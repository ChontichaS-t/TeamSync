"use client";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Grid,
  List,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useMemo, useState, useEffect } from "react";
import { AlertDialogSmall } from "@/components/global/AlertDialogSmall";
import { AddEventModal } from "@/components/global/AddEventModal";
import { UserProfileMenu } from "@/components/global/UserProfileMenu";
import { apiFetch } from "@/lib/api";

export type CalendarEvent = {
  id: string;
  dateKey: string; // "YYYY-MM-DD"
  time: string;
  title: string;
  location: string;
  tone: "blue" | "green" | "orange" | "purple";
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const THEME_MAP = {
  "/new/newsea.jpg": { primary: "#1a77a6", hover: "#13587b", shadow: "rgba(26, 119, 166, 0.2)" },
  "/new/newtrain.jpg": { primary: "#351e7a", hover: "#251458", shadow: "rgba(53, 30, 122, 0.2)" },
  "/new/newrabbit.jpg": { primary: "#db2777", hover: "#be185d", shadow: "rgba(219, 39, 119, 0.2)" },
  "/new/newgrli.jpg": { primary: "#5D4037", hover: "#3E2723", shadow: "rgba(93, 64, 55, 0.2)" },
  "/new/newwindow.jpg": { primary: "#F87B1B", hover: "#c76214", shadow: "rgba(248, 123, 27, 0.2)" },
  "/new/newbed.jpg": { primary: "#1a77a6", hover: "#13587b", shadow: "rgba(26, 119, 166, 0.2)" },
  "/new/newboy.jpg": { primary: "#1a77a6", hover: "#13587b", shadow: "rgba(26, 119, 166, 0.2)" },
  "/new/newdog.jpg": { primary: "#16a34a", hover: "#15803d", shadow: "rgba(22, 163, 74, 0.2)" },
};

export default function CalendarPage() {
  const searchParams = useSearchParams();
  const coverImage = searchParams.get("cover") || "/new/newsea.jpg";
  const projectTitle = searchParams.get("title") || "Badminton Tournament System";
  const requestedProjectId = searchParams.get("projectId");

  const activeTheme = (THEME_MAP as Record<string, { primary: string; hover: string; shadow: string }>)[coverImage || ""] || {
    primary: "#17211e",
    hover: "#253631",
    shadow: "rgba(23, 33, 30, 0.18)",
  };

  const dynamicStyle = {
    "--theme-primary": activeTheme.primary,
    "--theme-primary-hover": activeTheme.hover,
    "--theme-primary-shadow": activeTheme.shadow,
  } as React.CSSProperties;

  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 6, 21)); // July 2026
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(2026, 6, 21));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [backendProjectId, setBackendProjectId] = useState<string | null>(requestedProjectId);
  const [apiError, setApiError] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filterTone, setFilterTone] = useState<string>("all");

  useEffect(() => {
    document.title = `${projectTitle} | TeamSync`;
  }, [projectTitle]);

  useEffect(() => {
    const controller = new AbortController();
    async function loadEvents() {
      try {
        let projectId = requestedProjectId;
        if (!projectId) {
          const project = await apiFetch<{ id: string }>("/api/projects/ensure", {
            method: "POST",
            body: JSON.stringify({ externalKey: `cover:${coverImage}`, title: projectTitle, description: "", cover: coverImage, tags: "blue", deadline: "", progress: 0 }),
            signal: controller.signal,
          });
          projectId = project.id;
          setBackendProjectId(project.id);
        }
        const result = await apiFetch<{ events: CalendarEvent[] }>(`/api/projects/${encodeURIComponent(projectId)}/events`, { signal: controller.signal });
        setEvents(result.events);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setApiError(error instanceof Error ? error.message : "ไม่สามารถโหลดกิจกรรมได้");
      }
    }
    void loadEvents();
    return () => controller.abort();
  }, [coverImage, projectTitle, requestedProjectId]);

  // Delete Confirmation Dialog State
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null);

  // Add Event Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [activeMenuEventId, setActiveMenuEventId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeMenuEventId) return;
    const closeMenu = () => setActiveMenuEventId(null);
    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, [activeMenuEventId]);

  const todayKey = toDateKey(new Date());

  // Filter events by tone category
  const filteredEvents = useMemo(() => {
    if (filterTone === "all") return events;
    return events.filter((e) => e.tone === filterTone);
  }, [events, filterTone]);

  // Group events by YYYY-MM-DD
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const evt of filteredEvents) {
      if (!map[evt.dateKey]) map[evt.dateKey] = [];
      map[evt.dateKey].push(evt);
    }
    return map;
  }, [filteredEvents]);

  // Selected day events
  const selectedDateKey = toDateKey(selectedDate);
  const selectedDayEvents = eventsByDate[selectedDateKey] ?? [];

  // Month navigation helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleGoToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now);
  };

  // Build grid days array for current month view (6 rows = 42 cells)
  const calendarCells = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells: {
      date: Date;
      dateKey: string;
      dayNum: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
    }[] = [];

    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const d = new Date(year, month - 1, dayNum);
      const dKey = toDateKey(d);
      cells.push({
        date: d,
        dateKey: dKey,
        dayNum,
        isCurrentMonth: false,
        isToday: dKey === todayKey,
        isSelected: dKey === selectedDateKey,
      });
    }

    // Current month days
    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const d = new Date(year, month, dayNum);
      const dKey = toDateKey(d);
      cells.push({
        date: d,
        dateKey: dKey,
        dayNum,
        isCurrentMonth: true,
        isToday: dKey === todayKey,
        isSelected: dKey === selectedDateKey,
      });
    }

    // Next month padding
    const remaining = 42 - cells.length;
    for (let dayNum = 1; dayNum <= remaining; dayNum++) {
      const d = new Date(year, month + 1, dayNum);
      const dKey = toDateKey(d);
      cells.push({
        date: d,
        dateKey: dKey,
        dayNum,
        isCurrentMonth: false,
        isToday: dKey === todayKey,
        isSelected: dKey === selectedDateKey,
      });
    }

    return cells;
  }, [year, month, todayKey, selectedDateKey]);



  const handleDeleteEvent = async (id: string) => {
    if (!backendProjectId) return;
    try {
      await apiFetch<void>(`/api/projects/${encodeURIComponent(backendProjectId)}/events/${encodeURIComponent(id)}`, { method: "DELETE" });
      setEvents((prev) => prev.filter((event) => event.id !== id));
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "ไม่สามารถลบกิจกรรมได้");
    }
  };

  const openNewEventModal = () => {
    setEditingEvent(null);
    setIsAddModalOpen(true);
  };

  const openEditEventModal = (event: CalendarEvent) => {
    setEditingEvent(event);
    setIsAddModalOpen(true);
  };

  const closeEventModal = () => {
    setIsAddModalOpen(false);
    setEditingEvent(null);
  };

  const selectedDateLabel = new Intl.DateTimeFormat("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(selectedDate);

  return (
    <div className="calendar-page-shell" style={dynamicStyle}>

      <nav className="project-navbar" aria-label="Project navigation">
        <Link className="brand" href="/home" aria-label="TeamSync home">
          TeamSync
        </Link>
        <div className="project-navbar-menu">
          <Link href="/home">Home</Link>
          <Link href={`/project?cover=${encodeURIComponent(coverImage)}&title=${encodeURIComponent(projectTitle)}${backendProjectId ? `&projectId=${encodeURIComponent(backendProjectId)}` : ""}`}>Project</Link>
          <Link
            className="project-navbar-active"
            href={`/calendar?cover=${encodeURIComponent(coverImage)}&title=${encodeURIComponent(projectTitle)}${backendProjectId ? `&projectId=${encodeURIComponent(backendProjectId)}` : ""}`}
          >
            Calendar
          </Link>
        </div>
        <UserProfileMenu />
      </nav>

      <main className="calendar-page">
        {apiError && <p role="alert" style={{ color: "#b91c1c", marginBottom: 12 }}>{apiError}</p>}
        {/* Page Header */}
        <header className="calendar-heading">
          <div>
            <h1 style={{ color: "var(--theme-primary)" }}>{projectTitle}</h1>
            <p>Plan milestones, reviews, and team sessions in an interactive grid.</p>
          </div>
          <button
            className="calendar-add-button"
            type="button"
            onClick={openNewEventModal}
          >
            <Plus aria-hidden="true" />
            <span>เพิ่มกิจกรรมใหม่</span>
          </button>
        </header>

        {/* Toolbar: Navigation & Filters */}
        <section className="calendar-toolbar" aria-label="Calendar controls">
          <div className="calendar-nav-group">
            <button
              className="calendar-icon-btn"
              type="button"
              onClick={handlePrevMonth}
              title="Previous month"
              aria-label="Previous month"
            >
              <ChevronLeft aria-hidden="true" />
            </button>
            <h2 className="calendar-month-title">
              {MONTH_NAMES[month]} {year}
            </h2>
            <button
              className="calendar-icon-btn"
              type="button"
              onClick={handleNextMonth}
              title="Next month"
              aria-label="Next month"
            >
              <ChevronRight aria-hidden="true" />
            </button>
            <button
              className="calendar-today-btn"
              type="button"
              onClick={handleGoToday}
            >
              Today
            </button>
          </div>

          <div className="calendar-view-controls">
            {/* Filter Pills */}
            <div className="calendar-filter-pills">
              <button
                className={`filter-pill ${filterTone === "all" ? "active" : ""}`}
                type="button"
                onClick={() => setFilterTone("all")}
              >
                All
              </button>
              <button
                className={`filter-pill blue ${filterTone === "blue" ? "active" : ""}`}
                type="button"
                onClick={() => setFilterTone("blue")}
              >
                Meetings
              </button>
              <button
                className={`filter-pill green ${filterTone === "green" ? "active" : ""}`}
                type="button"
                onClick={() => setFilterTone("green")}
              >
                Reviews
              </button>
              <button
                className={`filter-pill orange ${filterTone === "orange" ? "active" : ""}`}
                type="button"
                onClick={() => setFilterTone("orange")}
              >
                Deadlines
              </button>
            </div>

            {/* View mode toggle */}
            <div className="calendar-mode-toggle">
              <button
                className={`mode-btn ${viewMode === "grid" ? "active" : ""}`}
                type="button"
                onClick={() => setViewMode("grid")}
                title="Grid View"
              >
                <Grid aria-hidden="true" />
              </button>
              <button
                className={`mode-btn ${viewMode === "list" ? "active" : ""}`}
                type="button"
                onClick={() => setViewMode("list")}
                title="List View"
              >
                <List aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>

        {/* Main Content Layout */}
        <section className="calendar-layout" aria-label="Project calendar content">
          {/* Left Main View (Grid or List) */}
          <div
            className="calendar-panel"
            style={
              coverImage
                ? {
                    backgroundImage: `url(${coverImage})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    position: "relative",
                    overflow: "hidden",
                  }
                : undefined
            }
          >
            {coverImage && (
              <div
                className="calendar-cover-overlay"
                style={{
                  position: "absolute",
                  inset: 0,
                  zIndex: 0,
                }}
              />
            )}
            <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", flex: 1 }}>
              {viewMode === "grid" ? (
                <div className="calendar-grid-container">
                  {/* Weekday Row */}
                  <div className="calendar-weekdays-row">
                    {WEEKDAYS.map((dayName) => (
                      <div className="calendar-weekday-cell" key={dayName}>
                        {dayName}
                      </div>
                    ))}
                  </div>

                  {/* 7x6 Date Cell Matrix */}
                  <div className="calendar-cells-grid">
                    {calendarCells.map((cell) => {
                      const dayEvts = eventsByDate[cell.dateKey] ?? [];
                      return (
                        <div
                          key={cell.dateKey}
                          className={`calendar-cell ${cell.isCurrentMonth ? "in-month" : "out-month"} ${
                            cell.isSelected ? "selected" : ""
                          } ${cell.isToday ? "today" : ""}`}
                          onClick={() => setSelectedDate(cell.date)}
                        >
                          <div className="calendar-cell-header">
                            <span className="calendar-cell-num">{cell.dayNum}</span>
                            {cell.isToday && <span className="today-badge">Today</span>}
                          </div>

                          {/* Event Pills */}
                          <div className="calendar-cell-events">
                            {dayEvts.slice(0, 2).map((evt) => (
                              <div
                                key={evt.id}
                                className="cell-event-pill"
                                data-tone={evt.tone}
                                title={`${evt.time} - ${evt.title}`}
                              >
                                <span className="pill-time">{evt.time}</span>
                                <span className="pill-title">{evt.title}</span>
                              </div>
                            ))}
                            {dayEvts.length > 2 && (
                              <div className="cell-more-pill">
                                +{dayEvts.length - 2} more
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* List View fallback */
                <div className="calendar-list-view">
                  <h3>All Scheduled Events</h3>
                  {filteredEvents.length === 0 ? (
                    <p className="empty-text">No events scheduled.</p>
                  ) : (
                    <div className="list-view-events">
                      {filteredEvents.map((evt) => (
                        <article
                          key={evt.id}
                          className="calendar-event"
                          data-tone={evt.tone}
                          onClick={() => {
                            const [y, m, d] = evt.dateKey.split("-").map(Number);
                            setSelectedDate(new Date(y, m - 1, d));
                          }}
                        >
                          <div className="event-actions-menu-wrap list-event-actions">
                            <button
                              className="event-actions-trigger"
                              type="button"
                              aria-label={`Manage ${evt.title}`}
                              aria-haspopup="menu"
                              aria-expanded={activeMenuEventId === evt.id}
                              onClick={(clickEvent) => {
                                clickEvent.stopPropagation();
                                setActiveMenuEventId((activeId) => activeId === evt.id ? null : evt.id);
                              }}
                            >
                              <MoreHorizontal aria-hidden="true" />
                            </button>

                            {activeMenuEventId === evt.id && (
                              <div className="event-actions-dropdown" role="menu" onClick={(clickEvent) => clickEvent.stopPropagation()}>
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    openEditEventModal(evt);
                                    setActiveMenuEventId(null);
                                  }}
                                >
                                  <Pencil aria-hidden="true" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  className="danger"
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    setDeleteEventId(evt.id);
                                    setActiveMenuEventId(null);
                                  }}
                                >
                                  <Trash2 aria-hidden="true" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="calendar-event-datekey">{evt.dateKey}</div>
                          <div className="calendar-event-time">
                            <Clock3 aria-hidden="true" />
                            {evt.time}
                          </div>
                          <h3>{evt.title}</h3>
                          <p>
                            <MapPin aria-hidden="true" />
                            {evt.location}
                          </p>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Agenda Sidebar */}
          <aside className="calendar-agenda" aria-live="polite">
            <div className="calendar-agenda-heading">
              <span className="calendar-agenda-icon">
                <CalendarDays aria-hidden="true" />
              </span>
              <div>
                <p>วันที่เลือก</p>
                <h2>{selectedDateLabel}</h2>
              </div>
            </div>

            <div className="calendar-event-list">
              {selectedDayEvents.map((event) => (
                <article
                  className="calendar-event"
                  data-tone={event.tone}
                  key={event.id}
                >
                  <div className="event-header-row">
                    <div className="calendar-event-time">
                      <Clock3 aria-hidden="true" />
                      {event.time}
                    </div>
                    <div className="event-actions-menu-wrap">
                      <button
                        className="event-actions-trigger"
                        type="button"
                        aria-label={`Manage ${event.title}`}
                        aria-haspopup="menu"
                        aria-expanded={activeMenuEventId === event.id}
                        onClick={(clickEvent) => {
                          clickEvent.stopPropagation();
                          setActiveMenuEventId((activeId) => activeId === event.id ? null : event.id);
                        }}
                      >
                        <MoreHorizontal aria-hidden="true" />
                      </button>

                      {activeMenuEventId === event.id && (
                        <div className="event-actions-dropdown" role="menu" onClick={(clickEvent) => clickEvent.stopPropagation()}>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              openEditEventModal(event);
                              setActiveMenuEventId(null);
                            }}
                          >
                            <Pencil aria-hidden="true" />
                            <span>Edit</span>
                          </button>
                          <button
                            className="danger"
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setDeleteEventId(event.id);
                              setActiveMenuEventId(null);
                            }}
                          >
                            <Trash2 aria-hidden="true" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <h3>{event.title}</h3>
                  <p>
                    <MapPin aria-hidden="true" />
                    {event.location}
                  </p>
                </article>
              ))}

              {selectedDayEvents.length === 0 && (
                <div className="calendar-empty">
                  <CalendarDays aria-hidden="true" />
                  <h3>ยังไม่มีกิจกรรม</h3>
                  <p>วันนี้ยังว่าง เหมาะสำหรับโฟกัสกับงาน</p>
                  <button
                    className="add-inline-btn"
                    type="button"
                    onClick={openNewEventModal}
                  >
                    <Plus aria-hidden="true" /> เพิ่มกิจกรรม
                  </button>
                </div>
              )}
            </div>
          </aside>
        </section>
      </main>

      {/* Reusable Add Event Modal */}
      <AddEventModal
        isOpen={isAddModalOpen}
        onClose={closeEventModal}
        defaultDateKey={selectedDateKey}
        initialData={editingEvent}
        onSave={(data) => {
          if (!backendProjectId) return;
          void (async () => {
            try {
              const saved = await apiFetch<CalendarEvent>(editingEvent ? `/api/projects/${encodeURIComponent(backendProjectId)}/events/${encodeURIComponent(editingEvent.id)}` : `/api/projects/${encodeURIComponent(backendProjectId)}/events`, { method: editingEvent ? "PUT" : "POST", body: JSON.stringify(data) });
              setEvents((current) => editingEvent ? current.map((event) => event.id === editingEvent.id ? saved : event) : [...current, saved]);
              setApiError("");
            } catch (error) {
              setApiError(error instanceof Error ? error.message : "ไม่สามารถบันทึกกิจกรรมได้");
            }
          })();
        }}
      />

      {/* Delete Event Confirmation Dialog */}
      <AlertDialogSmall
        open={!!deleteEventId}
        onOpenChange={(open) => {
          if (!open) setDeleteEventId(null);
        }}
        trigger={null}
        title="ลบกิจกรรมนี้?"
        description="คุณแน่ใจหรือไม่ว่าต้องการลบกิจกรรมนี้ออกจากปฏิทิน? เมื่อลบแล้วจะไม่สามารถกู้คืนได้"
        cancelText="ยกเลิก"
        actionText="ลบกิจกรรม"
        onAction={() => {
          if (deleteEventId) {
            void handleDeleteEvent(deleteEventId);
            setDeleteEventId(null);
          }
        }}
      />
    </div>
  );
}
