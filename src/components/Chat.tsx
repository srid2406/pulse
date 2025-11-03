import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { getFallbackAvatar } from "../utils/avatar";
import { MoreVertical, Edit3, Trash2 } from "lucide-react";

type Message = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  name?: string;
  avatar?: string | null;
};

const getDateLabel = (dateString: string): string => {
  const now = new Date();
  const msgDate = new Date(dateString);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(
    msgDate.getFullYear(),
    msgDate.getMonth(),
    msgDate.getDate(),
  );
  const diffTime = today.getTime() - msgDay.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 3600 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return msgDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

export default function Chat() {
  const { user } = useAuth();
  const { darkMode } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const loadMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: true });

      if (!error && data) setMessages(data);
    };
    loadMessages();

    const channel = supabase
      .channel("chat-room")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setMessages((prev) => [...prev, payload.new as Message]);
          }
          if (payload.eventType === "UPDATE") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === (payload.new as Message).id
                  ? (payload.new as Message)
                  : m,
              ),
            );
          }
          if (payload.eventType === "DELETE") {
            setMessages((prev) =>
              prev.filter((m) => m.id !== (payload.old as Message).id),
            );
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    if (editingId) {
      await supabase
        .from("messages")
        .update({ content: newMessage })
        .eq("id", editingId)
        .eq("user_id", user.id);
      setEditingId(null);
      setNewMessage("");
    } else {
      await supabase.from("messages").insert({
        user_id: user.id,
        content: newMessage,
        name: user.name || user.email,
        avatar: user.avatar || null,
      });
      setNewMessage("");
    }
  };

  const deleteMessage = async (id: string) => {
    if (!user) return;
    await supabase
      .from("messages")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
  };

  return (
    <div className="w-full h-full">
      <div
        className={`flex flex-col h-full ${darkMode ? "bg-black" : "bg-white"}`}
      >
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 scrollbar-hide">
          {messages.map((msg, index) => {
            const isMe = msg.user_id === user?.id;
            const isLast = index === messages.length - 1;
            const showDateHeader =
              index === 0 ||
              getDateLabel(msg.created_at) !==
                getDateLabel(messages[index - 1].created_at);

            return (
              <div key={`group-${msg.id}`}>
                {showDateHeader && (
                  <div className="flex items-center my-6">
                    <div
                      className={`flex-1 h-px ${darkMode ? "bg-zinc-800" : "bg-gray-200"}`}
                    />
                    <span
                      className={`px-3 py-1 text-xs font-medium ${darkMode ? "text-zinc-400 bg-zinc-900 border-zinc-800" : "text-gray-500 bg-gray-50 border-gray-200"} rounded-full border`}
                    >
                      {getDateLabel(msg.created_at)}
                    </span>
                    <div
                      className={`flex-1 h-px ${darkMode ? "bg-zinc-800" : "bg-gray-200"}`}
                    />
                  </div>
                )}
                <div
                  className={`relative flex items-start gap-3 ${
                    isMe ? "justify-end" : "justify-start"
                  } group`}
                >
                  {!isMe && (
                    <div className="flex-shrink-0">
                      <img
                        src={
                          msg.avatar ||
                          getFallbackAvatar(msg.name || msg.user_id)
                        }
                        alt={msg.name || "User"}
                        className={`w-9 h-9 rounded-full border ${darkMode ? "border-zinc-800" : "border-gray-200"}`}
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.onerror = null;
                          target.src = getFallbackAvatar(
                            msg.name || msg.user_id,
                          );
                        }}
                      />
                    </div>
                  )}

                  <div
                    className={`relative max-w-xs sm:max-w-md ${isMe ? "mr-12" : ""}`}
                  >
                    <div
                      className={`px-4 py-2.5 rounded-lg ${
                        isMe
                          ? darkMode
                            ? "bg-white text-black"
                            : "bg-black text-white"
                          : darkMode
                            ? "bg-zinc-900 text-white border-zinc-800"
                            : "bg-gray-100 text-gray-900 border-gray-200"
                      } ${!isMe ? "border" : ""}`}
                    >
                      {!isMe && (
                        <p
                          className={`text-xs font-medium ${darkMode ? "text-zinc-400" : "text-gray-600"} mb-1.5`}
                        >
                          {msg.name}
                        </p>
                      )}

                      <p className="text-sm leading-relaxed break-words">
                        {msg.content}
                      </p>

                      <div
                        className={`text-[10px] mt-1.5 ${
                          isMe
                            ? darkMode
                              ? "text-gray-600"
                              : "text-gray-400"
                            : darkMode
                              ? "text-zinc-500"
                              : "text-gray-500"
                        } text-right`}
                      >
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>

                    {isMe && (
                      <div className="absolute -right-10 top-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                          onClick={() =>
                            setMenuOpen(menuOpen === msg.id ? null : msg.id)
                          }
                          className={`p-1.5 rounded ${darkMode ? "hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200" : "hover:bg-gray-100 text-gray-500 hover:text-gray-700"} transition-colors cursor-pointer`}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {menuOpen === msg.id && (
                          <div
                            className={`absolute ${
                              isLast ? "bottom-8 right-0" : "top-8 right-0"
                            } w-32 ${darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"} rounded-lg shadow-lg z-20 border overflow-hidden`}
                          >
                            <button
                              onClick={() => {
                                setEditingId(msg.id);
                                setNewMessage(msg.content);
                                setMenuOpen(null);
                              }}
                              className={`flex items-center gap-2.5 px-3 py-2.5 ${darkMode ? "hover:bg-zinc-800 text-white" : "hover:bg-gray-50 text-gray-900"} w-full text-left text-sm transition-colors cursor-pointer`}
                            >
                              <Edit3
                                size={14}
                                className={
                                  darkMode ? "text-zinc-400" : "text-gray-700"
                                }
                              />
                              <span>Edit</span>
                            </button>
                            <div
                              className={`h-px ${darkMode ? "bg-zinc-800" : "bg-gray-200"}`}
                            />
                            <button
                              onClick={() => {
                                deleteMessage(msg.id);
                                setMenuOpen(null);
                              }}
                              className={`flex items-center gap-2.5 px-3 py-2.5 ${darkMode ? "hover:bg-zinc-800 text-white" : "hover:bg-gray-50 text-gray-900"} w-full text-left text-sm transition-colors cursor-pointer`}
                            >
                              <Trash2 size={14} />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <div
          className={`border-t ${darkMode ? "border-zinc-800 bg-black" : "border-gray-200 bg-white"} px-4 py-4`}
        >
          <form onSubmit={sendMessage} className="flex items-center gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                className={`w-full ${darkMode ? "bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500 focus:ring-white focus:border-white" : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-500 focus:ring-black focus:border-black"} border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 text-sm transition-all`}
                placeholder={
                  editingId ? "Edit your message..." : "Type your message..."
                }
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className={`${darkMode ? "bg-white text-black hover:bg-zinc-200" : "bg-black text-white hover:bg-gray-800"} px-5 py-2.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm cursor-pointer`}
            >
              {editingId ? "Update" : "Send"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
