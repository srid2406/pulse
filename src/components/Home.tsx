import { useState, useEffect } from "react";
import {
  MessageCircle,
  FileText,
  CheckSquare,
  StickyNote,
  BookOpen,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useTheme } from "../context/ThemeContext";

interface Stats {
  activeTasks: number;
  teamMessages: number;
  documents: number;
  notes: number;
}

interface Task {
  id: string;
  title: string;
  deadline: string | null;
  status: "todo" | "inprogress" | "completed";
  created_at: string;
}

interface ActivityItem {
  action: string;
  time: string;
  rawTime: string;
  icon: any;
  type: "message" | "task" | "note" | "document";
}

export default function Home() {
  const { darkMode } = useTheme();
  const [stats, setStats] = useState<Stats>({
    activeTasks: 0,
    teamMessages: 0,
    documents: 0,
    notes: 0,
  });
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchDashboardData();
    }
  }, [currentUser]);

  const getCurrentUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const fetchDashboardData = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);

      const { data: userTasks } = await supabase
        .from("tasks")
        .select("*")
        .eq("assigned_to", currentUser.id);

      const activeTasks =
        userTasks?.filter((task) => task.status === "inprogress").length || 0;

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: todayMessages } = await supabase
        .from("messages")
        .select("id")
        .gte("created_at", todayStart.toISOString());

      const { count: documentsCount } = await supabase
        .from("file_items")
        .select("*", { count: "exact", head: true });

      const { count: notesCount } = await supabase
        .from("meet_notes")
        .select("*", { count: "exact", head: true });

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const { data: recentMessages } = await supabase
        .from("messages")
        .select("content, name, created_at")
        .gte("created_at", yesterday.toISOString())
        .order("created_at", { ascending: false })
        .limit(5);

      const { data: recentTasks } = await supabase
        .from("tasks")
        .select("title, created_at")
        .gte("created_at", yesterday.toISOString())
        .order("created_at", { ascending: false })
        .limit(5);

      const { data: recentDocs } = await supabase
        .from("file_items")
        .select("name, type, created_at")
        .gte("created_at", yesterday.toISOString())
        .order("created_at", { ascending: false })
        .limit(5);

      const { data: recentNotes } = await supabase
        .from("meet_notes")
        .select("name, created_at, created_by")
        .gte("created_at", yesterday.toISOString())
        .order("created_at", { ascending: false })
        .limit(5);

      console.log(recentNotes);

      const activities: ActivityItem[] = [];

      recentMessages?.forEach((message) => {
        activities.push({
          action: `New message: "${message.content.substring(0, 30)}${message.content.length > 30 ? "..." : ""}"`,
          time: formatTimeAgo(message.created_at),
          rawTime: message.created_at,
          icon: MessageCircle,
          type: "message",
        });
      });

      recentTasks?.forEach((task) => {
        activities.push({
          action: `Task "${task.title}" was created`,
          time: formatTimeAgo(task.created_at),
          rawTime: task.created_at,
          icon: CheckSquare,
          type: "task",
        });
      });

      recentDocs?.forEach((doc) => {
        activities.push({
          action: `New ${doc.type}: "${doc.name}"`,
          time: formatTimeAgo(doc.created_at),
          rawTime: doc.created_at,
          icon: FileText,
          type: "document",
        });
      });

      recentNotes?.forEach((note) => {
        activities.push({
          action: `New note "${note.name}" created by ${note.created_by}`,
          time: formatTimeAgo(note.created_at),
          rawTime: note.created_at,
          icon: StickyNote,
          type: "note",
        });
      });

      activities.sort(
        (a, b) => new Date(b.rawTime).getTime() - new Date(a.rawTime).getTime(),
      );

      setRecentActivity(activities.slice(0, 5));

      const { data: upcomingUserTasks } = await supabase
        .from("tasks")
        .select("id, title, deadline, status, created_at")
        .eq("assigned_to", currentUser.id)
        .neq("status", "completed")
        .not("deadline", "is", null)
        .order("deadline", { ascending: true })
        .limit(4);

      setStats({
        activeTasks,
        teamMessages: todayMessages?.length || 0,
        documents: documentsCount ?? 0,
        notes: notesCount ?? 0,
      });

      setUpcomingTasks(upcomingUserTasks || []);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const messageTime = new Date(timestamp);

    if (isNaN(messageTime.getTime())) return "Unknown time";

    const diffInMinutes = Math.floor(
      (now.getTime() - messageTime.getTime()) / (1000 * 60),
    );

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes} mins ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hours ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} days ago`;
  };

  const formatDeadline = (deadline: string): string => {
    const today = new Date().toISOString().split("T")[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    if (deadline === today) return "Today";
    if (deadline === tomorrowStr) return "Tomorrow";

    const deadlineDate = new Date(deadline);
    return deadlineDate.toLocaleDateString();
  };

  const getPriorityFromDeadline = (
    deadline: string,
  ): "high" | "medium" | "low" => {
    const today = new Date().toISOString().split("T")[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    if (deadline === today) return "high";
    if (deadline === tomorrowStr) return "medium";
    return "low";
  };

  const quickStatsData = [
    {
      title: "Active Tasks",
      value: loading ? "..." : stats.activeTasks.toString(),
      change: "",
      icon: CheckSquare,
      color: darkMode ? "bg-white" : "bg-black",
      description: "Tasks in progress",
    },
    {
      title: "Team Messages",
      value: loading ? "..." : stats.teamMessages.toString(),
      change: "",
      icon: MessageCircle,
      color: darkMode ? "bg-white" : "bg-black",
      description: "Messages today",
    },
    {
      title: "Documents",
      value: loading ? "..." : stats.documents.toString(),
      change: "",
      icon: FileText,
      color: darkMode ? "bg-white" : "bg-black",
      description: "Files & folders",
    },
    {
      title: "Notes",
      value: loading ? "..." : stats.notes.toString(),
      change: "",
      icon: BookOpen,
      color: darkMode ? "bg-white" : "bg-black",
      description: "Meet Notes",
    },
  ];

  if (!currentUser) {
    return (
      <div
        className={`p-8 flex items-center justify-center min-h-screen ${darkMode ? "bg-black" : "bg-white"}`}
      >
        <div className="text-center">
          <div
            className={`animate-spin rounded-full h-8 w-8 border-2 ${darkMode ? "border-white border-t-transparent" : "border-black border-t-transparent"} mx-auto mb-4`}
          ></div>
          <p
            className={`${darkMode ? "text-zinc-400" : "text-gray-600"} text-sm`}
          >
            Loading user data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`p-8 space-y-6 ${darkMode ? "bg-black" : "bg-white"} min-h-screen`}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStatsData.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className={`${darkMode ? "bg-zinc-900 border-zinc-800 hover:border-zinc-700" : "bg-white border-gray-200 hover:border-gray-300"} rounded-lg p-6 shadow-sm border transition-colors`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className={`${darkMode ? "text-zinc-400" : "text-gray-600"} text-xs font-medium uppercase tracking-wider`}
                  >
                    {stat.title}
                  </p>
                  <p
                    className={`text-3xl font-semibold ${darkMode ? "text-white" : "text-gray-900"} mt-2`}
                  >
                    {stat.value}
                  </p>
                  <p
                    className={`${darkMode ? "text-zinc-500" : "text-gray-500"} text-xs mt-1`}
                  >
                    {stat.description}
                  </p>
                </div>
                <div
                  className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center`}
                >
                  <Icon
                    className={`w-5 h-5 ${darkMode ? "text-black" : "text-white"}`}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          className={`${darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"} rounded-lg p-6 shadow-sm border`}
        >
          <div className="flex items-center justify-between mb-6">
            <h3
              className={`text-base font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}
            >
              Recent Activity
            </h3>
            <button
              onClick={fetchDashboardData}
              className={`${darkMode ? "text-zinc-400 hover:text-white" : "text-gray-600 hover:text-black"} text-sm font-medium transition-colors cursor-pointer`}
            >
              Refresh
            </button>
          </div>
          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div
                  className={`animate-spin rounded-full h-6 w-6 border-2 ${darkMode ? "border-white border-t-transparent" : "border-black border-t-transparent"}`}
                ></div>
              </div>
            ) : recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => {
                const Icon = activity.icon;
                return (
                  <div
                    key={index}
                    className={`flex items-start space-x-3 pb-4 border-b ${darkMode ? "border-zinc-800" : "border-gray-100"} last:border-0 last:pb-0`}
                  >
                    <div
                      className={`w-8 h-8 ${darkMode ? "bg-zinc-800" : "bg-gray-100"} rounded-lg flex items-center justify-center flex-shrink-0`}
                    >
                      <Icon
                        className={`w-4 h-4 ${darkMode ? "text-zinc-400" : "text-gray-700"}`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`${darkMode ? "text-white" : "text-gray-900"} text-sm font-medium`}
                      >
                        {activity.action}
                      </p>
                      <p
                        className={`${darkMode ? "text-zinc-500" : "text-gray-500"} text-xs mt-0.5`}
                      >
                        {activity.time}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p
                className={`${darkMode ? "text-zinc-500" : "text-gray-500"} text-center py-8 text-sm`}
              >
                No recent activity
              </p>
            )}
          </div>
        </div>

        <div
          className={`${darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"} rounded-lg p-6 shadow-sm border`}
        >
          <div className="flex items-center justify-between mb-6">
            <h3
              className={`text-base font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}
            >
              My Upcoming Tasks
            </h3>
          </div>
          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div
                  className={`animate-spin rounded-full h-6 w-6 border-2 ${darkMode ? "border-white border-t-transparent" : "border-black border-t-transparent"}`}
                ></div>
              </div>
            ) : upcomingTasks.length > 0 ? (
              upcomingTasks.map((task, index) => {
                const priority = task.deadline
                  ? getPriorityFromDeadline(task.deadline)
                  : "low";
                return (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-4 ${darkMode ? "bg-zinc-800 border-zinc-700 hover:border-zinc-600" : "bg-gray-50 border-gray-100 hover:border-gray-200"} rounded-lg border transition-colors`}
                  >
                    <div className="flex-1 min-w-0 mr-4">
                      <p
                        className={`${darkMode ? "text-white" : "text-gray-900"} text-sm font-medium truncate`}
                      >
                        {task.title}
                      </p>
                      <p
                        className={`${darkMode ? "text-zinc-500" : "text-gray-500"} text-xs mt-1`}
                      >
                        {task.deadline
                          ? formatDeadline(task.deadline)
                          : "No deadline"}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          task.status === "todo"
                            ? darkMode
                              ? "bg-zinc-700 text-zinc-300"
                              : "bg-gray-200 text-gray-700"
                            : task.status === "inprogress"
                              ? darkMode
                                ? "bg-white text-black"
                                : "bg-black text-white"
                              : darkMode
                                ? "bg-zinc-700 text-zinc-300"
                                : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {task.status === "inprogress"
                          ? "In Progress"
                          : task.status === "todo"
                            ? "To Do"
                            : "Done"}
                      </span>
                      {task.deadline && (
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            priority === "high"
                              ? darkMode
                                ? "bg-white text-black"
                                : "bg-gray-900 text-white"
                              : priority === "medium"
                                ? darkMode
                                  ? "bg-zinc-700 text-zinc-300"
                                  : "bg-gray-300 text-gray-800"
                                : darkMode
                                  ? "bg-zinc-800 text-zinc-400"
                                  : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {priority}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p
                className={`${darkMode ? "text-zinc-500" : "text-gray-500"} text-center py-8 text-sm`}
              >
                No upcoming tasks assigned to you
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
