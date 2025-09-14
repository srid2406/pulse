import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Home,
  MessageSquare,
  FileText,
  Calendar,
  ChevronLeft,
  Presentation,
  ListChecks,
  HardDrive,
  LogOut,
  Activity,
  Sun,
  Moon,
  // Bell,
  // Settings,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { usePresence } from "../context/PresenceContext";
import { getFallbackAvatar } from "../utils/avatar";

const Layout = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const { signOut } = useAuth();
  const { onlineUsers } = usePresence();
  const location = useLocation();

  const routeTitles: Record<string, string> = {
    "/": "Dashboard",
    "/chat": "Chat",
    "/docs": "Docs",
    "/notes": "Meet Notes",
    "/calendar": "Calendar",
    "/whiteboard": "Whiteboard",
    "/tasks": "Tasks",
  };

  const currentTitle = routeTitles[location.pathname] || "Pulse";

  const sidebarBg = darkMode
    ? "bg-slate-900/95 border-slate-800/50"
    : "bg-white/95 border-gray-200/50";
  const sidebarText = darkMode ? "text-slate-100" : "text-gray-700";
  const navbarBg = darkMode
    ? "bg-slate-900/80 border-slate-700/30"
    : "bg-white/80 border-gray-200/30";
  const mainBg = darkMode
    ? "bg-slate-950"
    : "bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20";
  const hoverActive = darkMode
    ? {
        active:
          "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/25",
        hover: "hover:bg-slate-800 hover:text-slate-200",
      }
    : {
        active:
          "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25",
        hover: "hover:bg-gray-100 hover:text-gray-900",
      };

  const navigationItems = [
    {
      to: "/",
      icon: Home,
      label: "Dashboard",
      gradient: "from-blue-500 to-blue-600",
    },
    {
      to: "/chat",
      icon: MessageSquare,
      label: "Chat",
      gradient: "from-green-500 to-green-600",
    },
    {
      to: "/docs",
      icon: HardDrive,
      label: "Docs",
      gradient: "from-purple-500 to-purple-600",
    },
    {
      to: "/notes",
      icon: FileText,
      label: "Meet Notes",
      gradient: "from-orange-500 to-orange-600",
    },
    {
      to: "/calendar",
      icon: Calendar,
      label: "Calendar",
      gradient: "from-red-500 to-red-600",
    },
    {
      to: "/whiteboard",
      icon: Presentation,
      label: "Whiteboard",
      gradient: "from-pink-500 to-pink-600",
    },
    {
      to: "/tasks",
      icon: ListChecks,
      label: "Tasks",
      gradient: "from-cyan-500 to-cyan-600",
    },
  ];

  return (
    <div className={`flex h-screen overflow-hidden ${mainBg}`}>
      <div
        className={`${
          isCollapsed ? "w-20" : "w-72"
        } ${sidebarBg} ${sidebarText} flex flex-col transition-all duration-300 shadow-2xl border-r relative backdrop-blur-xl z-10`}
      >
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`absolute -right-4 top-8 z-10 ${
            darkMode
              ? "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300"
              : "bg-white hover:bg-gray-50 border-gray-200 text-gray-600"
          } p-2.5 rounded-full shadow-lg border-2 transition-all duration-200 hover:scale-110`}
        >
          <ChevronLeft
            className={`w-4 h-4 transition-transform duration-300 ${
              isCollapsed ? "rotate-180" : ""
            }`}
          />
        </button>

        <div
          className={`flex items-center ${isCollapsed ? "justify-center" : "justify-start px-6"} h-20 border-b ${darkMode ? "border-slate-800/50" : "border-gray-200/50"} relative`}
        >
          {isCollapsed ? (
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              </div>
              <div>
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                  Pulse
                </span>
                <p
                  className={`text-xs ${darkMode ? "text-slate-400" : "text-gray-500"} mt-0.5`}
                >
                  QuanDao Hub
                </p>
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 px-4 py-6">
          <ul className="space-y-2">
            {navigationItems.map(({ to, icon: Icon, label, gradient }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end
                  className={({ isActive }) =>
                    `group flex items-center gap-4 p-3 rounded-xl transition-all duration-200 relative overflow-hidden ${
                      isActive
                        ? `bg-gradient-to-r ${gradient} text-white shadow-lg transform scale-[1.02]`
                        : `${hoverActive.hover} transform hover:scale-[1.01]`
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <div
                          className={`absolute inset-0 bg-gradient-to-r ${gradient} opacity-20 blur-xl`}
                        ></div>
                      )}

                      <div
                        className={`relative z-10 ${isActive ? "text-white" : ""}`}
                      >
                        <Icon
                          className={`w-5 h-5 transition-transform duration-200 ${isActive ? "scale-110" : "group-hover:scale-105"}`}
                        />
                      </div>

                      {!isCollapsed && (
                        <span
                          className={`relative z-10 font-medium transition-all duration-200 ${
                            isActive ? "text-white" : ""
                          }`}
                        >
                          {label}
                        </span>
                      )}

                      {isActive && !isCollapsed && (
                        <div className="absolute right-3 w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="flex-1 flex flex-col min-w-0 relative">
        <header className="relative px-4 py-3">
          <div
            className={`flex items-center justify-between px-6 py-3 ${navbarBg} backdrop-blur-xl border shadow-md rounded-2xl transition-all duration-300`}
          >
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <h1
                  className={`text-xl font-bold ${darkMode ? "text-white" : "text-gray-900"} leading-tight`}
                >
                  {currentTitle}
                </h1>
                <p
                  className={`text-xs ${darkMode ? "text-slate-400" : "text-gray-500"} leading-none`}
                >
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {/* <button
                  className={`relative p-2 rounded-lg transition-all duration-200 group ${darkMode
                      ? "hover:bg-slate-700/50 text-slate-300 hover:text-white"
                      : "hover:bg-gray-100/50 text-gray-600 hover:text-gray-900"
                    }`}
                >
                  <Bell className="w-4 h-4" />
                  <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-gradient-to-r from-red-500 to-pink-500 rounded-full"></div>
                </button> */}

                {/* <button
                  className={`p-2 rounded-lg transition-all duration-200 group ${darkMode
                      ? "hover:bg-slate-700/50 text-slate-300 hover:text-white"
                      : "hover:bg-gray-100/50 text-gray-600 hover:text-gray-900"
                    }`}
                >
                  <Settings className="w-4 h-4" />
                </button> */}

                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className={`p-2 rounded-lg transition-all duration-200 group ${
                    darkMode
                      ? "bg-slate-700/50 text-yellow-400 hover:bg-slate-600/50"
                      : "bg-gray-100/50 text-gray-600 hover:bg-gray-200/50"
                  }`}
                >
                  {darkMode ? (
                    <Sun className="w-4 h-4" />
                  ) : (
                    <Moon className="w-4 h-4" />
                  )}
                </button>
              </div>

              <div
                className={`w-px h-6 ${darkMode ? "bg-slate-700" : "bg-gray-200"} mx-2`}
              ></div>

              <div className="flex items-center gap-2">
                <div className="flex -space-x-1.5">
                  {onlineUsers.slice(0, 3).map((u, _index) => (
                    <div key={u.id} className="relative group">
                      <img
                        src={
                          u.avatar ||
                          `https://api.dicebear.com/7.x/identicon/svg?seed=${u.email}`
                        }
                        alt={u.name || u.email}
                        className="w-8 h-8 rounded-full border-2 border-white shadow-sm transition-all duration-200 hover:scale-110 hover:z-10 hover:border-blue-500"
                        title={u.name || u.email}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            getFallbackAvatar(u.email);
                        }}
                      />
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border border-white rounded-full"></div>
                    </div>
                  ))}
                  {onlineUsers.length > 3 && (
                    <div
                      className={`w-8 h-8 rounded-full ${darkMode ? "bg-slate-700" : "bg-gray-100"} border-2 border-white shadow-sm flex items-center justify-center`}
                    >
                      <span
                        className={`text-xs font-medium ${darkMode ? "text-slate-300" : "text-gray-600"}`}
                      >
                        +{onlineUsers.length - 3}
                      </span>
                    </div>
                  )}
                </div>
                {onlineUsers.length > 0 && (
                  <span
                    className={`text-xs ${darkMode ? "text-slate-400" : "text-gray-500"} ml-1 hidden sm:block`}
                  >
                    {onlineUsers.length} online
                  </span>
                )}
              </div>

              <div
                className={`w-px h-6 ${darkMode ? "bg-slate-700" : "bg-gray-200"} mx-2`}
              ></div>

              <button
                onClick={signOut}
                className="group flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg shadow-sm hover:shadow-md hover:from-red-600 hover:to-red-700 transition-all duration-200 transform hover:scale-105"
              >
                <LogOut className="w-4 h-4" />
                <span className="font-medium text-sm hidden sm:block">
                  Sign Out
                </span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-hidden px-4 pb-4">
          <div className="h-full overflow-y-auto scrollbar-hide rounded-2xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
