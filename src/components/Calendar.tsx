import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
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

  const getEventColor = (event: CalendarEvent) => {
    const colors = {
      "1": "#5B7BFF",
      "2": "#34D399",
      "3": "#A855F7",
      "4": "#F87171",
      "5": "#FACC15",
      "6": "#FB923C",
      "7": "#38BDF8",
      "8": "#6B7280",
      "9": "#4F46E5",
      "10": "#10B981",
      "11": "#EF4444",
    };
    return event.colorId
      ? colors[event.colorId as keyof typeof colors] || "#3B82F6"
      : "#3B82F6";
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
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200 transition-all duration-300">
        <div className="grid grid-cols-7 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
          {weekDays.map((day) => (
            <div
              key={day}
              className="p-4 text-center font-medium text-gray-600 text-sm tracking-wide"
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
                className={`min-h-32 p-3 transition-all duration-200 hover:bg-gray-50/80 border-r border-b border-gray-100/50 ${
                  !isCurrentMonth ? "bg-gray-50/30 text-gray-400" : ""
                }`}
              >
                <div
                  className={`text-sm font-semibold mb-2 ${
                    todayClass
                      ? "bg-indigo-600 text-white w-7 h-7 rounded-full flex items-center justify-center"
                      : "text-gray-700"
                  }`}
                >
                  {day.getDate()}
                </div>

                <div className="space-y-1.5">
                  {dayEvents.slice(0, 3).map((event) => (
                    <div
                      key={event.id}
                      onClick={() => {
                        setSelectedEvent(event);
                        setShowEventDetails(true);
                      }}
                      className="text-xs px-2 py-1.5 rounded-lg cursor-pointer hover:shadow-md transition-all duration-200 truncate font-medium"
                      style={{
                        backgroundColor: getEventColor(event),
                        color: "white",
                      }}
                    >
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-gray-500 font-medium hover:text-gray-700 transition-colors">
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
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
        <div className="grid grid-cols-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
          <div className="p-4"></div>
          {weekDays.map((day) => (
            <div key={day.toISOString()} className="p-4 text-center">
              <div className="text-sm text-gray-600 font-medium">
                {day.toLocaleDateString("en-US", { weekday: "short" })}
              </div>
              <div
                className={`text-lg font-semibold ${
                  isToday(day)
                    ? "bg-indigo-600 text-white w-9 h-9 rounded-full flex items-center justify-center mx-auto"
                    : "text-gray-700"
                }`}
              >
                {day.getDate()}
              </div>
            </div>
          ))}
        </div>

        <div className="max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-50">
          {hours.map((hour) => (
            <div
              key={hour}
              className="grid grid-cols-8 border-b border-gray-100/50 min-h-14"
            >
              <div className="p-3 text-xs text-gray-500 font-medium border-r bg-gray-50/30">
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
                    className="p-1.5 border-r border-gray-100/50 relative"
                  >
                    {dayEvents.map((event) => (
                      <div
                        key={event.id}
                        onClick={() => {
                          setSelectedEvent(event);
                          setShowEventDetails(true);
                        }}
                        className="text-xs px-2 py-1.5 rounded-lg cursor-pointer mb-1.5 truncate font-medium hover:shadow-md transition-all duration-200"
                        style={{
                          backgroundColor: getEventColor(event),
                          color: "white",
                        }}
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
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 tracking-tight">
            Upcoming Events
          </h3>
        </div>
        <div className="divide-y divide-gray-100">
          {upcomingEvents.map((event) => (
            <div
              key={event.id}
              onClick={() => {
                setSelectedEvent(event);
                setShowEventDetails(true);
              }}
              className="p-5 hover:bg-gray-50/80 cursor-pointer transition-all duration-200"
            >
              <div className="flex items-start space-x-4">
                <div
                  className="w-3 h-3 rounded-full mt-2.5 flex-shrink-0"
                  style={{ backgroundColor: getEventColor(event) }}
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 truncate text-base">
                    {event.title}
                  </h4>
                  <div className="flex items-center space-x-4 mt-1.5 text-sm text-gray-600">
                    <span>{formatDate(new Date(event.start))}</span>
                    <span>
                      {formatTime(new Date(event.start))} -{" "}
                      {formatTime(new Date(event.end))}
                    </span>
                  </div>
                  {event.location && (
                    <div className="flex items-center mt-2 text-sm text-gray-600">
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
    <div className="p-8 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {loading && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-50">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      )}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="flex items-center bg-white rounded-xl shadow-sm border border-gray-200">
              <button
                onClick={() => navigateCalendar(-1)}
                className="p-3 hover:bg-gray-100 transition-all duration-200 rounded-l-xl"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="px-6 py-3 font-semibold text-gray-900 min-w-56 text-center text-lg tracking-tight">
                {currentDate.toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </div>
              <button
                onClick={() => navigateCalendar(1)}
                className="p-3 hover:bg-gray-100 transition-all duration-200 rounded-r-xl"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-6 py-3 bg-white hover:bg-gray-100 text-gray-800 rounded-xl shadow-sm border border-gray-200 transition-all duration-200 font-medium"
            >
              Today
            </button>
          </div>

          <div className="flex bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {[
              { key: "month", icon: Grid3x3, label: "Month" },
              { key: "week", icon: Calendar, label: "Week" },
              { key: "list", icon: List, label: "List" },
            ].map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => setView(key as any)}
                className={`px-5 py-3 flex items-center space-x-2 transition-all duration-200 ${
                  view === key
                    ? "bg-indigo-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="hidden sm:block font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {view === "month" && <MonthView />}
      {view === "week" && <WeekView />}
      {view === "list" && <ListView />}

      {showEventDetails && selectedEvent && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-6 bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-50">
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div className="flex-1 pr-6">
                  <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                    {selectedEvent.title}
                  </h2>
                </div>
                <button
                  onClick={() => setShowEventDetails(false)}
                  className="text-gray-500 hover:text-gray-700 transition-all duration-200 p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Clock className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2 text-lg">
                      When
                    </h3>
                    <p className="text-gray-600 text-sm">
                      {formatDate(selectedEvent.start)}
                    </p>
                    <p className="text-gray-600 text-sm">
                      {formatTime(selectedEvent.start)} -{" "}
                      {formatTime(selectedEvent.end)}
                    </p>
                  </div>
                </div>

                {selectedEvent.location && (
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2 text-lg">
                        Where
                      </h3>
                      <p className="text-gray-600 text-sm">
                        {selectedEvent.location}
                      </p>
                    </div>
                  </div>
                )}

                {selectedEvent.attendees &&
                  selectedEvent.attendees.length > 0 && (
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Users className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2 text-lg">
                          Attendees ({selectedEvent.attendees.length})
                        </h3>
                        <div className="space-y-1.5 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-50">
                          {selectedEvent.attendees
                            .slice(0, 5)
                            .map((attendee, index) => (
                              <div
                                key={index}
                                className="text-sm text-gray-600"
                              >
                                {attendee.displayName || attendee.email}
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  )}

                {selectedEvent.description && (
                  <div className="bg-gray-50 rounded-xl p-5">
                    <h3 className="font-semibold text-gray-900 mb-2 text-lg">
                      Description
                    </h3>
                    <div className="text-gray-600 text-sm leading-relaxed">
                      {selectedEvent.description}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex space-x-4 mt-8 pt-6 border-t border-gray-200">
                {selectedEvent.hangoutLink && (
                  <a
                    href={selectedEvent.hangoutLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-5 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 font-semibold"
                  >
                    <ExternalLink className="w-5 h-5" />
                    <span>Join Meeting</span>
                  </a>
                )}
                {selectedEvent.htmlLink && (
                  <a
                    href={selectedEvent.htmlLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 font-semibold"
                  >
                    <ExternalLink className="w-5 h-5" />
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
