import { useEffect, useState } from "react";
import {
  Folder,
  FileText,
  Upload,
  MoreVertical,
  Trash2,
  Edit3,
  FolderPlus,
  X,
  Check,
  Image,
  FileVideo,
  FileAudio,
  Archive,
  File,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

type ItemType = {
  id: string;
  name: string;
  sanitized_name: string;
  type: "file" | "folder";
  path: string;
  parent_path: string;
  file_size?: number;
  mime_type?: string;
  created_at: Date;
  updated_at?: Date;
};

const FileManager = () => {
  const [items, setItems] = useState<ItemType[]>([]);
  const [currentPath, setCurrentPath] = useState("");
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    itemId?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [fileOperationLoading, setFileOperationLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<{
    itemId: string;
    item: ItemType;
  } | null>(null);

  // Sanitize file name for Supabase storage
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

  // Get file icon based on extension
  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    const iconProps = { className: "w-8 h-8" };

    switch (ext) {
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
      case "webp":
        return <Image {...iconProps} className="w-8 h-8 text-green-500" />;
      case "mp4":
      case "avi":
      case "mkv":
      case "mov":
        return <FileVideo {...iconProps} className="w-8 h-8 text-red-500" />;
      case "mp3":
      case "wav":
      case "flac":
        return <FileAudio {...iconProps} className="w-8 h-8 text-purple-500" />;
      case "zip":
      case "rar":
      case "7z":
        return <Archive {...iconProps} className="w-8 h-8 text-yellow-600" />;
      case "pdf":
        return <FileText {...iconProps} className="w-8 h-8 text-red-600" />;
      case "doc":
      case "docx":
        return <FileText {...iconProps} className="w-8 h-8 text-blue-600" />;
      case "xls":
      case "xlsx":
        return <FileText {...iconProps} className="w-8 h-8 text-green-600" />;
      case "ppt":
      case "pptx":
        return <FileText {...iconProps} className="w-8 h-8 text-orange-600" />;
      default:
        return <File {...iconProps} className="w-8 h-8 text-gray-500" />;
    }
  };

  const buildStoragePath = (parentPath: string, sanitizedName: string) => {
    return parentPath ? `${parentPath}/${sanitizedName}` : sanitizedName;
  };

  const fetchItems = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from("file_items")
        .select("*")
        .eq("parent_path", currentPath)
        .order("type", { ascending: false })
        .order("name", { ascending: true });

      if (error) throw error;

      const typedData: ItemType[] = (data || []).map((item) => {
        let displayName = item.name;
        let sanitizedName = item.name;

        if (item.file_names) {
          displayName = item.file_names.display || item.name;
          sanitizedName = item.file_names.sanitized || item.name;
        }

        return {
          id: item.id,
          name: displayName,
          sanitized_name: sanitizedName,
          type: item.type as "file" | "folder",
          path: item.path,
          parent_path: item.parent_path,
          file_size: item.file_size,
          mime_type: item.mime_type,
          created_at: new Date(item.created_at),
          updated_at: item.updated_at ? new Date(item.updated_at) : undefined,
        };
      });

      setItems(typedData);
    } catch (err) {
      console.error("Error fetching items:", err);
      setError("Failed to fetch items");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    const folderPath = currentPath
      ? `${currentPath}/${newFolderName.trim()}`
      : newFolderName.trim();

    try {
      const { error } = await supabase.from("file_items").insert([
        {
          name: newFolderName.trim(),
          type: "folder",
          path: folderPath,
          parent_path: currentPath,
          file_names: {
            display: newFolderName.trim(),
            sanitized: newFolderName.trim(),
          },
        },
      ]);

      if (error) throw error;

      setNewFolderName("");
      setShowNewFolderInput(false);
      await fetchItems();
    } catch (err) {
      console.error("Error creating folder:", err);
      setError("Failed to create folder");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileOperationLoading(true);
    const sanitizedFileName = sanitizeFileName(file.name);
    const storagePath = buildStoragePath(currentPath, sanitizedFileName);

    try {
      const { data: _uploadData, error: uploadError } = await supabase.storage
        .from("documents")
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from("file_items").insert([
        {
          name: file.name,
          type: "file",
          path: storagePath,
          parent_path: currentPath,
          file_size: file.size,
          mime_type: file.type || null,
          file_names: {
            display: file.name,
            sanitized: sanitizedFileName,
          },
        },
      ]);

      if (dbError) throw dbError;

      await fetchItems();
      e.target.value = "";
    } catch (err) {
      console.error("Error uploading file:", err);
      setError("Failed to upload file");
    } finally {
      setFileOperationLoading(false);
    }
  };

  const handleDelete = async (itemId: string, item: ItemType) => {
    setFileOperationLoading(true);
    try {
      if (item.type === "folder") {
        const { data: descendants, error: fetchError } = await supabase
          .from("file_items")
          .select("*")
          .like("path", `${item.path}%`);

        if (fetchError) throw fetchError;

        const storagePaths = descendants
          .filter((descendant) => descendant.type === "file")
          .map((descendant) =>
            buildStoragePath(
              descendant.parent_path,
              descendant.file_names?.sanitized || descendant.name,
            ),
          );

        if (storagePaths.length > 0) {
          const { error: storageError } = await supabase.storage
            .from("documents")
            .remove(storagePaths);

          if (storageError) {
            console.warn("Storage deletion warning:", storageError);
          }
        }

        const { error: dbError } = await supabase
          .from("file_items")
          .delete()
          .like("path", `${item.path}%`);

        if (dbError) throw dbError;
      } else {
        const storagePath = buildStoragePath(
          item.parent_path,
          item.sanitized_name,
        );
        const { error: storageError } = await supabase.storage
          .from("documents")
          .remove([storagePath]);

        if (storageError) {
          console.warn("Storage deletion warning:", storageError);
        }

        const { error: dbError } = await supabase
          .from("file_items")
          .delete()
          .eq("id", itemId);

        if (dbError) throw dbError;
      }

      await fetchItems();
    } catch (err) {
      console.error("Error deleting item:", err);
      setError("Failed to delete item");
    } finally {
      setFileOperationLoading(false);
      setShowDeleteModal(null);
    }
  };

  const handleRename = async (
    itemId: string,
    newDisplayName: string,
    item: ItemType,
  ) => {
    if (!newDisplayName.trim()) return;

    try {
      const updateData: any = {
        name: newDisplayName.trim(),
        file_names: {
          display: newDisplayName.trim(),
          sanitized: item.sanitized_name,
        },
      };

      const { error } = await supabase
        .from("file_items")
        .update(updateData)
        .eq("id", itemId);

      if (error) throw error;

      setEditingItem(null);
      setEditingName("");
      await fetchItems();
    } catch (err) {
      console.error("Error renaming item:", err);
      setError("Failed to rename item");
    }
  };

  const handleItemClick = (item: ItemType) => {
    if (item.type === "folder") {
      setCurrentPath(item.path);
    } else {
      handleFileOpen(item);
    }
  };

  const handleFileOpen = async (item: ItemType) => {
    setFileOperationLoading(true);
    try {
      const storagePath = buildStoragePath(
        item.parent_path,
        item.sanitized_name,
      );

      const { data, error } = await supabase.storage
        .from("documents")
        .download(storagePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      window.open(url, "_blank");
    } catch (err) {
      console.error("Error downloading file:", err);
      setError("Failed to download file");
    } finally {
      setFileOperationLoading(false);
    }
  };

  const getBreadcrumbs = () => {
    if (!currentPath) return [{ name: "Home", path: "" }];

    const parts = currentPath.split("/");
    const breadcrumbs = [{ name: "Home", path: "" }];

    let buildPath = "";
    parts.forEach((part) => {
      buildPath = buildPath ? `${buildPath}/${part}` : part;
      breadcrumbs.push({ name: part, path: buildPath });
    });

    return breadcrumbs;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const handleRightClick = (e: React.MouseEvent, itemId?: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, itemId });
  };

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showDeleteModal) {
        setShowDeleteModal(null);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [showDeleteModal]);

  useEffect(() => {
    fetchItems();
  }, [currentPath]);

  return (
    <div className="h-screen bg-gray-50/50 flex flex-col">
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <nav className="flex items-center space-x-2 text-sm">
              {getBreadcrumbs().map((crumb, index) => (
                <div key={index} className="flex items-center">
                  {index > 0 && <span className="mx-2 text-gray-400">›</span>}
                  <button
                    onClick={() => setCurrentPath(crumb.path)}
                    className="text-gray-600 hover:text-blue-600 transition-colors font-medium"
                  >
                    {crumb.name}
                  </button>
                </div>
              ))}
            </nav>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowNewFolderInput(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                disabled={loading || fileOperationLoading}
              >
                <FolderPlus className="w-4 h-4" />
                <span>New Folder</span>
              </button>

              <label className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>Upload</span>
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={loading || fileOperationLoading}
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-800 text-xs mt-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {fileOperationLoading && !showDeleteModal && (
        <div className="fixed inset-0 bg-white/80 flex items-center justify-center z-50">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      )}

      <div className="flex-1 p-6 overflow-auto">
        {loading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-50">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
          </div>
        )}

        {showNewFolderInput && (
          <div className="mb-6 p-4 bg-white rounded-xl shadow-sm border border-gray-200/50">
            <div className="flex items-center space-x-3">
              <Folder className="w-5 h-5 text-blue-500" />
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name..."
                className="flex-1 px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateFolder();
                  if (e.key === "Escape") {
                    setShowNewFolderInput(false);
                    setNewFolderName("");
                  }
                }}
              />
              <button
                onClick={handleCreateFolder}
                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                disabled={loading || fileOperationLoading}
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setShowNewFolderInput(false);
                  setNewFolderName("");
                }}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {!loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="group relative p-4 bg-white/60 backdrop-blur-sm rounded-xl hover:bg-white/80 hover:shadow-md transition-all duration-200 cursor-pointer border border-white/20"
                onClick={() => handleItemClick(item)}
                onContextMenu={(e) => handleRightClick(e, item.id)}
              >
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRightClick(e, item.id);
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-col items-center text-center">
                  <div className="mb-3">
                    {item.type === "folder" ? (
                      <Folder className="w-8 h-8 text-blue-500" />
                    ) : (
                      getFileIcon(item.name)
                    )}
                  </div>

                  {editingItem === item.id ? (
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="text-xs font-medium text-gray-700 bg-white border border-blue-400 rounded px-1 py-0.5 text-center w-full"
                      autoFocus
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === "Enter")
                          handleRename(item.id, editingName, item);
                        if (e.key === "Escape") {
                          setEditingItem(null);
                          setEditingName("");
                        }
                      }}
                      onBlur={() => handleRename(item.id, editingName, item)}
                    />
                  ) : (
                    <div className="text-xs font-medium text-gray-700 truncate w-full leading-tight">
                      {item.name}
                    </div>
                  )}

                  {item.type === "file" && item.file_size && (
                    <div className="text-xs text-gray-500 mt-1">
                      {formatFileSize(item.file_size)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="text-center py-16">
            <Folder className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-500 mb-2">
              This folder is empty
            </h3>
            <p className="text-gray-400 text-sm">
              Create a folder or upload files to get started
            </p>
          </div>
        )}
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full mx-4">
            {fileOperationLoading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-sm text-gray-600">
                  Deleting {showDeleteModal.item.type}...
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center space-x-2 mb-4">
                  <Trash2 className="w-5 h-5 text-red-600" />
                  <h3 className="text-lg font-medium text-gray-900">
                    Delete {showDeleteModal.item.type}
                  </h3>
                </div>
                <p className="text-sm text-gray-600 mb-6">
                  Are you sure you want to delete "
                  <span className="font-medium">
                    {showDeleteModal.item.name}
                  </span>
                  "?
                  {showDeleteModal.item.type === "folder"
                    ? " This will also delete all files and subfolders inside. "
                    : " "}
                  This action cannot be undone.
                </p>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowDeleteModal(null)}
                    className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() =>
                      handleDelete(showDeleteModal.itemId, showDeleteModal.item)
                    }
                    className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {contextMenu && (
        <div
          className="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[140px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextMenu.itemId ? (
            <>
              <button
                onClick={() => {
                  const item = items.find((i) => i.id === contextMenu.itemId);
                  if (item) {
                    setEditingItem(item.id);
                    setEditingName(item.name);
                  }
                  setContextMenu(null);
                }}
                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
              >
                <Edit3 className="w-3 h-3" />
                <span>Rename</span>
              </button>
              <button
                onClick={() => {
                  const item = items.find((i) => i.id === contextMenu.itemId);
                  if (item) {
                    setShowDeleteModal({ itemId: item.id, item });
                  }
                  setContextMenu(null);
                }}
                className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                setShowNewFolderInput(true);
                setContextMenu(null);
              }}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
            >
              <FolderPlus className="w-3 h-3" />
              <span>New Folder</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default FileManager;
