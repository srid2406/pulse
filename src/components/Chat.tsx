import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
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

export default function Chat() {
  const { user } = useAuth();
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
      <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 scrollbar-hide">
          {messages.map((msg, index) => {
            const isMe = msg.user_id === user?.id;
            const isLast = index === messages.length - 1;

            return (
              <div
                key={msg.id}
                className={`relative flex items-start gap-3 ${
                  isMe ? "justify-end" : "justify-start"
                } group`}
              >
                {!isMe && (
                  <div className="flex-shrink-0">
                    <img
                      src={
                        msg.avatar || getFallbackAvatar(msg.name || msg.user_id)
                      }
                      alt={msg.name || "User"}
                      className="w-10 h-10 rounded-full ring-2 ring-white shadow-sm"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.onerror = null;
                        target.src = getFallbackAvatar(msg.name || msg.user_id);
                      }}
                    />
                  </div>
                )}

                <div
                  className={`relative max-w-xs sm:max-w-md ${isMe ? "mr-12" : ""}`}
                >
                  <div
                    className={`px-4 py-3 rounded-2xl shadow-sm ${
                      isMe
                        ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-md"
                        : "bg-white text-gray-800 rounded-bl-md border border-gray-100"
                    }`}
                  >
                    {!isMe && (
                      <p className="text-xs font-medium text-blue-600 mb-2">
                        {msg.name}
                      </p>
                    )}

                    <p className="text-sm leading-relaxed break-words">
                      {msg.content}
                    </p>

                    <div
                      className={`text-[10px] mt-2 ${
                        isMe ? "text-blue-100" : "text-gray-500"
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
                        className="p-1.5 rounded-full hover:bg-white/20 text-gray-500 hover:text-gray-700 transition-all duration-200"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {menuOpen === msg.id && (
                        <div
                          className={`absolute ${
                            isLast ? "bottom-8 right-0" : "top-8 right-0"
                          } w-36 bg-white text-gray-800 rounded-xl shadow-lg z-20 border border-gray-200 overflow-hidden`}
                        >
                          <button
                            onClick={() => {
                              setEditingId(msg.id);
                              setNewMessage(msg.content);
                              setMenuOpen(null);
                            }}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 w-full text-left text-sm transition-colors duration-150"
                          >
                            <Edit3 size={16} className="text-blue-500" />
                            <span>Edit</span>
                          </button>
                          <div className="h-px bg-gray-100" />
                          <button
                            onClick={() => {
                              deleteMessage(msg.id);
                              setMenuOpen(null);
                            }}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-red-50 w-full text-left text-sm text-red-600 transition-colors duration-150"
                          >
                            <Trash2 size={16} />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-white/50 bg-white/40 backdrop-blur-sm px-4 py-4">
          <form onSubmit={sendMessage} className="flex items-center gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                className="w-full bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-sm placeholder:text-gray-500 transition-all duration-200"
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
              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-2xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-sm shadow-sm hover:shadow-md"
            >
              {editingId ? "Update" : "Send"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
