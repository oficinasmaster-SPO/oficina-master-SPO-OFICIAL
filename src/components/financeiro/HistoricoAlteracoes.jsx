import React from "react";
import { Clock, User, PlusCircle, Edit2, DollarSign, XCircle } from "lucide-react";

const tipoConfig = {
  criado:                   { icon: PlusCircle,  color: "text-blue-600",  bg: "bg-blue-50",  label: "Criado" },
  editado:                  { icon: Edit2,        color: "text-amber-600", bg: "bg-amber-50", label: "Editado" },
  recebimento_registrado:   { icon: DollarSign,  color: "text-green-600", bg: "bg-green-50", label: "Recebimento Registrado" },
  pagamento_registrado:     { icon: DollarSign,  color: "text-red-600",   bg: "bg-red-50",   label: "Pagamento Registrado" },
  cancelado:                { icon: XCircle,     color: "text-gray-500",  bg: "bg-gray-50",  label: "Cancelado" },
};

function fmtDataHora(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR") + " às " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export default function HistoricoAlteracoes({ historico = [] }) {
  if (!historico.length) {
    return (
      <div className="text-xs text-gray-400 italic py-2 text-center">
        Nenhum histórico registrado.
      </div>
    );
  }

  // Ordenar do mais recente para o mais antigo
  const ordenado = [...historico].sort((a, b) => new Date(b.data_hora) - new Date(a.data_hora));

  return (
    <div className="space-y-2">
      {ordenado.map((item, i) => {
        const cfg = tipoConfig[item.tipo] || tipoConfig.editado;
        const Icon = cfg.icon;
        return (
          <div key={i} className={`flex items-start gap-3 p-2.5 rounded-lg ${cfg.bg}`}>
            <div className={`mt-0.5 shrink-0 ${cfg.color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {item.usuario_nome || item.usuario_email || "—"}
                </span>
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {fmtDataHora(item.data_hora)}
                </span>
              </div>
              {item.detalhes && (
                <p className="text-xs text-gray-600 mt-0.5">{item.detalhes}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}