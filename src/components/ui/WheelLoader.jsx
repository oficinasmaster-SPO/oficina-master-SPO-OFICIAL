import React from 'react';
import { cn } from "@/lib/utils";

export default function WheelLoader({ className, size = 'md', text = "Carregando..." }) {
  const sizeMap = {
    sm: { container: 'w-8 h-8', stroke: 2 },
    md: { container: 'w-12 h-12', stroke: 2.5 },
    lg: { container: 'w-16 h-16', stroke: 3 },
    xl: { container: 'w-20 h-20', stroke: 3 },
  };
  const s = sizeMap[size] || sizeMap.md;

  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      {/* SVG spinner inline — sem dependência de rede, sem CLS */}
      <svg
        className={cn(s.container, "animate-spin")}
        viewBox="0 0 50 50"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <circle cx="25" cy="25" r="20" stroke="#e2e8f0" strokeWidth={s.stroke} />
        <path
          d="M25 5 A20 20 0 0 1 45 25"
          stroke="#FF0000"
          strokeWidth={s.stroke}
          strokeLinecap="round"
        />
      </svg>
      {text && (
        <span className="text-sm font-medium text-slate-500">{text}</span>
      )}
    </div>
  );
}