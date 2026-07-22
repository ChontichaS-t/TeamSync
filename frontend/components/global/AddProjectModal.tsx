"use client";

import { Calendar as CalendarIcon, Check, ChevronDown, ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export type NewProjectData = {
  id?: number | string;
  title: string;
  description: string;
  cover: string;
  tags: string;
  deadline: string;
  progress: number;
  members: string[];
};

export type AddProjectModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (projectData: NewProjectData) => void;
  initialData?: NewProjectData | null;
};

const COVER_OPTIONS = [
  { id: "blue", cover: "/new/newsea.jpg", label: "Sea Tone", tag: "blue" },
  { id: "purple", cover: "/new/newtrain.jpg", label: "Train Tone", tag: "purple" },
  { id: "pink", cover: "/new/newrabbit.jpg", label: "Rabbit Tone", tag: "pink" },
  { id: "brown", cover: "/new/newgrli.jpg", label: "Coffee Tone", tag: "brown" },
  { id: "red", cover: "/new/newwindow.jpg", label: "Window Tone", tag: "red" },
  { id: "bed", cover: "/new/newbed.jpg", label: "Bed Tone", tag: "bed" },
  { id: "boy", cover: "/new/newboy.jpg", label: "Boy Tone", tag: "boy" },
  { id: "dog", cover: "/new/newdog.jpg", label: "Dog Tone", tag: "dog" },
];

const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

function formatDateToThai(date: Date): string {
  return `${date.getDate()} ${THAI_MONTHS[date.getMonth()]} ${date.getFullYear() + 543}`;
}

function parseThaiDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  const parts = dateStr.replace(/^กำหนดส่ง\s*/, "").split(" ");
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const monthIndex = THAI_MONTHS.indexOf(parts[1]);
    const yearBE = parseInt(parts[2], 10);
    const yearAD = yearBE > 2400 ? yearBE - 543 : yearBE;
    if (!isNaN(day) && monthIndex !== -1 && !isNaN(yearAD)) {
      return new Date(yearAD, monthIndex, day);
    }
  }
  return new Date();
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
        border: "1px solid #e2e8f0",
        boxShadow: "0 14px 36px rgba(15, 23, 42, 0.18)",
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
            border: "1px solid #e2e8f0",
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
            border: "1px solid #e2e8f0",
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
              color: "#64748b",
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
                border: isSelected ? "1px solid var(--theme-primary, #17211e)" : "0",
                borderRadius: "8px",
                backgroundColor: isSelected
                  ? "var(--theme-primary, #17211e)"
                  : isToday
                  ? "#f1f5f9"
                  : "transparent",
                color: isSelected
                  ? "#ffffff"
                  : cell.isCurrentMonth
                  ? "#17211e"
                  : "#94a3b8",
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

export function AddProjectModal({ isOpen, onClose, onSave, initialData }: AddProjectModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCover, setSelectedCover] = useState(COVER_OPTIONS[0]);
  const [deadline, setDeadline] = useState<string>("");

  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const datePickerRef = useRef<HTMLDivElement>(null);

  const isEditMode = Boolean(initialData);

  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      setTitle(initialData.title || "");
      setDescription(initialData.description || "");
      const matchedCover = COVER_OPTIONS.find((c) => c.cover === initialData.cover) || COVER_OPTIONS[0];
      setSelectedCover(matchedCover);
      const cleanedDeadline = (initialData.deadline || "").replace(/^กำหนดส่ง\s*/, "");
      setDeadline(cleanedDeadline || formatDateToThai(new Date()));
    } else {
      setTitle("");
      setDescription("");
      setSelectedCover(COVER_OPTIONS[0]);
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 60);
      setDeadline(formatDateToThai(defaultDate));
    }
  }, [isOpen, initialData]);

  // Click outside to close date picker
  useEffect(() => {
    if (!showDatePicker) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDatePicker]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelectCalendarDate = (date: Date) => {
    setDeadline(formatDateToThai(date));
    setShowDatePicker(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      id: initialData?.id,
      title: title.trim(),
      description: description.trim(),
      cover: selectedCover.cover,
      tags: selectedCover.tag,
      deadline: deadline.trim() || formatDateToThai(new Date()),
      progress: initialData?.progress ?? 0,
      members: initialData?.members?.length ? initialData.members : ["/cv1.png"],
    });

    onClose();
  };

  const selectedDateObj = parseThaiDate(deadline);

  return (
    <div
      className="project-modal-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="project-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-project-title"
      >
        {/* Header */}
        <div className="project-modal-header">
          <div>
            <h2 id="new-project-title">
              {isEditMode ? "แก้ไขโปรเจกต์" : "สร้างโปรเจกต์ใหม่"}
            </h2>
            <p>
              {isEditMode
                ? "ปรับแต่งรายละเอียดของโปรเจกต์นี้"
                : "กรอกข้อมูลรายละเอียดเพื่อเริ่มต้นโปรเจกต์ใหม่สำหรับทีม"}
            </p>
          </div>
          <button
            className="project-modal-close-btn"
            type="button"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X aria-hidden="true" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="project-modal-body">
          {/* Project Name */}
          <div className="project-modal-form-group">
            <label htmlFor="new-project-name">
              ชื่อโปรเจกต์ <span className="required-star">*</span>
            </label>
            <input
              id="new-project-name"
              type="text"
              placeholder="เช่น Badminton Tournament System, Mobile App Redesign"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="project-modal-form-group">
            <label htmlFor="new-project-desc">รายละเอียดโปรเจกต์</label>
            <textarea
              id="new-project-desc"
              rows={2}
              placeholder="อธิบายรายละเอียด สรุปเป้าหมาย หรือขอบเขตของโปรเจกต์นี้..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Cover Selector */}
          <div className="project-modal-form-group">
            <label>เลือกธีมหน้าปกโปรเจกต์</label>
            <div className="cover-picker-grid">
              {COVER_OPTIONS.map((opt) => {
                const isSelected = selectedCover.id === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`cover-picker-card ${isSelected ? "selected" : ""}`}
                    onClick={() => setSelectedCover(opt)}
                  >
                    <div className="cover-picker-img-wrapper">
                      <Image
                        src={opt.cover}
                        alt={opt.label}
                        fill
                        sizes="100px"
                      />
                      {isSelected && (
                        <div className="cover-picker-check">
                          <Check aria-hidden="true" />
                        </div>
                      )}
                    </div>
                    <span className="cover-picker-label">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Deadline with Interactive Calendar Dropdown */}
          <div className="project-modal-form-group" style={{ position: "relative" }} ref={datePickerRef}>
            <label htmlFor="new-project-deadline">
              กำหนดส่ง (Deadline)
            </label>
            <button
              id="new-project-deadline"
              type="button"
              onClick={() => setShowDatePicker((prev) => !prev)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                border: "1px solid #cbd5e1",
                borderRadius: "12px",
                backgroundColor: "#f8fafc",
                fontSize: "14px",
                color: "#0f172a",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.18s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <CalendarIcon style={{ width: 16, height: 16, color: "#64748b" }} />
                <span>{deadline || "เลือกวันกำหนดส่ง"}</span>
              </div>
              <ChevronDown style={{ width: 16, height: 16, color: "#94a3b8" }} />
            </button>

            {/* Mini Calendar Popover */}
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

          {/* Actions */}
          <div className="project-modal-actions">
            <button
              type="button"
              className="project-modal-btn-cancel"
              onClick={onClose}
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="project-modal-btn-submit"
              disabled={!title.trim()}
            >
              {isEditMode ? "บันทึกการเปลี่ยนแปลง" : "สร้างโปรเจกต์"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
