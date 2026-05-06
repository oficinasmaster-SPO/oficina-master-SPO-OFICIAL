import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { X, Save, Bell, CheckCircle2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ProximoPassoTimeline from "./ProximoPassoTimeline";

const STATUS_OPTS = [
  { value: "pendente",             label: "Pendente" },
  { value: "em_andamento",         label: "Em andamento" },
  { value: "aguardando_cliente",   label: "Aguardando cliente" },
  { value: "aguardando_consultor", label: "Aguardando consultor" },
  { value: "validacao",            label: "Validação" },
  { value: "finalizado",           label: "Finalizado" },
  { value: "cancelado",            label: "Cancelado" },
];

export default function ProximoPassoModal({ passo, onClose, onSaved }) {
  const { user } = useAuth();
  const [status, setStatus] = useState(passo.status);
  const [percentual, setPercentual] = useState(passo.percentual_execucao || 0);
  const [observacoes, setObservacoes] = useState(passo.observacoes_consultor || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const now = new Date().toISOString();
    const novoHistorico = [...(passo.historico || [])];

    if (status !== passo.status) {
      novoHistorico.push({
        tipo: "status_alterado",
        descricao: `Status alterado de "${passo.status}" para "${status}"`,
        de: passo.status,
        para: status,
        usuario_id: user?.id,
        usuario_nome: user?.full_name,
        created_at: now,
      });
    }

    const updates = {
      status,
      percentual_execucao: percentual,
      observacoes_consultor: observacoes,
      historico: novoHistorico,
    };

    if (status === "finalizado" && !passo.data_finalizacao) {
      updates.data_finalizacao = now;
    }
    if (status === "em_andamento" && !passo.data_inicio) {
      updates.data_inicio = now;
    }

    await base44.entities.ConsultoriaProximoPasso.update(passo.id, updates);
    setSaving(false);
    onSaved();
  };

  const handleCobrar = async () => {
    const now = new Date().toISOString();
    const novoHistorico = [
      ...(passo.historico || []),
      {
        tipo: "cobranca",
        descricao: "Consultor cobrou atualização do cliente",
        usuario_id: user?.id,
        usuario_nome: user?.full_name,
        created_at: now,
      },
    ];
    await base44.entities.ConsultoriaProximoPasso.update(passo.id, {
      ultima_cobranca_em: now,
      historico: novoHistorico,
    });
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-100">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900 leading-snug">{passo.titulo}</h2>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
              {passo.responsavel_nome && <span>👤 {passo.responsavel_nome}</span>}
              {passo.prazo && (
                <span className={passo.status === "atrasado" ? "text-red-600 font-semibold" : ""}>
                  📅 {format(parseISO(passo.prazo), "dd/MM/yyyy", { locale: ptBR })}
                </span>
              )}
              {passo.ultima_cobranca_em && (
                <span>🔔 Última cobrança: {format(parseISO(passo.ultima_cobranca_em), "dd/MM/yy", { locale: ptBR })}</span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 ml-3">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Corpo */}
        <div className="p-6 space-y-5">
          {/* Status + % */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Progresso — {percentual}%
              </label>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={percentual}
                onChange={(e) => setPercentual(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Observações do consultor</label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
              placeholder="Anote o que está acontecendo..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          {/* Evidências (visualização) */}
          {passo.evidencias?.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Evidências ({passo.evidencias.length})</label>
              <div className="space-y-1.5">
                {passo.evidencias.map((ev, i) => (
                  <a
                    key={i}
                    href={ev.arquivo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-blue-600 hover:underline"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {ev.descricao || ev.tipo || "Evidência"}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
          <ProximoPassoTimeline historico={passo.historico || []} />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <Button variant="outline" size="sm" onClick={handleCobrar} className="gap-1.5 text-xs">
            <Bell className="w-3.5 h-3.5" /> Cobrar cliente
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">Cancelar</Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5 text-xs">
              {saving ? "Salvando..." : (<><Save className="w-3.5 h-3.5" /> Salvar</>)}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}