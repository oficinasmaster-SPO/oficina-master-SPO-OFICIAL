import React, { useState } from "react";
import { getInitials, getAvatarColor } from "@/lib/avatarUtils";

const SIZE_MAP = {
  sm: "w-7 h-7 text-xs",
  md: "w-11 h-11 text-sm",
  lg: "w-16 h-16 text-lg",
};

/**
 * Avatar — avatar reutilizável com imagem, fallback de iniciais e cor determinística.
 * @param {string} src       - URL da imagem
 * @param {string} name      - Nome do colaborador (para iniciais e cor)
 * @param {string} size      - "sm" | "md" | "lg"
 * @param {string} className  - Classes extras
 */
export default function Avatar({ src, name, size = "md", className = "" }) {
  const [imgError, setImgError] = useState(false);
  const { bg, text } = getAvatarColor(name);
  const sizeClass = SIZE_MAP[size] || SIZE_MAP.md;
  const showImage = src && !imgError;

  return (
    <div
      className={`${sizeClass} ${showImage ? "" : `${bg} ${text}`} flex-shrink-0 rounded-full overflow-hidden flex items-center justify-center font-medium ${className}`}
    >
      {showImage ? (
        <img
          src={src}
          alt={name || "Avatar"}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span>{getInitials(name)}</span>
      )}
    </div>
  );
}