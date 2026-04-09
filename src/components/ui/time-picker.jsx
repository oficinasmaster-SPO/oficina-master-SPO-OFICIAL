import React from "react";
import { cn } from "@/lib/utils";

export const TimePicker = React.forwardRef(({ value, onChange, disabled, className }, ref) => {
  return (
    <input
      ref={ref}
      type="time"
      value={value || ""}
      onChange={(e) => onChange?.(e.target.value)}
      disabled={disabled}
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    />
  );
});

TimePicker.displayName = "TimePicker";
export default TimePicker;