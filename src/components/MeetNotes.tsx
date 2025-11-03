import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import {
  X,
  Save,
  Trash2,
  PlusIcon,
  Calendar,
  User,
  FileText,
} from "lucide-react";
import { SimpleEditor } from "./tiptap-templates/simple/simple-editor";
import { getDefaultContent } from "../utils/meetDate";
import SavedToast from "./SavedToast";

type MeetNote = {
  id: number;
  name: string;
  date: string;
  created_by: string;
  notes: any;
  created_at: Date;
};

const MeetNotes = () => {
  const { user } = useAuth();
  const { darkMode } = useTheme();
  const [notes, setNotes] = useState<MeetNote[]>([]);
  const [draft, setDraft] = useState<MeetNote | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const latestDraftRef = useRef<MeetNote | null>(null);
  const [savedKey, setSavedKey] = useState(0);

  useEffect(() => {
    fetchNotes();
  }, []);

  // Inject Vercel-style CSS for Tiptap editor
  useEffect(() => {
    const styleId = "tiptap-vercel-theme";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        /* Vercel Theme for Tiptap Editor */
        .ProseMirror {
          padding: 3rem 4rem !important;
          min-height: 100%;
          outline: none !important;
          font-size: 15px;
          line-height: 1.6;
          color: #000;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
        }

        .dark .ProseMirror {
          color: #ededed;
        }

        /* Placeholder */
        .ProseMirror p.is-editor-empty:first-child::before {
          color: #999;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }

        .dark .ProseMirror p.is-editor-empty:first-child::before {
          color: #666;
        }

        /* Headings */
        .ProseMirror h1 {
          font-size: 2.5rem;
          font-weight: 700;
          line-height: 1.2;
          margin-top: 2rem;
          margin-bottom: 1rem;
          color: #000;
          letter-spacing: -0.03em;
        }

        .dark .ProseMirror h1 {
          color: #fff;
        }

        .ProseMirror h1:first-child {
          margin-top: 0;
        }

        .ProseMirror h2 {
          font-size: 2rem;
          font-weight: 600;
          line-height: 1.3;
          margin-top: 2rem;
          margin-bottom: 0.75rem;
          color: #000;
          letter-spacing: -0.02em;
          padding-top: 0.5rem;
          border-top: 1px solid #eaeaea;
        }

        .dark .ProseMirror h2 {
          color: #fff;
          border-top-color: #333;
        }

        .ProseMirror h2:first-child {
          margin-top: 0;
          border-top: none;
          padding-top: 0;
        }

        .ProseMirror h3 {
          font-size: 1.5rem;
          font-weight: 600;
          line-height: 1.4;
          margin-top: 1.5rem;
          margin-bottom: 0.5rem;
          color: #000;
          letter-spacing: -0.01em;
        }

        .dark .ProseMirror h3 {
          color: #fff;
        }

        /* Paragraphs */
        .ProseMirror p {
          margin-top: 0.75rem;
          margin-bottom: 0.75rem;
          color: #525252;
          line-height: 1.7;
        }

        .dark .ProseMirror p {
          color: #a1a1a1;
        }

        /* Lists */
        .ProseMirror ul,
        .ProseMirror ol {
          padding-left: 1.5rem;
          margin-top: 0.75rem;
          margin-bottom: 0.75rem;
        }

        .ProseMirror ul {
          list-style-type: disc;
        }

        .ProseMirror ol {
          list-style-type: decimal;
        }

        .ProseMirror li {
          margin-top: 0.375rem;
          margin-bottom: 0.375rem;
          color: #525252;
          line-height: 1.6;
        }

        .dark .ProseMirror li {
          color: #a1a1a1;
        }

        .ProseMirror li > p {
          margin: 0;
        }

        .ProseMirror ul ul,
        .ProseMirror ol ul {
          list-style-type: circle;
          margin-top: 0.25rem;
        }

        .ProseMirror ul ul ul,
        .ProseMirror ol ul ul {
          list-style-type: square;
        }

        /* Code blocks */
        .ProseMirror pre {
          background: #fafafa;
          border: 1px solid #eaeaea;
          border-radius: 8px;
          padding: 1rem 1.25rem;
          margin: 1.5rem 0;
          overflow-x: auto;
          font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
          font-size: 14px;
          line-height: 1.6;
        }

        .dark .ProseMirror pre {
          background: #111;
          border-color: #333;
        }

        .ProseMirror pre code {
          background: none;
          padding: 0;
          border-radius: 0;
          color: inherit;
          font-size: inherit;
        }

        .ProseMirror code {
          background: #f4f4f4;
          padding: 0.2em 0.4em;
          border-radius: 4px;
          font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
          font-size: 0.9em;
          color: #eb5757;
          font-weight: 500;
        }

        .dark .ProseMirror code {
          background: #1a1a1a;
          color: #ff6b6b;
        }

        /* Blockquotes */
        .ProseMirror blockquote {
          border-left: 3px solid #eaeaea;
          padding-left: 1rem;
          margin-left: 0;
          margin-top: 1.5rem;
          margin-bottom: 1.5rem;
          color: #666;
          font-style: italic;
        }

        .dark .ProseMirror blockquote {
          border-left-color: #333;
          color: #888;
        }

        .ProseMirror blockquote p {
          color: inherit;
        }

        /* Links */
        .ProseMirror a {
          color: #0070f3;
          text-decoration: none;
          transition: color 0.2s ease;
          cursor: pointer;
        }

        .ProseMirror a:hover {
          color: #0051cc;
          text-decoration: underline;
        }

        .dark .ProseMirror a {
          color: #3291ff;
        }

        .dark .ProseMirror a:hover {
          color: #0070f3;
        }

        /* Horizontal rule */
        .ProseMirror hr {
          border: none;
          border-top: 1px solid #eaeaea;
          margin: 2.5rem 0;
        }

        .dark .ProseMirror hr {
          border-top-color: #333;
        }

        /* Strong/Bold */
        .ProseMirror strong,
        .ProseMirror b {
          font-weight: 600;
          color: #000;
        }

        .dark .ProseMirror strong,
        .dark .ProseMirror b {
          color: #fff;
        }

        /* Italic */
        .ProseMirror em,
        .ProseMirror i {
          font-style: italic;
        }

        /* Strike */
        .ProseMirror s,
        .ProseMirror strike,
        .ProseMirror del {
          text-decoration: line-through;
          opacity: 0.7;
        }

        /* Selection */
        .ProseMirror ::selection {
          background: #0070f3;
          color: white;
        }

        .dark .ProseMirror ::selection {
          background: #3291ff;
          color: white;
        }

        /* Focus */
        .ProseMirror:focus {
          outline: none;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .ProseMirror {
            padding: 2rem 1.5rem !important;
          }
        }

        @media (max-width: 640px) {
          .ProseMirror {
            padding: 1.5rem 1rem !important;
            font-size: 14px;
          }

          .ProseMirror h1 {
            font-size: 2rem;
          }

          .ProseMirror h2 {
            font-size: 1.5rem;
          }

          .ProseMirror h3 {
            font-size: 1.25rem;
          }
        }
      `;
      document.head.appendChild(style);
    }

    return () => {
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  const fetchNotes = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from("meet_notes").select("*");
    if (error) console.error("Error fetching notes:", error);
    if (data) setNotes(data as MeetNote[]);
    setIsLoading(false);
  };

  const addRow = async () => {
    if (!user) return;
    setIsLoading(true);
    const today = new Date().toISOString().slice(0, 10);

    const newNote = {
      name: "New Meeting",
      date: today,
      created_by: user.name || user.email,
      notes: getDefaultContent(today),
      created_at: new Date(),
    };

    const { data, error } = await supabase
      .from("meet_notes")
      .insert([newNote])
      .select();

    if (error) console.error("Insert error:", error);
    else if (data) setNotes((prev) => [...prev, data[0]]);
    setIsLoading(false);
  };

  const saveNote = async () => {
    if (!latestDraftRef.current) return;
    setIsLoading(true);

    const { error } = await supabase
      .from("meet_notes")
      .update({
        name: latestDraftRef.current.name,
        date: latestDraftRef.current.date,
        created_by: latestDraftRef.current.created_by,
        notes: latestDraftRef.current.notes,
      })
      .eq("id", latestDraftRef.current.id);

    if (error) console.error("Update error:", error);
    else {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === latestDraftRef.current?.id ? latestDraftRef.current! : n,
        ),
      );
      setSavedKey((prev) => prev + 1);
    }
    setIsLoading(false);
  };

  const deleteNote = async (id: number) => {
    setIsLoading(true);
    const { error } = await supabase.from("meet_notes").delete().eq("id", id);
    if (error) console.error("Delete error:", error);
    else {
      setNotes((prev) => prev.filter((n) => n.id !== id));
      setDraft(null);
      latestDraftRef.current = null;
    }
    setIsLoading(false);
  };

  const closeEditor = async () => {
    setDraft(null);
    latestDraftRef.current = null;
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      saveNote();
    } else if (e.key === "Escape") {
      setDraft(null);
      latestDraftRef.current = null;
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div
      className={`relative w-full h-full overflow-hidden ${darkMode ? "bg-black" : "bg-white"}`}
    >
      {isLoading && (
        <div
          className={`absolute inset-0 ${darkMode ? "bg-black/80" : "bg-white/80"} flex items-center justify-center z-50`}
        >
          <div
            className={`animate-spin rounded-full h-12 w-12 border-2 ${darkMode ? "border-white border-t-transparent" : "border-black border-t-transparent"}`}
          ></div>
        </div>
      )}

      <div className="p-0 overflow-y-auto h-full">
        {notes.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div
              className={`w-16 h-16 ${darkMode ? "bg-zinc-900" : "bg-gray-100"} rounded-full flex items-center justify-center mb-4`}
            >
              <FileText
                size={24}
                className={darkMode ? "text-zinc-600" : "text-gray-400"}
              />
            </div>
            <h3
              className={`text-lg font-semibold ${darkMode ? "text-white" : "text-gray-900"} mb-2`}
            >
              No meeting notes yet
            </h3>
            <p
              className={`${darkMode ? "text-zinc-400" : "text-gray-600"} mb-6 max-w-sm text-sm`}
            >
              Get started by creating your first meeting note to capture
              important discussions and decisions.
            </p>
            <button
              onClick={addRow}
              className={`inline-flex items-center gap-2 px-4 py-2 ${darkMode ? "bg-white text-black hover:bg-zinc-200" : "bg-black text-white hover:bg-gray-800"} rounded-lg transition-colors duration-200 font-medium text-sm cursor-pointer`}
              disabled={isLoading}
            >
              <PlusIcon size={16} />
              Create First Note
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-6">
            {notes.map((note) => (
              <div
                key={note.id}
                className={`group relative ${darkMode ? "bg-zinc-900 border-zinc-800 hover:border-zinc-700" : "bg-white border-gray-200 hover:border-gray-300"} rounded-lg border transition-all duration-200 cursor-pointer overflow-hidden`}
                onClick={() => {
                  setDraft({ ...note });
                  latestDraftRef.current = { ...note };
                }}
              >
                <div className="p-4">
                  <h3
                    className={`font-semibold ${darkMode ? "text-white group-hover:text-zinc-100" : "text-gray-900 group-hover:text-black"} text-base mb-3 line-clamp-2 transition-colors duration-200`}
                  >
                    {note.name}
                  </h3>

                  <div className="space-y-2">
                    <div
                      className={`flex items-center gap-2 text-xs ${darkMode ? "text-zinc-400" : "text-gray-600"}`}
                    >
                      <Calendar
                        size={14}
                        className={darkMode ? "text-zinc-500" : "text-gray-400"}
                      />
                      <span>{formatDate(note.date)}</span>
                    </div>

                    <div
                      className={`flex items-center gap-2 text-xs ${darkMode ? "text-zinc-400" : "text-gray-600"}`}
                    >
                      <User
                        size={14}
                        className={darkMode ? "text-zinc-500" : "text-gray-400"}
                      />
                      <span className="truncate">{note.created_by}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {!draft && notes.length > 0 && (
        <div className="absolute bottom-6 right-6 z-30">
          <button
            onClick={addRow}
            className={`w-12 h-12 rounded-full shadow-lg ${darkMode ? "bg-white text-black hover:bg-zinc-200" : "bg-black text-white hover:bg-gray-800"} transition-all duration-200 flex items-center justify-center group hover:scale-105 active:scale-95 cursor-pointer`}
            disabled={isLoading}
          >
            <PlusIcon
              size={20}
              className="group-hover:rotate-90 transition-transform duration-200"
            />
          </button>
        </div>
      )}

      {draft && (
        <div
          className={`absolute top-0 left-0 right-0 bottom-0 z-20 flex flex-col ${darkMode ? "bg-black dark" : "bg-white"} w-full h-full`}
        >
          <div
            className={`flex justify-between items-center px-6 py-4 border-b ${darkMode ? "border-zinc-800 bg-black" : "border-gray-200 bg-white"}`}
          >
            <div className="flex-1 mr-6">
              <input
                value={draft.name}
                onChange={(e) => {
                  setDraft({ ...draft, name: e.target.value });
                  latestDraftRef.current = {
                    ...latestDraftRef.current!,
                    name: e.target.value,
                  };
                }}
                className={`text-xl font-semibold w-full border-none outline-none ${darkMode ? "text-white bg-transparent placeholder-zinc-600 focus:text-zinc-100" : "text-gray-900 bg-transparent placeholder-gray-400 focus:text-black"} transition-colors duration-200`}
                placeholder="Meeting title..."
                disabled={isLoading}
              />
              <div
                className={`flex items-center gap-4 mt-2 text-xs ${darkMode ? "text-zinc-400" : "text-gray-600"}`}
              >
                <div className="flex items-center gap-1">
                  <Calendar size={12} />
                  <span>{formatDate(draft.date)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <User size={12} />
                  <span>{draft.created_by}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={saveNote}
                className={`flex items-center gap-2 px-4 py-2 ${darkMode ? "bg-white text-black hover:bg-zinc-200" : "bg-black text-white hover:bg-gray-800"} rounded-lg transition-colors duration-200 font-medium text-sm cursor-pointer`}
                disabled={isLoading}
              >
                <Save size={16} />
                Save
              </button>
              <button
                onClick={() => deleteNote(draft.id)}
                className={`flex items-center gap-2 px-4 py-2 ${darkMode ? "bg-zinc-900 border-zinc-800 text-white hover:bg-zinc-800" : "bg-white border-gray-200 text-gray-900 hover:bg-gray-50"} border rounded-lg transition-colors duration-200 font-medium text-sm cursor-pointer`}
                disabled={isLoading}
              >
                <Trash2 size={16} />
                Delete
              </button>
              <button
                onClick={closeEditor}
                className={`flex items-center justify-center w-10 h-10 ${darkMode ? "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"} rounded-lg transition-all duration-200 cursor-pointer`}
                disabled={isLoading}
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <SimpleEditor
              content={draft.notes}
              onChange={(json) => {
                setDraft((prev) => (prev ? { ...prev, notes: json } : prev));
                latestDraftRef.current = latestDraftRef.current
                  ? { ...latestDraftRef.current, notes: json }
                  : null;
              }}
            />
          </div>
        </div>
      )}

      {savedKey > 0 && <SavedToast key={savedKey} />}
    </div>
  );
};

export default MeetNotes;
