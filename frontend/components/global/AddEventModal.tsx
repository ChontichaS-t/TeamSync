"use client";

import { CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type NewEventData = {
  title: string;
  dateKey: string;
  time: string;
  location: string;
  tone: "blue" | "green" | "orange" | "purple";
};

export type AddEventModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (eventData: NewEventData) => void;
  defaultDateKey?: string;
};

function parseDateKey(key: string): Date {
  if (!key) return new Date();
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function MiniCalendarPicker({
  selectedDate,
  onSelectDate,
}: {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}) {
  const [pickerMonth, setPickerMonth] = useState<Date>(
    new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  );

  const year = pickerMonth.getFullYear();
  const month = pickerMonth.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const weekdays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const handlePrev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPickerMonth(new Date(year, month - 1, 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPickerMonth(new Date(year, month + 1, 1));
  };

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells = [];
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const dNum = daysInPrevMonth - i;
    cells.push({
      date: new Date(year, month - 1, dNum),
      dayNum: dNum,
      isCurrentMonth: false,
    });
  }
  for (let dNum = 1; dNum <= daysInMonth; dNum++) {
    cells.push({
      date: new Date(year, month, dNum),
      dayNum: dNum,
      isCurrentMonth: true,
    });
  }
  const remaining = 35 - cells.length > 0 ? 35 - cells.length : 42 - cells.length;
  for (let dNum = 1; dNum <= remaining; dNum++) {
    cells.push({
      date: new Date(year, month + 1, dNum),
      dayNum: dNum,
      isCurrentMonth: false,
    });
  }

  const selectedKey = `${selectedDate.getFullYear()}-${selectedDate.getMonth()}-${selectedDate.getDate()}`;
  const todayObj = new Date();
  const todayKey = `${todayObj.getFullYear()}-${todayObj.getMonth()}-${todayObj.getDate()}`;

  return (
    <div
      style={{
        width: "280px",
        padding: "14px",
        backgroundColor: "#ffffff",
        borderRadius: "18px",
        border: "1px solid #e5e7eb",
        boxShadow: "0 14px 36px rgba(0, 0, 0, 0.12)",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "12px",
        }}
      >
        <button
          type="button"
          onClick={handlePrev}
          style={{
            width: "30px",
            height: "30px",
            display: "grid",
            placeItems: "center",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            backgroundColor: "#ffffff",
            color: "#17211e",
            cursor: "pointer",
          }}
        >
          <ChevronLeft style={{ width: 16, height: 16 }} />
        </button>
        <span style={{ fontWeight: 700, fontSize: "14px", color: "#17211e" }}>
          {monthNames[month]} {year}
        </span>
        <button
          type="button"
          onClick={handleNext}
          style={{
            width: "30px",
            height: "30px",
            display: "grid",
            placeItems: "center",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            backgroundColor: "#ffffff",
            color: "#17211e",
            cursor: "pointer",
          }}
        >
          <ChevronRight style={{ width: 16, height: 16 }} />
        </button>
      </div>

      {/* Weekdays Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "4px",
          textAlign: "center",
          marginBottom: "8px",
        }}
      >
        {weekdays.map((w) => (
          <span
            key={w}
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "#6b7280",
              textTransform: "uppercase",
            }}
          >
            {w}
          </span>
        ))}
      </div>

      {/* Days Matrix */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "4px",
        }}
      >
        {cells.map((cell, idx) => {
          const cellKey = `${cell.date.getFullYear()}-${cell.date.getMonth()}-${cell.date.getDate()}`;
          const isSelected = cellKey === selectedKey;
          const isToday = cellKey === todayKey;

          return (
            <button
              key={idx}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSelectDate(cell.date);
              }}
              style={{
                height: "32px",
                display: "grid",
                placeItems: "center",
                border: isSelected ? "1px solid #17211e" : "0",
                borderRadius: "8px",
                backgroundColor: isSelected
                  ? "#17211e"
                  : isToday
                  ? "#f3f4f6"
                  : "transparent",
                color: isSelected
                  ? "#ffffff"
                  : cell.isCurrentMonth
                  ? "#17211e"
                  : "#9ca3af",
                fontSize: "12px",
                fontWeight: isSelected || isToday ? 700 : 500,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {cell.dayNum}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function AddEventModal({
  isOpen,
  onClose,
  onSave,
  defaultDateKey,
}: AddEventModalProps) {
  const [title, setTitle] = useState<string>("");
  const [dateKey, setDateKey] = useState<string>("");
  const [time, setTime] = useState<string>("10:00");
  const [location, setLocation] = useState<string>("Google Meet");
  const [tone, setTone] = useState<"blue" | "green" | "orange" | "purple">("blue");

  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const datePickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (defaultDateKey) {
      setDateKey(defaultDateKey);
    } else {
      setDateKey(formatDateKey(new Date()));
    }
  }, [defaultDateKey, isOpen]);

  // Click outside to close MiniCalendarPicker
  useEffect(() => {
    if (!showDatePicker) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        datePickerRef.current &&
        !datePickerRef.current.contains(event.target as Node)
      ) {
        setShowDatePicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDatePicker]);

  if (!isOpen) return null;

  const selectedDateObj = parseDateKey(dateKey);

  const handleSelectCalendarDate = (d: Date) => {
    setDateKey(formatDateKey(d));
    setShowDatePicker(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      title: title.trim(),
      dateKey,
      time,
      location: location.trim() || "Online",
      tone,
    });

    setTitle("");
    setShowDatePicker(false);
    onClose();
  };

  return (
    <div className="calendar-modal-backdrop" onClick={onClose}>
      <div
        className="calendar-modal-content"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="calendar-modal-header">
          <h3>Add New Event</h3>
          <button
            className="calendar-modal-close"
            type="button"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="calendar-modal-form">
          <div className="form-group">
            <label htmlFor="modal-evt-title">Event Title</label>
            <input
              id="modal-evt-title"
              type="text"
              placeholder="e.g. Design Sync"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onFocus={() => setShowDatePicker(false)}
              required
              autoFocus
            />
          </div>

          <div className="form-row">
            <div className="form-group" style={{ position: "relative" }} ref={datePickerRef}>
              <label htmlFor="modal-evt-date">Date</label>
              <button
                id="modal-evt-date"
                type="button"
                className="date-picker-trigger-btn"
                onClick={() => setShowDatePicker((prev) => !prev)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  border: "1px solid #d1d5db",
                  borderRadius: "10px",
                  backgroundColor: "#ffffff",
                  fontSize: "14px",
                  color: "#17211e",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span>{dateKey || "Select Date"}</span>
                <CalendarIcon style={{ width: 16, height: 16, color: "#68767b" }} />
              </button>

              {/* Styled Mini Calendar Popover */}
              {showDatePicker && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    zIndex: 100,
                    marginTop: "6px",
                  }}
                >
                  <MiniCalendarPicker
                    selectedDate={selectedDateObj}
                    onSelectDate={handleSelectCalendarDate}
                  />
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="modal-evt-time">Time</label>
              <input
                id="modal-evt-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                onFocus={() => setShowDatePicker(false)}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="modal-evt-location">Location / Link</label>
            <input
              id="modal-evt-location"
              type="text"
              placeholder="e.g. Meeting Room A or Google Meet"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onFocus={() => setShowDatePicker(false)}
            />
          </div>

          <div className="form-group">
            <label>Category Tone</label>
            <div className="tone-selector">
              {(["blue", "green", "orange", "purple"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`tone-chip ${t} ${tone === t ? "selected" : ""}`}
                  onClick={() => {
                    setTone(t);
                    setShowDatePicker(false);
                  }}
                >
                  {t === "blue" && "Sync"}
                  {t === "green" && "Review"}
                  {t === "orange" && "Deadline"}
                  {t === "purple" && "Task"}
                </button>
              ))}
            </div>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="modal-cancel-btn"
              onClick={onClose}
            >
              Cancel
            </button>
            <button type="submit" className="modal-submit-btn">
              Save Event
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
