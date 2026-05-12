import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";


import {
  Phone, MessageCircle, Mail, Video, MapPin, CheckCircle2, X, Clock, AlertCircle,
  ChevronRight, ChevronLeft, Upload, Check, Calendar, User, Bell,
  MessageSquare, Send, Loader2
} from "lucide-react";
import { format, isToday, parseISO } from "date-fns";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import VisualizarAtaModal from "@/components/aceleracao/VisualizarAtaModal";
import { useOperationalSync } from "@/hooks/useOperationalSync";
import CronogramaTab from "@/components/aceleracao/CronogramaTab";
import TrilhaClientePanel from "@/components/aceleracao/TrilhaClientePanel";
import SprintClientSection from "@/components/aceleracao/sprint-client/SprintClientSection";
import PedidosInternosTab from "@/components/aceleracao/PedidosInternosTab";
import BacklogDashboard from "@/components/aceleracao/BacklogDashboard";
import ProximosPassosAbaTab from "@/components/aceleracao/ProximosPassosAbaTab";
import SprintClientModal from "@/components/aceleracao/sprint-client/SprintClientModal";
import ClientSelectorGrid from "@/components/aceleracao/ClientSelectorGrid";
import HistoricoContatosPanel, { buildHistoricoResumoIA } from "@/components/aceleracao/followups/HistoricoContatosPanel";
import BucketPanel from "@/components/aceleracao/BucketPanel";
import ParallelDemandsPanel from "@/components/aceleracao/ParallelDemandsPanel";
import CheckpointModal from "@/components/aceleracao/CheckpointModal";
import RegistrarAtendimento from "@/pages/RegistrarAtendimento";
import { useToasts } from "@/components/aceleracao/ToastContainer";
import { useClientDemands } from "@/components/aceleracao/hooks/useClientDemands";

const RESULTADO_COLORS = {
  atendeu: "bg-green-100 text-green-700 border-green-300",
  nao_atendeu: "bg-red-100 text-red-700 border-red-300",
  retornar: "bg-amber-100 text-amber-700 border-amber-300",
  agendou: "bg-blue-100 text-blue-700 border-blue-300",
  reagendou: "bg-purple-100 text-purple-700 border-purple-300",
  desistiu: "bg-gray-100 text-gray-700 border-gray-300",
};

const RESULTADO_LABELS = {
  atendeu: "Atendeu", nao_atendeu: "Não atendeu", retornar: "Retornar",
  agendou: "Agendou", reagendou: "Reagendou", desistiu: "Desistiu",
};
const CANAL_LABELS = {
  ligacao: "Ligação", whatsapp: "WhatsApp", email: "E-mail",
  video: "Vídeo", presencial: "Presencial",
};
const PROXIMO_PASSO_LABELS = {
  reagendar: "Reagendar follow-up", agendar: "Agendar sessão", enviar: "Enviar material",
  escalar: "Escalar para gestor", concluir: "Concluir programa", cancelar: "Cancelamento",
};

const SAVE_STEPS = [
  { key: "interacao",  label: "Gravando interação..." },
  { key: "followup",   label: "Atualizando status do follow-up..." },
  { key: "proximo",    label: "Criando próximo follow-up..." },
  { key: "notificacao",label: "Notificando consultor..." },
];

function getInitials(name = "") {
  return name.split(" ").slice(0, 2).map(p => p[0]).join("").toUpperCase() || "?";
}

const CANAL_OPTIONS = [
  { id: "ligacao", label: "Ligação", icon: Phone },
  { id: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { id: "email", label: "E-mail", icon: Mail },
  { id: "meet", label: "Meet", icon: Video },
  { id: "presencial", label: "Presencial", icon: MapPin },
];

const RESULTADO_OPTIONS = [
  { id: "atendeu", label: "Atendeu", color: "bg-green-100 border-green-300" },
  { id: "nao_atendeu", label: "Não atendeu", color: "bg-red-100 border-red-300" },
  { id: "aguardando", label: "Aguardando resposta", color: "bg-blue-100 border-blue-300" },
  { id: "agendou", label: "Agendou", color: "bg-teal-100 border-teal-300" },
  { id: "reagendou", label: "Reagendou", color: "bg-purple-100 border-purple-300" },
  { id: "desistiu", label: "Desistiu", color: "bg-gray-100 border-gray-300" },
];

const PROXIMO_PASSO_OPTIONS = [
  { id: "reagendar", label: "Reagendar follow-up" },
  { id: "agendar", label: "Agendar sessão" },
  { id: "enviar", label: "Enviar material" },
  { id: "escalar", label: "Escalar para gestor" },
  { id: "concluir", label: "Concluir programa" },
  { id: "cancelar", label: "Cancelamento" },
];

function renderMarkdown(text) {
  if (!text) return null;
  return text
    .split('\n')
    .filter(line => line !== null)
    .map((line, idx) => {
      if (line.trim() === '') return <div key={idx} className="h-2" />;
      const parts = line.split(/(\*\*[^*]+\*\*)/);
      const rendered = parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        return part;
      });
      if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
        return (
          <div key={idx} className="flex gap-1.5 items-start">
            <span className="text-red-500 mt-0.5 flex-shrink-0">•</span>
            <span>{rendered}</span>
          </div>
        );
      }
      const numMatch = line.trim().match(/^(\d+)\.\s(.+)/);
      if (numMatch) {
        return (
          <div key={idx} className="flex gap-1.5 items-start">
            <span className="text-red-500 font-semibold flex-shrink-0">{numMatch[1]}.</span>
            <span>{rendered}</span>
          </div>
        );
      }
      return <div key={idx}>{rendered}</div>;
    });
}

export default function IniciarAtendimentoModal({ followUp: followUpInicial, cliente, onClose, onSaved, fusConcatenados = [], proximoFU = null, onProximoFollowUp, filaReminders = [], onNavegar }) {
  // Validar filaReminders — pode vir undefined
  const validFilaReminders = Array.isArray(filaReminders) ? filaReminders : [];
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];

  // ── Estado interno do follow-up atual (permite navegação sem fechar o modal) ──
  const [followUp, setFollowUp] = useState(followUpInicial);

  const [timer, setTimer] = useState(0);
  const [canais, setCanais] = useState([]);
  const [resultado, setResultado] = useState("");
  const [dataContato, setDataContato] = useState(format(new Date(), "yyyy-MM-dd"));
  const [humor, setHumor] = useState("");
  const [engajamento, setEngajamento] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [compromissos, setCompromissos] = useState("");
  const [proximoPasso, setProximoPasso] = useState("");
  const [proxData, setProxData] = useState("");
  const [proxHora, setProxHora] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingStep, setSavingStep] = useState(null);
  const [activeStepIndex, setActiveStepIndex] = useState(-1);
  const [saveSuccess, setSaveSuccess] = useState(null); // dados da tela de confirmação
  const [errors, setErrors] = useState({});
  const [selectedAta, setSelectedAta] = useState(null);
  const [pastedImages, setPastedImages] = useState([]);
  const [duracao, setDuracao] = useState(30);
  const [inicioContagem, setInicioContagem] = useState(null);

  useEffect(() => {
    setInicioContagem(prev => prev ?? Date.now());
  }, []);
  const [cronometroAtivo, setCronometroAtivo] = useState(true);
  const [showAtaModal, setShowAtaModal] = useState(false);
  const [showNavConfirm, setShowNavConfirm] = useState(false);
  const [navTarget, setNavTarget] = useState(null);
  const [fusSemanaExpandido, setFusSemanaExpandido] = useState(false);
  const [fusSemanaLocal, setFusSemanaLocal] = useState([]);
  const [fuAtaSelecionados, setFuAtaSelecionados] = useState([]);
  const [fuSpSelecionados, setFuSpSelecionados] = useState([]);
  const [activePanel, setActivePanel] = useState('atas');
  const [selectedSprintId, setSelectedSprintId] = useState(null);
  const [showClientSelector, setShowClientSelector] = useState(false);
  const [clienteAtual, setClienteAtual] = useState(cliente);
  const [showRegistrarAtendimento, setShowRegistrarAtendimento] = useState(false);
  const [showCheckpointModal, setShowCheckpointModal] = useState(false);
  
  // Toasts & Demands
  const { addToast } = useToasts();
  const { demands, demandsCritical } = useClientDemands(followUp?.workshop_id);

  // States da aba IA
  const [dicaIA, setDicaIA] = useState(null);
  const [carregandoDica, setCarregandoDica] = useState(false);
  const calcOriginPos = useCallback(() => {
    return {
      x: window.innerWidth - 700,
      y: window.innerHeight - 90,
    };
  }, []);

  const [postItPos, setPostItPos] = useState(() => calcOriginPos());
  const [postItMinimizado, setPostItMinimizado] = useState(false);
  const draggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const postItRef = useRef(null);
  const postItClickTimer = useRef(null);
  const postItMoved = useRef(false);
  const [chatMensagens, setChatMensagens] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatEnviando, setChatEnviando] = useState(false);
  const [chatInicializado, setChatInicializado] = useState(false);
  const chatEndRef = useRef(null);

  // ─── OPERATIONAL SYNC MANAGER ───
  // Fonte única de verdade para todos os dados operacionais
  const {
    allFollowUps,
    completedFollowUps: concluidosModal,
    consultorAttendances: atendimentosHojeModal,
    atas,
    workshop,
    workshopOwner: ownerEmployee,
    allSprints,
    invalidate,
  } = useOperationalSync(followUp?.workshop_id || null, user?.id, user);

  // Alias para compatibilidade com código existente
  const allFollowUpsModal = allFollowUps;

  // Usar sprints já carregados pelo useOperationalSync (evita query duplicada → 429)
  const sprintsMapModal = useMemo(
    () => Object.fromEntries(allSprints.map(s => [s.id, s])),
    [allSprints]
  );

  const FASE_LABELS_MODAL = {
    Planning: "Planejamento",
    Execution: "Implementação",
    Monitoring: "Acompanhamento",
    Review: "Revisão",
    Retrospective: "Melhoria",
  };

  const getSprintFaseETarefaModal = (sprintId) => {
    const sprint = sprintsMapModal[sprintId];
    if (!sprint?.phases?.length) return { fase: null, tarefa: null };
    const faseAtiva = sprint.phases.find(p => p.status === 'in_progress' || p.status === 'pending_review')
      || sprint.phases.find(p => p.status === 'not_started');
    if (!faseAtiva) return { fase: null, tarefa: null };
    const tarefa = faseAtiva.tasks?.find(t => t.status === 'to_do') || null;
    return {
      fase: FASE_LABELS_MODAL[faseAtiva.name] || faseAtiva.name,
      tarefa: tarefa?.description || null,
    };
  };



  const idxAtual = validFilaReminders.findIndex(f => f.id === followUp?.id);
  const fuAnterior = idxAtual > 0 ? validFilaReminders[idxAtual - 1] : null;
  const fuProximo = idxAtual >= 0 && idxAtual < validFilaReminders.length - 1
    ? validFilaReminders[idxAtual + 1]
    : null;
  const isDirty = !!(canais.length > 0 || resultado || observacoes || compromissos || proximoPasso || pastedImages.length > 0);

  // ── Função central de troca de follow-up (sem fechar o modal) ──
   const trocarFollowUp = useCallback((novoFU) => {
     // Limpar rascunho do anterior
     localStorage.removeItem(`draft_atendimento_${followUp?.id}`);
     // Atualizar FU interno
     setFollowUp(novoFU);
     // ✅ SINCRONIZAR CLIENTE ATUAL COM O NOVO FU
     if (novoFU?.workshop_id) {
       const novoCliente = {
         id: novoFU.workshop_id,
         name: novoFU.workshop_name,
       };
       setClienteAtual(novoCliente);
     }
     // Resetar formulário
     setCanais([]);
     setResultado("");
     setHumor("");
     setEngajamento("");
     setObservacoes("");
     setCompromissos("");
     setProximoPasso("");
     setProxData("");
     setProxHora("");
     setPastedImages([]);
     setErrors({});
     setSaveSuccess(null);
     setActiveStepIndex(-1);
     // Resetar timer para o novo cliente
     setTimer(0);
     setDuracao(30);
     setInicioContagem(Date.now());
     setCronometroAtivo(true);
     // Notificar o pai (opcional, só para sincronia de estado externo)
     onNavegar?.(novoFU);
   }, [followUp?.id, onNavegar]);

  // ── Gerador de ID rastreável de suporte ──
  const gerarSuporteId = () => {
    const ts = Date.now();
    const rand = Math.random().toString(36).substr(2, 5).toUpperCase();
    return `SUP-${ts}-${rand}`;
  };

  // ── Carregador de cliente — abre suporte rastreável com prazo 24h ──
  const carregarCliente = useCallback(async (clientData) => {
    try {
      setClienteAtual(clientData);
      
      // Buscar primeiro follow-up pendente do cliente
      const followUps = await base44.entities.FollowUpReminder.filter({
        workshop_id: clientData.id,
        is_completed: false
      }, 'reminder_date', 1);

      if (followUps && followUps.length > 0) {
        trocarFollowUp(followUps[0]);
      } else {
        // Sem follow-ups — criar SUPORTE rastreável com prazo 24h (amanhã = vencido)
        const suporteId = gerarSuporteId();
        const hoje = new Date().toISOString().split('T')[0];
        const novoSuporte = {
          id: `suporte_${clientData.id}_${Date.now()}`,
          workshop_id: clientData.id,
          workshop_name: clientData.name,
          consultor_id: user?.id,
          consultor_nome: user?.full_name || "Consultor",
          sequence_number: 0,
          reminder_date: hoje, // prazo = hoje, amanhã já aparece como vencido
          origin_type: 'suporte',
          suporte_id: suporteId,
          suporte_descricao: '',
          is_completed: false,
          atendimento_id: null,
          ata_id: null,
          notes: `Suporte ao Cliente · ${suporteId}`,
          _isSuporteLocal: true, // flag para não salvar no BD ainda
        };
        trocarFollowUp(novoSuporte);
      }
      setShowClientSelector(false);
    } catch (err) {
      console.error('Erro ao carregar cliente:', err);
      toast.error('Erro ao carregar cliente');
    }
  }, [user?.id, user?.full_name, trocarFollowUp]);

  // Derivações da aba Follow-ups
  const isSprintFUModal = followUp?.origin_type === 'sprint';
  const sprintLabelModal = followUp?.notes?.replace('Follow-up automático da sprint: ', '').trim() || null;
  const fusDaSprintModal = isSprintFUModal
    ? allFollowUpsModal
        .filter(f =>
          f.origin_type === 'sprint' &&
          f.sprint_id === followUp?.sprint_id &&
          f.id !== followUp?.id
        )
        .sort((a, b) => (a.sequence_number || 0) - (b.sequence_number || 0))
    : [];

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
  const fusDaSemanaModal = allFollowUpsModal.filter(f =>
    !f.is_completed &&
    f.id !== followUp?.id &&
    f.reminder_date >= inicioSemana &&
    f.reminder_date <= fimSemana
  );

  // Carregar rascunho ao abrir o modal
  useEffect(() => {
    if (!followUp?.id) return;
    const storageKey = `draft_atendimento_${followUp.id}`;
    const savedDraft = localStorage.getItem(storageKey);
    
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        console.log('✅ Rascunho carregado:', draft);
        
        // Restaurar todos os campos
        setCanais(draft.canais || []);
        setResultado(draft.resultado || "");
        setDataContato(draft.dataContato || format(new Date(), "yyyy-MM-dd"));
        setHumor(draft.humor || "");
        setEngajamento(draft.engajamento || "");
        setObservacoes(draft.observacoes || "");
        setCompromissos(draft.compromissos || "");
        setProximoPasso(draft.proximoPasso || "");
        setProxData(draft.proxData || "");
        setProxHora(draft.proxHora || "");
        setPastedImages(draft.pastedImages || []);
        setTimer(draft.timer || 0);
        setDuracao(draft.duracao || 30);
        setInicioContagem(draft.inicioContagem ? new Date(draft.inicioContagem).getTime() : null);
        setCronometroAtivo(draft.cronometroAtivo !== false);
        
        toast.success("Rascunho restaurado! Pronto para continuar.");
      } catch (err) {
        console.error('Erro ao carregar rascunho:', err);
      }
    }
  }, [followUp?.id]);



  // Intervalo unificado — um único setInterval para timer e duração
  useEffect(() => {
    if (!cronometroAtivo) return;
    const interval = setInterval(() => {
      setTimer(t => t + 1);
      const decorrido = Math.floor((Date.now() - inicioContagem) / 1000 / 60);
      setDuracao(Math.max(0, 30 - decorrido));
    }, 1000);
    return () => clearInterval(interval);
  }, [inicioContagem, cronometroAtivo]);

  const formatTimer = () => {
    const mins = String(Math.floor(timer / 60)).padStart(2, "0");
    const secs = String(timer % 60).padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const handleNavegar = (fu) => {
    if (isDirty) {
      setNavTarget(fu);
      setShowNavConfirm(true);
    } else {
      trocarFollowUp(fu);
    }
  };

  const confirmarNavegacao = () => {
    const fu = navTarget;
    setShowNavConfirm(false);
    setNavTarget(null);
    trocarFollowUp(fu);
  };

  // ── Funções da aba IA ──
  const snapToOrigin = useCallback(() => {
    const origin = calcOriginPos();
    if (postItRef.current) {
      postItRef.current.style.transition = 'left 0.35s cubic-bezier(0.4,0,0.2,1), top 0.35s cubic-bezier(0.4,0,0.2,1)';
      setTimeout(() => {
        if (postItRef.current) postItRef.current.style.transition = '';
      }, 380);
    }
    setPostItPos(origin);
  }, [calcOriginPos]);

  const handlePostItMouseDown = useCallback((e) => {
    if (e.target.closest('button')) return;

    postItMoved.current = false;
    if (postItClickTimer.current) {
      clearTimeout(postItClickTimer.current);
      postItClickTimer.current = null;
      snapToOrigin();
      return;
    }
    postItClickTimer.current = setTimeout(() => {
      postItClickTimer.current = null;
    }, 320);

    draggingRef.current = true;
    dragOffsetRef.current = {
      x: e.clientX - postItPos.x,
      y: e.clientY - postItPos.y,
    };
    e.preventDefault();

    const handleMouseMove = (e) => {
      if (!draggingRef.current) return;
      postItMoved.current = true;
      setPostItPos({
        x: e.clientX - dragOffsetRef.current.x,
        y: e.clientY - dragOffsetRef.current.y,
      });
    };

    const handleMouseUp = () => {
      draggingRef.current = false;
      if (postItMoved.current && postItClickTimer.current) {
        clearTimeout(postItClickTimer.current);
        postItClickTimer.current = null;
      }
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [postItPos, snapToOrigin]);

  const gerarDicaIA = async () => {
    setCarregandoDica(true);
    try {
      const resumoAtas = atas.slice(0, 3).map(a =>
        `Ata (${a.tipo_aceleracao || a.tipo_atendimento || 'reunião'} - ${a.meeting_date || ''}): próximos passos: ${a.proximos_passos || 'não registrado'}`
      ).join('\n');
      const resumoHistoricoContatos = buildHistoricoResumoIA(concluidosModal);

      // Cria conversa pontual dedicada à dica
      const convDica = await base44.agents.createConversation({
        agent_name: 'followup_consultor',
        metadata: {
          name: `Dica ${followUp?.workshop_name} - FU ${followUp?.sequence_number}`,
          description: 'Geração pontual de dica para o atendimento',
        },
      });

      // Injeta contexto + pedido de dica numa única mensagem
      const mensagem = [
        `Cliente: ${followUp?.workshop_name}`,
        `Follow-up: ${followUp?.sequence_number}/4`,
        `Consultor: ${followUp?.consultor_nome || 'não informado'}`,
        ``,
        `ÚLTIMAS ATAS:`,
        resumoAtas || 'Sem atas registradas',
        ``,
        `HISTÓRICO DE CONTATOS:`,
        resumoHistoricoContatos || 'Sem contatos anteriores',
        ``,
        `Com base neste histórico, gere UMA dica prática e direta (máximo 3 linhas) para o consultor seguir neste atendimento. Responda apenas a dica, sem introdução, sem saudação.`,
      ].join('\n');

      await base44.agents.addMessage(convDica, {
        role: 'user',
        content: mensagem,
      });

      // Aguarda resposta via subscribe com timeout de 20s
      const dica = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout — agente não respondeu em 20s'));
        }, 20000);

        const unsubscribe = base44.agents.subscribeToConversation(
          convDica.id,
          (data) => {
            const msgs = data.messages || [];
            const resposta = msgs.find(m => m.role === 'assistant' && m.content?.trim());
            if (resposta?.content) {
              clearTimeout(timeout);
              unsubscribe();
              resolve(resposta.content);
            }
          }
        );
      });

      setDicaIA(dica.replace(/\\n/g, '\n').trim());
    } catch (err) {
      console.error('Erro ao gerar dica:', err);
      if (err.message?.includes('Timeout')) {
        toast.error('O agente demorou para responder. Tente recarregar.');
      } else {
        toast.error('Erro ao gerar dica de IA');
      }
    } finally {
      setCarregandoDica(false);
    }
  };

  // Dica gerada apenas quando o usuário clicar no botão ↺ do post-it

  const buildSystemPrompt = () => {
    const resumoAtas = atas.slice(0, 5).map(a =>
      `- ${a.tipo_aceleracao || a.tipo_atendimento || 'Reunião'} (${a.meeting_date || ''}): próximos passos: ${a.proximos_passos || 'não registrado'}`
    ).join('\n');
    const resumoHistorico = buildHistoricoResumoIA(concluidosModal);
    return `Você é um assistente especializado em consultoria empresarial para oficinas mecânicas e negócios em aceleração. Seu papel é ajudar o consultor durante o atendimento de follow-up.\n\nCONTEXTO DO ATENDIMENTO\nCliente: ${followUp?.workshop_name}\nFollow-up: ${followUp?.sequence_number}/4\nConsultor: ${followUp?.consultor_nome || 'não informado'}\nData: ${followUp?.reminder_date || 'não informada'}\n\nÚLTIMAS ATAS:\n${resumoAtas || 'Nenhuma ata registrada'}\n\nHISTÓRICO DE CONTATOS (follow-ups anteriores):\n${resumoHistorico}\n\nRegras:\n- Responda sempre em português brasileiro\n- Seja direto, prático e objetivo\n- Foque exclusivamente no cliente e contexto fornecido\n- Use o histórico de contatos para identificar padrões de humor, engajamento e comprometimentos não cumpridos\n- Sugira abordagens baseadas no histórico real do cliente\n- Seu escopo é: estratégia de atendimento, relacionamento com cliente, próximos passos, abordagem de follow-up, análise de humor e engajamento`;
  };

  const iniciarChat = () => {
    if (chatInicializado) return;
    setChatInicializado(true);
    setChatMensagens([{
      role: 'assistant',
      content: `Olá! Estou pronto para ajudar no atendimento de ${followUp?.workshop_name} — Follow-up ${followUp?.sequence_number}/4. Já analisei o histórico de atas e atendimentos deste cliente. Como posso ajudar?`,
    }]);
  };

  const enviarMensagemChat = async () => {
    if (!chatInput.trim() || chatEnviando) return;
    const texto = chatInput.trim();
    setChatInput('');
    const novasMensagens = [...chatMensagens, { role: 'user', content: texto }];
    setChatMensagens(novasMensagens);
    setChatEnviando(true);
    try {
      const historico = novasMensagens.slice(-10)
        .map(m => `${m.role === 'user' ? 'Consultor' : 'Assistente'}: ${m.content}`)
        .join('\n');
      const prompt = `${buildSystemPrompt()}\n\n---\nHISTÓRICO:\n${historico}\n\nResponda à última mensagem do Consultor.`;
      const response = await base44.functions.invoke('invokeLLMUnlimited', { prompt });
      const respostaRaw = response?.data?.result || response?.data?.message || response?.data || 'Não foi possível obter uma resposta.';
      const resposta = (typeof respostaRaw === 'string' ? respostaRaw : JSON.stringify(respostaRaw)).replace(/\\n/g, '\n').trim();
      setChatMensagens(prev => [...prev, { role: 'assistant', content: resposta }]);
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
      setChatMensagens(prev => [...prev, { role: 'assistant', content: 'Erro ao processar. Tente novamente.' }]);
    } finally {
      setChatEnviando(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMensagens]);

  // Resultados que fazem auto-reagendamento para amanhã (sem precisar próximo passo manual)
  const isAutoReagendar = resultado === "nao_atendeu" || resultado === "aguardando";

  const validate = () => {
    const newErrors = {};
    if (canais.length === 0) newErrors.canais = "Selecione pelo menos um canal";
    if (!resultado) newErrors.resultado = "Obrigatório";
    if (!observacoes.trim() || observacoes.length < 10) newErrors.observacoes = "Mín. 10 caracteres";
    // Próximo passo não é obrigatório para nao_atendeu e aguardando (auto-reagendamento)
    if (!isAutoReagendar && !proximoPasso) newErrors.proximoPasso = "Obrigatório";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      console.log('Iniciando salvamento de rascunho...');
      console.log('followUp:', followUp);
      
      if (!followUp || !followUp.id) {
        toast.error("Erro: follow-up não identificado");
        setSaving(false);
        return;
      }

      setSavingStep("Salvando rascunho...");
      
      // Salvar dados em uma estrutura temporária
       const draftData = {
         followUp_id: followUp.id,
         atendimento_id: followUp.atendimento_id,
         canais,
              resultado,
              dataContato,
         duracao,
         humor,
         engajamento,
         observacoes,
         compromissos,
         proximoPasso,
         proxData,
         proxHora,
         pastedImages,
         timer,
         cronometroAtivo: false,
         inicioContagem,
         savedAt: new Date().toISOString()
       };

       // Salvar no localStorage com a key baseada em followUp.id
       const storageKey = `draft_atendimento_${followUp.id}`;
       localStorage.setItem(storageKey, JSON.stringify(draftData));
       console.log('✅ Rascunho salvo em:', storageKey);
       console.log('Dados salvos:', draftData);
      
      await new Promise(r => setTimeout(r, 800));
      setSavingStep("completed");
      await new Promise(r => setTimeout(r, 1000));
      
      // Pausar cronômetro
      setCronometroAtivo(false);
      
      toast.success("Rascunho salvo com sucesso!");
      // Não limpar o localStorage aqui — para que o rascunho permaneça disponível
      onClose();
      } catch (err) {
      console.error('Erro ao salvar rascunho:', err);
      toast.error("Erro ao salvar rascunho: " + err.message);
      setSavingStep(null);
      } finally {
      setSaving(false);
      }
      };

  const handleSaveAndFinalize = async () => {
    if (!validate()) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    // Mostrar checkpoint modal em vez de salvar direto
    setShowCheckpointModal(true);
  };

  const handleCheckpointDecision = async (decision, metadata) => {
    setSaving(true);
    setActiveStepIndex(0);
    setShowCheckpointModal(false);

    const isSuporteFlow = followUp.origin_type === 'suporte' || followUp.origin_type === 'suporte_checkin';

    try {
      // STEP 0 — Se for suporte local (ainda não salvo no BD), criar o FollowUpReminder primeiro
      let followUpId = followUp.id;
      if (followUp._isSuporteLocal) {
        const suporteReminder = await base44.entities.FollowUpReminder.create({
          workshop_id: followUp.workshop_id,
          workshop_name: followUp.workshop_name,
          consultor_id: followUp.consultor_id,
          consultor_nome: followUp.consultor_nome,
          sequence_number: 0,
          reminder_date: followUp.reminder_date,
          origin_type: 'suporte',
          suporte_id: followUp.suporte_id,
          suporte_descricao: observacoes,
          is_completed: false,
          notes: followUp.notes,
          consulting_firm_id: user?.data?.consulting_firm_id || null,
        });
        followUpId = suporteReminder.id;
      }

      // STEP 0 — Gravar interação (FollowUpConcluido)
      setActiveStepIndex(0);
      await base44.entities.FollowUpConcluido.create({
        followup_id: followUpId,
        workshop_id: followUp.workshop_id,
        consultor_id: followUp.consultor_id,
        consultor_nome: followUp.consultor_nome,
        canal: canais.join(', '),
        resultado,
        dataContato,
        duracao,
        humor,
        engajamento,
        observacoes: isSuporteFlow ? `[SUPORTE ${followUp.suporte_id || ''}] ${observacoes}` : observacoes,
        compromissos,
        proximoPasso,
        proxData,
        proxHora,
        pastedImages,
        completedAt: new Date().toISOString(),
      });
      await new Promise(r => setTimeout(r, 650));

      // STEP 1 — Atualizar status do FollowUpReminder
      setActiveStepIndex(1);
      if (!followUp._isSuporteLocal) {
        await base44.entities.FollowUpReminder.update(followUp.id, {
          is_completed: true,
          completed_at: new Date().toISOString(),
        });
      } else {
        // Já criamos acima e vamos marcar como concluído pelo id real
        await base44.entities.FollowUpReminder.update(followUpId, {
          is_completed: true,
          completed_at: new Date().toISOString(),
        });
      }
      await new Promise(r => setTimeout(r, 650));

      // INVALIDAR FOLLOW-UPS PARA SINCRONIZAR COM OUTROS COMPONENTES
      invalidate.followUps();

      // STEP 1b — Encerrar FUs concatenados com os mesmos dados
      // Combina: externos (fusConcatenados do FollowUpDetail) + internos FUAta + internos FUSp + fusSemanaLocal legado
      const fusInternos = [
        ...fuAtaSelecionados.map(id => allFollowUpsModal.find(f => f.id === id)),
        ...fuSpSelecionados.map(id => allFollowUpsModal.find(f => f.id === id)),
        ...fusSemanaLocal.map(id => allFollowUpsModal.find(f => f.id === id)),
      ].filter(Boolean);
      const todosIds = new Set([...fusConcatenados.map(f => f.id), ...fusInternos.map(f => f.id)]);
      const fusParaConcatenar = [...fusConcatenados, ...fusInternos].filter((f, _, arr) => {
        if (todosIds.has(f.id)) { todosIds.delete(f.id); return true; }
        return false;
      });
      if (fusParaConcatenar.length > 0) {
        await Promise.all(fusParaConcatenar.map(fu =>
          Promise.all([
            base44.entities.FollowUpReminder.update(fu.id, {
              is_completed: true,
              completed_at: new Date().toISOString(),
            }),
            base44.entities.FollowUpConcluido.create({
              followup_id: fu.id,
              workshop_id: fu.workshop_id,
              consultor_id: fu.consultor_id,
              consultor_nome: fu.consultor_nome,
              canal: canais.join(', '),
              resultado,
              dataContato,
              duracao,
              humor,
              engajamento,
              observacoes: `[Encerrado junto ao FU ${followUp.sequence_number}] ${observacoes}`,
              compromissos,
              proximoPasso,
              proxData,
              proxHora,
              pastedImages: [],
              completedAt: new Date().toISOString(),
            }),
          ])
        ));
      }
      // Limpar seleção local após salvar
      setFusSemanaLocal([]);
      setFuAtaSelecionados([]);
      setFuSpSelecionados([]);

      // STEP 2 — Criar próximo follow-up
      let novoFollowUp = null;
      setActiveStepIndex(2);

      // Auto-reagendamento para amanhã: nao_atendeu ou aguardando resposta
      if (resultado === "nao_atendeu" || resultado === "aguardando") {
        const amanha = new Date();
        amanha.setDate(amanha.getDate() + 1);
        const amanhaStr = amanha.toISOString().split('T')[0];

        // Usa o canal selecionado como origem (primeiro canal da lista)
        const canalOrigem = canais[0] || "whatsapp";
        const canalLabel = { ligacao: "Ligação", whatsapp: "WhatsApp", email: "E-mail", meet: "Meet", presencial: "Presencial" }[canalOrigem] || canalOrigem;

        // Monta message de contexto para o card de amanhã
        const msgContexto = resultado === "aguardando"
          ? `⏳ Aguardando resposta (${canalLabel})${observacoes ? ` — ${observacoes.slice(0, 120)}` : ""}`
          : `🔁 Retentativa — não atendeu em ${format(new Date(), "dd/MM/yyyy")}${observacoes ? ` — ${observacoes.slice(0, 120)}` : ""}`;

        novoFollowUp = await base44.entities.FollowUpReminder.create({
          workshop_id: followUp.workshop_id,
          workshop_name: followUp.workshop_name,
          atendimento_id: followUp.atendimento_id,
          ata_id: followUp.ata_id,
          consultor_id: followUp.consultor_id,
          consultor_nome: followUp.consultor_nome,
          sequence_number: followUp.sequence_number || 1,
          reminder_date: amanhaStr,
          origin_type: followUp.origin_type || 'ata',
          sprint_id: followUp.sprint_id || null,
          is_completed: false,
          message: msgContexto,
          canal_origem: resultado === "aguardando" ? canalOrigem : null,
          consulting_firm_id: followUp.consulting_firm_id || null,
        });
      } else if (!isSuporteFlow && proximoPasso === "reagendar" && proxData) {
        // Reagendamento manual com data escolhida
        const nextSeq = (followUp.sequence_number || 1) + 1;
        novoFollowUp = await base44.entities.FollowUpReminder.create({
          workshop_id: followUp.workshop_id,
          workshop_name: followUp.workshop_name,
          atendimento_id: followUp.atendimento_id,
          ata_id: followUp.ata_id,
          consultor_id: followUp.consultor_id,
          consultor_nome: followUp.consultor_nome,
          sequence_number: nextSeq,
          reminder_date: proxData,
          origin_type: followUp.origin_type === 'sprint' ? 'sprint' : 'ata',
          sprint_id: followUp.origin_type === 'sprint' ? followUp.sprint_id : null,
          is_completed: false,
          message: compromissos ? `Comprometimentos anteriores:\n${compromissos}` : "",
          consulting_firm_id: followUp.consulting_firm_id || null,
        });
      }
      await new Promise(r => setTimeout(r, 650));

      // STEP 3 — Notificação (interna)
      setActiveStepIndex(3);
      await new Promise(r => setTimeout(r, 650));

      // Limpar rascunho
      localStorage.removeItem(`draft_atendimento_${followUp.id}`);

      // Invalidar todos os dados operacionais para sincronização em tempo real
      invalidate.all();

      onSaved?.();

      // Se houver próximo na fila, avança automaticamente sem fechar o modal
      const proximoNaFila = fuProximo;
      if (proximoNaFila) {
        toast.success(`✅ Salvo! Carregando próximo: ${proximoNaFila.workshop_name}`);
        trocarFollowUp(proximoNaFila);
      } else {
        // Sem próximo — mostra tela de confirmação final
        setSaveSuccess({
          clienteNome: cliente?.name || followUp?.workshop_name || "Cliente",
          sequenceNumber: followUp?.sequence_number || 1,
          canais, resultado,
          novoFollowUp,
          proxData, proxHora,
          consultor_nome: followUp?.consultor_nome,
        });
      }
    } catch (err) {
      console.error("Erro ao salvar:", err);
      toast.error("Erro ao salvar atendimento: " + err.message);
      setActiveStepIndex(-1);
    } finally {
      setSaving(false);
    }
  };

      // Tela de confirmação pós-salvar
  if (saveSuccess) {
    const { clienteNome, sequenceNumber, canais: cs, resultado: r, novoFollowUp, proxData: pd, proxHora: ph, consultor_nome } = saveSuccess;
    return (
      <Dialog open onOpenChange={() => {}}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          <div className="bg-gradient-to-b from-green-50 to-white p-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-9 h-9 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Atendimento salvo!</h2>
            <p className="text-sm text-gray-500 mb-6">
              {clienteNome} · Follow-up {sequenceNumber}/4 concluído
            </p>

            <div className="w-full space-y-2 text-left mb-6">
              <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span className="text-sm text-gray-700">
                  Interação registrada · <span className="font-medium">{cs?.split(', ').map(c => CANAL_LABELS[c] || c).join(' + ') || '—'}</span> · 
                  <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-medium border ${RESULTADO_COLORS[r] || "bg-gray-100 text-gray-700"}`}>
                    {RESULTADO_LABELS[r] || r}
                  </span>
                </span>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span className="text-sm text-gray-700">Follow-up {sequenceNumber}/4 marcado como realizado</span>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span className="text-sm text-gray-700">Observações salvas no histórico</span>
              </div>
            </div>

            {novoFollowUp && (
              <div className="w-full bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-2">Próximo follow-up criado automaticamente</p>
                <div className="space-y-1 text-sm text-blue-900">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-blue-500" />
                    <span>Follow-up {(sequenceNumber || 1) + 1}/4</span>
                  </div>
                  {pd && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-blue-500" />
                      <span>Data: {format(new Date(pd + "T00:00:00"), "dd/MM/yyyy")}{ph ? ` às ${ph}` : ""}</span>
                    </div>
                  )}
                  {consultor_nome && (
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-blue-500" />
                      <span>Consultor: {consultor_nome}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-3 w-full">
              <Button variant="outline" className="flex-1" onClick={onClose}>
                Voltar à lista
              </Button>
              {proximoFU && (
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => trocarFollowUp(proximoFU)}
                >
                  Próximo follow-up →
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open onOpenChange={() => {}}>
        <DialogContent hideClose className="p-0 flex flex-col overflow-hidden relative" style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "96vw", maxWidth: "96vw", height: "94vh", maxHeight: "94vh", zIndex: 9999, margin: 0, borderRadius: "12px" }}>
        {/* OVERLAY DE SALVAMENTO */}
        {saving && (
          <div className="absolute inset-0 bg-white/90 z-50 flex flex-col items-center justify-center gap-6">
            <div className="w-14 h-14 rounded-full border-4 border-gray-200 border-t-green-600 animate-spin" />
            <div className="space-y-3 w-64">
              {SAVE_STEPS.map((step, idx) => {
                const done = idx < activeStepIndex;
                const active = idx === activeStepIndex;
                return (
                  <div key={step.key} className={`flex items-center gap-3 transition-all ${active ? "opacity-100" : done ? "opacity-60" : "opacity-30"}`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${done ? "bg-green-500" : active ? "bg-green-600 animate-pulse" : "bg-gray-200"}`}>
                      {done ? <Check className="w-3 h-3 text-white" /> : <span className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <span className={`text-sm font-medium ${active ? "text-gray-900" : done ? "text-green-600" : "text-gray-400"}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* HEADER - FIXO */}
         <div className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between border-b border-gray-800 flex-shrink-0">
           <div className="flex items-center gap-4 flex-1">
             {/* Cliente Selector Button */}
             <button
               onClick={() => setShowClientSelector(true)}
               className="flex items-center gap-3 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors group min-w-fit"
             >
               <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-xs">
                 {getInitials(clienteAtual?.name || followUp?.workshop_name || "")}
               </div>
               <div className="text-left">
                 <p className="font-semibold text-sm group-hover:text-red-400 transition-colors">
                   {clienteAtual?.name || followUp?.workshop_name || "Selecionar cliente"}
                 </p>
                 {(followUp?.origin_type === 'suporte' || followUp?.origin_type === 'suporte_checkin') ? (
                   <p className="text-[10px] text-amber-400 font-bold">🛟 {followUp?.suporte_id || 'Suporte'}</p>
                 ) : (
                   <p className="text-[10px] text-gray-400">Follow-up {followUp?.sequence_number}/4</p>
                 )}
               </div>
               <span className="text-gray-400 ml-2">▼</span>
             </button>

             <Badge className="bg-gradient-to-r from-red-600 to-red-700 text-white border-0 shadow-lg flex items-center gap-2 px-3 py-1.5 flex-shrink-0">
               <div className="relative flex items-center justify-center">
                 <div className="absolute inset-0 bg-red-500 rounded-full animate-pulse opacity-30"></div>
                 <Clock className="w-4 h-4 relative z-10" />
               </div>
               <span className="font-semibold text-sm">Em atendimento</span>
               <span className="bg-red-800 rounded px-2 py-0.5 font-mono text-sm">{formatTimer()}</span>
             </Badge>
             </div>

             {/* SPACER */}
             <div className="flex-1" />

             <div className="flex items-center gap-2 ml-auto flex-shrink-0">
            {/* Badge de status/prioridade do FU atual */}
            {(() => {
              const rd = followUp?.reminder_date;
              if (!rd) return null;
              const diffDays = Math.floor((new Date(today) - new Date(rd + 'T00:00:00')) / 86400000);
              if (diffDays >= 3) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-600 text-white uppercase tracking-wide">🔴 Urgente</span>;
              if (diffDays >= 1) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500 text-white uppercase tracking-wide">🟠 Vencido</span>;
              if (diffDays === 0) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-gray-900 uppercase tracking-wide">🟡 Hoje</span>;
              return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-600 text-gray-200 uppercase tracking-wide">📅 Futuro</span>;
            })()}
            <button
              onClick={() => fuAnterior && handleNavegar(fuAnterior)}
              disabled={!fuAnterior}
              title={fuAnterior ? `Anterior: ${fuAnterior.workshop_name}` : 'Sem anterior'}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-gray-500 min-w-[40px] text-center">
              {idxAtual >= 0 ? `${idxAtual + 1}/${validFilaReminders.length}` : '—'}
            </span>
            <button
              onClick={() => fuProximo && handleNavegar(fuProximo)}
              disabled={!fuProximo}
              title={fuProximo ? `Próximo: ${fuProximo.workshop_name}` : 'Sem próximo'}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* CONTENT - SCROLLÁVEL */}
        <div className="flex-1 overflow-hidden flex min-h-0">
          {/* LEFT COLUMN - FORM (~40%) */}
          <div className="overflow-y-auto border-r border-gray-200 px-4 py-4" style={{ flex: '2 1 0%', minWidth: '320px', maxWidth: '42%' }}>
            <div className="space-y-6 max-w-2xl px-2 py-2 bg-white rounded-lg shadow-[inset_0_2px_8px_rgba(0,0,0,0.05)]">
              {/* Canal */}
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2 block">
                  Canais de contato *
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {CANAL_OPTIONS.map(opt => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => {
                          setCanais(prev =>
                            prev.includes(opt.id)
                              ? prev.filter(id => id !== opt.id)
                              : [...prev, opt.id]
                          );
                          setErrors(e => ({ ...e, canais: null }));
                        }}
                        className={`flex flex-col items-center gap-1 px-3 py-3 rounded-lg border-2 text-xs font-medium transition ${
                          canais.includes(opt.id)
                            ? "bg-gray-900 text-white border-gray-900"
                            : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                        } ${errors.canais ? "border-red-500 bg-red-50" : ""}`}
                      >
                        <Icon className="w-5 h-5" />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                {errors.canais && <p className="text-xs text-red-600 mt-1">{errors.canais}</p>}
              </div>

              {/* Resultado */}
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2 block">
                  Resultado do contato *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {RESULTADO_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setResultado(opt.id);
                      setErrors(e => ({ ...e, resultado: null }));
                    }}
                      className={`px-3 py-2 rounded-lg border-2 text-xs font-medium transition flex items-center justify-center gap-1 ${
                        resultado === opt.id
                          ? `${RESULTADO_COLORS[opt.id]} ring-2 ring-offset-1 ring-current`
                          : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                      } ${errors.resultado && !resultado ? "border-red-300" : ""}`}
                    >
                      {resultado === opt.id && <Check className="w-3 h-3" />}
                      {opt.label}
                    </button>
                  ))}
                </div>
                {errors.resultado && <p className="text-xs text-red-600 mt-1">{errors.resultado}</p>}
              </div>

              {/* Informações */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2 block">Data do contato</label>
                  <Input type="date" value={dataContato} disabled className="bg-gray-100 cursor-not-allowed" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2 block">Duração (min)</label>
                  <Input type="number" value={duracao} disabled className="bg-gray-100 cursor-not-allowed text-center font-semibold" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2 block">Humor do cliente</label>
                  <Select value={humor} onValueChange={setHumor}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {["Receptivo", "Neutro", "Resistente", "Animado", "Preocupado"].map(h => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2 block">Engajamento</label>
                  <Select value={engajamento} onValueChange={setEngajamento}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {["Alto", "Médio", "Baixo"].map(e => (
                        <SelectItem key={e} value={e}>{e}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2 block">Observações *</label>
                <Textarea
                  placeholder="Descreva detalhes do contato..."
                  value={observacoes}
                  onChange={e => {
                    setObservacoes(e.target.value);
                    if (e.target.value.length >= 10) setErrors(er => ({ ...er, observacoes: null }));
                  }}
                  className={`min-h-24 text-sm ${errors.observacoes ? "border-red-500 bg-red-50" : ""}`}
                />
                <p className="text-xs text-gray-500 mt-1">{observacoes.length}/10 caracteres</p>
                {errors.observacoes && <p className="text-xs text-red-600">{errors.observacoes}</p>}
              </div>

              {/* Compromissos */}
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2 block">Compromissos do cliente</label>
                <Textarea
                  placeholder="O que o cliente se comprometeu em fazer..."
                  value={compromissos}
                  onChange={e => setCompromissos(e.target.value)}
                  className="min-h-20 text-sm"
                />
              </div>

              {/* Próximo passo — oculto para nao_atendeu e aguardando (auto-reagendamento) */}
              {!isAutoReagendar && (
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2 block">Próximo passo *</label>
                <div className="grid grid-cols-2 gap-2">
                  {PROXIMO_PASSO_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => {
                        setProximoPasso(opt.id);
                        setErrors(e => ({ ...e, proximoPasso: null }));
                      }}
                      className={`px-3 py-2 rounded-lg border-2 text-xs font-medium transition ${
                        proximoPasso === opt.id
                          ? opt.id === "cancelar"
                            ? "bg-red-100 text-red-700 border-red-300"
                            : "bg-gray-900 text-white border-gray-900"
                          : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                      } ${errors.proximoPasso ? "border-red-500 bg-red-50" : ""}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {errors.proximoPasso && <p className="text-xs text-red-600 mt-1">{errors.proximoPasso}</p>}
              </div>
              )}

              {/* Banner informativo para auto-reagendamento */}
              {isAutoReagendar && (
                <div className={`rounded-lg border px-3 py-2.5 flex items-center gap-2 text-xs font-medium ${resultado === "aguardando" ? "bg-blue-50 border-blue-200 text-blue-800" : "bg-amber-50 border-amber-200 text-amber-800"}`}>
                  <span className="text-base">{resultado === "aguardando" ? ({ ligacao: "📞", email: "✉️", presencial: "🏠", meet: "🎥" }[canais[0]] || "💬") : "🔁"}</span>
                  <span>
                    {resultado === "aguardando"
                      ? `Um novo follow-up será criado automaticamente para amanhã — aguardando retorno via ${({ ligacao: "Ligação", whatsapp: "WhatsApp", email: "E-mail", meet: "Meet", presencial: "Presencial" }[canais[0]] || "WhatsApp")}`
                      : "Um novo follow-up de retentativa será criado automaticamente para amanhã"}
                  </span>
                </div>
              )}

              {/* Data/Hora próximo contato */}
              {["reagendar", "agendar", "enviar"].includes(proximoPasso) && (
                <div className="grid grid-cols-2 gap-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div>
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2 block">Data próximo contato</label>
                    <Input type="date" value={proxData} onChange={e => setProxData(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2 block">Horário</label>
                    <Input type="time" value={proxHora} onChange={e => setProxHora(e.target.value)} />
                  </div>
                </div>
              )}

              {/* Documentos */}
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2 block">Documentos e anexos</label>
                
                {/* Upload Area */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition cursor-pointer mb-3">
                  <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                  <p className="text-xs text-gray-600">Arraste arquivos ou clique para selecionar</p>
                  <p className="text-xs text-gray-400 mt-1">PDF, XLSX, DOCX, PNG (máx 10MB)</p>
                </div>

                {/* Paste Screenshot Area */}
                <div 
                  onPaste={(e) => {
                    e.preventDefault();
                    const items = e.clipboardData.items;
                    for (let item of items) {
                      if (item.type.startsWith('image/')) {
                        const file = item.getAsFile();
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          setPastedImages(prev => [...prev, {
                            id: Math.random(),
                            src: event.target.result,
                            name: `Screenshot ${new Date().toLocaleTimeString('pt-BR')}`
                          }]);
                        };
                        reader.readAsDataURL(file);
                      }
                    }
                  }}
                  className="border-2 border-blue-300 border-dashed rounded-lg p-6 bg-blue-50 text-center focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3 cursor-pointer transition"
                  tabIndex="0"
                >
                  <p className="text-sm font-medium text-blue-700 mb-1">Colar screenshot aqui</p>
                  <p className="text-xs text-blue-600">Use Ctrl+V (ou Cmd+V) para colar uma imagem da área de transferência</p>
                </div>

                {/* Pasted Images Preview */}
                {pastedImages.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-600">Screenshots coladas ({pastedImages.length})</p>
                    <div className="grid grid-cols-2 gap-2">
                      {pastedImages.map(img => (
                        <div key={img.id} className="relative group rounded-lg overflow-hidden border border-gray-200 bg-white">
                          <img 
                            src={img.src} 
                            alt={img.name}
                            className="w-full h-24 object-cover"
                          />
                          <button
                            onClick={() => setPastedImages(prev => prev.filter(p => p.id !== img.id))}
                            className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <p className="text-xs text-gray-600 p-1 bg-white text-center truncate">{img.name}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT SIDE - RAIL + CONTEXTUAL PANEL */}
          {(() => {
            const NAV_ITEMS = [
              { id: 'atas',         emoji: '📄', label: 'Atas',           group: 1 },
              { id: 'followups',    emoji: '👥', label: 'Follow-ups',     group: 1 },
              { id: 'cliente',      emoji: '🏢', label: 'Cliente',        group: 1 },
              { id: 'cronograma',   emoji: '📊', label: 'Cronograma',     group: 2 },
              { id: 'trilhas',      emoji: '🚀', label: 'Trilhas',        group: 2 },
              { id: 'sprints',      emoji: '⚡', label: 'Sprints',        group: 2 },
              { id: 'proximospassos', emoji: '✅', label: 'Próximos Passos', group: 2 },
              { id: 'pedidos',      emoji: '📋', label: 'Pedidos',        group: 2 },
              { id: 'backlog',      emoji: '📝', label: 'Backlog',        group: 2 },
              { id: 'bucket',       emoji: '📥', label: 'Bucket',         group: 2 },
              { id: 'historico',    emoji: '🕐', label: 'Histórico',      group: 3 },
      { id: 'ia',           emoji: '🤖', label: 'IA',             group: 3 },
      { id: 'demandas',     emoji: '🔔', label: 'Demandas Paralelas', group: 3 },
      ];

            const handleRailClick = (id) => {
              if (id === 'ia' && !chatInicializado) iniciarChat();
              setActivePanel(prev => prev === id ? null : id);
            };

            return (
              <>
                {/* RAIL VERTICAL */}
                <div className="w-12 flex-shrink-0 border-l border-gray-200 bg-gray-900 flex flex-col items-center py-2 gap-0.5">
                  {NAV_ITEMS.map((item, idx) => {
                    const prevItem = NAV_ITEMS[idx - 1];
                    const showDivider = idx > 0 && item.group !== prevItem?.group;
                    return (
                      <div key={item.id}>
                         {showDivider && <div className="w-8 h-px bg-gray-600 my-1" />}
                         <div className="relative group">
                          <button
                            onClick={() => handleRailClick(item.id)}
                            title={item.label}
                            className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-all duration-150 relative ${
                              activePanel === item.id
                                ? 'bg-red-600 shadow-lg ring-2 ring-red-400'
                                : 'hover:bg-gray-700'
                            }`}
                          >
                            {item.emoji}
                            {/* Pulsing badge for demands */}
                            {item.id === 'demandas' && demandsCritical && demandsCritical.length > 0 && (
                              <>
                                <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping opacity-75" />
                                <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-orange-500" />
                              </>
                            )}
                          </button>
                          {/* Tooltip */}
                          <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 border border-gray-700">
                            {item.label}
                            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-800" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* CONTEXTUAL PANEL */}
                {activePanel && (
                  <div
                    className="border-l border-gray-200 bg-white overflow-hidden flex flex-col"
                    style={{ flex: '3 1 0%', minWidth: '340px', animation: 'slideInRight 0.25s ease-out' }}
                  >
                    {/* Panel Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50 flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{NAV_ITEMS.find(n => n.id === activePanel)?.emoji}</span>
                        <span className="text-sm font-semibold text-gray-800">{NAV_ITEMS.find(n => n.id === activePanel)?.label}</span>
                      </div>
                      {/* Botão + Novo Atendimento (apenas na aba ATAS) */}
                      {activePanel === 'atas' && (
                        <Button 
                          size="sm" 
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold h-7 px-2.5 mr-2"
                          onClick={() => setShowRegistrarAtendimento(true)}
                        >
                          + Novo Atendimento
                        </Button>
                      )}
                      <button onClick={() => setActivePanel(null)} className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Panel Content */}
                    <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">

                      {/* ATAS */}
                      {activePanel === 'atas' && (
                        <div className="px-3 py-4 space-y-2">
                          {atas.length === 0 ? (
                            <p className="text-xs text-gray-500 italic">Sem atas registradas</p>
                          ) : atas.map(ata => {
                            const isOrigin = ata.id === followUp?.ata_id;
                            const tipo = (ata.tipo_aceleracao || ata.tipo_atendimento || "ATA").toLowerCase();
                            const emojiMap = { "diagnóstico": "🔍", "diagnostico": "🔍", "acelera time": "⚡", "mentoria": "🎓", "onboarding": "🚀", "pontual": "📌" };
                            const emoji = emojiMap[tipo] || "📄";
                            return (
                              <button key={ata.id} onClick={() => setSelectedAta(ata)}
                                className={`w-full flex items-start gap-3 px-3 py-3 rounded-lg border transition-colors text-left ${isOrigin ? "border-green-300 bg-green-50 hover:bg-green-100" : "border-gray-200 bg-white hover:bg-gray-50"}`}
                              >
                                <span className="text-lg flex-shrink-0">{emoji}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className={`text-xs font-semibold ${isOrigin ? "text-green-800" : "text-gray-800"}`}>{ata.tipo_aceleracao || ata.tipo_atendimento || "ATA"}</p>
                                    {isOrigin && <Badge className="bg-green-600 text-white text-[10px] flex items-center gap-1"><Check className="w-3 h-3" /> Origem</Badge>}
                                  </div>
                                  {ata.proximos_passos && <p className="text-[11px] text-gray-500 line-clamp-1 mt-1">{ata.proximos_passos}</p>}
                                  {ata.meeting_date && <p className="text-[10px] text-gray-400 mt-1">{format(new Date(ata.meeting_date), "dd/MM/yyyy")}</p>}
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* FOLLOW-UPS — Timeline 2 colunas */}
                      {activePanel === 'followups' && (() => {
                        // Calcula semana atual (domingo–sábado)
                        const _hoje = new Date(today);
                        const _inicioSem = new Date(_hoje); _inicioSem.setDate(_hoje.getDate() - _hoje.getDay());
                        const _fimSem = new Date(_hoje); _fimSem.setDate(_hoje.getDate() + (6 - _hoje.getDay()));
                        const _inicioStr = _inicioSem.toISOString().split('T')[0];
                        const _fimStr = _fimSem.toISOString().split('T')[0];

                        // FUAta: origem ata, pendente, com ata_id, dentro da semana
                        const fuAtaSemana = allFollowUpsModal.filter(f =>
                          (f.origin_type === 'ata' || !f.origin_type) &&
                          !f.is_completed &&
                          f.ata_id &&
                          f.reminder_date >= _inicioStr &&
                          f.reminder_date <= _fimStr
                        ).sort((a, b) => new Date(a.reminder_date) - new Date(b.reminder_date));

                        // FUSp: origem sprint, pendente, com sprint_id, dentro da semana
                        const fuSpSemana = allFollowUpsModal.filter(f =>
                          f.origin_type === 'sprint' &&
                          !f.is_completed &&
                          f.sprint_id &&
                          f.reminder_date >= _inicioStr &&
                          f.reminder_date <= _fimStr
                        ).sort((a, b) => new Date(a.reminder_date) - new Date(b.reminder_date));

                        const totalSelecionados = fuAtaSelecionados.length + fuSpSelecionados.length;

                        return (
                          <div className="px-3 py-4 space-y-3">
                            {/* Card atual */}
                            <div className="bg-white rounded-lg p-3 border border-red-200">
                              <Badge className="bg-red-600 text-white text-xs mb-1">Atual</Badge>
                              <p className="text-sm font-semibold text-gray-900">FU {followUp?.sequence_number || 1}</p>
                              <p className="text-xs text-gray-500 mt-1">{followUp?.reminder_date}</p>
                            </div>

                            {/* Bloco sprint (se FU atual for de sprint) */}
                            {isSprintFUModal && (
                              <div className="bg-orange-50 border border-orange-200 rounded-lg overflow-hidden">
                                <div className="flex items-center gap-2 px-3 py-2 border-b border-orange-200">
                                  <span className="text-sm">🚀</span>
                                  <p className="text-[10px] font-bold text-orange-800 uppercase tracking-wide flex-1">Follow-ups desta sprint</p>
                                  <span className="text-[10px] text-orange-600 font-medium">
                                    {allFollowUpsModal.filter(f => f.sprint_id === followUp?.sprint_id && f.origin_type === 'sprint' && f.is_completed).length}
                                    /{allFollowUpsModal.filter(f => f.sprint_id === followUp?.sprint_id && f.origin_type === 'sprint').length} concluídos
                                  </span>
                                </div>
                                {sprintLabelModal && <p className="text-[11px] text-orange-600 px-3 pt-2 pb-1 italic truncate">{sprintLabelModal}</p>}
                                <div className="px-3 pb-3 pt-1 space-y-1.5">
                                  <div className="flex items-center gap-2 bg-orange-100 border border-orange-200 rounded px-2 py-1.5">
                                    <div className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0 ring-2 ring-orange-300" />
                                    <span className="text-[11px] font-bold text-orange-800">FU {followUp?.sequence_number} · Em andamento</span>
                                    <span className="ml-auto text-[10px] text-orange-600">{followUp?.reminder_date ? format(new Date(followUp.reminder_date + 'T00:00:00'), 'dd/MM') : '—'}</span>
                                  </div>
                                  {fusDaSprintModal.map(f => (
                                    <div key={f.id} className="flex items-center gap-2 px-2 py-1.5">
                                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${f.is_completed ? 'bg-green-400' : 'bg-gray-300'}`} />
                                      <span className={`text-[11px] ${f.is_completed ? 'text-green-700 font-semibold' : 'text-gray-600'}`}>FU {f.sequence_number}</span>
                                      <span className={`text-[10px] ${f.is_completed ? 'text-green-500' : 'text-gray-400'}`}>{f.is_completed ? '✓ concluído' : 'pendente'}</span>
                                      <span className="ml-auto text-[10px] text-gray-400">{f.reminder_date ? format(new Date(f.reminder_date + 'T00:00:00'), 'dd/MM') : '—'}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Banner aviso semana */}
                            {fusDaSemanaModal.length > 0 && (
                              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0">{fusDaSemanaModal.length}</span>
                                <p className="text-[11px] text-amber-800 font-medium">
                                  {fusDaSemanaModal.length} outro{fusDaSemanaModal.length > 1 ? 's' : ''} FU{fusDaSemanaModal.length > 1 ? 's' : ''} pendente{fusDaSemanaModal.length > 1 ? 's' : ''} esta semana — selecione abaixo para encerrar em conjunto
                                </p>
                              </div>
                            )}

                            {/* Badge de selecionados */}
                            {totalSelecionados > 0 && (
                              <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                                <p className="text-[11px] text-green-700 font-semibold">
                                  ✓ {totalSelecionados} FU{totalSelecionados > 1 ? 's' : ''} selecionado{totalSelecionados > 1 ? 's' : ''} para encerrar junto
                                </p>
                              </div>
                            )}

                            {/* Timeline 2 colunas */}
                            {(fuAtaSemana.length > 0 || fuSpSemana.length > 0) && (
                              <div className="border border-gray-200 rounded-lg overflow-hidden">
                                {/* Cabeçalho das colunas */}
                                <div className="grid grid-cols-2 divide-x divide-gray-200 bg-gray-50 border-b border-gray-200">
                                  <div className="px-3 py-2 flex items-center gap-1.5">
                                    <span className="text-sm">📄</span>
                                    <span className="text-[10px] font-bold text-orange-700 uppercase tracking-wide">FUAta ({fuAtaSemana.length})</span>
                                  </div>
                                  <div className="px-3 py-2 flex items-center gap-1.5">
                                    <span className="text-sm">⚡</span>
                                    <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wide">FUSp ({fuSpSemana.length})</span>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 divide-x divide-gray-200" style={{ maxHeight: '360px' }}>
                                  {/* Coluna FUAta */}
                                  <div className="overflow-y-auto">
                                    {fuAtaSemana.length === 0 ? (
                                      <p className="text-[11px] text-gray-400 italic text-center py-6">Sem FUAta esta semana</p>
                                    ) : fuAtaSemana.map(f => {
                                      const originAta = atas.find(a => a.id === f.ata_id);
                                      const tipoAtendimento = originAta?.tipo_aceleracao || originAta?.tipo_atendimento || '—';
                                      const isChecked = fuAtaSelecionados.includes(f.id);
                                      const isAtual = f.id === followUp?.id;
                                      return (
                                        <div key={f.id} className={`border-b border-gray-100 last:border-0 p-2.5 ${isAtual ? 'bg-red-50' : isChecked ? 'bg-orange-50' : 'bg-white hover:bg-gray-50'} transition-colors`}>
                                          <div className="flex items-start gap-2">
                                            {!isAtual && (
                                              <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={e => setFuAtaSelecionados(prev =>
                                                  e.target.checked ? [...prev, f.id] : prev.filter(id => id !== f.id)
                                                )}
                                                className="w-3.5 h-3.5 accent-orange-600 mt-0.5 flex-shrink-0"
                                              />
                                            )}
                                            {isAtual && <div className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />}
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center gap-1 flex-wrap mb-1">
                                                <p className="text-[11px] font-bold text-gray-900 truncate">{f.workshop_name}</p>
                                                {isAtual && <span className="text-[9px] bg-red-600 text-white rounded px-1 font-bold">ATUAL</span>}
                                              </div>
                                              <div className="space-y-0.5 text-[10px] text-gray-600">
                                                <p><span className="font-semibold">FU:</span> {f.sequence_number}/4</p>
                                                <p><span className="font-semibold">Consultor:</span> {f.consultor_nome || '—'}</p>
                                                <p><span className="font-semibold">Tipo:</span> {tipoAtendimento}</p>
                                                <p><span className="font-semibold">Criado:</span> {f.created_date ? format(new Date(f.created_date), 'dd/MM/yy') : '—'}</p>
                                                <p><span className="font-semibold">Agendado:</span> {f.reminder_date ? format(new Date(f.reminder_date + 'T00:00:00'), 'dd/MM/yy') : '—'}</p>
                                              </div>
                                              {f.ata_id && (
                                                <button
                                                  onClick={() => {
                                                    if (originAta) setSelectedAta(originAta);
                                                  }}
                                                  className="mt-1.5 text-[10px] text-orange-600 hover:text-orange-700 font-semibold flex items-center gap-1 hover:underline"
                                                >
                                                  📋 Visualizar ATA
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>

                                  {/* Coluna FUSp */}
                                  <div className="overflow-y-auto">
                                    {fuSpSemana.length === 0 ? (
                                      <p className="text-[11px] text-gray-400 italic text-center py-6">Sem FUSp esta semana</p>
                                    ) : fuSpSemana.map(f => {
                                      const isChecked = fuSpSelecionados.includes(f.id);
                                      const isAtual = f.id === followUp?.id;
                                      const sprintLabel = f.notes?.replace('Follow-up automático da sprint: ', '').trim() || '—';
                                      const { fase, tarefa } = getSprintFaseETarefaModal(f.sprint_id);
                                      const sprintObj = sprintsMapModal[f.sprint_id] || null;
                                      return (
                                        <div key={f.id} className={`border-b border-gray-100 last:border-0 p-2.5 ${isAtual ? 'bg-red-50' : isChecked ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'} transition-colors`}>
                                          <div className="flex items-start gap-2">
                                            {!isAtual && (
                                              <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={e => setFuSpSelecionados(prev =>
                                                  e.target.checked ? [...prev, f.id] : prev.filter(id => id !== f.id)
                                                )}
                                                className="w-3.5 h-3.5 accent-blue-600 mt-0.5 flex-shrink-0"
                                              />
                                            )}
                                            {isAtual && <div className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />}
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center gap-1 flex-wrap mb-1">
                                                <p className="text-[11px] font-bold text-gray-900 truncate">{f.workshop_name}</p>
                                                {isAtual && <span className="text-[9px] bg-red-600 text-white rounded px-1 font-bold">ATUAL</span>}
                                              </div>
                                              <div className="space-y-0.5 text-[10px] text-gray-600">
                                                <p><span className="font-semibold">FUSp:</span> {f.sequence_number}/4</p>
                                                <p><span className="font-semibold">Agendado:</span> {f.reminder_date ? format(new Date(f.reminder_date + 'T00:00:00'), 'dd/MM/yy') : '—'}</p>
                                                <p><span className="font-semibold">Sprint:</span> <span className="truncate">{sprintLabel.length > 25 ? sprintLabel.substring(0, 25) + '…' : sprintLabel}</span></p>
                                                <p><span className="font-semibold">Consultor:</span> {f.consultor_nome || '—'}</p>
                                              </div>
                                              <div className="mt-1.5 space-y-1">
                                                {fase ? (
                                                  <p className="text-[10px] text-blue-700 font-semibold bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5 inline-block">
                                                    📍 Fase: {fase}
                                                  </p>
                                                ) : (
                                                  <p className="text-[10px] text-gray-400 italic">Fase: —</p>
                                                )}
                                                {tarefa ? (
                                                  <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-100 rounded px-1.5 py-0.5 leading-relaxed">
                                                    ✅ Tarefa: {tarefa.length > 35 ? tarefa.substring(0, 35) + '…' : tarefa}
                                                  </p>
                                                ) : fase ? (
                                                  <p className="text-[10px] text-green-600 italic">✓ Todas as tarefas concluídas</p>
                                                ) : null}
                                                {sprintObj && (
                                                  <button
                                                    onClick={() => setSelectedSprintId(f.sprint_id)}
                                                    className="mt-1.5 text-[10px] text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 hover:underline"
                                                  >
                                                    🚀 Abrir Sprint →
                                                  </button>
                                                )}
                                                </div>
                                                </div>
                                                </div>
                                                </div>
                                                );
                                                })}
                                                </div>
                                </div>
                              </div>
                            )}

                            {/* Estado vazio */}
                            {fuAtaSemana.length === 0 && fuSpSemana.length === 0 && (
                              <p className="text-[11px] text-gray-400 italic text-center py-4">Nenhum outro follow-up pendente esta semana</p>
                            )}
                          </div>
                        );
                      })()}

                      {/* CLIENTE */}
                      {activePanel === 'cliente' && (
                        <div className="px-3 py-4 space-y-6 text-sm">
                          <div className="border-b pb-4">
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wide mb-3">Consultor Responsável</p>
                            <p className="text-xs text-gray-500 font-semibold mb-1">Nome</p>
                            <p className="text-gray-900 font-medium">{followUp?.consultor_nome || "—"}</p>
                          </div>
                          {ownerEmployee && (
                            <div className="border-b pb-4">
                              <p className="text-xs text-gray-500 font-bold uppercase tracking-wide mb-3">Proprietário da Oficina</p>
                              <div className="space-y-2">
                                <div><p className="text-xs text-gray-500 font-semibold mb-1">Nome Completo</p><p className="text-gray-900 font-medium">{ownerEmployee.full_name || "—"}</p></div>
                                <div><p className="text-xs text-gray-500 font-semibold mb-1">E-mail</p><p className="text-gray-900 break-all">{ownerEmployee.email || "—"}</p></div>
                                <div><p className="text-xs text-gray-500 font-semibold mb-1">Telefone</p><p className="text-gray-900">{ownerEmployee.telefone || "—"}</p></div>
                                {ownerEmployee.cpf && <div><p className="text-xs text-gray-500 font-semibold mb-1">CPF</p><p className="text-gray-900">{ownerEmployee.cpf}</p></div>}
                                {ownerEmployee.data_nascimento && <div><p className="text-xs text-gray-500 font-semibold mb-1">Data de Nascimento</p><p className="text-gray-900">{format(new Date(ownerEmployee.data_nascimento), "dd/MM/yyyy")}</p></div>}
                              </div>
                            </div>
                          )}
                          {workshop && (
                            <div className="border-b pb-4">
                              <p className="text-xs text-gray-500 font-bold uppercase tracking-wide mb-3">Dados da Oficina</p>
                              <div className="space-y-2">
                                <div><p className="text-xs text-gray-500 font-semibold mb-1">Nome</p><p className="text-gray-900 font-medium">{workshop.name || "—"}</p></div>
                                <div><p className="text-xs text-gray-500 font-semibold mb-1">Razão Social</p><p className="text-gray-900">{workshop.razao_social || "—"}</p></div>
                                <div><p className="text-xs text-gray-500 font-semibold mb-1">CNPJ</p><p className="text-gray-900">{workshop.cnpj || "—"}</p></div>
                                <div><p className="text-xs text-gray-500 font-semibold mb-1">Localização</p><p className="text-gray-900">{workshop.city || "—"} / {workshop.state || "—"}</p></div>
                                <div><p className="text-xs text-gray-500 font-semibold mb-1">Endereço</p><p className="text-gray-900 text-xs">{workshop.endereco_rua} {workshop.endereco_numero && `, ${workshop.endereco_numero}`} {workshop.endereco_complemento && `- ${workshop.endereco_complemento}`}</p></div>
                                <div><p className="text-xs text-gray-500 font-semibold mb-1">Telefone</p><p className="text-gray-900">{workshop.telefone || "—"}</p></div>
                                <div><p className="text-xs text-gray-500 font-semibold mb-1">E-mail</p><p className="text-gray-900 break-all">{workshop.email || "—"}</p></div>
                                <div><p className="text-xs text-gray-500 font-semibold mb-1">Segmento</p><p className="text-gray-900">{workshop.segment_auto || workshop.segment || "—"}</p></div>
                                {workshop.employees_count && <div><p className="text-xs text-gray-500 font-semibold mb-1">Colaboradores</p><p className="text-gray-900">{workshop.employees_count}</p></div>}
                                {workshop.planoAtual && <div><p className="text-xs text-gray-500 font-semibold mb-1">Plano</p><p className="text-gray-900 font-medium">{workshop.planoAtual}</p></div>}
                              </div>
                            </div>
                          )}
                          <div className="pt-3">
                            <div className="bg-amber-50 border border-amber-200 rounded p-3">
                              <AlertCircle className="w-4 h-4 text-amber-600 mb-2" />
                              <p className="text-xs text-amber-900">Ação sugerida: Confirmar disponibilidade</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* CRONOGRAMA */}
                      {activePanel === 'cronograma' && (
                        <div className="px-3 py-4">
                          {followUp?.workshop_id ? <CronogramaTab workshopId={followUp.workshop_id} /> : <p className="text-xs text-gray-500 italic">Sem cronograma disponível</p>}
                        </div>
                      )}

                      {/* TRILHAS */}
                      {activePanel === 'trilhas' && (
                        <div className="px-3 py-4">
                          {followUp?.workshop_id ? <TrilhaClientePanel workshopId={followUp.workshop_id} /> : <p className="text-xs text-gray-500 italic">Sem trilhas disponíveis</p>}
                        </div>
                      )}

                      {/* SPRINTS */}
                      {activePanel === 'sprints' && (
                        <div className="px-3 py-4">
                          {followUp?.workshop_id ? <SprintClientSection workshopId={followUp.workshop_id} user={user} workshop={workshop} /> : <p className="text-xs text-gray-500 italic">Sem sprints disponíveis</p>}
                        </div>
                      )}

                      {/* PRÓXIMOS PASSOS */}
                      {activePanel === 'proximospassos' && (
                        <div className="px-3 py-4">
                          {followUp?.workshop_id ? <ProximosPassosAbaTab workshopId={followUp.workshop_id} /> : <p className="text-xs text-gray-500 italic">Sem próximos passos registrados</p>}
                        </div>
                      )}

                      {/* PEDIDOS */}
                      {activePanel === 'pedidos' && (
                        <div className="px-3 py-4">
                          {followUp?.workshop_id ? <PedidosInternosTab workshopId={followUp.workshop_id} user={user} /> : <p className="text-xs text-gray-500 italic">Sem pedidos internos</p>}
                        </div>
                      )}

                      {/* BACKLOG */}
                      {activePanel === 'backlog' && (
                        <div className="px-3 py-4">
                          {followUp?.workshop_id ? <BacklogDashboard workshopId={followUp.workshop_id} consultorId={followUp.consultor_id} /> : <p className="text-xs text-gray-500 italic">Sem backlog disponível</p>}
                        </div>
                      )}

                      {/* BUCKET DE ATENDIMENTOS */}
                      {activePanel === 'bucket' && (
                        <div className="px-3 py-4">
                          {followUp?.workshop_id ? (
                            <BucketPanel 
                              workshopId={followUp.workshop_id} 
                              followUp={followUp}
                              onClose={() => setActivePanel(null)}
                            />
                          ) : (
                            <p className="text-xs text-gray-500 italic">Sem bucket disponível</p>
                          )}
                        </div>
                      )}

                      {/* HISTÓRICO DE CONTATOS */}
                      {activePanel === 'historico' && (
                        <HistoricoContatosPanel
                          workshopId={followUp?.workshop_id}
                          workshopName={followUp?.workshop_name}
                        />
                      )}

                      {/* DEMANDAS PARALELAS */}
                      {activePanel === 'demandas' && (
                        <div className="px-3 py-4">
                          <ParallelDemandsPanel
                            demands={demands}
                            isOpen={true}
                            onDemandClick={(type, id) => { console.log(`Demand clicked: ${type} - ${id}`); setActivePanel(null); }}
                          />
                        </div>
                      )}

                      {/* IA */}
                      {activePanel === 'ia' && (
                        <div className="flex flex-col h-full px-3 pb-3 pt-3" style={{ minHeight: 0 }}>
                          <div className="flex items-center gap-2 mb-2">
                            <MessageSquare className="w-3.5 h-3.5 text-gray-500" />
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Chat com IA</p>
                          </div>
                          {!chatInicializado ? (
                            <div className="flex-1 flex items-center justify-center">
                              <Button size="sm" variant="outline" onClick={iniciarChat} className="text-xs gap-2">
                                <MessageSquare className="w-3.5 h-3.5" />
                                Iniciar conversa com IA
                              </Button>
                            </div>
                          ) : (
                            <>
                              <div className="overflow-y-auto bg-gray-50 rounded-lg border border-gray-200 px-2.5 py-2 space-y-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent" style={{ flex: '1 1 0', minHeight: 0 }}>
                                {chatMensagens.length === 0 && chatEnviando && <div className="flex items-center justify-center h-full"><Loader2 className="w-4 h-4 animate-spin text-gray-400" /></div>}
                                {chatMensagens.map((msg, idx) => (
                                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[88%] rounded-xl px-2.5 py-1.5 text-[11px] leading-relaxed space-y-0.5 ${msg.role === 'user' ? 'bg-red-600 text-white rounded-br-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'}`}>
                                      {msg.role === 'user' ? msg.content : <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>{renderMarkdown(msg.content)}</div>}
                                    </div>
                                  </div>
                                ))}
                                {chatEnviando && chatMensagens.length > 0 && (
                                  <div className="flex justify-start">
                                    <div className="bg-white border border-gray-200 rounded-xl rounded-bl-sm px-2.5 py-1.5">
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
                              <div className="flex gap-1.5 mt-2 flex-shrink-0">
                                <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviarMensagemChat()} placeholder="Pergunte sobre o cliente..." disabled={chatEnviando} className="flex-1 text-[11px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-red-400 disabled:opacity-50" />
                                <button onClick={enviarMensagemChat} disabled={!chatInput.trim() || chatEnviando} className="w-7 h-7 rounded-lg bg-red-600 hover:bg-red-700 text-white flex items-center justify-center disabled:opacity-40 transition-colors flex-shrink-0">
                                  <Send className="w-3 h-3" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}

                    </div>
                    </div>
                    )}
                    </>
                    );
                    })()}
                    </div>

        {/* FOOTER - FIXO */}
         <div className="bg-white border-t border-gray-200 px-6 py-4 flex gap-3 justify-between flex-shrink-0">
           <div className="flex gap-2">
             <Button variant="outline" onClick={() => { localStorage.removeItem(`draft_atendimento_${followUp?.id}`); onClose(); }} disabled={saving}>
               Fechar
             </Button>
             <Button variant="ghost" onClick={() => setShowClientSelector(true)} className="text-blue-600 hover:bg-blue-50">
               + Registrar Suporte ao Cliente
             </Button>
           </div>
           <div className="flex gap-3">
             <Button variant="outline" onClick={handleSaveDraft} disabled={saving} className="border-cyan-300 text-cyan-700 hover:bg-cyan-50">
               {saving && savingStep ? savingStep : "Rascunho"}
             </Button>
             <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleSaveAndFinalize} disabled={saving}>
               {saving ? "Salvando..." : "Salvar e finalizar atendimento"}
             </Button>
           </div>
         </div>
        </DialogContent>
        </Dialog>

      {/* ATA Modal - Fora do Dialog */}
      {selectedAta && (
       <VisualizarAtaModal
         ata={selectedAta}
         onClose={() => setSelectedAta(null)}
       />
       )}

       {/* Sprint Modal — aberto ao clicar em "Abrir Sprint" na aba Follow-ups */}
       <SprintClientModal
         sprint={selectedSprintId ? (sprintsMapModal[selectedSprintId] || null) : null}
         user={user}
         workshop={workshop}
         open={!!selectedSprintId}
         onClose={() => setSelectedSprintId(null)}
       />

       {/* Client Selector Modal */}
       {showClientSelector && (
         <ClientSelectorGrid
           onSelect={carregarCliente}
           onClose={() => setShowClientSelector(false)}
         />
       )}

       {/* Registrar Atendimento Modal — renderizado fora do Dialog para evitar conflito de stacking context */}
       {/* NOTA: mantido aqui dentro do Fragment mas FORA do DialogContent */}

       {/* CHECKPOINT MODAL */}
       <CheckpointModal
         isOpen={showCheckpointModal}
         followUpStatus={{
           completed: 1,
           inProgress: 0,
           pendingCount: (demandsCritical || []).length
         }}
         followUpContadorId={followUp?.id}
         sprintId={followUp?.sprint_id}
         bucketId={followUp?.id}
         ataId={followUp?.ata_id}
         onSubmit={handleCheckpointDecision}
         onCancel={() => setShowCheckpointModal(false)}
       />

       <AlertDialog open={showNavConfirm} onOpenChange={setShowNavConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Navegar para outro follow-up?</AlertDialogTitle>
            <AlertDialogDescription>
              Você preencheu campos neste atendimento. Ao navegar, os dados não salvos serão perdidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setShowNavConfirm(false); setNavTarget(null); }}>
              Ficar aqui
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarNavegacao}
              className="bg-red-600 hover:bg-red-700"
            >
              Navegar mesmo assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Registrar Atendimento Modal — fora do Dialog para evitar conflito de stacking context do Radix */}
      {showRegistrarAtendimento && (
        <RegistrarAtendimento
          isModal={true}
          origemTela="IniciarAtendimentoModal"
          initialData={{
            workshop_id: followUp?.workshop_id,
            consultor_id: followUp?.consultor_id,
            consultor_nome: followUp?.consultor_nome,
          }}
          onClose={() => setShowRegistrarAtendimento(false)}
          onSaved={() => {
            setShowRegistrarAtendimento(false);
            invalidate.all();
          }}
        />
      )}
      </>
      );
      }