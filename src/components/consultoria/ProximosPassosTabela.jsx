import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const STATUS_CONFIG = {
  pendente:             { label: "Pendente",            bg: "bg-gray-100",   text: "text-gray-700" },
  em_andamento:         { label: "Em andamento",        bg: "bg-blue-100",   text: "text-blue-700" },
  aguardando_cliente:   { label: "Ag. Cliente",         bg: "bg-yellow-100", text: "text-yellow-700" },
  aguardando_consultor: { label: "Ag. Consultor",       bg: "bg-purple-100", text: "text-purple-700" },
  validacao:            { label: "Validação",            bg: "bg-indigo-100", text: "text-indigo-700" },
  atrasado:             { label: "Atrasado",             bg: "bg-red-100",    text: "text-red-700" },
  finalizado:           { label: "Finalizado",           bg: "bg-green-100",  text: "text-green-700" },
  cancelado:            { label: "Cancelado",            bg: "bg-gray-200",   text: "text-gray-500" },
};

const PRIORIDADE_CONFIG = {
  critica: { label: "Crítica", dot: "bg-red-500" },
  alta:    { label: "Alta",    dot: "bg-orange-400" },
  media:   { label: "Média",   dot: "bg-yellow-400" },
  baixa:   { label: "Baixa",   dot: "bg-gray-300" },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pendente;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

function ProgressBar({ value }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5 min-w-[60px]">
        <div
          className="h-1.5 rounded-full bg-blue-500 transition-all"
          style={{ width: `${value || 0}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 w-8 text-right">{value || 0}%</span>
    </div>
  );
}

export default function ProximosPassosTabela({ passos, onAbrir }) {
  if (!passos.length) {
    return (
      <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl">
        <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
          <Zap className="w-7 h-7 text-gray-300" />
        </div>
        <p className="text-sm font-semibold text-gray-400">Nenhum próximo passo encontrado</p>
        <p className="text-xs text-gray-400 mt-1">Ajuste os filtros ou registre novos atendimentos</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ação</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Responsável</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Prazo</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Progresso</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Prioridade</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {passos.map((p) => {
              const prio = PRIORIDADE_CONFIG[p.prioridade] || PRIORIDADE_CONFIG.media;
              return (
                <tr key={p.id} className="hover:bg-gray-50/80 transition-colors group">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 max-w-xs truncate">{p.titulo}</p>
                    {p.workshop_id && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{p.workshop_nome || p.workshop_id.slice(0, 8)}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.responsavel_nome || "—"}</td>
                  <td className="px-4 py-3">
                    {p.prazo ? (
                      <span className={`text-xs font-medium ${p.status === "atrasado" ? "text-red-600" : "text-gray-600"}`}>
                        {format(parseISO(p.prazo), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3 min-w-[120px]"><ProgressBar value={p.percentual_execucao} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${prio.dot}`} />
                      <span className="text-xs text-gray-500">{prio.label}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onAbrir(p)}
                      className="h-7 text-xs gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Abrir <ArrowRight className="w-3 h-3" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden divide-y divide-gray-100">
        {passos.map((p) => (
          <div key={p.id} className="p-4 space-y-2" onClick={() => onAbrir(p)}>
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium text-gray-900 text-sm">{p.titulo}</p>
              <StatusBadge status={p.status} />
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>{p.responsavel_nome || "Sem responsável"}</span>
              {p.prazo && <span>· {format(parseISO(p.prazo), "dd/MM/yy", { locale: ptBR })}</span>}
            </div>
            <ProgressBar value={p.percentual_execucao} />
          </div>
        ))}
      </div>
    </div>
  );
}