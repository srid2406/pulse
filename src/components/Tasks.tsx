import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
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

  const addTask = () => {
    const newTask: Task = {
      id: crypto.randomUUID(),
      title: "New Task",
      description: "",
      assignedTo: null,
      deadline: null,
      subtasks: [],
      createdAt: new Date().toISOString(),
    };
    setColumns((prev) => ({
      ...prev,
      todo: [...prev.todo, newTask],
    }));
    setActiveTask(newTask);
  };

  const saveTask = async () => {
    if (!activeTask) return;

    const status = (Object.entries(columns).find(([_col, tasks]) =>
      tasks.some((t) => t.id === activeTask.id),
    )?.[0] || "todo") as keyof ColumnTasks;

    const { data, error } = await supabase
      .from("tasks")
      .upsert({
        id: activeTask.id,
        title: activeTask.title,
        description: activeTask.description,
        assigned_to: activeTask.assignedTo ?? null,
        deadline: activeTask.deadline,
        subtasks: activeTask.subtasks,
        status,
      })
      .select()
      .single();

    if (error) {
      console.error("Error saving task:", error.message);
      return;
    }

    // ✅ Update UI immediately
    setColumns((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((col) => {
        updated[col as keyof ColumnTasks] = updated[
          col as keyof ColumnTasks
        ].filter((t) => t.id !== activeTask.id);
      });
      updated[status].push({
        id: data.id,
        title: data.title,
        description: data.description,
        assignedTo: data.assigned_to,
        subtasks: data.subtasks || [],
        deadline: data.deadline,
        createdAt: data.created_at,
      });
      return updated;
    });

    setActiveTask(null);
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
    if (activeTask?.id === taskId) setActiveTask(null);
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
      return { text: "Today", color: "text-orange-600", bg: "bg-orange-50" };
    if (isOverdue)
      return {
        text: date.toLocaleDateString(),
        color: "text-red-600",
        bg: "bg-red-50",
      };
    return {
      text: date.toLocaleDateString(),
      color: "text-gray-600",
      bg: "bg-gray-50",
    };
  };

  const getColumnColors = (colId: string) => {
    switch (colId) {
      case "todo":
        return {
          bg: "bg-slate-50",
          accent: "border-t-blue-500",
          header: "text-blue-700",
        };
      case "inprogress":
        return {
          bg: "bg-amber-50",
          accent: "border-t-amber-500",
          header: "text-amber-700",
        };
      case "completed":
        return {
          bg: "bg-emerald-50",
          accent: "border-t-emerald-500",
          header: "text-emerald-700",
        };
      default:
        return {
          bg: "bg-gray-50",
          accent: "border-t-gray-500",
          header: "text-gray-700",
        };
    }
  };

  const getCompletedSubtasks = (subtasks: Subtask[]) => {
    const completed = subtasks.filter((st) => st.done).length;
    return { completed, total: subtasks.length };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
      {loading && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-50">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      )}
      <div className="max-w-7xl mx-auto">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {Object.entries(columns).map(([colId, tasks]) => {
              const colors = getColumnColors(colId);
              return (
                <Droppable droppableId={colId} key={colId}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`relative ${colors.bg} backdrop-blur-sm border border-white/20 rounded-2xl p-6 min-h-[600px] shadow-xl border-t-4 ${colors.accent} transition-all duration-200 ${
                        snapshot.isDraggingOver
                          ? "ring-2 ring-blue-300 ring-opacity-75 bg-blue-50/50"
                          : ""
                      }`}
                    >
                      {snapshot.isDraggingOver && (
                        <div className="absolute inset-4 border-2 border-dashed border-blue-400 rounded-xl bg-blue-50/30 backdrop-blur-sm z-10">
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg animate-bounce">
                              Drop task here
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-between items-center mb-6">
                        <div>
                          <h2
                            className={`text-xl font-bold ${colors.header} capitalize`}
                          >
                            {colId === "inprogress" ? "In Progress" : colId}
                          </h2>
                          <p className="text-sm text-gray-500 mt-1">
                            {tasks.length} tasks
                          </p>
                        </div>
                        {colId === "todo" && (
                          <button
                            onClick={addTask}
                            className="group relative p-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                          >
                            <Plus size={20} />
                            <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-400 rounded-full animate-pulse"></div>
                          </button>
                        )}
                      </div>

                      <div className="space-y-4 relative z-0 max-h-[calc(100vh-320px)] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
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
                                  className={`group relative bg-white rounded-xl border transition-all duration-200 ${
                                    snapshot.isDragging
                                      ? "shadow-2xl ring-4 ring-blue-400/30 scale-105 rotate-2 z-50 border-blue-300"
                                      : "border-gray-100 shadow-sm hover:shadow-md hover:scale-[1.01] hover:-translate-y-0.5 cursor-grab active:cursor-grabbing"
                                  }`}
                                >
                                  <div
                                    className={`absolute top-2 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-gray-300 rounded-full transition-all duration-200 ${
                                      snapshot.isDragging
                                        ? "bg-blue-400 w-10 opacity-80"
                                        : "group-hover:bg-gray-400"
                                    }`}
                                  />

                                  <div
                                    className="p-4 pt-6 cursor-pointer"
                                    onClick={(_e) => {
                                      if (!snapshot.isDragging) {
                                        setActiveTask(task);
                                      }
                                    }}
                                  >
                                    <div className="flex items-start justify-between mb-3">
                                      <h3 className="font-semibold text-gray-900 text-sm leading-tight flex-1 mr-2">
                                        {task.title}
                                      </h3>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deleteTask(task.id);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </div>

                                    {task.description && (
                                      <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                                        {task.description}
                                      </p>
                                    )}

                                    {task.subtasks.length > 0 && (
                                      <div className="mb-3">
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="text-xs text-gray-500">
                                            Progress
                                          </span>
                                          <span className="text-xs font-medium text-gray-700">
                                            {completed}/{total}
                                          </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                                          <div
                                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-1.5 rounded-full transition-all duration-500 ease-out"
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
                                            className={`flex items-center gap-1 px-2 py-1 rounded-md ${deadlineInfo.bg}`}
                                          >
                                            <Calendar size={12} />
                                            <span
                                              className={`text-xs font-medium ${deadlineInfo.color}`}
                                            >
                                              {deadlineInfo.text}
                                            </span>
                                          </div>
                                        )}
                                      </div>

                                      {assignedUser && (
                                        <div className="flex items-center gap-2">
                                          {assignedUser.avatar ? (
                                            <img
                                              src={assignedUser.avatar}
                                              alt="avatar"
                                              className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                                            />
                                          ) : (
                                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-sm">
                                              <User
                                                size={12}
                                                className="text-white"
                                              />
                                            </div>
                                          )}
                                          <span className="text-xs font-medium text-gray-600 max-w-20 truncate">
                                            {assignedUser.name?.split(" ")[0] ||
                                              "Assigned"}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {snapshot.isDragging && (
                                    <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-xl pointer-events-none animate-pulse" />
                                  )}
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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="bg-white border-b border-gray-100 p-6 relative">
                <button
                  onClick={() => setActiveTask(null)}
                  className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors duration-200"
                >
                  <X size={20} />
                </button>

                <input
                  type="text"
                  className="w-full text-2xl font-bold bg-transparent border-none outline-none placeholder-gray-400 text-gray-900 pr-12 focus:placeholder-gray-300"
                  value={activeTask.title}
                  onChange={(e) =>
                    setActiveTask({ ...activeTask, title: e.target.value })
                  }
                  placeholder="Task title..."
                />
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    className="w-full p-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all duration-200"
                    rows={3}
                    value={activeTask.description}
                    onChange={(e) =>
                      setActiveTask({
                        ...activeTask,
                        description: e.target.value,
                      })
                    }
                    placeholder="Add a description..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Assigned To
                    </label>
                    <div className="relative">
                      <select
                        className="w-full p-3 pr-10 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white transition-all duration-200"
                        value={activeTask.assignedTo ?? ""}
                        onChange={(e) =>
                          setActiveTask({
                            ...activeTask,
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
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                        <svg
                          className="w-5 h-5 text-gray-400"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    </div>
                    {(() => {
                      const assignedUser = getUserById(activeTask.assignedTo);
                      return assignedUser ? (
                        <div className="flex items-center gap-2 mt-2 p-2 bg-gray-50 rounded-lg">
                          {assignedUser.avatar ? (
                            <img
                              src={assignedUser.avatar}
                              alt="avatar"
                              className="w-6 h-6 rounded-full"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                              <User size={12} className="text-white" />
                            </div>
                          )}
                          <span className="text-sm text-gray-600">
                            {assignedUser.name}
                          </span>
                        </div>
                      ) : null;
                    })()}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Deadline
                    </label>
                    <input
                      type="date"
                      className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      value={activeTask.deadline || ""}
                      onChange={(e) =>
                        setActiveTask({
                          ...activeTask,
                          deadline: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Subtasks (
                    {activeTask.subtasks?.filter((st) => st.done).length || 0}/
                    {activeTask.subtasks?.length || 0})
                  </label>
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {activeTask.subtasks?.map((st, i) => (
                      <div
                        key={st.id}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl group hover:bg-gray-100 transition-colors duration-200"
                      >
                        <button
                          onClick={() => {
                            const newSubs = [...activeTask.subtasks];
                            newSubs[i].done = !newSubs[i].done;
                            setActiveTask({ ...activeTask, subtasks: newSubs });
                          }}
                          className="flex-shrink-0"
                        >
                          {st.done ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          ) : (
                            <Circle className="w-5 h-5 text-gray-400 hover:text-green-500 transition-colors duration-200" />
                          )}
                        </button>
                        <input
                          type="text"
                          className="flex-1 p-2 bg-transparent border-none outline-none text-gray-800 placeholder-gray-400"
                          value={st.title}
                          onChange={(e) => {
                            const newSubs = [...activeTask.subtasks];
                            newSubs[i].title = e.target.value;
                            setActiveTask({ ...activeTask, subtasks: newSubs });
                          }}
                          placeholder="Subtask title..."
                        />
                        <button
                          onClick={() => {
                            const newSubs = activeTask.subtasks.filter(
                              (_, idx) => idx !== i,
                            );
                            setActiveTask({ ...activeTask, subtasks: newSubs });
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() =>
                      setActiveTask({
                        ...activeTask,
                        subtasks: [
                          ...(activeTask.subtasks || []),
                          { id: Date.now().toString(), title: "", done: false },
                        ],
                      })
                    }
                    className="w-full mt-3 p-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <Plus size={16} />
                    Add subtask
                  </button>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => setActiveTask(null)}
                    className="px-6 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all duration-200 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveTask}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-200 font-medium"
                  >
                    Save Task
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
