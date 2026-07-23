"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface CalendarDemoProps {
  selectedDate?: Date;
  onSelectDate?: (date: Date | undefined) => void;
  className?: string;
}

export function CalendarDemo({ selectedDate, onSelectDate }: CalendarDemoProps = {}) {
  const activeDate = selectedDate || new Date();

  const [pickerMonth, setPickerMonth] = React.useState<Date>(
    new Date(activeDate.getFullYear(), activeDate.getMonth(), 1)
  );

  const year = pickerMonth.getFullYear();
  const month = pickerMonth.getMonth();

  const monthNames = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
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

  const selectedKey = `${activeDate.getFullYear()}-${activeDate.getMonth()}-${activeDate.getDate()}`;
  const todayObj = new Date();
  const todayKey = `${todayObj.getFullYear()}-${todayObj.getMonth()}-${todayObj.getDate()}`;

  return (
    <div
      className="mini-calendar-container"
      onClick={(e) => e.stopPropagation()}
      style={{
        width: "280px",
        padding: "14px",
        borderRadius: "18px",
        boxShadow: "0 14px 36px rgba(0, 0, 0, 0.14)",
        position: "relative",
        zIndex: 9999,
        userSelect: "none",
      }}
    >
      {/* Header Month / Year */}
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
          className="mini-calendar-nav"
          style={{
            width: "30px",
            height: "30px",
            display: "grid",
            placeItems: "center",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          <ChevronLeft style={{ width: 16, height: 16 }} />
        </button>
        <span className="mini-calendar-title" style={{ fontWeight: 700, fontSize: "14px" }}>
          {monthNames[month]} {year}
        </span>
        <button
          type="button"
          onClick={handleNext}
          className="mini-calendar-nav"
          style={{
            width: "30px",
            height: "30px",
            display: "grid",
            placeItems: "center",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          <ChevronRight style={{ width: 16, height: 16 }} />
        </button>
      </div>

      {/* Weekdays */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "2px",
          textAlign: "center",
          marginBottom: "6px",
        }}
      >
        {weekdays.map((w) => (
          <span
            key={w}
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "#94a3b8",
              padding: "4px 0",
            }}
          >
            {w}
          </span>
        ))}
      </div>

      {/* Days Grid */}
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
              onClick={() => {
                if (onSelectDate) {
                  onSelectDate(cell.date);
                }
              }}
              className={`mini-calendar-day-btn ${isSelected ? "selected" : ""} ${isToday ? "today" : ""} ${!cell.isCurrentMonth ? "out-month" : ""}`}
              style={{
                height: "32px",
                display: "grid",
                placeItems: "center",
                fontSize: "12px",
                fontWeight: isSelected || isToday ? 700 : 500,
                borderRadius: "8px",
                border: "none",
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
