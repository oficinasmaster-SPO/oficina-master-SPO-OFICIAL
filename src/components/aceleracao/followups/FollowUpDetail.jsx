import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ArrowLeft, Phone, Mail, MessageCircle, Calendar, AlertCircle,
  ChevronRight, User, Zap, FileText, PlayCircle, ExternalLink, X,
  Clock, Video, Bell, MessageSquare, Send, Loader2,
} from "lucide-react";
import { format, differenceInDays, addDays, isToday, parseISO } from "date-fns";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import VisualizarAtaModal from "@/components/aceleracao/VisualizarAtaModal";
import IniciarAtendimentoModal from "@/components/aceleracao/IniciarAtendimentoModal";

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

export default function FollowUpDetail({ reminder, today, onBack, filaReminders = [], onSelectReminder }) {
  const queryClient = useQueryClient();
  const [view, setView] = useState("detail");
  const [canal, setCanal] = useState("");
  const [resultado, setResultado] = useState("");
  const [proximoPasso, setProximoPasso] = useState("");
  const [reagendarEm, setReagendarEm] = useState("7");
  const [saving, setSaving] = useState(false);
  const [showLossModal, setShowLossModal] = useState(false);
  const [chatAberto, setChatAberto] = useState(false);
  const [chatMensagens, setChatMensagens] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatEnviando, setChatEnviando] = useState(false);
  const [chatConversa, setChatConversa] = useState(null);
  const chatEndRef = useRef(null);
  const [selectedAta, setSelectedAta] = useState(null);
  const { user } = useAuth();
  const [registerStep, setRegisterStep] = useState("history");
  const [fusSemanaExpandido, setFusSemanaExpandido] = useState(false);
  const [fusSelecionados, setFusSelecionados] = useState([]);
  const [dicaIA, setDicaIA] = useState(null);
  const [carregandoDica, setCarregandoDica] = useState(false);
  const [showAllAtas, setShowAllAtas] = useState(false);
  const [fuAtaSelecionados, setFuAtaSelecionados] = useState([]);
  const [fuSpSelecionados, setFuSpSelecionados] = useState([]);

  const isOverdue = !reminder.is_completed && reminder.reminder_date < today;
  const daysOver = reminder.reminder_date
    ? differenceInDays(new Date(today), new Date(reminder.reminder_date + "T00:00:00"))
    : 0;

  const { data: allFollowUps = [] } = useQuery({
    queryKey: ["all-followups-workshop", reminder.workshop_id],
    queryFn: async () => {
      if (!reminder.workshop_id) return [];
      return base44.entities.FollowUpReminder.filter(
        { workshop_id: reminder.workshop_id },
        "reminder_date",
        50
      );
    },
    enabled: !!reminder.workshop_id,
    staleTime: 3 * 60 * 1000,
  });

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

  const { data: concluidos = [] } = useQuery({
    queryKey: ["concluidos-detail-ia", reminder.workshop_id],
    queryFn: async () => {
      if (!reminder.workshop_id) return [];
      return base44.entities.FollowUpConcluido.filter(
        { workshop_id: reminder.workshop_id },
        "-completedAt",
        5
      );
    },
    enabled: !!reminder.workshop_id,
    staleTime: 5 * 60 * 1000,
  });

  const { data: atendimentosHoje = [] } = useQuery({
    queryKey: ["atendimentos-hoje-consultor", user?.id, today],
    queryFn: async () => {
      if (!user?.id) return [];
      const todos = await base44.entities.ConsultoriaAtendimento.filter(
        { consultor_id: user.id },
        "data_agendada",
        50
      );
      return todos.filter(a => {
        if (!a.data_agendada) return false;
        if (!['agendado', 'confirmado', 'reagendado'].includes(a.status)) return false;
        try { return isToday(parseISO(a.data_agendada)); } catch { return false; }
      });
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
  });

  const originAta = atas.find(a => a.id === reminder.ata_id);
  const suggestedAction = originAta?.proximos_passos?.trim()
    || atas.find(a => a.proximos_passos?.trim())?.proximos_passos
    || null;

  const iniciarChat = async () => {
    setChatAberto(true);
    if (chatConversa) return;
    setChatEnviando(true);
    try {
      const resumoAtas = atas.slice(0, 5).map(a =>
        `- ${a.tipo_aceleracao || a.tipo_atendimento || 'Reunião'} (${a.meeting_date || 'sem data'}): ${a.proximos_passos || 'sem próximos passos'}`
      ).join('\n');
      const resumoConcluidos = concluidos.slice(0, 3).map(c =>
        `- Canal: ${c.canal || '?'} | Resultado: ${c.resultado || '?'} | Humor: ${c.humor || '?'} | Comprometimentos: ${c.compromissos || 'nenhum'}`
      ).join('\n');
      const contexto = `Você é um assistente de consultoria empresarial. Ajude o consultor a atender o cliente "${reminder.workshop_name}" (Follow-up ${reminder.sequence_number}/4).\n\nÚLTIMAS ATAS:\n${resumoAtas || 'Nenhuma ata registrada'}\n\nÚLTIMOS ATENDIMENTOS:\n${resumoConcluidos || 'Nenhum atendimento anterior'}\n\nResponda de forma direta e prática. Seja objetivo.`;
      const conv = await base44.agents.createConversation({
        agent_name: 'qgp_tecnico',
        metadata: { name: `Chat ${reminder.workshop_name} - FU ${reminder.sequence_number}`, description: contexto },
      });
      setChatConversa(conv);
      setChatMensagens([{ role: 'assistant', content: `Olá! Estou pronto para ajudar com o atendimento de **${reminder.workshop_name}**. Tenho acesso ao histórico de atas e atendimentos deste cliente. O que você precisa saber?` }]);
      const unsubscribe = base44.agents.subscribeToConversation(conv.id, (data) => setChatMensagens(data.messages || []));
      return () => unsubscribe();
    } catch (err) {
      console.error('Erro ao iniciar chat:', err);
      toast.error('Erro ao iniciar chat');
    } finally {
      setChatEnviando(false);
    }
  };

  const enviarMensagemChat = async () => {
    if (!chatInput.trim() || !chatConversa || chatEnviando) return;
    const texto = chatInput.trim();
    setChatInput('');
    setChatEnviando(true);
    setChatMensagens(prev => [...prev, { role: 'user', content: texto }]);
    try {
      await base44.agents.addMessage(chatConversa, { role: 'user', content: texto });
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
      toast.error('Erro ao enviar mensagem');
    } finally {
      setChatEnviando(false);
    }
  };

  const gerarDicaIA = async () => {
    setCarregandoDica(true);
    try {
      const resumoAtas = atas.slice(0, 3).map(a =>
        `Ata (${a.tipo_aceleracao || a.tipo_atendimento || 'reunião'} - ${a.meeting_date || ''}): próximos passos: ${a.proximos_passos || 'não registrado'}`
      ).join('\n');

      const resumoConcluidos = concluidos.slice(0, 3).map(c =>
        `Atendimento via ${c.canal || '?'}: resultado=${c.resultado || '?'}, humor=${c.humor || '?'}, comprometimentos=${c.compromissos || 'nenhum'}`
      ).join('\n');

      const prompt = `Você é um coach de consultores de negócios. Com base nos dados abaixo sobre o cliente "${reminder.workshop_name}", gere UMA dica prática, direta e motivadora (máximo 3 linhas) para o consultor seguir neste atendimento de follow-up ${reminder.sequence_number}/4. Foque no que o cliente precisa agora.\n\nÚLTIMAS ATAS:\n${resumoAtas || 'Sem atas registradas'}\n\nÚLTIMOS ATENDIMENTOS:\n${resumoConcluidos || 'Sem atendimentos anteriores'}\n\nResponda apenas a dica, sem introdução.`;

      const response = await base44.functions.invoke('invokeLLMUnlimited', { prompt });
      const dica = response?.data?.result || response?.data?.message || response?.data || response?.result || response?.message || 'Não foi possível gerar a dica.';
      setDicaIA(typeof dica === 'string' ? dica : JSON.stringify(dica));
    } catch (err) {
      console.error('Erro ao gerar dica:', err);
      toast.error('Erro ao gerar dica de IA');
    } finally {
      setCarregandoDica(false);
    }
  };

  useEffect(() => {
    if ((atas.length > 0 || concluidos.length > 0) && !dicaIA && !carregandoDica) {
      gerarDicaIA();
    }
  }, [atas.length, concluidos.length]);

  const inicioSemana = (() => {
    const d = new Date(today);
    d.setDate(d.getDate() - d.getDay());
    return d.toISOString().split('T')[0];
  })();
  const fimSemana = (() => {
    const d = new Date(today);
    d.setDate(d.getDate() + (6 - d.getDay()));
    return d.toISOString().split('T')[0];
  })();
  const fusDaSemana = allFollowUps.filter(f =>
    !f.is_completed &&
    f.id !== reminder.id &&
    f.reminder_date >= inicioSemana &&
    f.reminder_date <= fimSemana
  );

  const isSprintFU = reminder.origin_type === 'sprint';
  const sprintLabel = reminder.notes?.replace('Follow-up automático da sprint: ', '').trim() || null;
  const proximoFU = filaReminders.find(f =>
    f.id !== reminder.id && !f.is_completed
  ) || null;
  const fusDaSprint = isSprintFU
    ? allFollowUps
        .filter(f =>
          f.origin_type === 'sprint' &&
          f.sprint_id === reminder.sprint_id &&
          f.id !== reminder.id
        )
        .sort((a, b) => (a.sequence_number || 0) - (b.sequence_number || 0))
    : [];

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
          ata_id: reminder.origin_type === 'sprint' ? null : (reminder.ata_id || null),
          atendimento_id: reminder.origin_type === 'sprint' ? null : (reminder.atendimento_id || null),
          origin_type: reminder.origin_type === 'sprint' ? 'sprint' : 'ata',
          sprint_id: reminder.origin_type === 'sprint' ? reminder.sprint_id : null,
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

  const verificarRascunho = () => {
    const storageKey = `draft_atendimento_${reminder.id}`;
    let rascunho = null;
    try {
      rascunho = localStorage.getItem(storageKey);
    } catch (e) {
      console.warn('localStorage indisponível:', e.message);
    }
    return !!rascunho;
  };

  // ---- REGISTER VIEW (Modal) ----
  if (view === "register") {
    return (
      <IniciarAtendimentoModal
        followUp={reminder}
        cliente={{ name: reminder.workshop_name }}
        fusConcatenados={fusSelecionados
          .map(id => allFollowUps.find(f => f.id === id))
          .filter(Boolean)
        }
        proximoFU={proximoFU}
        onClose={() => setView("detail")}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ["follow-up-reminders"] });
          setFusSelecionados([]);
        }}
        onProximoFollowUp={(fu) => {
          if (onSelectReminder) onSelectReminder(fu);
        }}
        filaReminders={allFollowUps}
        onNavegar={(fu) => {
          if (onSelectReminder) onSelectReminder(fu);
        }}
      />
    );
  }

  // ---- DETAIL VIEW ----
  // Progress dots for 4 follow-ups
  const totalSteps = 4;
  const currentStep = reminder.sequence_number || 1;

  return (
    <div className="space-y-3">
      <div className="flex flex-col h-[calc(100vh-200px)] bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Header fixo */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Overview da oficina</h2>
        </div>

        {/* Conteúdo rolável */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
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
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 text-sm">{reminder.workshop_name || "Sem cliente"}</span>
                        {isOverdue && (
                          <Badge className="text-[10px] bg-red-100 text-red-700 border-red-200">Urgente</Badge>
                        )}
                      </div>
                      {reminder.consultor_nome && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                            {getInitials(reminder.consultor_nome)}
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-semibold text-gray-800 leading-tight">{reminder.consultor_nome}</p>
                            <p className="text-[10px] text-gray-400 leading-tight">Consultor sênior</p>
                          </div>
                        </div>
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

              {/* Dica de IA */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <p className="text-xs font-semibold text-amber-700">Dica de IA para este atendimento</p>
                  </div>
                  <button
                    onClick={gerarDicaIA}
                    disabled={carregandoDica}
                    title="Gerar nova dica"
                    className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-amber-100 transition-colors disabled:opacity-40"
                  >
                    <svg
                      className={`w-4 h-4 text-amber-600 ${carregandoDica ? 'animate-spin' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
                {carregandoDica ? (
                  <div className="flex items-center gap-2 py-2">
                    <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
                    <p className="text-xs text-amber-600">Analisando histórico do cliente...</p>
                  </div>
                ) : dicaIA ? (
                  <p className="text-sm text-amber-800 leading-relaxed">{dicaIA}</p>
                ) : suggestedAction ? (
                  <p className="text-sm text-amber-800 leading-relaxed">{suggestedAction}</p>
                ) : (
                  <p className="text-xs text-amber-600 italic">Clique em recarregar para gerar uma dica.</p>
                )}
              </div>

              {/* ATA history */}
              {atas.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-gray-900 uppercase">
                      Histórico de ATAs ({atas.length})
                    </h3>
                    <button 
                      onClick={() => setShowAllAtas(true)}
                      className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
                    >
                      Ver todas <ChevronRight className="w-4 h-4" />
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

              {/* Modal Ver Todas as ATAs */}
              {showAllAtas && (
                <Dialog open={showAllAtas} onOpenChange={setShowAllAtas}>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Todas as ATAs - {reminder.workshop_name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2">
                      {atas.map(ata => {
                        const dateStr = ata.meeting_date || ata.created_date;
                        const isOrigin = ata.id === reminder.ata_id;
                        const tipo = (ata.tipo_aceleracao || ata.tipo_atendimento || "ata").toLowerCase();
                        const emoji = ATA_ICONS[tipo] || "📄";
                        return (
                          <button
                            key={ata.id}
                            onClick={() => {
                              setSelectedAta(ata);
                              setShowAllAtas(false);
                            }}
                            className={`w-full flex items-start gap-2.5 px-4 py-3 rounded-lg border transition-colors text-left ${
                              isOrigin
                                ? "border-green-300 bg-green-50 hover:bg-green-100"
                                : "border-gray-100 bg-gray-50 hover:bg-gray-100"
                            }`}
                          >
                            <span className="text-base flex-shrink-0 mt-0.5">{emoji}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                <span className={`text-sm font-semibold ${isOrigin ? "text-green-800" : "text-gray-800"}`}>
                                  {ata.tipo_aceleracao || ata.tipo_atendimento || "ATA"}
                                </span>
                                {isOrigin && (
                                  <span className="text-[9px] font-bold text-green-700 bg-green-200 rounded px-1.5 py-0.5">ORIGEM</span>
                                )}
                              </div>
                              {ata.proximos_passos && (
                                <p className="text-sm text-gray-600 mb-1">{ata.proximos_passos}</p>
                              )}
                            </div>
                            {dateStr && (
                              <span className="text-xs text-gray-400 flex-shrink-0">
                                {format(new Date(dateStr), "dd/MM/yyyy")}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {/* ---- RIGHT COLUMN ---- */}
            <div className="space-y-3">
              {/* Atendimentos do dia */}
              {atendimentosHoje.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Bell className="w-4 h-4 text-blue-600" />
                    <p className="text-[10px] text-blue-700 uppercase tracking-wide font-bold">
                      Seus atendimentos de hoje ({atendimentosHoje.length})
                    </p>
                  </div>
                  <div className="space-y-2">
                    {atendimentosHoje.map(at => (
                      <div key={at.id} className="bg-white border border-blue-100 rounded-lg px-3 py-2.5 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <Video className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-800 truncate">
                            {at.workshop_name || 'Cliente'}
                          </p>
                          <p className="text-[11px] text-gray-500 capitalize">
                            {(at.tipo_atendimento || 'atendimento').replace(/_/g, ' ')}
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3 text-blue-500" />
                            <span className="text-[11px] text-blue-600 font-medium">
                              {at.data_agendada
                                ? format(parseISO(at.data_agendada), 'HH:mm')
                                : 'Horário não definido'}
                            </span>
                            <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                              at.status === 'confirmado'
                                ? 'bg-green-100 text-green-700'
                                : at.status === 'reagendado'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {at.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Situação do cliente */}
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <h3 className="text-base font-bold text-gray-900 uppercase mb-4">Situação do Cliente</h3>
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
                <h3 className="text-base font-bold text-gray-900 uppercase mb-4">Próximas Ações Sugeridas</h3>
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

              {/* Follow-up Timeline */}
              {(() => {
                const past = allFollowUps.filter(f => f.is_completed && f.id !== reminder.id)
                  .sort((a, b) => new Date(b.reminder_date) - new Date(a.reminder_date));
                const future = allFollowUps.filter(f => !f.is_completed && f.id !== reminder.id)
                  .sort((a, b) => new Date(a.reminder_date) - new Date(b.reminder_date));

                return (
                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <h3 className="text-base font-bold text-gray-900 uppercase mb-4">Timeline de Follow-ups</h3>

                    {isSprintFU && (
                      <div className="mb-4 bg-orange-50 border border-orange-200 rounded-lg overflow-hidden">
                        <div className="flex items-center gap-2 px-3 py-2 border-b border-orange-200">
                          <span className="text-sm">🚀</span>
                          <p className="text-[10px] font-bold text-orange-800 uppercase tracking-wide flex-1">
                            Follow-ups desta sprint
                          </p>
                          <span className="text-[10px] text-orange-600 font-medium">
                            {allFollowUps.filter(f => f.sprint_id === reminder.sprint_id && f.origin_type === 'sprint').filter(f => f.is_completed).length}
                            /{allFollowUps.filter(f => f.sprint_id === reminder.sprint_id && f.origin_type === 'sprint').length} concluídos
                          </span>
                        </div>
                        {sprintLabel && (
                          <p className="text-[11px] text-orange-600 px-3 pt-2 pb-1 italic truncate">
                            {sprintLabel}
                          </p>
                        )}
                        <div className="px-3 pb-3 pt-1 space-y-1.5">
                          {/* FU atual destacado */}
                          <div className="flex items-center gap-2 bg-orange-100 border border-orange-200 rounded px-2 py-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-orange-500 flex-shrink-0 ring-2 ring-orange-300" />
                            <span className="text-[11px] font-bold text-orange-800">
                              FU {reminder.sequence_number} · Em andamento
                            </span>
                            <span className="ml-auto text-[10px] text-orange-600 font-medium">
                              {reminder.reminder_date
                                ? format(new Date(reminder.reminder_date + 'T00:00:00'), 'dd/MM')
                                : '—'}
                            </span>
                          </div>
                          {/* Demais FUs da sprint ordenados por sequence_number */}
                          {fusDaSprint.map(f => (
                            <div key={f.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-orange-50 transition-colors">
                              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                                f.is_completed
                                  ? 'bg-green-400'
                                  : 'bg-gray-300'
                              }`} />
                              <span className={`text-[11px] font-semibold ${
                                f.is_completed ? 'text-green-700' : 'text-gray-600'
                              }`}>
                                FU {f.sequence_number}
                              </span>
                              <span className={`text-[10px] ${
                                f.is_completed ? 'text-green-500' : 'text-gray-400'
                              }`}>
                                {f.is_completed ? '✓ concluído' : 'pendente'}
                              </span>
                              <span className="ml-auto text-[10px] text-gray-400">
                                {f.reminder_date
                                  ? format(new Date(f.reminder_date + 'T00:00:00'), 'dd/MM')
                                  : '—'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {fusDaSemana.length > 0 && (
                      <div className="mb-4 border border-amber-200 bg-amber-50 rounded-lg overflow-hidden">
                        <button
                          onClick={() => setFusSemanaExpandido(v => !v)}
                          className="w-full flex items-center justify-between px-3 py-2 text-left"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">
                              {fusDaSemana.length}
                            </span>
                            <span className="text-[11px] font-semibold text-amber-800">
                              {fusDaSemana.length} outro{fusDaSemana.length > 1 ? 's' : ''} FU{fusDaSemana.length > 1 ? 's' : ''} esta semana
                            </span>
                          </div>
                          <ChevronRight className={`w-3.5 h-3.5 text-amber-600 transition-transform ${fusSemanaExpandido ? 'rotate-90' : ''}`} />
                        </button>
                        {fusSemanaExpandido && (
                          <div className="border-t border-amber-200 bg-white">
                            <p className="text-[10px] text-gray-500 px-3 pt-2 pb-1">
                              Selecione para encerrar junto neste atendimento
                            </p>
                            {fusDaSemana.map(f => (
                              <label key={f.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0">
                                <input
                                  type="checkbox"
                                  checked={fusSelecionados.includes(f.id)}
                                  onChange={e => {
                                    setFusSelecionados(prev =>
                                      e.target.checked
                                        ? [...prev, f.id]
                                        : prev.filter(id => id !== f.id)
                                    );
                                  }}
                                  className="w-3.5 h-3.5 accent-red-600"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-[11px] font-semibold text-gray-700">
                                    FU {f.sequence_number} · {f.reminder_date
                                      ? format(new Date(f.reminder_date + 'T00:00:00'), 'dd/MM')
                                      : '—'}
                                  </p>
                                  {f.consultor_nome && (
                                    <p className="text-[10px] text-gray-400">{f.consultor_nome}</p>
                                  )}
                                </div>
                              </label>
                            ))}
                            {fusSelecionados.length > 0 && (
                              <p className="text-[10px] text-amber-700 bg-amber-50 px-3 py-2 font-medium">
                                {fusSelecionados.length} FU{fusSelecionados.length > 1 ? 's' : ''} será{fusSelecionados.length > 1 ? 'ão' : ''} encerrado{fusSelecionados.length > 1 ? 's' : ''} com os mesmos dados deste atendimento
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-2 divide-x divide-gray-100 gap-0 h-80 overflow-hidden">
                      {/* Left: FUAta */}
                      <div className="overflow-y-auto pr-3 pl-0">
                        <p className="text-[10px] text-gray-400 font-semibold mb-2 uppercase tracking-wide sticky top-0 bg-white py-2">FUAta</p>
                        <div className="space-y-2 pb-3">
                          {allFollowUps
                            .filter(f => f.origin_type === 'ata' && !f.is_completed)
                            .filter(f => {
                              const fDate = new Date(f.reminder_date + 'T00:00:00');
                              return fDate >= new Date(inicioSemana + 'T00:00:00') && fDate <= new Date(fimSemana + 'T23:59:59');
                            })
                            .sort((a, b) => new Date(a.reminder_date) - new Date(b.reminder_date))
                            .map(f => (
                              <div key={f.id} className="border border-gray-100 rounded-lg p-2.5 bg-gray-50 hover:bg-gray-100 transition-colors">
                                <div className="flex items-start gap-2 mb-2">
                                  <input
                                    type="checkbox"
                                    checked={fuAtaSelecionados.includes(f.id)}
                                    onChange={e => {
                                      setFuAtaSelecionados(prev =>
                                        e.target.checked
                                          ? [...prev, f.id]
                                          : prev.filter(id => id !== f.id)
                                      );
                                    }}
                                    className="w-3.5 h-3.5 accent-red-600 mt-0.5 flex-shrink-0"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-semibold text-gray-800 line-clamp-1">{f.workshop_name}</p>
                                    <p className="text-[10px] text-gray-500">Nº {f.sequence_number}</p>
                                  </div>
                                </div>
                                <div className="space-y-1 pl-6">
                                  <p className="text-[10px] text-gray-600">
                                    <span className="font-semibold">Consultor:</span> {f.consultor_nome || '—'}
                                  </p>
                                  <p className="text-[10px] text-gray-600">
                                    <span className="font-semibold">Tipo:</span> {f.origin_type || '—'}
                                  </p>
                                  {f.ata_id && (
                                    <button
                                      onClick={() => {
                                        const ata = atas.find(a => a.id === f.ata_id);
                                        if (ata) setSelectedAta(ata);
                                      }}
                                      className="text-[10px] text-blue-600 hover:underline font-medium"
                                    >
                                      Ver ATA →
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          {allFollowUps.filter(f => f.origin_type === 'ata' && !f.is_completed).filter(f => {
                            const fDate = new Date(f.reminder_date + 'T00:00:00');
                            return fDate >= new Date(inicioSemana + 'T00:00:00') && fDate <= new Date(fimSemana + 'T23:59:59');
                          }).length === 0 && (
                            <p className="text-[11px] text-gray-400 italic text-center py-4">Sem FUAta esta semana</p>
                          )}
                        </div>
                      </div>

                      {/* Right: FUSp */}
                      <div className="overflow-y-auto pl-3 pr-0">
                        <p className="text-[10px] text-gray-400 font-semibold mb-2 uppercase tracking-wide sticky top-0 bg-white py-2">FUSp</p>
                        <div className="space-y-2 pb-3">
                          {allFollowUps
                            .filter(f => f.origin_type === 'sprint' && !f.is_completed)
                            .filter(f => {
                              const fDate = new Date(f.reminder_date + 'T00:00:00');
                              return fDate >= new Date(inicioSemana + 'T00:00:00') && fDate <= new Date(fimSemana + 'T23:59:59');
                            })
                            .sort((a, b) => new Date(a.reminder_date) - new Date(b.reminder_date))
                            .map(f => (
                              <div key={f.id} className="border border-gray-100 rounded-lg p-2.5 bg-gray-50 hover:bg-gray-100 transition-colors">
                                <div className="flex items-start gap-2 mb-2">
                                  <input
                                    type="checkbox"
                                    checked={fuSpSelecionados.includes(f.id)}
                                    onChange={e => {
                                      setFuSpSelecionados(prev =>
                                        e.target.checked
                                          ? [...prev, f.id]
                                          : prev.filter(id => id !== f.id)
                                      );
                                    }}
                                    className="w-3.5 h-3.5 accent-red-600 mt-0.5 flex-shrink-0"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-semibold text-gray-800 line-clamp-1">{f.workshop_name}</p>
                                    <p className="text-[10px] text-gray-500">FUSp {f.sequence_number}</p>
                                  </div>
                                </div>
                                <div className="space-y-1 pl-6">
                                  <p className="text-[10px] text-gray-600">
                                    <span className="font-semibold">Sprint:</span> {sprintLabel ? sprintLabel.substring(0, 20) : '—'}
                                  </p>
                                  <p className="text-[10px] text-gray-600">
                                    <span className="font-semibold">Criação:</span> {f.reminder_date ? format(new Date(f.reminder_date + 'T00:00:00'), 'dd/MM/yy') : '—'}
                                  </p>
                                  <p className="text-[10px] text-gray-500 italic">
                                    Ult. acesso: —
                                  </p>
                                  <p className="text-[10px] text-gray-500 italic">
                                    Ult. interação: —
                                  </p>
                                </div>
                              </div>
                            ))}
                          {allFollowUps.filter(f => f.origin_type === 'sprint' && !f.is_completed).filter(f => {
                            const fDate = new Date(f.reminder_date + 'T00:00:00');
                            return fDate >= new Date(inicioSemana + 'T00:00:00') && fDate <= new Date(fimSemana + 'T23:59:59');
                          }).length === 0 && (
                            <p className="text-[11px] text-gray-400 italic text-center py-4">Sem FUSp esta semana</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Footer fixo */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-white space-y-2">
          {(() => {
            const temRascunho = verificarRascunho();
            return (
              <Button
                onClick={() => {
                  setView("register");
                  setRegisterStep("history");
                }}
                className={`w-full rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
                  temRascunho
                    ? "bg-cyan-600 hover:bg-cyan-700 text-white"
                    : "bg-green-600 hover:bg-green-700 text-white"
                }`}
              >
                <PlayCircle className="w-4 h-4" />
                {temRascunho ? "Retomar Atendimento" : "Iniciar Atendimento"}
              </Button>
            );
          })()}
          <Button
            onClick={onBack}
            variant="outline"
            className="w-full rounded-lg font-semibold flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar à lista
          </Button>
        </div>
      </div>

      {/* Mini chat flutuante */}
      <div className="fixed bottom-6 right-6 z-40">
        {chatAberto && (
          <div className="mb-3 w-80 bg-white border border-gray-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ height: '420px' }}>
            {/* Header do chat */}
            <div className="bg-gray-900 px-4 py-3 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-xs font-semibold text-white">Assistente IA</span>
                <span className="text-[10px] text-gray-400 truncate max-w-[100px]">{reminder.workshop_name}</span>
              </div>
              <button
                onClick={() => setChatAberto(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-gray-50">
              {chatMensagens.length === 0 && !chatEnviando && (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                </div>
              )}
              {chatMensagens.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-red-600 text-white rounded-br-sm'
                      : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {chatEnviando && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 rounded-xl rounded-bl-sm px-3 py-2">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-gray-200 px-3 py-2 flex gap-2 bg-white flex-shrink-0">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviarMensagemChat()}
                placeholder="Pergunte sobre o cliente..."
                disabled={chatEnviando}
                className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-red-400 disabled:opacity-50"
              />
              <button
                onClick={enviarMensagemChat}
                disabled={!chatInput.trim() || chatEnviando}
                className="w-8 h-8 rounded-lg bg-red-600 hover:bg-red-700 text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Botão flutuante */}
        <button
          onClick={chatAberto ? () => setChatAberto(false) : iniciarChat}
          className="w-12 h-12 rounded-full bg-gray-900 hover:bg-gray-800 text-white flex items-center justify-center shadow-lg transition-all hover:scale-105 relative"
          title="Assistente IA — pergunte sobre o cliente"
        >
          {chatAberto
            ? <X className="w-5 h-5" />
            : <MessageSquare className="w-5 h-5" />
          }
          {!chatAberto && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center">
              <span className="text-[8px] text-white font-bold">IA</span>
            </span>
          )}
        </button>
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