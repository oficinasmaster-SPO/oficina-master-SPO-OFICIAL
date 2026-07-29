import React from "react";
import { getInitials, getAvatarColor } from "@/lib/avatarUtils";

export default function WorkshopAvatar({ name, size = "md", className = "" }) {
  const { bg, text } = getAvatarColor(name);
  const initials = getInitials(name);

  const sizes = {
    sm: "w-6 h-6 text-[10px]",
    md: "w-8 h-8 text-xs",
    lg: "w-10 h-10 text-sm",
  };

  return (
    <div
      className={`flex-shrink-0 rounded-full flex items-center justify-center font-bold ${sizes[size] || sizes.md} ${bg} ${text} ${className}`}
      title={name}
    >
      {initials}
    </div>
  );
}
