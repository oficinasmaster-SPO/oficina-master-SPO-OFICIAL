import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const TIPO_CONFIG = {
  criacao:        { emoji: "🟢", label: "Criado" },
  status_alterado:{ emoji: "🔄", label: "Status alterado" },
  cobranca:       { emoji: "🔔", label: "Cobrança" },
  evidencia:      { emoji: "📎", label: "Evidência" },
  comentario:     { emoji: "💬", label: "Comentário" },
  finalizacao:    { emoji: "✅", label: "Finalizado" },
};

export default function ProximoPassoTimeline({ historico }) {
  if (!historico?.length) return null;

  const sorted = [...historico].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );

  return (
    <div>
      <p className="text-xs font-semibold text-gray-600 mb-2">Timeline</p>
      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
        {sorted.map((item, i) => {
          const cfg = TIPO_CONFIG[item.tipo] || { emoji: "•", label: item.tipo };
          return (
            <div key={i} className="flex items-start gap-2.5 text-xs">
              <span className="text-base leading-none mt-0.5">{cfg.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-gray-700">{item.descricao || cfg.label}</p>
                {item.usuario_nome && (
                  <p className="text-gray-400">{item.usuario_nome}</p>
                )}
              </div>
              {item.created_at && (
                <span className="text-gray-400 flex-shrink-0">
                  {format(parseISO(item.created_at), "dd/MM HH:mm", { locale: ptBR })}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}