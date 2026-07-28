import React from "react";
import Avatar from "@/components/ui/Avatar";

/**
 * UserAvatar — wrapper legado que delega para o componente Avatar unificado.
 * Mantém compatibilidade com usos que não passam `src` (apenas iniciais).
 * @param {string} src   - URL da imagem (opcional)
 * @param {string} name  - Nome do usuário
 * @param {string} size  - "sm" | "md" | "lg"
 */
export default function UserAvatar({ src, name, size = "sm", className = "" }) {
  return <Avatar src={src} name={name} size={size} className={className} />;
}

export { getInitials, getAvatarColor } from "@/lib/avatarUtils";