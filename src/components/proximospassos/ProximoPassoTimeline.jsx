import React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  PlusCircle, ArrowRightLeft, Bell, Paperclip,
  MessageSquare, CheckCircle2, Clock
} from "lucide-react";

const TIPO_CONFIG = {
  criacao:        { icon: PlusCircle,     color: "text-blue-500",  bg: "bg-blue-50",   label: "Criação" },
  status_alterado:{ icon: ArrowRightLeft, color: "text-purple-500",bg: "bg-purple-50", label: "Status" },
  cobranca:       { icon: Bell,           color: "text-orange-500",bg: "bg-orange-50", label: "Cobrança" },
  evidencia:      { icon: Paperclip,      color: "text-green-500", bg: "bg-green-50",  label: "Evidência" },
  comentario:     { icon: MessageSquare,  color: "text-gray-500",  bg: "bg-gray-50",   label: "Comentário" },
  finalizacao:    { icon: CheckCircle2,   color: "text-green-600", bg: "bg-green-100", label: "Finalização" },
};

export default function ProximoPassoTimeline({ historico }) {
  if (!historico?.length) {
    return (
      <div className="text-center py-10 text-gray-400">
        <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">Nenhum registro no histórico ainda.</p>
      </div>
    );
  }

  const sorted = [...historico].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );

  return (
    <div className="relative space-y-3">
      {/* Linha vertical */}
      <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-100" />

      {sorted.map((entry, idx) => {
        const cfg = TIPO_CONFIG[entry.tipo] || TIPO_CONFIG.comentario;
        const Icon = cfg.icon;
        return (
          <div key={idx} className="relative flex gap-3 pl-2">
            <div className={`relative z-10 w-6 h-6 rounded-full ${cfg.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
              <Icon className={`w-3 h-3 ${cfg.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-800">{entry.descricao}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {entry.usuario_nome && (
                  <span className="text-xs text-gray-400">{entry.usuario_nome}</span>
                )}
                {entry.created_at && (
                  <span className="text-xs text-gray-300">
                    {format(new Date(entry.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}