import React from "react";

export function ProgressRing({ value = 0, size = 64, strokeWidth = 6, color, label, children }) {
  const radius = Math.max(1, (size - strokeWidth) / 2);
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, value));
  const offset = circumference - (clamped / 100) * circumference;

  const strokeColor = color || (
    clamped >= 70 ? "#22c55e" :
    clamped >= 40 ? "#f59e0b" :
    "#ef4444"
  );

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size} height={size}
        className="absolute inset-0"
        style={{ transform: "rotate(-90deg)" }}
        role="img"
        aria-label={label ?? `${Math.round(clamped)}%`}
      >
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="#e5e7eb" strokeWidth={strokeWidth} fill="none"
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={strokeColor} strokeWidth={strokeWidth} fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
      </svg>
      <div className="relative z-10 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}
