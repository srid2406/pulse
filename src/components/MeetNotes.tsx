import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
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
  const [notes, setNotes] = useState<MeetNote[]>([]);
  const [draft, setDraft] = useState<MeetNote | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const latestDraftRef = useRef<MeetNote | null>(null);
  const [savedKey, setSavedKey] = useState(0);

  useEffect(() => {
    fetchNotes();
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
    <div className="relative w-full h-full overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-50">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      )}

      <div className="p-8 overflow-y-auto h-full">
        {notes.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <FileText size={24} className="text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              No meeting notes yet
            </h3>
            <p className="text-slate-600 mb-6 max-w-sm">
              Get started by creating your first meeting note to capture
              important discussions and decisions.
            </p>
            <button
              onClick={addRow}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium"
              disabled={isLoading}
            >
              <PlusIcon size={16} />
              Create First Note
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {notes.map((note) => (
              <div
                key={note.id}
                className="group relative bg-white rounded-xl shadow-sm border border-slate-200/60 hover:shadow-lg hover:border-slate-300/60 transition-all duration-200 cursor-pointer overflow-hidden"
                onClick={() => {
                  setDraft({ ...note });
                  latestDraftRef.current = { ...note };
                }}
              >
                <div className="p-6 pb-4">
                  <h3 className="font-semibold text-slate-900 text-lg mb-3 line-clamp-2 group-hover:text-blue-600 transition-colors duration-200">
                    {note.name}
                  </h3>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Calendar size={14} className="text-slate-400" />
                      <span>{formatDate(note.date)}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <User size={14} className="text-slate-400" />
                      <span className="truncate">{note.created_by}</span>
                    </div>
                  </div>
                </div>

                <div className="px-6 pb-6">
                  <div className="w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full opacity-20 group-hover:opacity-40 transition-opacity duration-200"></div>
                </div>

                <div className="absolute inset-0 bg-gradient-to-t from-blue-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"></div>
              </div>
            ))}
          </div>
        )}
      </div>

      {!draft && (
        <div className="absolute bottom-8 right-8 z-30">
          <button
            onClick={addRow}
            className="w-14 h-14 rounded-full shadow-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center group hover:scale-105 active:scale-95"
            disabled={isLoading}
          >
            <PlusIcon
              size={24}
              className="group-hover:rotate-90 transition-transform duration-200"
            />
          </button>
        </div>
      )}

      {draft && (
        <div className="absolute top-0 left-0 right-0 bottom-0 z-20 flex flex-col bg-white w-full h-full">
          <div className="flex justify-between items-center px-8 py-6 border-b border-slate-200/60 bg-white/95 backdrop-blur-sm">
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
                className="text-2xl font-bold w-full border-none outline-none text-slate-900 bg-transparent placeholder-slate-400 focus:text-blue-600 transition-colors duration-200"
                placeholder="Meeting title..."
                disabled={isLoading}
              />
              <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                <div className="flex items-center gap-1">
                  <Calendar size={14} />
                  <span>{formatDate(draft.date)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <User size={14} />
                  <span>{draft.created_by}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={saveNote}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 font-medium text-sm"
                disabled={isLoading}
              >
                <Save size={16} />
                Save
              </button>
              <button
                onClick={() => deleteNote(draft.id)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 font-medium text-sm"
                disabled={isLoading}
              >
                <Trash2 size={16} />
                Delete
              </button>
              <button
                onClick={closeEditor}
                className="flex items-center justify-center w-10 h-10 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all duration-200"
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
