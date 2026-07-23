"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface CustomComboboxProps {
  options?: readonly string[] | string[];
  value?: string;
  onChange?: (val: string) => void;
  onSelect?: (val: string) => void;
  placeholder?: string;
  className?: string;
  allowsEmptyCollection?: boolean;
  showAllOptionsOnOpen?: boolean;
  showCheckmark?: boolean;
  optionSecondarySeparator?: string;
  allowCustomValue?: boolean;
}

export function Combobox({
  options = ["Chonticha", "Beam", "Jane"],
  value = "",
  onChange,
  onSelect,
  placeholder = "เลือกรายการ...",
  className,
  showAllOptionsOnOpen = false,
  showCheckmark = true,
  optionSecondarySeparator,
  allowCustomValue = true,
}: CustomComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [isFiltering, setIsFiltering] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = showAllOptionsOnOpen && isOpen && !isFiltering
    ? options
    : options.filter((opt) =>
        opt.toLowerCase().includes((query || "").toLowerCase())
      );

  const handleSelectOption = (option: string) => {
    setQuery(option);
    if (onChange) onChange(option);
    if (onSelect) onSelect(option);
    setIsFiltering(false);
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        fontSize: "13px",
        fontFamily: "inherit",
      }}
      className={className}
    >
      {/* Trigger Input Box - Matching form-input styling 100% */}
      <div
        onClick={() => {
          if (!isOpen) setIsFiltering(false);
          setIsOpen(!isOpen);
        }}
        className="ts-combobox-trigger"
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          height: "40px",
          minHeight: "40px",
          padding: "0 14px",
          borderRadius: "10px",
          cursor: "pointer",
          boxSizing: "border-box",
          transition: "all 0.15s ease",
        }}
      >
        <input
          type="text"
          value={query}
          readOnly={!allowCustomValue}
          onChange={(e) => {
            if (!allowCustomValue) return;
            setIsFiltering(true);
            setQuery(e.target.value);
            if (onChange) onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="ts-combobox-input"
          style={{
            flex: 1,
            width: "100%",
            border: "none",
            outline: "none",
            backgroundColor: "transparent",
            fontSize: "13px",
            padding: 0,
            margin: 0,
          }}
        />
        <ChevronDown
          style={{
            width: "16px",
            height: "16px",
            color: "#94a3b8",
            flexShrink: 0,
            marginLeft: "8px",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.15s ease",
          }}
        />
      </div>

      {/* Floating Dropdown List Overlay */}
      {isOpen && (
        <div
          className="ts-combobox-dropdown"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 9999,
            maxHeight: "180px",
            overflowY: "auto",
            borderRadius: "12px",
            boxShadow: "0 12px 28px rgba(0, 0, 0, 0.12)",
            padding: "4px",
            boxSizing: "border-box",
          }}
        >
          {filteredOptions.length === 0 ? (
            <div
              className="ts-combobox-empty"
              style={{
                padding: "8px 12px",
                textAlign: "center",
                fontSize: "13px",
              }}
            >
              {allowCustomValue ? "ใช้ข้อความที่พิมพ์เป็นรายการใหม่ได้" : "ไม่พบรายการที่ค้นหา"}
            </div>
          ) : (
            filteredOptions.map((opt) => {
              const isSelected = query === opt;
              const optionParts = optionSecondarySeparator
                ? opt.split(optionSecondarySeparator)
                : [opt];
              const primaryText = optionParts[0];
              const secondaryText = optionParts.slice(1).join(optionSecondarySeparator);
              return (
                <div
                  key={opt}
                  onClick={() => handleSelectOption(opt)}
                  className={`ts-combobox-item ${isSelected ? "selected" : ""}`}
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: isSelected ? 600 : 400,
                    transition: "background 0.15s ease",
                  }}
                >
                  <span
                    style={{
                      minWidth: 0,
                      display: "flex",
                      flexDirection: "column",
                      gap: "2px",
                    }}
                  >
                    <span style={{ whiteSpace: "nowrap" }}>{primaryText}</span>
                    {secondaryText && (
                      <span className="ts-combobox-secondary-text" style={{ fontSize: "11px", fontWeight: 500 }}>
                        {secondaryText}
                      </span>
                    )}
                  </span>
                  {showCheckmark && isSelected && (
                    <Check
                      className="ts-combobox-check"
                      style={{
                        width: "14px",
                        height: "14px",
                        flexShrink: 0,
                        marginLeft: "8px",
                      }}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export function ComboboxInput({ placeholder, value, onChange }: any) {
  return null;
}

export function ComboboxContent({ children }: any) {
  return <>{children}</>;
}

export function ComboboxList({ children }: any) {
  return <>{children}</>;
}

export function ComboboxItem({ children, onClick, id }: any) {
  return null;
}

export function ComboboxEmpty({ children }: any) {
  return <>{children}</>;
}
