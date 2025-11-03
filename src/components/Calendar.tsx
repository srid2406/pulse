import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  MapPin,
  Users,
  Calendar,
  ExternalLink,
  Grid3x3,
  List,
} from "lucide-react";

type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  location?: string;
  attendees?: { email: string; displayName?: string }[];
  colorId?: string;
  htmlLink?: string;
  creator?: {
    email: string;
    displayName?: string;
  };
  hangoutLink?: string;
  status?: string;
};

const CustomCalendar = () => {
  const { accessToken } = useAuth();
  const { darkMode } = useTheme();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null,
  );
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [view, setView] = useState<"month" | "week" | "list">("month");

  const fetchEvents = useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=100&orderBy=startTime&singleEvents=true&timeMin=" +
          new Date().toISOString(),
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!res.ok) throw new Error(`Error: ${res.status}`);
      const data = await res.json();

      const formatted = (data.items || []).map((event: any) => ({
        id: event.id,
        title: event.summary || "Untitled Event",
        start: event.start.dateTime
          ? new Date(event.start.dateTime)
          : new Date(event.start.date),
        end: event.end.dateTime
          ? new Date(event.end.dateTime)
          : new Date(event.end.date),
        description: event.description || "",
        location: event.location || "",
        attendees: event.attendees || [],
        colorId: event.colorId,
        htmlLink: event.htmlLink,
        creator: event.creator,
        hangoutLink: event.hangoutLink,
        status: event.status,
      }));

      setEvents(formatted);
    } catch (err) {
      console.error("Error fetching events:", err);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && showEventDetails) {
        setShowEventDetails(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showEventDetails]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    for (let i = 0; i < 42; i++) {
      days.push(new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000));
    }
    return days;
  };

  const getEventsForDate = (date: Date) => {
    return events.filter((event) => {
      const eventStart = new Date(event.start);
      return eventStart.toDateString() === date.toDateString();
    });
  };

  const getWeekDays = () => {
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      return day;
    });
  };

  const navigateCalendar = (direction: number) => {
    const newDate = new Date(currentDate);
    if (view === "month") {
      newDate.setMonth(currentDate.getMonth() + direction);
    } else if (view === "week") {
      newDate.setDate(currentDate.getDate() + direction * 7);
    }
    setCurrentDate(newDate);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getEventColor = (_event: CalendarEvent) => {
    return darkMode ? "#ffffff" : "#000000";
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSameMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  const MonthView = () => {
    const days = getDaysInMonth(currentDate);
    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    return (
      <div
        className={`rounded-lg overflow-hidden border ${darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"}`}
      >
        <div
          className={`grid grid-cols-7 border-b ${darkMode ? "border-zinc-800" : "border-gray-200"}`}
        >
          {weekDays.map((day) => (
            <div
              key={day}
              className={`p-3 text-center font-medium text-xs tracking-wider uppercase ${darkMode ? "text-zinc-400" : "text-gray-500"}`}
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {days.map((day, index) => {
            const dayEvents = getEventsForDate(day);
            const isCurrentMonth = isSameMonth(day);
            const todayClass = isToday(day);

            return (
              <div
                key={index}
                className={`min-h-28 p-2.5 transition-colors border-r border-b ${
                  darkMode
                    ? `border-zinc-800 ${!isCurrentMonth ? "bg-zinc-950/50 text-zinc-600" : ""}`
                    : `border-gray-100 ${!isCurrentMonth ? "bg-gray-50/50 text-gray-400" : ""}`
                }`}
              >
                <div
                  className={`text-sm font-medium mb-2 ${
                    todayClass
                      ? darkMode
                        ? "bg-white text-black w-7 h-7 rounded-full flex items-center justify-center text-xs"
                        : "bg-black text-white w-7 h-7 rounded-full flex items-center justify-center text-xs"
                      : darkMode
                        ? "text-zinc-300"
                        : "text-gray-700"
                  }`}
                >
                  {day.getDate()}
                </div>

                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map((event) => (
                    <div
                      key={event.id}
                      onClick={() => {
                        setSelectedEvent(event);
                        setShowEventDetails(true);
                      }}
                      className={`text-xs px-2 py-1 rounded cursor-pointer transition-all truncate font-medium ${
                        darkMode
                          ? "bg-white text-black hover:bg-zinc-300"
                          : "bg-black text-white hover:bg-gray-800"
                      }`}
                    >
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div
                      className={`text-xs font-medium px-1 ${darkMode ? "text-zinc-500" : "text-gray-500"}`}
                    >
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const WeekView = () => {
    const weekDays = getWeekDays();
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div
        className={`rounded-lg overflow-hidden border ${darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"}`}
      >
        <div
          className={`grid grid-cols-8 border-b ${darkMode ? "border-zinc-800" : "border-gray-200"}`}
        >
          <div className="p-3"></div>
          {weekDays.map((day) => (
            <div key={day.toISOString()} className="p-3 text-center">
              <div
                className={`text-xs font-medium uppercase tracking-wider ${darkMode ? "text-zinc-500" : "text-gray-500"}`}
              >
                {day.toLocaleDateString("en-US", { weekday: "short" })}
              </div>
              <div
                className={`text-lg font-semibold mt-1 ${
                  isToday(day)
                    ? darkMode
                      ? "bg-white text-black w-9 h-9 rounded-full flex items-center justify-center mx-auto"
                      : "bg-black text-white w-9 h-9 rounded-full flex items-center justify-center mx-auto"
                    : darkMode
                      ? "text-zinc-200"
                      : "text-gray-900"
                }`}
              >
                {day.getDate()}
              </div>
            </div>
          ))}
        </div>

        <div className="max-h-[70vh] overflow-y-auto">
          {hours.map((hour) => (
            <div
              key={hour}
              className={`grid grid-cols-8 border-b min-h-14 ${darkMode ? "border-zinc-800" : "border-gray-100"}`}
            >
              <div
                className={`p-2.5 text-xs font-medium border-r ${darkMode ? "text-zinc-500 border-zinc-800" : "text-gray-500 border-gray-200"}`}
              >
                {hour === 0
                  ? "12 AM"
                  : hour < 12
                    ? `${hour} AM`
                    : hour === 12
                      ? "12 PM"
                      : `${hour - 12} PM`}
              </div>
              {weekDays.map((day) => {
                const dayEvents = getEventsForDate(day).filter(
                  (event) => new Date(event.start).getHours() === hour,
                );
                return (
                  <div
                    key={`${day.toISOString()}-${hour}`}
                    className={`p-1.5 border-r relative ${darkMode ? "border-zinc-800" : "border-gray-100"}`}
                  >
                    {dayEvents.map((event) => (
                      <div
                        key={event.id}
                        onClick={() => {
                          setSelectedEvent(event);
                          setShowEventDetails(true);
                        }}
                        className={`text-xs px-2 py-1 rounded cursor-pointer mb-1 truncate font-medium transition-all ${
                          darkMode
                            ? "bg-[#3291ff] text-white hover:bg-[#0070f3]"
                            : "bg-[#0070f3] text-white hover:bg-[#0051cc]"
                        }`}
                      >
                        {event.title}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const ListView = () => {
    const upcomingEvents = events
      .filter((event) => new Date(event.start) >= new Date())
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .slice(0, 20);

    return (
      <div
        className={`rounded-lg border ${darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"}`}
      >
        <div
          className={`p-5 border-b ${darkMode ? "border-zinc-800" : "border-gray-200"}`}
        >
          <h3
            className={`text-lg font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}
          >
            Upcoming Events
          </h3>
        </div>
        <div
          className={`divide-y ${darkMode ? "divide-zinc-800" : "divide-gray-100"}`}
        >
          {upcomingEvents.map((event) => (
            <div
              key={event.id}
              onClick={() => {
                setSelectedEvent(event);
                setShowEventDetails(true);
              }}
              className={`p-4 cursor-pointer transition-colors ${
                darkMode ? "hover:bg-zinc-800/50" : "hover:bg-gray-50"
              }`}
            >
              <div className="flex items-start space-x-3.5">
                <div
                  className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                  style={{ backgroundColor: getEventColor(event) }}
                />
                <div className="flex-1 min-w-0">
                  <h4
                    className={`font-medium truncate ${darkMode ? "text-white" : "text-gray-900"}`}
                  >
                    {event.title}
                  </h4>
                  <div
                    className={`flex items-center space-x-3 mt-1 text-sm ${darkMode ? "text-zinc-400" : "text-gray-600"}`}
                  >
                    <span>{formatDate(new Date(event.start))}</span>
                    <span>
                      {formatTime(new Date(event.start))} -{" "}
                      {formatTime(new Date(event.end))}
                    </span>
                  </div>
                  {event.location && (
                    <div
                      className={`flex items-center mt-2 text-sm ${darkMode ? "text-zinc-400" : "text-gray-600"}`}
                    >
                      <MapPin className="w-4 h-4 mr-1.5" />
                      <span className="truncate">{event.location}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={`p-6 min-h-screen ${darkMode ? "bg-black" : "bg-white"}`}>
      {loading && (
        <div
          className={`absolute inset-0 flex items-center justify-center z-50 ${darkMode ? "bg-black/80" : "bg-white/80"}`}
        >
          <div
            className={`animate-spin rounded-full h-10 w-10 border-2 ${darkMode ? "border-white border-t-transparent" : "border-black border-t-transparent"}`}
          ></div>
        </div>
      )}
      <div className="mb-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center space-x-2.5">
            <div
              className={`flex items-center rounded-lg border ${darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"}`}
            >
              <button
                onClick={() => navigateCalendar(-1)}
                className={`p-2.5 transition-colors rounded-l-lg ${darkMode ? "hover:bg-zinc-800" : "hover:bg-gray-50"}`}
              >
                <ChevronLeft
                  className={`w-5 h-5 ${darkMode ? "text-zinc-400" : "text-gray-600"}`}
                />
              </button>
              <div
                className={`px-5 py-2.5 font-semibold min-w-48 text-center text-base ${darkMode ? "text-white" : "text-gray-900"}`}
              >
                {currentDate.toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </div>
              <button
                onClick={() => navigateCalendar(1)}
                className={`p-2.5 transition-colors rounded-r-lg ${darkMode ? "hover:bg-zinc-800" : "hover:bg-gray-50"}`}
              >
                <ChevronRight
                  className={`w-5 h-5 ${darkMode ? "text-zinc-400" : "text-gray-600"}`}
                />
              </button>
            </div>

            <button
              onClick={() => setCurrentDate(new Date())}
              className={`px-4 py-2.5 rounded-lg border transition-colors font-medium text-sm ${
                darkMode
                  ? "bg-zinc-900 border-zinc-800 text-white hover:bg-zinc-800"
                  : "bg-white border-gray-200 text-gray-900 hover:bg-gray-50"
              }`}
            >
              Today
            </button>
          </div>

          <div
            className={`flex rounded-lg border overflow-hidden ${darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"}`}
          >
            {[
              { key: "month", icon: Grid3x3, label: "Month" },
              { key: "week", icon: Calendar, label: "Week" },
              { key: "list", icon: List, label: "List" },
            ].map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => setView(key as any)}
                className={`px-4 py-2.5 flex items-center space-x-2 transition-colors text-sm font-medium ${
                  view === key
                    ? darkMode
                      ? "bg-white text-black"
                      : "bg-black text-white"
                    : darkMode
                      ? "text-zinc-400 hover:bg-zinc-800"
                      : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:block">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {view === "month" && <MonthView />}
      {view === "week" && <WeekView />}
      {view === "list" && <ListView />}

      {showEventDetails && selectedEvent && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-6 bg-black/60 backdrop-blur-sm">
          <div
            className={`rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto ${darkMode ? "bg-zinc-900" : "bg-white"}`}
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div className="flex-1 pr-4">
                  <h2
                    className={`text-2xl font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}
                  >
                    {selectedEvent.title}
                  </h2>
                </div>
                <button
                  onClick={() => setShowEventDetails(false)}
                  className={`transition-colors p-1.5 rounded ${
                    darkMode
                      ? "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                      : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-5">
                <div className="flex items-start space-x-3.5">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${darkMode ? "bg-zinc-800" : "bg-gray-100"}`}
                  >
                    <Clock
                      className={`w-5 h-5 ${darkMode ? "text-zinc-400" : "text-gray-600"}`}
                    />
                  </div>
                  <div>
                    <h3
                      className={`font-medium mb-1.5 ${darkMode ? "text-white" : "text-gray-900"}`}
                    >
                      When
                    </h3>
                    <p
                      className={`text-sm ${darkMode ? "text-zinc-400" : "text-gray-600"}`}
                    >
                      {formatDate(selectedEvent.start)}
                    </p>
                    <p
                      className={`text-sm ${darkMode ? "text-zinc-400" : "text-gray-600"}`}
                    >
                      {formatTime(selectedEvent.start)} -{" "}
                      {formatTime(selectedEvent.end)}
                    </p>
                  </div>
                </div>

                {selectedEvent.location && (
                  <div className="flex items-start space-x-3.5">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${darkMode ? "bg-zinc-800" : "bg-gray-100"}`}
                    >
                      <MapPin
                        className={`w-5 h-5 ${darkMode ? "text-zinc-400" : "text-gray-600"}`}
                      />
                    </div>
                    <div>
                      <h3
                        className={`font-medium mb-1.5 ${darkMode ? "text-white" : "text-gray-900"}`}
                      >
                        Where
                      </h3>
                      <p
                        className={`text-sm ${darkMode ? "text-zinc-400" : "text-gray-600"}`}
                      >
                        {selectedEvent.location}
                      </p>
                    </div>
                  </div>
                )}

                {selectedEvent.attendees &&
                  selectedEvent.attendees.length > 0 && (
                    <div className="flex items-start space-x-3.5">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${darkMode ? "bg-zinc-800" : "bg-gray-100"}`}
                      >
                        <Users
                          className={`w-5 h-5 ${darkMode ? "text-zinc-400" : "text-gray-600"}`}
                        />
                      </div>
                      <div>
                        <h3
                          className={`font-medium mb-1.5 ${darkMode ? "text-white" : "text-gray-900"}`}
                        >
                          Attendees ({selectedEvent.attendees.length})
                        </h3>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {selectedEvent.attendees
                            .slice(0, 5)
                            .map((attendee, index) => (
                              <div
                                key={index}
                                className={`text-sm ${darkMode ? "text-zinc-400" : "text-gray-600"}`}
                              >
                                {attendee.displayName || attendee.email}
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  )}

                {selectedEvent.description && (
                  <div
                    className={`rounded-lg p-4 ${darkMode ? "bg-zinc-800" : "bg-gray-50"}`}
                  >
                    <h3
                      className={`font-medium mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}
                    >
                      Description
                    </h3>
                    <div
                      className={`text-sm leading-relaxed ${darkMode ? "text-zinc-400" : "text-gray-600"}`}
                    >
                      {selectedEvent.description}
                    </div>
                  </div>
                )}
              </div>

              <div
                className={`flex space-x-3 mt-6 pt-6 border-t ${darkMode ? "border-zinc-800" : "border-gray-200"}`}
              >
                {selectedEvent.hangoutLink && (
                  <a
                    href={selectedEvent.hangoutLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex-1 px-4 py-2.5 rounded-lg transition-colors flex items-center justify-center space-x-2 font-medium text-sm ${
                      darkMode
                        ? "bg-white text-black hover:bg-zinc-200"
                        : "bg-black text-white hover:bg-gray-800"
                    }`}
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Join Meeting</span>
                  </a>
                )}
                {selectedEvent.htmlLink && (
                  <a
                    href={selectedEvent.htmlLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex-1 px-4 py-2.5 border rounded-lg transition-colors flex items-center justify-center space-x-2 font-medium text-sm ${
                      darkMode
                        ? "bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700"
                        : "bg-white border-gray-200 text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Google Calendar</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomCalendar;
