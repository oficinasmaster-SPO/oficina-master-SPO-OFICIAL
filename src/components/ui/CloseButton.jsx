import React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CloseButton({ onClick, className, size = "md" }) {
  const sizes = {
    sm: "p-1.5 [&_svg]:w-4 [&_svg]:h-4",
    md: "p-2 [&_svg]:w-5 [&_svg]:h-5",
    lg: "p-2.5 [&_svg]:w-6 [&_svg]:h-6",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative rounded-full transition-colors duration-200 hover:bg-red-100 hover:text-red-600 text-gray-400 overflow-hidden group",
        sizes[size],
        className
      )}
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <span className="absolute inset-0 rounded-full bg-red-500 opacity-0 group-active:opacity-20 group-active:animate-ping" />
      <X className="relative z-10" />
    </button>
  );
}