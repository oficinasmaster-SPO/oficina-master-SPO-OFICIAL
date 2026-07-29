import React from "react";
import { MessageCircle, Phone, Mail, MapPin, Video } from "lucide-react";

const CHANNEL_CONFIG = {
  whatsapp:   { Icon: MessageCircle, bg: "bg-green-500",  label: "WhatsApp",   color: "text-green-600",  badge: "bg-green-50 border-green-200" },
  ligacao:    { Icon: Phone,         bg: "bg-blue-500",   label: "Ligação",    color: "text-blue-600",   badge: "bg-blue-50 border-blue-200" },
  email:      { Icon: Mail,          bg: "bg-indigo-500", label: "E-mail",     color: "text-indigo-600", badge: "bg-indigo-50 border-indigo-200" },
  presencial: { Icon: MapPin,        bg: "bg-gray-500",   label: "Presencial", color: "text-gray-600",   badge: "bg-gray-50 border-gray-200" },
  meet:       { Icon: Video,         bg: "bg-purple-500", label: "Meet",       color: "text-purple-600", badge: "bg-purple-50 border-purple-200" },
  video:      { Icon: Video,         bg: "bg-purple-500", label: "Vídeo",      color: "text-indigo-600", badge: "bg-indigo-50 border-indigo-200" },
  preventivo: { Icon: Phone,         bg: "bg-teal-500",   label: "Preventivo", color: "text-teal-600",   badge: "bg-teal-50 border-teal-200" },
};

// Dot: círculo colorido com ícone — uso em linhas de lista
export function ChannelDot({ canal, title }) {
  const cfg = CHANNEL_CONFIG[canal?.toLowerCase()];
  if (!cfg) return null;
  const { Icon, bg, label } = cfg;
  return (
    <div
      className={`w-5 h-5 rounded-full ${bg} flex items-center justify-center flex-shrink-0`}
      title={title || label}
    >
      <Icon className="w-3 h-3 text-white" />
    </div>
  );
}

// Badge: pill com ícone + rótulo — uso em detail / concluído
export function ChannelBadge({ canal }) {
  const cfg = CHANNEL_CONFIG[canal?.toLowerCase()];
  if (!cfg) return <span className="text-gray-300">—</span>;
  const { Icon, color, badge, label } = cfg;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-xs ${color} ${badge}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

export default CHANNEL_CONFIG;
