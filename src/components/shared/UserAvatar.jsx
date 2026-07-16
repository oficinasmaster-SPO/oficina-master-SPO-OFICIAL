import React from "react";

const AVATAR_COLORS = [
  "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500",
  "bg-pink-500", "bg-teal-500", "bg-indigo-500", "bg-red-500",
  "bg-amber-500", "bg-cyan-500",
];

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getColor(name) {
  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/**
 * UserAvatar — Avatar com iniciais e cor determinística.
 * @param {string} name - Nome do usuário
 * @param {string} size - "sm" | "md" | "lg"
 */
export default function UserAvatar({ name, size = "sm", className = "" }) {
  const sizeClass = {
    sm: "w-7 h-7 text-xs",
    md: "w-9 h-9 text-sm",
    lg: "w-11 h-11 text-base",
  }[size] || "w-7 h-7 text-xs";

  return (
    <div className={`${sizeClass} ${getColor(name)} rounded-full flex items-center justify-center text-white font-medium flex-shrink-0 ${className}`}>
      {getInitials(name)}
    </div>
  );
}

export { getInitials, getColor };