import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, Phone, Mail, MessageCircle, Calendar, AlertCircle,
  ChevronRight, User, Zap, FileText, PlayCircle, ExternalLink,
} from "lucide-react";
import { format, differenceInDays, addDays } from "date-fns";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import VisualizarAtaModal from "@/components/aceleracao/VisualizarAtaModal";

function getInitials(name = "") {
  return name.split(" ").slice(0, 2).map(p => p[0]).join("").toUpperCase() || "?";
}

const CANAL_OPTIONS = [
  { id: "ligacao",     label: "Ligação",     icon: Phone },
  { id: "whatsapp",    label: "WhatsApp",    icon: MessageCircle },
  { id: "email",       label: "E-mail",      icon: Mail },
  { id: "reuniao",     label: "Reunião",     icon: Calendar },
  { id: "sem_contato", label: "Sem contato", icon: AlertCircle },
];

const PROXIMO_PASSO_OPTIONS = [
  { value: "reagendar",       label: "Reagendar follow-up" },
  { value: "negociacao",      label: "Avançar para negociação" },
  { value: "fechamento",      label: "Avançar para fechamento" },
  { value: "nova_proposta",   label: "Enviar nova proposta" },
  { value: "agendar_reuniao", label: "Agendar reunião" },
  { value: "perdido",         label: "Marcar como perdido" },
  { value: "nurturing",       label: "Nurturing" },
];

const REAGENDAR_OPTIONS = [
  { value: "2",  label: "2 dias" },
  { value: "5",  label: "5 dias" },
  { value: "7",  label: "1 semana" },
  { value: "14", label: "2 semanas" },
];

const ATA_ICONS = {
  diagnostico: "🔍",
  acelera_time: "⚡",
  mentoria: "🎓",
  onboarding: "🚀",
  pontual: "📌",
};

export default function FollowUpDetail({ reminder, today, onBack }) {
  const queryClient = useQueryClient();
  const [view, setView] = useState("detail");
  const [canal, setCanal] = useState("");
  const [resultado, setResultado] = useState("");
  const [proximoPasso, setProximoPasso] = useState("");
  const [reagendarEm, setReagendarEm] = useState("7");
  const [saving, setSaving] = useState(false);
  const [showLossModal, setShowLossModal] = useState(false);
  const [selectedAta, setSelectedAta] = useState(null);

  const isOverdue = !reminder.is_completed && reminder.reminder_date < today;
  const daysOver = reminder.reminder_date
    ? differenceInDays(new Date(today), new Date(reminder.reminder_date + "T00:00:00"))
    : 0;

  const { data: atas = [] } = useQuery({
    queryKey: ["atas-followup-detail", reminder.workshop_id],
    queryFn: async () => {
      if (!reminder.workshop_id) return [];
      return base44.entities.MeetingMinutes.filter(
        { workshop_id: reminder.workshop_id },
        "-meeting_date",
        20
      );
    },
    enabled: !!reminder.workshop_id,
    staleTime: 3 * 60 * 1000,
  });

  const originAta = atas.find(a => a.id === reminder.ata_id);
  const suggestedAction = originAta?.proximos_passos?.trim()
    || atas.find(a => a.proximos_passos?.trim())?.proximos_passos
    || null;

  const handleSave = async () => {
    if (!canal) { toast.error("Selecione o canal de contato"); return; }
    if (!resultado.trim()) { toast.error("Descreva o resultado da conversa"); return; }
    if (!proximoPasso) { toast.error("Defina o próximo passo"); return; }

    setSaving(true);
    try {
      await base44.entities.FollowUpReminder.update(reminder.id, {
        is_completed: true,
        completed_at: new Date().toISOString(),
      });

      if (proximoPasso === "reagendar") {
        const nextDate = addDays(new Date(), parseInt(reagendarEm));
        await base44.entities.FollowUpReminder.create({
          workshop_id: reminder.workshop_id,
          workshop_name: reminder.workshop_name,
          consultor_id: reminder.consultor_id,
          consultor_nome: reminder.consultor_nome,
          sequence_number: reminder.sequence_number,
          reminder_date: nextDate.toISOString().split("T")[0],
          days_since_meeting: reminder.days_since_meeting,
          is_completed: false,
        });
        toast.success("Follow-up concluído e novo agendado!");
      } else {
        toast.success("Follow-up registrado com sucesso!");
      }

      queryClient.invalidateQueries({ queryKey: ["follow-up-reminders-tab"] });
      queryClient.invalidateQueries({ queryKey: ["follow-up-reminders"] });
      onBack();
    } finally {
      setSaving(false);
    }
  };

  const handleLoss = async () => {
    setSaving(true);
    try {
      await base44.entities.FollowUpReminder.update(reminder.id, {
        is_completed: true,
        completed_at: new Date().toISOString(),
      });
      toast.success("Follow-up encerrado como perda.");
      queryClient.invalidateQueries({ queryKey: ["follow-up-reminders-tab"] });
      queryClient.invalidateQueries({ queryKey: ["follow-up-reminders"] });
      onBack();
    } finally {
      setSaving(false);
      setShowLossModal(false);
    }
  };

  // ---- REGISTER VIEW ----
  if (view === "register") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setView("detail")} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <p className="text-xs text-gray-400">Iniciar atendimento</p>
            <p className="font-semibold text-sm text-gray-800">{reminder.workshop_name || "Sem cliente"}</p>
          </div>
          <Badge className="ml-auto text-[10px] bg-gray-100 text-gray-500 border-gray-200">
            Follow-up {reminder.sequence_number}/4
          </Badge>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-5">
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 block">Canal de contato</label>
            <div className="flex flex-wrap gap-2">
              {CANAL_OPTIONS.map(opt => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setCanal(opt.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                      canal === opt.id
                        ? "bg-gray-900 text-white border-gray-900"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 block">Resultado da conversa</label>
            <Textarea
              value={resultado}
              onChange={e => setResultado(e.target.value)}
              placeholder="Descreva o que foi dito, objeções encontradas, interesse demonstrado..."
              className="min-h-[90px] text-sm resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 block">Próximo passo</label>
            <Select value={proximoPasso} onValueChange={setProximoPasso}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Selecionar próximo passo..." />
              </SelectTrigger>
              <SelectContent>
                {PROXIMO_PASSO_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {proximoPasso === "reagendar" && (
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 block">Reagendar em</label>
              <Select value={reagendarEm} onValueChange={setReagendarEm}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REAGENDAR_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving} className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-full font-semibold">
            {saving ? "Salvando..." : "Salvar e concluir"}
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setShowLossModal(true)} disabled={saving}>
            Perda / desqualificação
          </Button>
        </div>

        {showLossModal && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl space-y-4">
              <h3 className="font-bold text-gray-900">Confirmar perda</h3>
              <p className="text-sm text-gray-600">Este follow-up será encerrado como perda/desqualificação. Deseja confirmar?</p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowLossModal(false)}>Cancelar</Button>
                <Button variant="destructive" className="flex-1" onClick={handleLoss} disabled={saving}>
                  {saving ? "..." : "Confirmar perda"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---- DETAIL VIEW ----
  // Progress dots for 4 follow-ups
  const totalSteps = 4;
  const currentStep = reminder.sequence_number || 1;

  return (
    <div className="space-y-3">
      {/* Back */}
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Voltar à lista
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ---- LEFT COLUMN ---- */}
        <div className="space-y-3">

          {/* Identity card */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                {getInitials(reminder.workshop_name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-gray-900 text-sm">{reminder.workshop_name || "Sem cliente"}</span>
                  {isOverdue && (
                    <Badge className="text-[10px] bg-red-100 text-red-700 border-red-200">Urgente</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {isOverdue && daysOver > 0 && (
                    <span className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded px-1.5 py-0.5">
                      {daysOver}d vencido
                    </span>
                  )}
                  {reminder.reminder_date === today && !isOverdue && (
                    <span className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">Hoje</span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  Setor automotivo · Follow-up {currentStep}/{totalSteps}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-3">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-1.5">Progresso dos follow-ups</p>
              <div className="flex items-center gap-1.5">
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <React.Fragment key={i}>
                    <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${
                      i < currentStep - 1
                        ? "bg-red-500 border-red-500"
                        : i === currentStep - 1
                        ? "bg-red-500 border-red-500"
                        : "bg-white border-gray-300"
                    }`} />
                    {i < totalSteps - 1 && (
                      <div className={`flex-1 h-0.5 ${i < currentStep - 1 ? "bg-red-300" : "bg-gray-200"}`} />
                    )}
                  </React.Fragment>
                ))}
                <span className="text-[11px] text-gray-400 ml-1">{currentStep} de {totalSteps}</span>
              </div>
            </div>

            {/* Quick contact icons */}
            <div className="mt-3">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-1.5">Contato rápido</p>
              <div className="flex gap-2">
                {CANAL_OPTIONS.filter(c => c.id !== "sem_contato").map(opt => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.id}
                      title={opt.label}
                      className="w-9 h-9 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors"
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Suggested action */}
          {suggestedAction && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
              <div className="flex items-start gap-2">
                <Zap className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-amber-700 mb-1">Ação sugerida para este follow-up</p>
                  <p className="text-sm text-amber-800 leading-relaxed">{suggestedAction}</p>
                </div>
              </div>
              {/* Quick action pills */}
              <div className="flex flex-wrap gap-2 pt-1">
                <button className="text-xs border border-amber-400 text-amber-700 rounded-full px-3 py-1 hover:bg-amber-100 transition-colors">
                  Reagendar sessão
                </button>
                <button className="text-xs border border-amber-400 text-amber-700 rounded-full px-3 py-1 hover:bg-amber-100 transition-colors">
                  Confirmar interesse
                </button>
                <button className="text-xs border border-amber-400 text-amber-700 rounded-full px-3 py-1 hover:bg-amber-100 transition-colors">
                  Enviar resumo anterior
                </button>
              </div>
            </div>
          )}

          {/* ATA history */}
          {atas.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">
                  Histórico de ATAs ({atas.length})
                </p>
                <button className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                  Ver todas <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <div className="space-y-2">
                {atas.slice(0, 5).map(ata => {
                  const dateStr = ata.meeting_date || ata.created_date;
                  const isOrigin = ata.id === reminder.ata_id;
                  const tipo = (ata.tipo_aceleracao || ata.tipo_atendimento || "ata").toLowerCase();
                  const emoji = ATA_ICONS[tipo] || "📄";
                  return (
                    <button
                      key={ata.id}
                      onClick={() => setSelectedAta(ata)}
                      className={`w-full flex items-start gap-2.5 px-3 py-2.5 rounded-lg border transition-colors text-left ${
                        isOrigin
                          ? "border-green-300 bg-green-50 hover:bg-green-100"
                          : "border-gray-100 bg-gray-50 hover:bg-gray-100"
                      }`}
                    >
                      <span className="text-base flex-shrink-0 mt-0.5">{emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-xs font-semibold ${isOrigin ? "text-green-800" : "text-gray-800"}`}>
                            {ata.tipo_aceleracao || ata.tipo_atendimento || "ATA"}
                          </span>
                          {isOrigin && (
                            <span className="text-[9px] font-bold text-green-700 bg-green-200 rounded px-1 py-0.5">ORIGEM</span>
                          )}
                        </div>
                        {ata.proximos_passos && (
                          <p className="text-[11px] text-gray-500 line-clamp-2 mt-0.5">{ata.proximos_passos}</p>
                        )}
                      </div>
                      {dateStr && (
                        <span className="text-[11px] text-gray-400 flex-shrink-0">
                          {format(new Date(dateStr), "dd/MM/yy")}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="flex">
            <Button
              onClick={() => setView("register")}
              className="bg-green-600 hover:bg-green-700 text-white rounded-full font-semibold flex items-center gap-2 px-6"
            >
              <PlayCircle className="w-4 h-4" />
              Iniciar Atendimento
            </Button>
          </div>
        </div>

        {/* ---- RIGHT COLUMN ---- */}
        <div className="space-y-3">

          {/* Consultor */}
          {reminder.consultor_nome && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-3">Consultor Responsável</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {getInitials(reminder.consultor_nome)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{reminder.consultor_nome}</p>
                  <p className="text-xs text-gray-400">Consultor sênior</p>
                </div>
              </div>
            </div>
          )}

          {/* Situação do cliente */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-3">Situação do Cliente</p>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="text-center">
                <p className="text-lg font-bold text-gray-800">{currentStep}/{totalSteps}</p>
                <p className="text-[10px] text-gray-400">Follow-ups</p>
              </div>
              <div className="text-center">
                <p className={`text-lg font-bold ${isOverdue ? "text-red-600" : "text-gray-800"}`}>{daysOver > 0 ? `${daysOver}d` : "—"}</p>
                <p className="text-[10px] text-gray-400">Vencido</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-gray-800">{atas.length}</p>
                <p className="text-[10px] text-gray-400">Atas</p>
              </div>
            </div>

            {/* Engagement bar */}
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-[11px] text-gray-500 mb-1">
                  <span>Engajamento</span>
                  <span>70%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full">
                  <div className="h-1.5 bg-blue-500 rounded-full" style={{ width: "70%" }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[11px] text-gray-500 mb-1">
                  <span>Progresso do programa</span>
                  <span>{Math.round((currentStep / totalSteps) * 100)}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full">
                  <div className="h-1.5 bg-green-500 rounded-full" style={{ width: `${Math.round((currentStep / totalSteps) * 100)}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Próximas ações sugeridas */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-3">Próximas Ações Sugeridas</p>
            <ul className="space-y-2">
              {[
                { text: "Confirmar disponibilidade do cliente", active: true },
                { text: "Reagendar próxima sessão", active: true },
                { text: "Enviar resumo das últimas atas", active: false },
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${item.active ? "bg-red-500" : "bg-gray-300"}`} />
                  <span className={`text-sm ${item.active ? "text-gray-700" : "text-gray-400"}`}>{item.text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Date info */}
          {reminder.reminder_date && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-2">Data do Follow-up</p>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className={`font-medium ${isOverdue ? "text-red-600" : "text-gray-800"}`}>
                  {format(new Date(reminder.reminder_date + "T00:00:00"), "dd/MM/yyyy")}
                </span>
                {reminder.days_since_meeting > 0 && (
                  <span className="text-xs text-gray-400">· {reminder.days_since_meeting}d após atendimento</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ATA preview modal */}
      {selectedAta && (
        <VisualizarAtaModal
          ata={selectedAta}
          workshop={null}
          atendimento={null}
          onClose={() => setSelectedAta(null)}
        />
      )}
    </div>
  );
}