import React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PlusCircle, ShoppingCart, CheckCircle2, XCircle, Clock, AlertTriangle, Bell } from "lucide-react";

const EVENT_CONFIG = {
  created: {
    icon: PlusCircle,
    color: "text-blue-600",
    bg: "bg-blue-100",
    line: "border-blue-200",
    label: "Criação",
  },
  used: {
    icon: ShoppingCart,
    color: "text-purple-600",
    bg: "bg-purple-100",
    line: "border-purple-200",
    label: "Utilização",
  },
  approved: {
    icon: CheckCircle2,
    color: "text-green-600",
    bg: "bg-green-100",
    line: "border-green-200",
    label: "Aprovação",
  },
  rejected: {
    icon: XCircle,
    color: "text-red-600",
    bg: "bg-red-100",
    line: "border-red-200",
    label: "Rejeição",
  },
  expired: {
    icon: Clock,
    color: "text-gray-500",
    bg: "bg-gray-100",
    line: "border-gray-200",
    label: "Expiração",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-yellow-600",
    bg: "bg-yellow-100",
    line: "border-yellow-200",
    label: "Alerta",
  },
};

export default function VoucherTimelineItem({ item, isLast }) {
  const config = EVENT_CONFIG[item.type] || EVENT_CONFIG.warning;
  const Icon = config.icon;

  return (
    <div className="flex gap-3">
      {/* Vertical line + icon */}
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full ${config.bg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-4 h-4 ${config.color}`} />
        </div>
        {!isLast && <div className={`w-0.5 flex-1 border-l-2 ${config.line} min-h-[24px]`} />}
      </div>

      {/* Content */}
      <div className={`pb-4 ${isLast ? "" : ""}`}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-semibold uppercase ${config.color}`}>
            {config.label}
          </span>
          {item.date && (
            <span className="text-xs text-gray-400">
              {format(new Date(item.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-700 mt-0.5">{item.description}</p>
        <p className="text-xs text-gray-400 mt-0.5">por {item.actor}</p>

        {item.extra?.discount_applied != null && (
          <p className="text-xs text-green-600 mt-1">
            Desconto aplicado: R$ {item.extra.discount_applied.toFixed(2)}
          </p>
        )}
        {item.extra?.negotiation_notes && (
          <p className="text-xs text-gray-500 mt-1 italic">
            Negociação: {item.extra.negotiation_notes}
          </p>
        )}
      </div>
    </div>
  );
}