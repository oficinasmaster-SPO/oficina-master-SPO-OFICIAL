import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export const TimePicker = React.forwardRef(({ value, onChange, disabled, placeholder, className }, ref) => {
  const [hour, setHour] = useState("");
  const [minute, setMinute] = useState("");
  const hourRef = useRef(null);
  const minuteRef = useRef(null);

  useEffect(() => {
    if (value) {
      const parts = value.split(":");
      setHour(parts[0] || "");
      setMinute(parts[1] || "");
    } else {
      setHour("");
      setMinute("");
    }
  }, [value]);

  const emitChange = (h, m) => {
    if (h !== "" && m !== "") {
      onChange?.(`${h.padStart(2, "0")}:${m.padStart(2, "0")}`);
    }
  };

  const clamp = (val, max) => {
    const num = parseInt(val, 10);
    if (isNaN(num)) return "";
    return String(Math.min(Math.max(num, 0), max)).padStart(2, "0");
  };

  const handleHourChange = (e) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 2);
    setHour(raw);
    if (raw.length === 2) {
      const clamped = clamp(raw, 23);
      setHour(clamped);
      emitChange(clamped, minute);
      minuteRef.current?.focus();
      minuteRef.current?.select();
    }
  };

  const handleMinuteChange = (e) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 2);
    setMinute(raw);
    if (raw.length === 2) {
      const clamped = clamp(raw, 59);
      setMinute(clamped);
      emitChange(hour, clamped);
    }
  };

  const handleHourBlur = () => {
    if (hour !== "") {
      const clamped = clamp(hour, 23);
      setHour(clamped);
      emitChange(clamped, minute);
    }
  };

  const handleMinuteBlur = () => {
    if (minute !== "") {
      const clamped = clamp(minute, 59);
      setMinute(clamped);
      emitChange(hour, clamped);
    }
  };

  const handleHourKeyDown = (e) => {
    if (e.key === ":" || e.key === "Tab" || e.key === "ArrowRight") {
      if (e.key !== "Tab") e.preventDefault();
      minuteRef.current?.focus();
      minuteRef.current?.select();
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const num = parseInt(hour || "0", 10);
      const next = String((num + 1) % 24).padStart(2, "0");
      setHour(next);
      emitChange(next, minute);
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const num = parseInt(hour || "0", 10);
      const next = String((num - 1 + 24) % 24).padStart(2, "0");
      setHour(next);
      emitChange(next, minute);
    }
  };

  const handleMinuteKeyDown = (e) => {
    if (e.key === "Backspace" && minute === "") {
      hourRef.current?.focus();
    }
    if (e.key === "ArrowLeft" && e.target.selectionStart === 0) {
      hourRef.current?.focus();
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const num = parseInt(minute || "0", 10);
      const next = String((num + 1) % 60).padStart(2, "0");
      setMinute(next);
      emitChange(hour, next);
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const num = parseInt(minute || "0", 10);
      const next = String((num - 1 + 60) % 60).padStart(2, "0");
      setMinute(next);
      emitChange(hour, next);
    }
  };

  const segmentClass = "w-12 h-full text-center text-sm font-medium bg-transparent outline-none border border-input rounded-md focus:ring-2 focus:ring-ring focus:border-ring placeholder:text-muted-foreground placeholder:font-normal transition-shadow [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center gap-1.5 w-full h-10",
        disabled && "opacity-50 pointer-events-none",
        className
      )}
    >
      <input
        ref={hourRef}
        type="text"
        inputMode="numeric"
        maxLength={2}
        value={hour}
        onChange={handleHourChange}
        onBlur={handleHourBlur}
        onKeyDown={handleHourKeyDown}
        onFocus={(e) => e.target.select()}
        placeholder="HH"
        disabled={disabled}
        className={segmentClass}
      />
      <span className="text-sm font-bold text-muted-foreground select-none shrink-0">:</span>
      <input
        ref={minuteRef}
        type="text"
        inputMode="numeric"
        maxLength={2}
        value={minute}
        onChange={handleMinuteChange}
        onBlur={handleMinuteBlur}
        onKeyDown={handleMinuteKeyDown}
        onFocus={(e) => e.target.select()}
        placeholder="MM"
        disabled={disabled}
        className={segmentClass}
      />
    </div>
  );
});

TimePicker.displayName = "TimePicker";
export default TimePicker;