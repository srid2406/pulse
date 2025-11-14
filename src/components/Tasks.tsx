import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { useTheme } from "../context/ThemeContext";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import {
  Plus,
  Trash2,
  Calendar,
  User,
  CheckCircle2,
  Circle,
  X,
} from "lucide-react";

type Subtask = { id: string; title: string; done: boolean };
type Task = {
  id: string;
  title: string;
  description: string;
  subtasks: Subtask[];
  assignedTo: string | null;
  deadline: string | null;
  createdAt: string;
};

type ColumnTasks = {
  todo: Task[];
  inprogress: Task[];
  completed: Task[];
};

const Tasks = () => {
  const { darkMode } = useTheme();
  const [columns, setColumns] = useState<ColumnTasks>({
    todo: [],
    inprogress: [],
    completed: [],
  });
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [allowedUsers, setAllowedUsers] = useState<
    { id: string; email: string; name?: string; avatar?: string | null }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Add scrollbar hide styles
    const style = document.createElement("style");
    style.textContent = `
      .scrollbar-hide::-webkit-scrollbar {
        display: none;
      }
      .scrollbar-hide {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  useEffect(() => {
    const fetchAllowedUsers = async () => {
      const { data, error } = await supabase
        .from("allowed_users")
        .select("id, email, raw_user_meta_data");
      if (error) {
        console.error("Error fetching allowed users:", error.message);
        return;
      }
      const mapped = data.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.raw_user_meta_data?.full_name ?? u.email,
        avatar: u.raw_user_meta_data?.avatar_url ?? null,
      }));
      setAllowedUsers(mapped);
    };
    fetchAllowedUsers();
  }, []);

  useEffect(() => {
    const fetchTasks = async () => {
      const { data, error } = await supabase.from("tasks").select("*");
      if (error) {
        console.error("Error fetching tasks:", error.message);
        return;
      }
      const mapped = { todo: [], inprogress: [], completed: [] } as ColumnTasks;
      data.forEach((t: any) => {
        const task: Task = {
          id: t.id,
          title: t.title,
          description: t.description,
          assignedTo: t.assigned_to,
          subtasks: t.subtasks || [],
          deadline: t.deadline,
          createdAt: t.created_at,
        };
        mapped[t.status as keyof ColumnTasks].push(task);
      });
      setColumns(mapped);
      setLoading(false);
    };
    fetchTasks();
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && activeTask) {
        setActiveTask(null);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [activeTask]);

  useEffect(() => {
    if (!activeTask) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveTaskToDB(activeTask);
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [activeTask]);

  const saveTaskToDB = async (task: Task) => {
    const status = (Object.entries(columns).find(([_col, tasks]) =>
      tasks.some((t) => t.id === task.id),
    )?.[0] || "todo") as keyof ColumnTasks;

    const { error } = await supabase.from("tasks").upsert({
      id: task.id,
      title: task.title,
      description: task.description,
      assigned_to: task.assignedTo ?? null,
      deadline: task.deadline,
      subtasks: task.subtasks,
      status,
    });

    if (error) {
      console.error("Error saving task:", error.message);
    }
  };

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination } = result;

    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const sourceCol = source.droppableId as keyof ColumnTasks;
    const destCol = destination.droppableId as keyof ColumnTasks;

    const movedTask = columns[sourceCol][source.index];

    const newColumns = { ...columns };

    if (sourceCol === destCol) {
      const newTasks = Array.from(columns[sourceCol]);
      newTasks.splice(source.index, 1);
      newTasks.splice(destination.index, 0, movedTask);
      newColumns[sourceCol] = newTasks;
    } else {
      const sourceTasks = Array.from(columns[sourceCol]);
      const destTasks = Array.from(columns[destCol]);

      sourceTasks.splice(source.index, 1);
      destTasks.splice(destination.index, 0, movedTask);

      newColumns[sourceCol] = sourceTasks;
      newColumns[destCol] = destTasks;
    }

    setColumns(newColumns);

    try {
      await supabase
        .from("tasks")
        .update({ status: destCol })
        .eq("id", movedTask.id);
    } catch (error) {
      console.error("Error updating task status:", error);
      setColumns(columns);
    }
  };

  const addTask = async () => {
    const newTask: Task = {
      id: crypto.randomUUID(),
      title: "New Task",
      description: "",
      assignedTo: null,
      deadline: null,
      subtasks: [],
      createdAt: new Date().toISOString(),
    };

    const { error } = await supabase.from("tasks").insert({
      id: newTask.id,
      title: newTask.title,
      description: newTask.description,
      assigned_to: newTask.assignedTo,
      deadline: newTask.deadline,
      subtasks: newTask.subtasks,
      status: "todo",
    });

    if (error) {
      console.error("Error creating task:", error.message);
      return;
    }

    setColumns((prev) => ({
      ...prev,
      todo: [...prev.todo, newTask],
    }));

    setActiveTask(newTask);
  };

  const deleteTask = async (taskId: string) => {
    await supabase.from("tasks").delete().eq("id", taskId);
    setColumns((prev) => {
      const updated: ColumnTasks = { ...prev };
      (Object.keys(updated) as (keyof ColumnTasks)[]).forEach((col) => {
        updated[col] = updated[col].filter((t) => t.id !== taskId);
      });
      return updated;
    });
    if (activeTask?.id === taskId) {
      setActiveTask(null);
    }
  };

  const updateActiveTask = (updates: Partial<Task>) => {
    if (!activeTask) return;

    const updatedTask = { ...activeTask, ...updates };
    setActiveTask(updatedTask);

    setColumns((prev) => {
      const updated = { ...prev };
      (Object.keys(updated) as (keyof ColumnTasks)[]).forEach((col) => {
        updated[col] = updated[col].map((t) =>
          t.id === updatedTask.id ? updatedTask : t,
        );
      });
      return updated;
    });
  };

  const getUserById = (userId: string | null) => {
    if (!userId) return null;
    return allowedUsers.find((u) => u.id === userId);
  };

  const formatDeadline = (deadline: string) => {
    const date = new Date(deadline);
    const now = new Date();
    const isOverdue = date < now;
    const isToday = date.toDateString() === now.toDateString();

    if (isToday)
      return {
        text: "Today",
        color: darkMode ? "text-orange-400" : "text-orange-600",
        bg: darkMode
          ? "bg-orange-500/10 border-orange-500/20"
          : "bg-orange-50 border-orange-200",
      };
    if (isOverdue)
      return {
        text: date.toLocaleDateString(),
        color: darkMode ? "text-red-400" : "text-red-600",
        bg: darkMode
          ? "bg-red-500/10 border-red-500/20"
          : "bg-red-50 border-red-200",
      };
    return {
      text: date.toLocaleDateString(),
      color: darkMode ? "text-zinc-400" : "text-zinc-600",
      bg: darkMode
        ? "bg-zinc-800 border-zinc-700"
        : "bg-zinc-50 border-zinc-200",
    };
  };

  const getColumnColors = (colId: string) => {
    if (darkMode) {
      switch (colId) {
        case "todo":
          return {
            bg: "bg-zinc-900",
            border: "border-zinc-800",
            header: "text-white",
            badge: "bg-zinc-800 text-zinc-300",
          };
        case "inprogress":
          return {
            bg: "bg-zinc-900",
            border: "border-zinc-800",
            header: "text-white",
            badge: "bg-blue-500/10 text-blue-400",
          };
        case "completed":
          return {
            bg: "bg-zinc-900",
            border: "border-zinc-800",
            header: "text-white",
            badge: "bg-green-500/10 text-green-400",
          };
        default:
          return {
            bg: "bg-zinc-900",
            border: "border-zinc-800",
            header: "text-white",
            badge: "bg-zinc-800 text-zinc-300",
          };
      }
    } else {
      switch (colId) {
        case "todo":
          return {
            bg: "bg-white",
            border: "border-gray-200",
            header: "text-gray-900",
            badge: "bg-gray-100 text-gray-600",
          };
        case "inprogress":
          return {
            bg: "bg-white",
            border: "border-gray-200",
            header: "text-gray-900",
            badge: "bg-blue-50 text-blue-600",
          };
        case "completed":
          return {
            bg: "bg-white",
            border: "border-gray-200",
            header: "text-gray-900",
            badge: "bg-green-50 text-green-600",
          };
        default:
          return {
            bg: "bg-white",
            border: "border-gray-200",
            header: "text-gray-900",
            badge: "bg-gray-100 text-gray-600",
          };
      }
    }
  };

  const getCompletedSubtasks = (subtasks: Subtask[]) => {
    const completed = subtasks.filter((st) => st.done).length;
    return { completed, total: subtasks.length };
  };

  return (
    <div className={`h-full p-6 ${darkMode ? "bg-black" : "bg-white"}`}>
      {loading && (
        <div
          className={`absolute inset-0 flex items-center justify-center z-50 ${darkMode ? "bg-black/80" : "bg-white/80"}`}
        >
          <div
            className={`animate-spin rounded-full h-8 w-8 border-2 ${darkMode ? "border-white border-t-transparent" : "border-black border-t-transparent"}`}
          ></div>
        </div>
      )}
      <div className="max-w-7xl mx-auto h-full">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
            {Object.entries(columns).map(([colId, tasks]) => {
              const colors = getColumnColors(colId);
              return (
                <Droppable droppableId={colId} key={colId}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`relative ${colors.bg} border ${colors.border} rounded-lg p-4 h-full flex flex-col ${
                        snapshot.isDraggingOver
                          ? darkMode
                            ? "ring-1 ring-white bg-zinc-800"
                            : "ring-1 ring-black bg-gray-50"
                          : ""
                      }`}
                    >
                      <div className="flex justify-between items-center mb-4">
                        <div>
                          <h2
                            className={`text-sm font-semibold ${colors.header} capitalize`}
                          >
                            {colId === "inprogress" ? "In Progress" : colId}
                          </h2>
                          <p
                            className={`text-xs mt-1 inline-flex items-center px-2 py-0.5 rounded-md ${colors.badge}`}
                          >
                            {tasks.length}{" "}
                            {tasks.length === 1 ? "task" : "tasks"}
                          </p>
                        </div>
                        {colId === "todo" && (
                          <button
                            onClick={addTask}
                            className={`p-2 rounded-md transition-all duration-200 ${
                              darkMode
                                ? "bg-white text-black hover:bg-zinc-200"
                                : "bg-black text-white hover:bg-gray-800"
                            }`}
                          >
                            <Plus size={16} />
                          </button>
                        )}
                      </div>

                      <div className="space-y-2 flex-1 overflow-y-auto scrollbar-hide pr-1">
                        {tasks.map((task, index) => {
                          const assignedUser = getUserById(task.assignedTo);
                          const { completed, total } = getCompletedSubtasks(
                            task.subtasks,
                          );
                          const deadlineInfo = task.deadline
                            ? formatDeadline(task.deadline)
                            : null;

                          return (
                            <Draggable
                              key={task.id}
                              draggableId={task.id}
                              index={index}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`group relative rounded-lg border ${
                                    snapshot.isDragging
                                      ? darkMode
                                        ? "shadow-xl border-white bg-zinc-800 z-[9999]"
                                        : "shadow-xl border-black bg-white z-[9999]"
                                      : darkMode
                                        ? "border-zinc-800 hover:border-zinc-700 cursor-grab active:cursor-grabbing bg-zinc-900"
                                        : "border-gray-200 hover:border-gray-300 cursor-grab active:cursor-grabbing bg-white"
                                  }`}
                                  style={{
                                    ...provided.draggableProps.style,
                                    zIndex: snapshot.isDragging ? 9999 : "auto",
                                  }}
                                >
                                  <div
                                    className="p-3 cursor-pointer"
                                    onClick={() => {
                                      if (!snapshot.isDragging) {
                                        setActiveTask(task);
                                      }
                                    }}
                                  >
                                    <div className="flex items-start justify-between mb-2">
                                      <h3
                                        className={`font-medium text-sm leading-tight flex-1 mr-2 ${darkMode ? "text-white" : "text-gray-900"}`}
                                      >
                                        {task.title}
                                      </h3>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deleteTask(task.id);
                                        }}
                                        className={`opacity-0 group-hover:opacity-100 p-1 rounded transition-all duration-200 ${
                                          darkMode
                                            ? "text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                                            : "text-gray-400 hover:text-red-600 hover:bg-red-50"
                                        }`}
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>

                                    {task.description && (
                                      <p
                                        className={`text-xs mb-2 line-clamp-2 ${darkMode ? "text-zinc-400" : "text-gray-600"}`}
                                      >
                                        {task.description}
                                      </p>
                                    )}

                                    {task.subtasks.length > 0 && (
                                      <div className="mb-2">
                                        <div className="flex items-center justify-between mb-1">
                                          <span
                                            className={`text-xs ${darkMode ? "text-zinc-500" : "text-gray-500"}`}
                                          >
                                            Progress
                                          </span>
                                          <span
                                            className={`text-xs font-medium ${darkMode ? "text-zinc-300" : "text-gray-700"}`}
                                          >
                                            {completed}/{total}
                                          </span>
                                        </div>
                                        <div
                                          className={`w-full rounded-full h-1 ${darkMode ? "bg-zinc-800" : "bg-gray-100"}`}
                                        >
                                          <div
                                            className={`h-1 rounded-full transition-all duration-500 ${darkMode ? "bg-white" : "bg-black"}`}
                                            style={{
                                              width: `${total > 0 ? (completed / total) * 100 : 0}%`,
                                            }}
                                          ></div>
                                        </div>
                                      </div>
                                    )}

                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        {deadlineInfo && (
                                          <div
                                            className={`flex items-center gap-1 px-2 py-1 rounded text-xs border ${deadlineInfo.bg}`}
                                          >
                                            <Calendar size={10} />
                                            <span
                                              className={`font-medium ${deadlineInfo.color}`}
                                            >
                                              {deadlineInfo.text}
                                            </span>
                                          </div>
                                        )}
                                      </div>

                                      {assignedUser && (
                                        <div className="flex items-center gap-1.5">
                                          {assignedUser.avatar ? (
                                            <img
                                              src={assignedUser.avatar}
                                              alt="avatar"
                                              className={`w-5 h-5 rounded-full border ${darkMode ? "border-zinc-700" : "border-gray-200"}`}
                                            />
                                          ) : (
                                            <div
                                              className={`w-5 h-5 rounded-full flex items-center justify-center ${darkMode ? "bg-white" : "bg-black"}`}
                                            >
                                              <User
                                                size={10}
                                                className={
                                                  darkMode
                                                    ? "text-black"
                                                    : "text-white"
                                                }
                                              />
                                            </div>
                                          )}
                                          <span
                                            className={`text-xs font-medium max-w-16 truncate ${darkMode ? "text-zinc-400" : "text-gray-600"}`}
                                          >
                                            {assignedUser.name?.split(" ")[0] ||
                                              "Assigned"}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                      </div>
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              );
            })}
          </div>
        </DragDropContext>

        {activeTask && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
            <div
              className={`w-full max-w-2xl rounded-xl shadow-2xl relative overflow-hidden ${darkMode ? "bg-zinc-900 border border-zinc-800" : "bg-white border border-gray-200"}`}
            >
              <div
                className={`border-b p-5 relative ${darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"}`}
              >
                <button
                  onClick={() => setActiveTask(null)}
                  className={`absolute top-4 right-4 p-1.5 rounded-md transition-colors duration-200 ${
                    darkMode
                      ? "hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                      : "hover:bg-gray-100 text-gray-500 hover:text-gray-900"
                  }`}
                >
                  <X size={18} />
                </button>

                <input
                  type="text"
                  className={`w-full text-xl font-semibold bg-transparent border-none outline-none pr-12 ${
                    darkMode
                      ? "placeholder-zinc-600 text-white"
                      : "placeholder-gray-400 text-gray-900"
                  }`}
                  value={activeTask.title}
                  onChange={(e) => updateActiveTask({ title: e.target.value })}
                  placeholder="Task title..."
                />
              </div>

              <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
                <div>
                  <label
                    className={`block text-xs font-semibold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}
                  >
                    Description
                  </label>
                  <textarea
                    className={`w-full p-3 rounded-md border focus:outline-none focus:ring-2 resize-none transition-all duration-200 text-sm ${
                      darkMode
                        ? "bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 focus:ring-white focus:border-transparent"
                        : "bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-black focus:border-transparent"
                    }`}
                    rows={3}
                    value={activeTask.description}
                    onChange={(e) =>
                      updateActiveTask({ description: e.target.value })
                    }
                    placeholder="Add a description..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label
                      className={`block text-xs font-semibold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}
                    >
                      Assigned To
                    </label>
                    <select
                      className={`w-full p-2.5 rounded-md border focus:outline-none focus:ring-2 appearance-none transition-all duration-200 text-sm ${
                        darkMode
                          ? "bg-zinc-800 border-zinc-700 text-white focus:ring-white focus:border-transparent"
                          : "bg-white border-gray-200 text-gray-900 focus:ring-black focus:border-transparent"
                      }`}
                      value={activeTask.assignedTo ?? ""}
                      onChange={(e) =>
                        updateActiveTask({
                          assignedTo:
                            e.target.value === "" ? null : e.target.value,
                        })
                      }
                    >
                      <option value="">Unassigned</option>
                      {allowedUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name || u.email}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      className={`block text-xs font-semibold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}
                    >
                      Deadline
                    </label>
                    <input
                      type="date"
                      className={`w-full p-2.5 rounded-md border focus:outline-none focus:ring-2 transition-all duration-200 text-sm ${
                        darkMode
                          ? "bg-zinc-800 border-zinc-700 text-white focus:ring-white focus:border-transparent [color-scheme:dark]"
                          : "bg-white border-gray-200 text-gray-900 focus:ring-black focus:border-transparent [color-scheme:light]"
                      }`}
                      value={activeTask.deadline || ""}
                      onChange={(e) =>
                        updateActiveTask({ deadline: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div>
                  <label
                    className={`block text-xs font-semibold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}
                  >
                    Subtasks (
                    {activeTask.subtasks?.filter((st) => st.done).length || 0}/
                    {activeTask.subtasks?.length || 0})
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {activeTask.subtasks?.map((st, i) => (
                      <div
                        key={st.id}
                        className={`flex items-center gap-2 p-2.5 rounded-md group transition-colors duration-200 ${
                          darkMode
                            ? "bg-zinc-800 hover:bg-zinc-700"
                            : "bg-gray-50 hover:bg-gray-100"
                        }`}
                      >
                        <button
                          onClick={() => {
                            const newSubs = [...activeTask.subtasks];
                            newSubs[i].done = !newSubs[i].done;
                            updateActiveTask({ subtasks: newSubs });
                          }}
                          className="flex-shrink-0"
                        >
                          {st.done ? (
                            <CheckCircle2
                              className={`w-4 h-4 ${darkMode ? "text-green-400" : "text-green-600"}`}
                            />
                          ) : (
                            <Circle
                              className={`w-4 h-4 transition-colors duration-200 ${
                                darkMode
                                  ? "text-zinc-600 hover:text-zinc-300"
                                  : "text-gray-400 hover:text-gray-900"
                              }`}
                            />
                          )}
                        </button>
                        <input
                          type="text"
                          className={`flex-1 p-1.5 bg-transparent border-none outline-none text-sm ${
                            darkMode
                              ? "text-white placeholder-zinc-600"
                              : "text-gray-900 placeholder-gray-400"
                          }`}
                          value={st.title}
                          onChange={(e) => {
                            const newSubs = [...activeTask.subtasks];
                            newSubs[i].title = e.target.value;
                            updateActiveTask({ subtasks: newSubs });
                          }}
                          placeholder="Subtask title..."
                        />
                        <button
                          onClick={() => {
                            const newSubs = activeTask.subtasks.filter(
                              (_, idx) => idx !== i,
                            );
                            updateActiveTask({ subtasks: newSubs });
                          }}
                          className={`opacity-0 group-hover:opacity-100 p-1 rounded transition-all duration-200 ${
                            darkMode
                              ? "text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                              : "text-gray-400 hover:text-red-600 hover:bg-red-50"
                          }`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() =>
                      updateActiveTask({
                        subtasks: [
                          ...(activeTask.subtasks || []),
                          { id: Date.now().toString(), title: "", done: false },
                        ],
                      })
                    }
                    className={`w-full mt-2 p-2.5 rounded-md border-2 border-dashed transition-all duration-200 flex items-center justify-center gap-2 text-sm ${
                      darkMode
                        ? "border-zinc-700 text-zinc-400 hover:border-white hover:text-white"
                        : "border-gray-200 text-gray-500 hover:border-black hover:text-black"
                    }`}
                  >
                    <Plus size={14} />
                    Add subtask
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Tasks;
