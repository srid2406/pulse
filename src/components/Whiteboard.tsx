import { useEffect, useState, useRef } from "react";
import { Excalidraw, exportToBlob } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import {
  Trash2,
  Save,
  Loader2,
  Moon,
  Sun,
  Settings,
  Image,
} from "lucide-react";
import SavedToast from "./SavedToast";

const Whiteboard = () => {
  const { user, loading: authLoading } = useAuth();
  const [initialData, setInitialData] = useState<{
    elements: any[];
    files: Record<string, any>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetCounter, setResetCounter] = useState(0);
  const [savedKey, setSavedKey] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [showControls, setShowControls] = useState(false);

  const USER_EMAIL = user?.email;

  const latestSceneRef = useRef<{
    elements: any[];
    files: Record<string, any>;
  } | null>(null);

  const sanitizeFileName = (fileName: string) => {
    const lastDotIndex = fileName.lastIndexOf(".");
    const name =
      lastDotIndex !== -1 ? fileName.substring(0, lastDotIndex) : fileName;
    const extension =
      lastDotIndex !== -1 ? fileName.substring(lastDotIndex) : "";

    const sanitizedName = name
      .replace(/[\s_]+/g, "-")
      .replace(/[^\w\-\.]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "")
      .substring(0, 100);

    const finalName = sanitizedName || "file";

    return finalName + extension;
  };

  useEffect(() => {
    if (!USER_EMAIL) return;

    const fetchOrCreate = async () => {
      try {
        const { data: existing } = await supabase
          .from("whiteboards")
          .select("data")
          .eq("user_email", USER_EMAIL)
          .maybeSingle();

        let scene = { elements: [], files: {} };

        if (!existing) {
          await supabase
            .from("whiteboards")
            .insert([{ user_email: USER_EMAIL, data: scene }]);
        } else if (existing.data && Object.keys(existing.data).length > 0) {
          scene = existing.data;
        }

        setInitialData(scene);
        latestSceneRef.current = scene;
      } catch (err) {
        console.error("Error loading whiteboard:", err);
        setInitialData({ elements: [], files: {} });
      } finally {
        setLoading(false);
      }
    };

    fetchOrCreate();
  }, [USER_EMAIL]);

  const handleChange = (elements: any, _appState: any, files: any) => {
    latestSceneRef.current = { elements, files };
  };

  const saveToDB = async () => {
    if (!USER_EMAIL || !latestSceneRef.current || isSaving) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("whiteboards")
        .upsert([{ user_email: USER_EMAIL, data: latestSceneRef.current }]);

      if (error) {
        console.error("Error saving whiteboard:", error);
      } else {
        setSavedKey((prev) => prev + 1);
      }
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportToPNG = async () => {
    if (!USER_EMAIL || !latestSceneRef.current || isSaving) return;

    setIsSaving(true);
    try {
      const blob = await exportToBlob({
        elements: latestSceneRef.current.elements,
        appState: {
          exportBackground: true,
          exportWithDarkMode: false,
          viewBackgroundColor: "#ffffff",
        },
        files: latestSceneRef.current.files,
        getDimensions: () => ({ width: 1920, height: 1080, scale: 2 }),
        mimeType: "image/png",
        quality: 0.92,
      });

      const whiteboardFolder = "whiteboard";
      const { data: folderExists } = await supabase
        .from("file_items")
        .select("id")
        .eq("path", whiteboardFolder)
        .eq("type", "folder")
        .maybeSingle();

      if (!folderExists) {
        await supabase.from("file_items").insert([
          {
            name: "whiteboard",
            type: "folder",
            path: whiteboardFolder,
            parent_path: "",
            file_names: {
              display: "whiteboard",
              sanitized: "whiteboard",
            },
          },
        ]);
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const fileName = `whiteboard-${timestamp}.png`;
      const sanitizedFileName = sanitizeFileName(fileName);
      const storagePath = `${whiteboardFolder}/${sanitizedFileName}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(storagePath, blob, {
          contentType: "image/png",
        });

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from("file_items").insert([
        {
          name: fileName,
          type: "file",
          path: storagePath,
          parent_path: whiteboardFolder,
          file_size: blob.size,
          mime_type: "image/png",
          file_names: {
            display: fileName,
            sanitized: sanitizedFileName,
          },
        },
      ]);

      if (dbError) throw dbError;

      setSavedKey((prev) => prev + 1);
    } catch (err) {
      console.error("Error exporting whiteboard:", err);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    window.addEventListener("beforeunload", saveToDB);
    window.addEventListener("offline", saveToDB);

    return () => {
      window.removeEventListener("beforeunload", saveToDB);
      window.removeEventListener("offline", saveToDB);
    };
  }, [USER_EMAIL]);

  const handleReset = async () => {
    const emptyScene = { elements: [], files: {} };
    setInitialData(emptyScene);
    setResetCounter((prev) => prev + 1);
    latestSceneRef.current = emptyScene;

    if (USER_EMAIL) {
      try {
        const { error } = await supabase
          .from("whiteboards")
          .upsert([{ user_email: USER_EMAIL, data: emptyScene }]);
        if (error) console.error("Error resetting whiteboard:", error);
      } catch (err) {
        console.error("Reset failed:", err);
      }
    }
  };

  if (authLoading || loading || !initialData) {
    return (
      <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative overflow-hidden">
      <div className="absolute right-8 top-1/2 -translate-y-1/2 z-50 flex items-center justify-center">
        <button
          onClick={() => setShowControls(!showControls)}
          className={`relative flex items-center justify-center w-10 h-10 rounded-full backdrop-blur-xl border shadow-xl transition-all duration-300 hover:scale-110 ${
            showControls
              ? darkMode
                ? "bg-violet-500/20 border-violet-400/40 text-violet-300 shadow-violet-500/30"
                : "bg-violet-100/80 border-violet-200/60 text-violet-600 shadow-violet-300/30"
              : darkMode
                ? "bg-slate-800/90 border-slate-700/60 text-slate-300 hover:text-slate-100"
                : "bg-white/90 border-gray-200/60 text-gray-600 hover:text-gray-800"
          }`}
        >
          <Settings
            className={`w-6 h-6 transition-transform duration-500 ${showControls ? "rotate-180" : ""}`}
          />
        </button>

        {showControls &&
          (() => {
            const radius = 60;
            const buttons = [
              {
                onClick: saveToDB,
                disabled: isSaving,
                className: isSaving
                  ? "bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed"
                  : darkMode
                    ? "bg-emerald-300/10 border-emerald-200/30 text-emerald-200 hover:bg-emerald-200/20 shadow-emerald-300/20"
                    : "bg-emerald-50 border-emerald-100 text-emerald-500 hover:bg-emerald-100 shadow-emerald-200/40",
                title: "Save",
                icon: isSaving ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  <Save className="w-5 h-5 mx-auto transition-transform duration-200 hover:scale-110" />
                ),
                duration: 200,
              },
              {
                onClick: handleReset,
                disabled: false,
                className: darkMode
                  ? "bg-rose-300/10 border-rose-200/30 text-rose-200 hover:bg-rose-200/20 shadow-rose-300/20"
                  : "bg-rose-50 border-rose-100 text-rose-500 hover:bg-rose-100 shadow-rose-200/40",
                title: "Clear",
                icon: (
                  <Trash2 className="w-5 h-5 mx-auto transition-transform duration-200 hover:scale-110" />
                ),
                duration: 300,
              },
              {
                onClick: () => setDarkMode(!darkMode),
                disabled: false,
                className: darkMode
                  ? "bg-amber-300/10 border-amber-200/30 text-amber-200 hover:bg-amber-200/20 shadow-amber-300/20"
                  : "bg-indigo-50 border-indigo-100 text-indigo-500 hover:bg-indigo-100 shadow-indigo-200/40",
                title: darkMode ? "Light Mode" : "Dark Mode",
                icon: darkMode ? (
                  <Sun className="w-5 h-5 mx-auto transition-transform duration-200 hover:rotate-45" />
                ) : (
                  <Moon className="w-5 h-5 mx-auto transition-transform duration-200 hover:-rotate-12" />
                ),
                duration: 400,
              },
              {
                onClick: handleExportToPNG,
                disabled: isSaving,
                className: isSaving
                  ? "bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed"
                  : darkMode
                    ? "bg-cyan-300/10 border-cyan-200/30 text-cyan-200 hover:bg-cyan-200/20 shadow-cyan-300/20"
                    : "bg-cyan-50 border-cyan-100 text-cyan-500 hover:bg-cyan-100 shadow-cyan-200/40",
                title: "Export as PNG",
                icon: isSaving ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  <Image className="w-5 h-5 mx-auto transition-transform duration-200 hover:scale-110" />
                ),
                duration: 500,
              },
            ];

            const startAngle = (3 * Math.PI) / 2;
            const endAngle = Math.PI / 2;
            const angleStep = (endAngle - startAngle) / (buttons.length - 1);

            return buttons.map((button, index) => {
              const angle = startAngle + index * angleStep;
              const x = radius * Math.cos(angle);
              const y = radius * Math.sin(angle);
              return (
                <button
                  key={button.title}
                  onClick={button.onClick}
                  disabled={button.disabled}
                  className={`absolute w-12 h-12 rounded-full backdrop-blur-xl border transition-all duration-300 transform hover:scale-110 shadow-lg animate-in fade-in-0 zoom-in-95 duration-${button.duration} ${button.className}`}
                  style={{
                    left: `calc(50% + ${x}px)`,
                    top: `calc(50% + ${y}px)`,
                    transform: "translate(-50%, -50%)",
                  }}
                  title={button.title}
                >
                  {button.icon}
                </button>
              );
            });
          })()}
      </div>

      <div className="w-full h-full">
        <Excalidraw
          key={resetCounter}
          initialData={initialData}
          onChange={handleChange}
          theme={darkMode ? "dark" : "light"}
          viewModeEnabled={false}
          zenModeEnabled={false}
          gridModeEnabled={false}
        />
      </div>

      {savedKey > 0 && <SavedToast key={savedKey} />}
    </div>
  );
};

export default Whiteboard;
