import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { getFallbackAvatar } from "../utils/avatar";
import { MoreVertical, Edit3, Trash2, Smile } from "lucide-react";
import EmojiPicker, {
  type EmojiClickData,
  EmojiStyle,
  Theme,
} from "emoji-picker-react";

type Reaction = {
  emoji: string;
  user_ids: string[];
  count: number;
};

type Message = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  name?: string;
  avatar?: string | null;
  reactions?: Record<string, string[]>;
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
  const [emojiPickerOpen, setEmojiPickerOpen] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement | null>(null);
  const emojiButtonRef = useRef<Record<string, HTMLButtonElement | null>>({});

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
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      const isNewMessage =
        messages.length === 1 ||
        new Date(lastMessage.created_at).getTime() >
          new Date(messages[messages.length - 2]?.created_at || 0).getTime();

      if (isNewMessage) {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [messages.length]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (emojiPickerRef.current && !emojiPickerRef.current.contains(target)) {
        const clickedButton = Object.values(emojiButtonRef.current).some(
          (button) => button && button.contains(target),
        );

        if (!clickedButton) {
          setEmojiPickerOpen(null);
        }
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setEmojiPickerOpen(null);
      }
    };

    if (emojiPickerOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [emojiPickerOpen]);

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
        reactions: {},
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

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!user) return;

    const message = messages.find((m) => m.id === messageId);
    if (!message) return;

    const reactions = message.reactions || {};
    const currentReactors = reactions[emoji] || [];

    let updatedReactions;
    if (currentReactors.includes(user.id)) {
      const newReactors = currentReactors.filter((id) => id !== user.id);
      if (newReactors.length === 0) {
        const { [emoji]: _, ...rest } = reactions;
        updatedReactions = rest;
      } else {
        updatedReactions = { ...reactions, [emoji]: newReactors };
      }
    } else {
      updatedReactions = {
        ...reactions,
        [emoji]: [...currentReactors, user.id],
      };
    }

    const { data, error } = await supabase
      .from("messages")
      .update({ reactions: updatedReactions })
      .eq("id", messageId)
      .select();

    if (error) {
      console.error("Error updating reaction:", error);
      alert("Failed to add reaction. Please check your permissions.");
    } else {
      console.log("Reaction updated successfully:", data);
    }
  };

  const handleEmojiClick = (messageId: string, emojiData: EmojiClickData) => {
    toggleReaction(messageId, emojiData.emoji);
    setEmojiPickerOpen(null);
  };

  const getReactionsList = (
    reactions?: Record<string, string[]>,
  ): Reaction[] => {
    if (!reactions) return [];
    return Object.entries(reactions).map(([emoji, user_ids]) => ({
      emoji,
      user_ids,
      count: user_ids.length,
    }));
  };

  const getUserNameById = (userId: string): string => {
    const message = messages.find((m) => m.user_id === userId);
    return message?.name || "Unknown User";
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
            const reactionsList = getReactionsList(msg.reactions);

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
                            ? "bg-zinc-900 text-white border-zinc-800"
                            : "bg-gray-100 text-gray-900 border-gray-200"
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

                    {/* Reactions */}
                    {reactionsList.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {reactionsList.map((reaction) => {
                          const hasReacted = reaction.user_ids.includes(
                            user?.id || "",
                          );
                          const reactorNames =
                            reaction.user_ids.map(getUserNameById);
                          const tooltipText = reactorNames.join(", ");

                          return (
                            <button
                              key={reaction.emoji}
                              onClick={() =>
                                toggleReaction(msg.id, reaction.emoji)
                              }
                              title={tooltipText}
                              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all cursor-pointer ${
                                hasReacted
                                  ? darkMode
                                    ? "bg-zinc-800 border-zinc-600"
                                    : "bg-blue-100 border-blue-300"
                                  : darkMode
                                    ? "bg-zinc-900 border-zinc-800 hover:bg-zinc-800"
                                    : "bg-gray-100 border-gray-200 hover:bg-gray-200"
                              } border`}
                            >
                              <span>{reaction.emoji}</span>
                              <span
                                className={
                                  darkMode ? "text-zinc-400" : "text-gray-600"
                                }
                              >
                                {reaction.count}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div
                      className={`absolute -right-10 top-2 flex flex-col gap-1 transition-opacity duration-200 ${emojiPickerOpen === msg.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                    >
                      <div className="relative">
                        <button
                          ref={(el) => {
                            if (el) emojiButtonRef.current[msg.id] = el;
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEmojiPickerOpen(
                              emojiPickerOpen === msg.id ? null : msg.id,
                            );
                          }}
                          className={`p-1.5 rounded ${darkMode ? "hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200" : "hover:bg-gray-100 text-gray-500 hover:text-gray-700"} transition-colors cursor-pointer`}
                        >
                          <Smile className="w-4 h-4" />
                        </button>

                        {emojiPickerOpen === msg.id &&
                          (() => {
                            const button = emojiButtonRef.current[msg.id];
                            if (!button) return null;

                            const rect = button.getBoundingClientRect();
                            const viewportHeight = window.innerHeight;
                            const viewportWidth = window.innerWidth;
                            const pickerHeight = 450;
                            const pickerWidth = 350;

                            let top = rect.bottom + 8;
                            let left = rect.left - pickerWidth + 40;

                            if (top + pickerHeight > viewportHeight) {
                              top = rect.top - pickerHeight - 8;
                            }

                            if (left < 8) {
                              left = 8;
                            }

                            if (left + pickerWidth > viewportWidth - 8) {
                              left = viewportWidth - pickerWidth - 8;
                            }

                            return (
                              <div
                                ref={emojiPickerRef}
                                className="fixed z-50"
                                style={{
                                  top: `${top}px`,
                                  left: `${left}px`,
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div
                                  className={`rounded-lg overflow-hidden shadow-2xl ${darkMode ? "ring-1 ring-zinc-800" : "ring-1 ring-gray-200"}`}
                                >
                                  <EmojiPicker
                                    onEmojiClick={(emojiData) =>
                                      handleEmojiClick(msg.id, emojiData)
                                    }
                                    theme={
                                      (darkMode
                                        ? Theme.DARK
                                        : Theme.LIGHT) as Theme
                                    }
                                    width={350}
                                    height={450}
                                    previewConfig={{ showPreview: false }}
                                    searchDisabled={true}
                                    skinTonesDisabled={true}
                                    emojiStyle={EmojiStyle.GOOGLE}
                                    lazyLoadEmojis={true}
                                  />
                                </div>
                              </div>
                            );
                          })()}
                      </div>

                      {/* Menu button (only for own messages) */}
                      {isMe && (
                        <>
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
                        </>
                      )}
                    </div>
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
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                className={`w-full ${darkMode ? "bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500 focus:ring-white focus:border-white" : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-500 focus:ring-black focus:border-black"} border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 text-sm transition-all`}
                placeholder={
                  editingId ? "Edit your message..." : "Type your message..."
                }
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(e);
                  }
                }}
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim()}
              className={`${darkMode ? "bg-white text-black hover:bg-zinc-200" : "bg-black text-white hover:bg-gray-800"} px-5 py-2.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm cursor-pointer`}
            >
              {editingId ? "Update" : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
