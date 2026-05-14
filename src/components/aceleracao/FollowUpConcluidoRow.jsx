import React from "react";
import { format } from "date-fns";
import { Phone, Mail, MessageCircle } from "lucide-react";

const canalIconMap = {
  ligacao: { icon: Phone, label: "Ligação", color: "text-blue-600" },
  email: { icon: Mail, label: "E-mail", color: "text-purple-600" },
  whatsapp: { icon: MessageCircle, label: "WhatsApp", color: "text-green-600" },
};

export default function FollowUpConcluidoRow({ completed, onSelect }) {
  const canalData = canalIconMap[completed?.canal?.toLowerCase()] || {
    icon: null,
    label: completed?.canal || "—",
    color: "text-gray-600"
  };
  const CanalIcon = canalData.icon;

  return (
    <button
      onClick={() => onSelect && onSelect(completed)}
      className="w-full text-left hover:bg-green-50/50 transition-colors px-4 py-2.5 border-b border-gray-100 last:border-b-0"
    >
      <div className="flex items-center gap-4 text-sm">
        {/* Data e Hora */}
        <div className="w-24 flex-shrink-0">
          <span className="text-gray-700 font-medium">
            {completed?.dataContato ? format(new Date(completed.dataContato), "dd/MM") : "—"}
          </span>
          <span className="text-gray-500 text-xs ml-1">
            {completed?.completedAt ? format(new Date(completed.completedAt), "HH:mm") : "—"}
          </span>
        </div>

        {/* Quem concluiu */}
        <div className="w-28 flex-shrink-0 text-gray-600 truncate text-xs">
          {completed?.consultor_nome || "—"}
        </div>

        {/* Canal com ícone */}
        <div className={`w-20 flex-shrink-0 flex items-center gap-1 ${canalData.color}`}>
          {CanalIcon && <CanalIcon className="w-3.5 h-3.5" />}
          <span className="text-xs truncate">{canalData.label}</span>
        </div>

        {/* Status */}
        <div className="flex-shrink-0 ml-auto">
          <span className="text-xs font-medium text-green-600">✓ Concluído</span>
        </div>
      </div>
    </button>
  );
}