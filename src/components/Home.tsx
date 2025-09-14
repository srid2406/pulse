import { useState, useEffect } from "react";
import {
  MessageCircle,
  FileText,
  CheckSquare,
  StickyNote,
  NotebookTabsIcon,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

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
      color: "bg-blue-500",
      description: "Tasks in progress",
    },
    {
      title: "Team Messages",
      value: loading ? "..." : stats.teamMessages.toString(),
      change: "",
      icon: MessageCircle,
      color: "bg-green-500",
      description: "Messages today",
    },
    {
      title: "Documents",
      value: loading ? "..." : stats.documents.toString(),
      change: "",
      icon: FileText,
      color: "bg-purple-500",
      description: "Files & folders",
    },
    {
      title: "Notes",
      value: loading ? "..." : stats.notes.toString(),
      change: "",
      icon: NotebookTabsIcon,
      color: "bg-yellow-500",
      description: "Meet Notes",
    },
  ];

  if (!currentUser) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading user data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickStatsData.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {stat.value}
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    {stat.description}
                  </p>
                </div>
                <div
                  className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Recent Activity
            </h3>
            <button
              onClick={fetchDashboardData}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Refresh
            </button>
          </div>
          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => {
                const Icon = activity.icon;
                return (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Icon className="w-4 h-4 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-900 font-medium">
                        {activity.action}
                      </p>
                      <p className="text-gray-500 text-sm">{activity.time}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-500 text-center py-4">
                No recent activity
              </p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              My Upcoming Tasks
            </h3>
          </div>
          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : upcomingTasks.length > 0 ? (
              upcomingTasks.map((task, index) => {
                const priority = task.deadline
                  ? getPriorityFromDeadline(task.deadline)
                  : "low";
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="text-gray-900 font-medium">{task.title}</p>
                      <p className="text-gray-500 text-sm">
                        {task.deadline
                          ? formatDeadline(task.deadline)
                          : "No deadline"}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          task.status === "todo"
                            ? "bg-gray-100 text-gray-700"
                            : task.status === "inprogress"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-green-100 text-green-700"
                        }`}
                      >
                        {task.status === "inprogress"
                          ? "In Progress"
                          : task.status.toUpperCase()}
                      </span>
                      {task.deadline && (
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            priority === "high"
                              ? "bg-red-100 text-red-700"
                              : priority === "medium"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-green-100 text-green-700"
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
              <p className="text-gray-500 text-center py-4">
                No upcoming tasks assigned to you
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
