import React, { useState } from "react";
import { getInitials, getAvatarColor } from "@/lib/avatarUtils";

/**
 * Avatar de workshop/cliente.
 *
 * Props:
 *  - name:       nome do cliente (usado para iniciais e cor de fallback)
 *  - size:       "sm" | "md" | "lg"
 *  - logo_url:   URL da logo da empresa (opcional). Quando presente,
 *                renderiza <img> com fallback automático para iniciais.
 *  - className:  classes extras
 *
 * Exemplo:
 *   <WorkshopAvatar name="Euro Car" logo_url={logosByWorkshop[wid]} />
 */
export default function WorkshopAvatar({ name, size = "md", logo_url, className = "" }) {
  const [imgError, setImgError] = useState(false);
  const { bg, text } = getAvatarColor(name);
  const initials = getInitials(name);

  const sizes = {
    sm: "w-6 h-6 text-[10px]",
    md: "w-8 h-8 text-xs",
    lg: "w-10 h-10 text-sm",
  };

  const showImage = logo_url && !imgError;

  return (
    <div
      className={`flex-shrink-0 rounded-full flex items-center justify-center font-bold overflow-hidden ${sizes[size] || sizes.md} ${showImage ? "bg-gray-100" : `${bg} ${text}`} ${className}`}
      title={name}
    >
      {showImage ? (
        <img
          src={logo_url}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        initials
      )}
    </div>
  );
}