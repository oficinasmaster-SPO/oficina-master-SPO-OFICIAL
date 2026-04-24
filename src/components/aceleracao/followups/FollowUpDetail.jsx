import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, Phone, Mail, MessageCircle, Calendar, AlertCircle,
  ChevronRight, User, Zap, FileText, Clock, CheckCircle2, PlayCircle,
} from "lucide-react";
import { format, differenceInDays, addDays } from "date-fns";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

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

// ATA status config for Trello-style columns
const ATA_STATUS_COLUMNS = [
  { key: "realizado",   label: "Realizado",   color: "bg-blue-50 border-blue-200",   dot: "bg-blue-400" },
  { key: "pendente",    label: "Pendente",    color: "bg-amber-50 border-amber-200", dot: "bg-amber-400" },
  { key: "cancelado",   label: "Cancelado",   color: "bg-red-50 border-red-200",     dot: "bg-red-400" },
  { key: "agendado",    label: "Agendado",    color: "bg-green-50 border-green-200", dot: "bg-green-400" },
];

function AtaKanbanCard({ ata }) {
  const dateStr = ata.data_atendimento || ata.created_date;
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold text-gray-800 leading-tight line-clamp-2">
          {ata.tipo_atendimento || ata.tipo || "Atendimento"}
        </p>
        <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
      </div>
      {dateStr && (
        <p className="text-[11px] text-gray-400 flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {format(new Date(dateStr), "dd/MM/yyyy")}
        </p>
      )}
      {ata.proximos_passos && (
        <div className="bg-amber-50 border border-amber-100 rounded px-2 py-1.5">
          <p className="text-[11px] text-amber-700 font-medium">Próximos passos:</p>
          <p className="text-[11px] text-amber-800 line-clamp-3">{ata.proximos_passos}</p>
        </div>
      )}
      {ata.consultor_nome && (
        <p className="text-[10px] text-gray-400 flex items-center gap-1">
          <User className="w-3 h-3" /> {ata.consultor_nome}
        </p>
      )}
    </div>
  );
}

export default function FollowUpDetail({ reminder, today, onBack }) {
  const queryClient = useQueryClient();
  const [view, setView] = useState("detail"); // "detail" | "register"
  const [canal, setCanal] = useState("");
  const [resultado, setResultado] = useState("");
  const [proximoPasso, setProximoPasso] = useState("");
  const [reagendarEm, setReagendarEm] = useState("7");
  const [saving, setSaving] = useState(false);
  const [showLossModal, setShowLossModal] = useState(false);

  const isOverdue = !reminder.is_completed && reminder.reminder_date < today;
  const daysOver = reminder.reminder_date
    ? differenceInDays(new Date(today), new Date(reminder.reminder_date + "T00:00:00"))
    : 0;

  // Fetch ATAs for this workshop
  const { data: atas = [] } = useQuery({
    queryKey: ["atas-followup-detail", reminder.workshop_id],
    queryFn: async () => {
      if (!reminder.workshop_id) return [];
      return base44.entities.ConsultoriaAtendimento.filter(
        { workshop_id: reminder.workshop_id },
        "-data_atendimento",
        30
      );
    },
    enabled: !!reminder.workshop_id,
    staleTime: 3 * 60 * 1000,
  });

  // Get suggested action from the most recent ATA's proximos_passos field
  const suggestedAction = (() => {
    const withProxPassos = atas.find(a => a.proximos_passos && a.proximos_passos.trim());
    if (withProxPassos) return withProxPassos.proximos_passos;
    if (daysOver >= 3) return "Ligue imediatamente — follow-up vencido há mais de 3 dias. Identifique objeções e reforce valor.";
    if (reminder.reminder_date === today) return "Contato agendado para hoje. Prepare argumentos e verifique histórico de interações antes de ligar.";
    return `Agende contato para ${reminder.reminder_date ? format(new Date(reminder.reminder_date + "T00:00:00"), "dd/MM/yyyy") : "a data prevista"}.`;
  })();

  // Group ATAs by status for Trello
  const ataByStatus = ATA_STATUS_COLUMNS.reduce((acc, col) => {
    acc[col.key] = atas.filter(a => (a.status || "realizado") === col.key);
    return acc;
  }, {});
  // Put ATAs without matching status into "realizado"
  atas.forEach(a => {
    const validKeys = ATA_STATUS_COLUMNS.map(c => c.key);
    if (!validKeys.includes(a.status)) {
      ataByStatus["realizado"].push(a);
    }
  });

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

        <Card>
          <CardContent className="p-4 space-y-5">
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
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REAGENDAR_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-full font-semibold"
          >
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
  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Voltar à lista
      </button>

      {/* Identity card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-base flex-shrink-0">
              {getInitials(reminder.workshop_name)}
            </div>
            <div className="flex-1 min-w-0">
              {/* Name + consultor on same line */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-bold text-gray-900 text-base truncate">{reminder.workshop_name || "Sem cliente"}</span>
                  {isOverdue && daysOver >= 3 && (
                    <Badge className="text-[10px] bg-red-100 text-red-700 border-red-200 flex-shrink-0">Urgente</Badge>
                  )}
                </div>
                {reminder.consultor_nome && (
                  <span className="text-xs text-gray-500 flex items-center gap-1 flex-shrink-0">
                    <User className="w-3 h-3" />
                    {reminder.consultor_nome}
                  </span>
                )}
              </div>

              <div className="flex gap-2 mt-2 flex-wrap">
                <Badge className="text-[11px] bg-gray-100 text-gray-600 border-gray-200">
                  Follow-up {reminder.sequence_number}/4
                </Badge>
                <Badge className={`text-[11px] ${isOverdue ? "bg-red-100 text-red-700 border-red-200" : "bg-amber-100 text-amber-700 border-amber-200"}`}>
                  {isOverdue ? `${daysOver}d vencido` : reminder.reminder_date === today ? "Hoje" : "Pendente"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-500">
            <Calendar className="w-3.5 h-3.5" />
            Data prevista:{" "}
            <span className={`font-medium ${isOverdue ? "text-red-600" : "text-gray-700"}`}>
              {reminder.reminder_date
                ? format(new Date(reminder.reminder_date + "T00:00:00"), "dd/MM/yyyy")
                : "—"}
            </span>
            {reminder.days_since_meeting > 0 && (
              <span className="text-gray-400">· {reminder.days_since_meeting}d após o atendimento</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Suggested action — reads from ATA proximos_passos */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex gap-2">
        <Zap className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-amber-700 mb-0.5">Ação sugerida</p>
          <p className="text-sm text-amber-800">{suggestedAction}</p>
        </div>
      </div>

      {/* Trello-style ATA history */}
      {atas.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Histórico de ATAs</p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {ATA_STATUS_COLUMNS.map(col => {
              const colAtas = ataByStatus[col.key] || [];
              return (
                <div key={col.key} className={`rounded-lg border p-2 space-y-2 min-h-[80px] ${col.color}`}>
                  <div className="flex items-center gap-1.5 pb-1 border-b border-gray-200/60">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${col.dot}`} />
                    <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide">{col.label}</span>
                    <span className="ml-auto text-[10px] text-gray-400">{colAtas.length}</span>
                  </div>
                  {colAtas.length === 0 ? (
                    <p className="text-[11px] text-gray-400 text-center py-2">—</p>
                  ) : (
                    colAtas.slice(0, 5).map(ata => (
                      <AtaKanbanCard key={ata.id} ata={ata} />
                    ))
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CTA button — green rounded */}
      <Button
        onClick={() => setView("register")}
        className="w-full bg-green-600 hover:bg-green-700 text-white rounded-full font-semibold flex items-center justify-center gap-2 py-5 text-base"
      >
        <PlayCircle className="w-5 h-5" />
        Iniciar Atendimento
      </Button>
    </div>
  );
}