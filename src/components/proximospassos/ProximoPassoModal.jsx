import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  X, Clock, CheckCircle2, AlertTriangle, MessageSquare,
  Paperclip, History, Save, Bell, Phone, FileText, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import ProximoPassoTimeline from "./ProximoPassoTimeline";
import EvidenciasUploader from "./EvidenciasUploader";
import ProgressBarExecucao from "./ProgressBarExecucao";
import ClienteDataTab from "./ClienteDataTab";
import VisualizarAtaModal from "@/components/aceleracao/VisualizarAtaModal";

const STATUS_OPTIONS = [
  { value: "pendente",             label: "Pendente" },
  { value: "em_andamento",         label: "Em andamento" },
  { value: "aguardando_cliente",   label: "Aguardando cliente" },
  { value: "aguardando_consultor", label: "Aguardando consultor" },
  { value: "validacao",            label: "Validação" },
  { value: "finalizado",           label: "Finalizado" },
  { value: "atrasado",             label: "Atrasado" },
  { value: "cancelado",            label: "Cancelado" },
];

const PRIORIDADE_OPTIONS = [
  { value: "baixa",   label: "Baixa" },
  { value: "media",   label: "Média" },
  { value: "alta",    label: "Alta" },
  { value: "critica", label: "Crítica" },
];

const CANAL_OPTIONS = [
  { value: "ligacao",     label: "Ligação" },
  { value: "whatsapp",    label: "WhatsApp" },
  { value: "email",       label: "E-mail" },
  { value: "video",       label: "Vídeo" },
  { value: "presencial",  label: "Presencial" },
];

const RESULTADO_OPTIONS = [
  { value: "atendeu",    label: "Atendeu" },
  { value: "nao_atendeu", label: "Não atendeu" },
  { value: "retornar",   label: "Retornar" },
  { value: "agendou",    label: "Agendou" },
  { value: "reagendou",  label: "Reagendou" },
  { value: "desistiu",   label: "Desistiu" },
];

const PROXIMO_PASSO_OPTIONS = [
  { value: "reagendar",  label: "Reagendar" },
  { value: "agendar",    label: "Agendar" },
  { value: "enviar",     label: "Enviar" },
  { value: "escalar",    label: "Escalar" },
  { value: "concluir",   label: "Concluir" },
  { value: "cancelar",   label: "Cancelar" },
];

export default function ProximoPassoModal({ passo, onClose, onSaved }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("detalhes");

  // Estado principal do próximo passo
  const [status, setStatus] = useState(passo.status || "pendente");
  const [percentual, setPercentual] = useState(passo.percentual_execucao || 0);
  const [prioridade, setPrioridade] = useState(passo.prioridade || "media");
  const [observacoes, setObservacoes] = useState(passo.observacoes_consultor || "");
  const [evidencias, setEvidencias] = useState(passo.evidencias || []);
  const [ataParaVisualizar, setAtaParaVisualizar] = useState(null);

  // Estado dos FUs da semana vinculados
  const [fusDaSemana, setFusDaSemana] = useState([]);
  const [encerrarFUs, setEncerrarFUs] = useState(true);
  const [fuCanal, setFuCanal] = useState("whatsapp");
  const [fuResultado, setFuResultado] = useState("atendeu");
  const [fuObservacoes, setFuObservacoes] = useState("");
  const [fuProximoPasso, setFuProximoPasso] = useState("reagendar");

  // Buscar FUs pendentes da semana vinculados a esta ATA
  useEffect(() => {
    const ataId = passo.ata_id || passo.consultoria_atendimento_id;
    if (!ataId) return;

    const hoje = new Date();
    const inicioSemana = format(startOfWeek(hoje, { weekStartsOn: 1 }), "yyyy-MM-dd");
    const fimSemana = format(endOfWeek(hoje, { weekStartsOn: 1 }), "yyyy-MM-dd");

    base44.entities.FollowUpReminder.filter({ ata_id: ataId, is_completed: false })
      .then(fus => {
        const fusSemana = (fus || []).filter(f =>
          f.reminder_date >= inicioSemana && f.reminder_date <= fimSemana
        );
        setFusDaSemana(fusSemana);
      })
      .catch(() => setFusDaSemana([]));
  }, [passo.ata_id, passo.consultoria_atendimento_id]);

  const temFusSemana = fusDaSemana.length > 0;

  // Dar baixa nos FUs da semana
  const darBaixaFUs = async (resultadoOverride) => {
    if (!temFusSemana || !encerrarFUs) return;

    const now = new Date().toISOString();
    const hoje = format(new Date(), "yyyy-MM-dd");
    const resultadoFinal = resultadoOverride || fuResultado;

    await Promise.all(fusDaSemana.map(async (fu) => {
      await base44.entities.FollowUpReminder.update(fu.id, {
        is_completed: true,
        completed_at: now,
      });

      await base44.entities.FollowUpConcluido.create({
        followup_id: fu.id,
        workshop_id: fu.workshop_id,
        consultor_id: fu.consultor_id || user?.id,
        consultor_nome: fu.consultor_nome || user?.full_name,
        canal: fuCanal,
        resultado: resultadoFinal,
        dataContato: hoje,
        duracao: 0,
        observacoes: fuObservacoes || observacoes || `Encerrado via Próximo Passo: ${passo.titulo}`,
        compromissos: "",
        proximoPasso: fuProximoPasso,
        completedAt: now,
      });
    }));

    // Invalida queries de follow-ups em todas as telas
    queryClient.invalidateQueries({ queryKey: ["followup-reminders"] });
    queryClient.invalidateQueries({ queryKey: ["followups"] });
    queryClient.invalidateQueries({ queryKey: ["central-follow-up"] });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const historicoAtual = passo.historico || [];
      const novasEntradas = [];

      let statusFinal = status;
      if (percentual === 100 && status !== "finalizado") {
        statusFinal = "finalizado";
        novasEntradas.push({
          tipo: "status_alterado",
          descricao: "Auto-finalizado ao atingir 100% de execução",
          de: status, para: "finalizado",
          usuario_id: user?.id, usuario_nome: user?.full_name || user?.email, created_at: now,
        });
      }

      if (statusFinal !== passo.status && !novasEntradas.some(e => e.tipo === "status_alterado")) {
        novasEntradas.push({
          tipo: "status_alterado",
          descricao: `Status alterado de "${passo.status}" para "${statusFinal}"`,
          de: passo.status, para: statusFinal,
          usuario_id: user?.id, usuario_nome: user?.full_name || user?.email, created_at: now,
        });
      }

      if (percentual !== passo.percentual_execucao) {
        novasEntradas.push({
          tipo: "comentario",
          descricao: `Progresso atualizado para ${percentual}%`,
          usuario_id: user?.id, usuario_nome: user?.full_name || user?.email, created_at: now,
        });
      }

      if (evidencias.length > (passo.evidencias || []).length) {
        novasEntradas.push({
          tipo: "evidencia", descricao: "Nova evidência anexada",
          usuario_id: user?.id, usuario_nome: user?.full_name || user?.email, created_at: now,
        });
      }

      await base44.entities.ConsultoriaProximoPasso.update(passo.id, {
        status: statusFinal,
        percentual_execucao: percentual,
        prioridade,
        observacoes_consultor: observacoes,
        evidencias,
        historico: [...historicoAtual, ...novasEntradas],
        ...(statusFinal === "finalizado" && !passo.data_finalizacao ? { data_finalizacao: now } : {}),
        ...(statusFinal === "em_andamento" && !passo.data_inicio ? { data_inicio: now } : {}),
      });

      // Dar baixa nos FUs da semana
      await darBaixaFUs();

      queryClient.invalidateQueries({ queryKey: ["central-proximos-passos"] });
      queryClient.invalidateQueries({ queryKey: ["proximos-passos-consultoria"] });
      onSaved();
    } catch (err) {
      console.error("Erro ao salvar próximo passo:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleCobrar = async () => {
    try {
      const now = new Date().toISOString();
      const historicoAtual = passo.historico || [];
      await base44.entities.ConsultoriaProximoPasso.update(passo.id, {
        ultima_cobranca_em: now,
        historico: [...historicoAtual, {
          tipo: "cobranca",
          descricao: "Consultor registrou cobrança ao responsável",
          usuario_id: user?.id, usuario_nome: user?.full_name || user?.email, created_at: now,
        }],
      });

      // Cobrança: resultado padrão = retornar
      await darBaixaFUs("retornar");

      queryClient.invalidateQueries({ queryKey: ["central-proximos-passos"] });
      queryClient.invalidateQueries({ queryKey: ["proximos-passos-consultoria"] });
      onSaved();
    } catch (err) {
      console.error("Erro ao registrar cobrança:", err);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Deseja deletar "${passo.titulo}"?\n\nEsta ação não pode ser desfeita.`)) return;
    try {
      setSaving(true);
      await base44.entities.ConsultoriaProximoPasso.delete(passo.id);
      queryClient.invalidateQueries({ queryKey: ["central-proximos-passos"] });
      onSaved();
    } catch (err) {
      console.error("Erro ao deletar próximo passo:", err);
      alert("Erro ao deletar próximo passo");
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: "detalhes",   label: "Detalhes",   icon: CheckCircle2 },
    { id: "evidencias", label: "Evidências",  icon: Paperclip },
    { id: "historico",  label: "Histórico",   icon: History },
    { id: "cliente",    label: "Cliente",     icon: Phone },
    { id: "ata",        label: "ATA",         icon: FileText },
  ];

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-base font-bold text-gray-900 truncate">{passo.titulo}</h2>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
              {passo.responsavel_nome && <span>👤 {passo.responsavel_nome}</span>}
              {passo.prazo && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {format(new Date(passo.prazo), "dd/MM/yyyy", { locale: ptBR })}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-5 gap-1 overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">

          {activeTab === "detalhes" && (
            <div className="space-y-5">
              {/* Status + Prioridade */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1.5">Status</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1.5">Prioridade</label>
                  <select
                    value={prioridade}
                    onChange={e => setPrioridade(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    {PRIORIDADE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Percentual */}
              <ProgressBarExecucao value={percentual} onChange={setPercentual} />

              {/* Observações */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1.5 flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5" /> Observações do consultor
                </label>
                <textarea
                  value={observacoes}
                  onChange={e => setObservacoes(e.target.value)}
                  rows={3}
                  placeholder="Anotações, bloqueios, orientações..."
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                />
              </div>

              {/* Última cobrança */}
              {passo.ultima_cobranca_em && (
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <Bell className="w-3.5 h-3.5" />
                  Última cobrança: {format(new Date(passo.ultima_cobranca_em), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </p>
              )}

              {/* ── BLOCO DE FU DA SEMANA ── */}
              {temFusSemana && (
                <div className="border border-amber-300 bg-amber-50 rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-amber-800">
                          {fusDaSemana.length} follow-up{fusDaSemana.length > 1 ? "s" : ""} pendente{fusDaSemana.length > 1 ? "s" : ""} desta semana
                        </p>
                        <p className="text-[11px] text-amber-600 mt-0.5">
                          {fusDaSemana.map(f => `FU ${f.sequence_number} · ${f.reminder_date ? format(new Date(f.reminder_date + "T00:00:00"), "dd/MM") : "—"}`).join(" · ")}
                        </p>
                      </div>
                    </div>
                    <label className="flex items-center gap-1.5 cursor-pointer flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={encerrarFUs}
                        onChange={e => setEncerrarFUs(e.target.checked)}
                        className="w-3.5 h-3.5 accent-amber-600"
                      />
                      <span className="text-[11px] text-amber-700 font-medium whitespace-nowrap">Encerrar ao salvar</span>
                    </label>
                  </div>

                  {encerrarFUs && (
                    <div className="space-y-2.5 pt-1">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] font-semibold text-amber-700 block mb-1">Canal *</label>
                          <select
                            value={fuCanal}
                            onChange={e => setFuCanal(e.target.value)}
                            className="w-full text-xs border border-amber-300 bg-white rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400"
                          >
                            {CANAL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-amber-700 block mb-1">Resultado *</label>
                          <select
                            value={fuResultado}
                            onChange={e => setFuResultado(e.target.value)}
                            className="w-full text-xs border border-amber-300 bg-white rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400"
                          >
                            {RESULTADO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-amber-700 block mb-1">Próximo passo *</label>
                        <select
                          value={fuProximoPasso}
                          onChange={e => setFuProximoPasso(e.target.value)}
                          className="w-full text-xs border border-amber-300 bg-white rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400"
                        >
                          {PROXIMO_PASSO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-amber-700 block mb-1">Observações do contato</label>
                        <textarea
                          value={fuObservacoes}
                          onChange={e => setFuObservacoes(e.target.value)}
                          rows={2}
                          placeholder="Deixe em branco para usar as observações do consultor..."
                          className="w-full text-xs border border-amber-300 bg-white rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "evidencias" && (
            <EvidenciasUploader evidencias={evidencias} onChange={setEvidencias} />
          )}

          {activeTab === "historico" && (
            <ProximoPassoTimeline historico={passo.historico || []} />
          )}

          {activeTab === "cliente" && (
            <ClienteDataTab passo={passo} />
          )}

          {activeTab === "ata" && !passo.consultoria_atendimento_id && !passo.ata_id && (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
              <p className="text-gray-600 text-sm font-medium">ATA não vinculada</p>
              <p className="text-gray-400 text-xs mt-1">Este próximo passo não tem um atendimento associado</p>
            </div>
          )}

          {activeTab === "ata" && (passo.ata_id || passo.consultoria_atendimento_id) && (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <FileText className="w-12 h-12 text-blue-300" />
              <p className="text-gray-600 text-sm text-center">Clique para visualizar a ATA desta reunião.</p>
              <Button
                onClick={async () => {
                  try {
                    let ataData = null;
                    if (passo.ata_id) {
                      ataData = await base44.entities.MeetingMinutes.get(passo.ata_id);
                    } else {
                      const results = await base44.entities.MeetingMinutes.filter(
                        { atendimento_id: passo.consultoria_atendimento_id }, '-created_date', 1
                      );
                      if (results?.length > 0) ataData = results[0];
                    }
                    if (ataData) setAtaParaVisualizar(ataData);
                  } catch (e) {
                    console.error("Erro ao carregar ATA:", e);
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
              >
                <FileText className="w-4 h-4" />
                Visualizar ATA
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-4 border-t border-gray-100 bg-gray-50">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCobrar}
              className="text-xs gap-1.5"
            >
              <Bell className="w-3.5 h-3.5" /> Registrar Cobrança
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={saving}
              className="text-xs gap-1.5 text-red-600 hover:bg-red-50 hover:border-red-200"
            >
              <Trash2 className="w-3.5 h-3.5" /> Deletar
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
              <Save className="w-3.5 h-3.5" />
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </div>
    </div>

    {ataParaVisualizar && (
      <VisualizarAtaModal
        ata={ataParaVisualizar}
        onClose={() => setAtaParaVisualizar(null)}
      />
    )}
    </>
  );
}