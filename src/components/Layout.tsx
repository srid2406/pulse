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
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { usePresence } from "../context/PresenceContext";
import { getFallbackAvatar } from "../utils/avatar";
import { useTheme } from "../context/ThemeContext";

const Layout = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { darkMode, setDarkMode } = useTheme();
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

  // Get current date
  const getCurrentDate = () => {
    const now = new Date();
    return now.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const sidebarBg = darkMode
    ? "bg-black border-zinc-800"
    : "bg-white border-zinc-200";
  const sidebarText = darkMode ? "text-zinc-100" : "text-zinc-900";
  const mainBg = darkMode ? "bg-black" : "bg-white";
  const hoverActive = darkMode
    ? {
        active: "bg-zinc-800 text-white",
        hover: "hover:bg-zinc-900 hover:text-zinc-100",
      }
    : {
        active: "bg-zinc-100 text-black",
        hover: "hover:bg-zinc-50 hover:text-black",
      };

  const navigationItems = [
    {
      to: "/",
      icon: Home,
      label: "Dashboard",
    },
    {
      to: "/chat",
      icon: MessageSquare,
      label: "Chat",
    },
    {
      to: "/docs",
      icon: HardDrive,
      label: "Docs",
    },
    {
      to: "/notes",
      icon: FileText,
      label: "Meet Notes",
    },
    {
      to: "/calendar",
      icon: Calendar,
      label: "Calendar",
    },
    {
      to: "/whiteboard",
      icon: Presentation,
      label: "Whiteboard",
    },
    {
      to: "/tasks",
      icon: ListChecks,
      label: "Tasks",
    },
  ];

  return (
    <div className={`flex h-screen overflow-hidden ${mainBg}`}>
      <div
        className={`${
          isCollapsed ? "w-20" : "w-64"
        } ${sidebarBg} ${sidebarText} flex flex-col transition-all duration-300 border-r z-10 relative`}
      >
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`absolute -right-3 top-8 z-10 ${
            darkMode
              ? "bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-400"
              : "bg-white hover:bg-zinc-50 border-zinc-200 text-zinc-600"
          } p-2 rounded-full shadow-sm border transition-all duration-200 cursor-pointer`}
        >
          <ChevronLeft
            className={`w-3.5 h-3.5 transition-transform duration-300 ${
              isCollapsed ? "rotate-180" : ""
            }`}
          />
        </button>

        <div
          className={`flex items-center ${isCollapsed ? "justify-center" : "justify-start px-6"} h-16 border-b ${darkMode ? "border-zinc-800" : "border-zinc-200"}`}
        >
          {isCollapsed ? (
            <div className="relative">
              <div
                className={`w-8 h-8 ${darkMode ? "bg-white" : "bg-black"} rounded-md flex items-center justify-center`}
              >
                <Activity
                  className={`w-5 h-5 ${darkMode ? "text-black" : "text-white"}`}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="relative">
                <div
                  className={`w-8 h-8 ${darkMode ? "bg-white" : "bg-black"} rounded-md flex items-center justify-center`}
                >
                  <Activity
                    className={`w-5 h-5 ${darkMode ? "text-black" : "text-white"}`}
                  />
                </div>
              </div>
              <div>
                <span
                  className={`text-xl font-semibold ${darkMode ? "text-white" : "text-black"}`}
                >
                  Pulse
                </span>
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 px-3 py-4">
          <ul className="space-y-0.5">
            {navigationItems.map(({ to, icon: Icon, label }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end
                  className={({ isActive }) =>
                    `group flex items-center ${isCollapsed ? "justify-center" : "gap-3"} px-3 py-2 rounded-md transition-all duration-200 text-sm cursor-pointer ${
                      isActive
                        ? `${hoverActive.active}`
                        : `${hoverActive.hover} ${darkMode ? "text-zinc-400" : "text-zinc-600"}`
                    }`
                  }
                  title={isCollapsed ? label : undefined}
                >
                  {({}) => (
                    <>
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      {!isCollapsed && (
                        <span className="font-medium">{label}</span>
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <header
          className={`px-6 h-16 border-b ${darkMode ? "border-zinc-800" : "border-zinc-200"} flex items-center justify-between`}
        >
          <div className="flex items-center gap-4">
            <div>
              <h1
                className={`text-lg font-semibold ${darkMode ? "text-white" : "text-black"}`}
              >
                {currentTitle}
              </h1>
              <p
                className={`text-xs ${darkMode ? "text-zinc-500" : "text-zinc-500"} mt-0.5`}
              >
                {getCurrentDate()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-md transition-all duration-200 cursor-pointer ${
                darkMode
                  ? "hover:bg-zinc-900 text-zinc-400"
                  : "hover:bg-zinc-100 text-zinc-600"
              }`}
            >
              {darkMode ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>

            <div
              className={`w-px h-6 ${darkMode ? "bg-zinc-800" : "bg-zinc-200"}`}
            ></div>

            <div className="flex items-center gap-2">
              <div className="flex -space-x-1.5">
                {onlineUsers.slice(0, 3).map((u) => (
                  <div key={u.id} className="relative cursor-pointer">
                    <img
                      src={
                        u.avatar ||
                        `https://api.dicebear.com/7.x/identicon/svg?seed=${u.email}`
                      }
                      alt={u.name || u.email}
                      className={`w-7 h-7 rounded-full border-2 ${darkMode ? "border-black" : "border-white"}`}
                      title={u.name || u.email}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          getFallbackAvatar(u.email);
                      }}
                    />
                  </div>
                ))}
                {onlineUsers.length > 3 && (
                  <div
                    className={`w-7 h-7 rounded-full ${darkMode ? "bg-zinc-900" : "bg-zinc-100"} border-2 ${darkMode ? "border-black" : "border-white"} flex items-center justify-center cursor-pointer`}
                    title={`${onlineUsers.length - 3} more users online`}
                  >
                    <span
                      className={`text-xs font-medium ${darkMode ? "text-zinc-400" : "text-zinc-600"}`}
                    >
                      +{onlineUsers.length - 3}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div
              className={`w-px h-6 ${darkMode ? "bg-zinc-800" : "bg-zinc-200"}`}
            ></div>

            <button
              onClick={signOut}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-all duration-200 cursor-pointer ${
                darkMode
                  ? "bg-zinc-900 hover:bg-zinc-800 text-white"
                  : "bg-zinc-100 hover:bg-zinc-200 text-black"
              }`}
            >
              <LogOut className="w-4 h-4" />
              <span className="font-medium hidden sm:block">Sign Out</span>
            </button>
          </div>
        </header>

        <main
          className={`flex-1 flex flex-col overflow-hidden ${darkMode ? "bg-black" : "bg-white"}`}
        >
          <div className="flex-1 overflow-y-auto scrollbar-hide p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
