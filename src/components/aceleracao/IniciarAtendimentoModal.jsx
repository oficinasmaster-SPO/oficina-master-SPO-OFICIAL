import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Phone, MessageCircle, Mail, Video, MapPin, CheckCircle2, X, Clock, AlertCircle,
  ChevronRight, ChevronLeft, Upload, Check, ArrowRight, Calendar, User, Bell,
  MessageSquare, Send, Loader2, Zap
} from "lucide-react";
import { format, isToday, parseISO } from "date-fns";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import VisualizarAtaModal from "@/components/aceleracao/VisualizarAtaModal";

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
  { id: "video", label: "Vídeo", icon: Video },
  { id: "presencial", label: "Presencial", icon: MapPin },
];

const RESULTADO_OPTIONS = [
  { id: "atendeu", label: "Atendeu", color: "bg-green-100 border-green-300" },
  { id: "nao_atendeu", label: "Não atendeu", color: "bg-red-100 border-red-300" },
  { id: "retornar", label: "Retornar", color: "bg-amber-100 border-amber-300" },
  { id: "agendou", label: "Agendou", color: "bg-blue-100 border-blue-300" },
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

export default function IniciarAtendimentoModal({ followUp, cliente, onClose, onSaved, fusConcatenados = [], proximoFU = null, onProximoFollowUp, filaReminders = [], onNavegar }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];
  const [timer, setTimer] = useState(0);
  const [canal, setCanal] = useState("");
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

  // States da aba IA
  const [dicaIA, setDicaIA] = useState(null);
  const [carregandoDica, setCarregandoDica] = useState(false);
  const [postItPos, setPostItPos] = useState({ x: 24, y: 120 });
  const [postItMinimizado, setPostItMinimizado] = useState(false);
  const draggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const postItRef = useRef(null);
  const [chatMensagens, setChatMensagens] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatEnviando, setChatEnviando] = useState(false);
  const [chatInicializado, setChatInicializado] = useState(false);
  const chatEndRef = useRef(null);

  // Fetch todos os follow-ups do cliente (must be before derived state that uses it)
  const { data: allFollowUpsModal = [] } = useQuery({
    queryKey: ["all-followups-modal", followUp?.workshop_id],
    queryFn: async () => {
      if (!followUp?.workshop_id) return [];
      return base44.entities.FollowUpReminder.filter({ workshop_id: followUp.workshop_id }, "reminder_date", 50);
    },
    enabled: !!followUp?.workshop_id,
    staleTime: 2 * 60 * 1000,
  });

  // Fetch atendimentos agendados do consultor hoje
  const { data: atendimentosHojeModal = [] } = useQuery({
    queryKey: ["atendimentos-hoje-modal", user?.id, today],
    queryFn: async () => {
      if (!user?.id) return [];
      const todos = await base44.entities.ConsultoriaAtendimento.filter({ consultor_id: user.id }, "data_agendada", 50);
      return todos.filter(a => {
        if (!a.data_agendada) return false;
        if (!['agendado', 'confirmado', 'reagendado'].includes(a.status)) return false;
        try { return isToday(parseISO(a.data_agendada)); } catch { return false; }
      });
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
  });

  // Fetch últimos atendimentos concluídos — contexto para IA
  const { data: concluidosModal = [] } = useQuery({
    queryKey: ["concluidos-ia-modal", followUp?.workshop_id],
    queryFn: async () => {
      if (!followUp?.workshop_id) return [];
      return base44.entities.FollowUpConcluido.filter({ workshop_id: followUp.workshop_id }, "-completedAt", 5);
    },
    enabled: !!followUp?.workshop_id,
    staleTime: 5 * 60 * 1000,
  });

  const idxAtual = filaReminders.findIndex(f => f.id === followUp?.id);
  const fuAnterior = idxAtual > 0 ? filaReminders[idxAtual - 1] : null;
  const fuProximo = idxAtual >= 0 && idxAtual < filaReminders.length - 1
    ? filaReminders[idxAtual + 1]
    : null;
  const isDirty = !!(canal || resultado || observacoes || compromissos || proximoPasso || pastedImages.length > 0);

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
        setCanal(draft.canal || "");
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

  // Fetch ATAs
   const { data: atas = [] } = useQuery({
     queryKey: ["atas-modal", followUp?.workshop_id],
     queryFn: async () => {
       if (!followUp?.workshop_id) return [];
       return base44.entities.MeetingMinutes.filter(
         { workshop_id: followUp.workshop_id },
         "-meeting_date",
         50
       );
     },
     enabled: !!followUp?.workshop_id,
   });

   // Fetch Workshop
   const { data: workshop = null } = useQuery({
     queryKey: ["workshop-modal", followUp?.workshop_id],
     queryFn: async () => {
       if (!followUp?.workshop_id) return null;
       const workshops = await base44.entities.Workshop.filter(
         { id: followUp.workshop_id },
         undefined,
         1
       );
       return workshops[0] || null;
     },
     enabled: !!followUp?.workshop_id,
   });

   // Fetch Owner Employee
   const { data: ownerEmployee = null } = useQuery({
     queryKey: ["owner-employee-modal", workshop?.owner_id],
     queryFn: async () => {
       if (!workshop?.owner_id) return null;
       const employees = await base44.entities.Employee.filter(
         { user_id: workshop.owner_id },
         undefined,
         1
       );
       return employees[0] || null;
     },
     enabled: !!workshop?.owner_id,
   });

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
      onNavegar?.(fu);
      onClose();
    }
  };

  const confirmarNavegacao = () => {
    const fu = navTarget;
    const storageKey = `draft_atendimento_${followUp?.id}`;
    localStorage.removeItem(storageKey);
    setShowNavConfirm(false);
    setNavTarget(null);
    onNavegar?.(fu);
    onClose();
  };

  // ── Funções da aba IA ──
  const handlePostItMouseDown = useCallback((e) => {
    if (e.target.closest('button')) return;
    draggingRef.current = true;
    dragOffsetRef.current = {
      x: e.clientX - postItPos.x,
      y: e.clientY - postItPos.y,
    };
    e.preventDefault();

    const handleMouseMove = (e) => {
      if (!draggingRef.current) return;
      setPostItPos({
        x: e.clientX - dragOffsetRef.current.x,
        y: e.clientY - dragOffsetRef.current.y,
      });
    };

    const handleMouseUp = () => {
      draggingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [postItPos]);

  const gerarDicaIA = async () => {
    setCarregandoDica(true);
    try {
      const resumoAtas = atas.slice(0, 3).map(a =>
        `Ata (${a.tipo_aceleracao || a.tipo_atendimento || 'reunião'} - ${a.meeting_date || ''}): próximos passos: ${a.proximos_passos || 'não registrado'}`
      ).join('\n');
      const resumoConcluidos = concluidosModal.slice(0, 3).map(c =>
        `Atendimento via ${c.canal || '?'}: resultado=${c.resultado || '?'}, humor=${c.humor || '?'}, comprometimentos=${c.compromissos || 'nenhum'}`
      ).join('\n');

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
        `ÚLTIMOS ATENDIMENTOS:`,
        resumoConcluidos || 'Sem atendimentos anteriores',
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

  useEffect(() => {
    if ((atas.length > 0 || concluidosModal.length > 0) && !dicaIA && !carregandoDica) {
      gerarDicaIA();
    }
  }, [atas.length, concluidosModal.length]);

  const buildSystemPrompt = () => {
    const resumoAtas = atas.slice(0, 5).map(a =>
      `- ${a.tipo_aceleracao || a.tipo_atendimento || 'Reunião'} (${a.meeting_date || ''}): próximos passos: ${a.proximos_passos || 'não registrado'}`
    ).join('\n');
    const resumoConcluidos = concluidosModal.slice(0, 3).map(c =>
      `- Canal: ${c.canal || '?'} | Resultado: ${c.resultado || '?'} | Humor: ${c.humor || '?'} | Comprometimentos: ${c.compromissos || 'nenhum'}`
    ).join('\n');
    return `Você é um assistente especializado em consultoria empresarial para oficinas mecânicas e negócios em aceleração. Seu papel é ajudar o consultor durante o atendimento de follow-up.\n\nCONTEXTO DO ATENDIMENTO\nCliente: ${followUp?.workshop_name}\nFollow-up: ${followUp?.sequence_number}/4\nConsultor: ${followUp?.consultor_nome || 'não informado'}\nData: ${followUp?.reminder_date || 'não informada'}\n\nÚLTIMAS ATAS:\n${resumoAtas || 'Nenhuma ata registrada'}\n\nÚLTIMOS ATENDIMENTOS:\n${resumoConcluidos || 'Nenhum atendimento anterior'}\n\nRegras:\n- Responda sempre em português brasileiro\n- Seja direto, prático e objetivo\n- Foque exclusivamente no cliente e contexto fornecido\n- Sugira abordagens e estratégias baseadas no histórico real do cliente\n- Seu escopo é: estratégia de atendimento, relacionamento com cliente, próximos passos, abordagem de follow-up, análise de humor e engajamento`;
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

  const validate = () => {
    const newErrors = {};
    if (!canal) newErrors.canal = "Obrigatório";
    if (!resultado) newErrors.resultado = "Obrigatório";
    if (!observacoes.trim() || observacoes.length < 10) newErrors.observacoes = "Mín. 10 caracteres";
    if (!proximoPasso) newErrors.proximoPasso = "Obrigatório";
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
         canal,
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

    setSaving(true);
    setActiveStepIndex(0);

    try {
      // STEP 0 — Gravar interação (FollowUpConcluido)
      setActiveStepIndex(0);
      await base44.entities.FollowUpConcluido.create({
        followup_id: followUp.id,
        workshop_id: followUp.workshop_id,
        consultor_id: followUp.consultor_id,
        consultor_nome: followUp.consultor_nome,
        canal,
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
        completedAt: new Date().toISOString(),
      });
      await new Promise(r => setTimeout(r, 650));

      // STEP 1 — Atualizar status do FollowUpReminder
      setActiveStepIndex(1);
      await base44.entities.FollowUpReminder.update(followUp.id, {
        is_completed: true,
        completed_at: new Date().toISOString(),
      });
      await new Promise(r => setTimeout(r, 650));

      // STEP 1b — Encerrar FUs concatenados com os mesmos dados
      const fusParaConcatenar = fusConcatenados.length > 0 ? fusConcatenados : fusSemanaLocal.map(id => allFollowUpsModal.find(f => f.id === id)).filter(Boolean);
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
              canal,
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

      // STEP 2 — Criar próximo follow-up (se reagendar)
      let novoFollowUp = null;
      if (proximoPasso === "reagendar" && proxData) {
        setActiveStepIndex(2);
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
          notes: compromissos ? `Comprometimentos anteriores:\n${compromissos}` : "",
        });
        await new Promise(r => setTimeout(r, 650));
      }

      // STEP 3 — Notificação (interna)
      setActiveStepIndex(3);
      await new Promise(r => setTimeout(r, 650));

      // Limpar rascunho
      localStorage.removeItem(`draft_atendimento_${followUp.id}`);

      // Invalidar queries para refresh das listas
      queryClient.invalidateQueries({ queryKey: ["follow-up-reminders"] });
      queryClient.invalidateQueries({ queryKey: ["follow-up-reminders-tab"] });
      queryClient.invalidateQueries({ queryKey: ["follow-up-concluidos-tab"] });

      // Mostrar tela de confirmação
      setSaveSuccess({
        clienteNome: cliente?.name || followUp?.workshop_name || "Cliente",
        sequenceNumber: followUp?.sequence_number || 1,
        canal, resultado,
        novoFollowUp,
        proxData, proxHora,
        consultor_nome: followUp?.consultor_nome,
      });

      onSaved?.();
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
    const { clienteNome, sequenceNumber, canal: c, resultado: r, novoFollowUp, proxData: pd, proxHora: ph, consultor_nome } = saveSuccess;
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
                  Interação registrada · <span className="font-medium">{CANAL_LABELS[c] || c}</span> · 
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
                  onClick={() => {
                    setSaveSuccess(null);
                    setCanal("");
                    setResultado("");
                    setHumor("");
                    setEngajamento("");
                    setObservacoes("");
                    setCompromissos("");
                    setProximoPasso("");
                    setProxData("");
                    setProxHora("");
                    setPastedImages([]);
                    setTimer(0);
                    setDuracao(30);
                    setInicioContagem(Date.now());
                    setCronometroAtivo(true);
                    setErrors({});
                    setActiveStepIndex(-1);
                    onProximoFollowUp?.(proximoFU);
                    onClose();
                  }}
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
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-sm">
              {getInitials(cliente?.name || followUp?.workshop_name || "")}
            </div>
            <div>
              <p className="font-semibold">{cliente?.name || followUp?.workshop_name || "Cliente"}</p>
              <p className="text-xs text-gray-400">
                Follow-up {followUp?.sequence_number}/4 · {followUp?.consultor_nome}
              </p>
            </div>
            <Badge className="bg-gradient-to-r from-red-600 to-red-700 text-white border-0 ml-4 shadow-lg flex items-center gap-2 px-3 py-1.5">
              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 bg-red-500 rounded-full animate-pulse opacity-30"></div>
                <Clock className="w-4 h-4 relative z-10" />
              </div>
              <span className="font-semibold">Em atendimento</span>
              <span className="bg-red-800 rounded px-2 py-0.5 font-mono text-sm">{formatTimer()}</span>
            </Badge>
          </div>

          <div className="flex items-center gap-1 ml-4">
            <button
              onClick={() => fuAnterior && handleNavegar(fuAnterior)}
              disabled={!fuAnterior}
              title={fuAnterior ? `Anterior: ${fuAnterior.workshop_name}` : 'Sem anterior'}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-gray-500 min-w-[40px] text-center">
              {idxAtual >= 0 ? `${idxAtual + 1}/${filaReminders.length}` : '—'}
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
          {/* LEFT COLUMN - FORM */}
          <div className="flex-1 overflow-y-auto border-r border-gray-200 px-4 py-4">
            <div className="space-y-6 max-w-2xl px-2 py-2 bg-white rounded-lg shadow-[inset_0_2px_8px_rgba(0,0,0,0.05)]">
              {/* Canal */}
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2 block">
                  Canal de contato *
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {CANAL_OPTIONS.map(opt => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => {
                          setCanal(opt.id);
                          setErrors(e => ({ ...e, canal: null }));
                        }}
                        className={`flex flex-col items-center gap-1 px-3 py-3 rounded-lg border-2 text-xs font-medium transition ${
                          canal === opt.id
                            ? "bg-gray-900 text-white border-gray-900"
                            : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                        } ${errors.canal ? "border-red-500 bg-red-50" : ""}`}
                      >
                        <Icon className="w-5 h-5" />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                {errors.canal && <p className="text-xs text-red-600 mt-1">{errors.canal}</p>}
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

              {/* Próximo passo */}
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

          {/* CENTER COLUMN */}
          <div className="w-72 flex-shrink-0 border-r border-gray-100 bg-gray-50/50 overflow-y-auto flex flex-col scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">

            {/* FUs da semana */}
            {fusDaSemanaModal.length > 0 ? (
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Follow-ups desta semana</p>
                  <span className="ml-auto bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {fusDaSemanaModal.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {fusDaSemanaModal.map(f => (
                    <div
                      key={f.id}
                      className="bg-white border border-gray-200 rounded-xl p-3 hover:border-amber-300 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center flex-shrink-0">
                            <span className="text-[11px] font-bold text-amber-600">{f.sequence_number}</span>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-800 truncate max-w-[140px]">
                              {f.workshop_name || 'Cliente'}
                            </p>
                            <p className="text-[10px] text-gray-400">
                              {f.reminder_date
                                ? format(new Date(f.reminder_date + 'T00:00:00'), 'dd/MM')
                                : '—'}
                            </p>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={fusSemanaLocal.includes(f.id)}
                          onChange={e => {
                            setFusSemanaLocal(prev =>
                              e.target.checked
                                ? [...prev, f.id]
                                : prev.filter(id => id !== f.id)
                            );
                          }}
                          className="w-3.5 h-3.5 accent-red-600 flex-shrink-0 mt-0.5"
                        />
                      </div>
                      {f.consultor_nome && (
                        <p className="text-[10px] text-gray-400 truncate">{f.consultor_nome}</p>
                      )}
                      {f.origin_type && (
                        <span className={`inline-flex items-center text-[9px] font-semibold px-1.5 py-0.5 rounded mt-1 ${
                          f.origin_type === 'sprint'
                            ? 'bg-orange-100 text-orange-600'
                            : 'bg-blue-100 text-blue-600'
                        }`}>
                          {f.origin_type === 'sprint' ? '🚀 Sprint' : '📋 Ata'}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {fusSemanaLocal.length > 0 && (
                  <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-amber-700 font-semibold">
                      {fusSemanaLocal.length} FU{fusSemanaLocal.length > 1 ? 's' : ''} será{fusSemanaLocal.length > 1 ? 'ão' : ''} encerrado{fusSemanaLocal.length > 1 ? 's' : ''} junto
                    </p>
                    <p className="text-[9px] text-amber-600 mt-0.5">Herdam os dados deste atendimento</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Follow-ups desta semana</p>
                </div>
                <div className="bg-white border border-dashed border-gray-200 rounded-xl p-4 text-center">
                  <p className="text-[11px] text-gray-400">Nenhum outro follow-up pendente esta semana</p>
                </div>
              </div>
            )}

            {/* Espaço reservado para futuras adições */}
            <div className="flex-1" />

          </div>

          {/* RIGHT COLUMN - SIDEBAR */}
          <div className="w-80 xl:w-96 flex-shrink-0 border-l border-gray-200 bg-gradient-to-b from-white via-gray-50 to-gray-100 overflow-hidden flex flex-col shadow-[inset_-2px_0_8px_rgba(0,0,0,0.03)]">
            <Tabs defaultValue="atas" className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-4 rounded-none border-b bg-white p-0 h-auto">
                {[
                  { value: 'atas', label: 'Atas', onClick: undefined },
                  { value: 'followups', label: 'FUs', onClick: undefined },
                  { value: 'cliente', label: 'Cliente', onClick: undefined },
                  { value: 'ia', label: '⚡ IA', onClick: () => { if (!chatInicializado) iniciarChat(); } },
                ].map(tab => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    onClick={tab.onClick}
                    className="relative py-3 text-xs font-medium rounded-none border-0 transition-all duration-150 text-gray-400 bg-transparent hover:text-red-500 hover:bg-red-50 data-[state=active]:text-red-600 data-[state=active]:bg-white data-[state=active]:shadow-none data-[state=active]:font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-transparent data-[state=active]:after:bg-red-600"
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="atas" className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                <div className="space-y-2">
                  {atas.length === 0 ? (
                    <p className="text-xs text-gray-500 italic">Sem atas registradas</p>
                  ) : (
                    atas.map(ata => {
                      const isOrigin = ata.id === followUp?.ata_id;
                      const tipo = (ata.tipo_aceleracao || ata.tipo_atendimento || "ATA").toLowerCase();
                      const emojiMap = {
                        "diagnóstico": "🔍",
                        "diagnostico": "🔍",
                        "acelera time": "⚡",
                        "mentoria": "🎓",
                        "onboarding": "🚀",
                        "pontual": "📌",
                      };
                      const emoji = emojiMap[tipo] || "📄";
                      
                      return (
                        <button
                          key={ata.id}
                          onClick={() => setSelectedAta(ata)}
                          className={`w-full flex items-start gap-3 px-3 py-3 rounded-lg border transition-colors text-left ${
                            isOrigin
                              ? "border-green-300 bg-green-50 hover:bg-green-100"
                              : "border-gray-200 bg-white hover:bg-gray-50"
                          }`}
                        >
                          <span className="text-lg flex-shrink-0">{emoji}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className={`text-xs font-semibold ${isOrigin ? "text-green-800" : "text-gray-800"}`}>
                                {ata.tipo_aceleracao || ata.tipo_atendimento || "ATA"}
                              </p>
                              {isOrigin && (
                                <Badge className="bg-green-600 text-white text-[10px] flex items-center gap-1">
                                  <Check className="w-3 h-3" /> Origem
                                </Badge>
                              )}
                            </div>
                            {ata.proximos_passos && (
                              <p className="text-[11px] text-gray-500 line-clamp-1 mt-1">{ata.proximos_passos}</p>
                            )}
                            {ata.meeting_date && (
                              <p className="text-[10px] text-gray-400 mt-1">
                                {format(new Date(ata.meeting_date), "dd/MM/yyyy")}
                              </p>
                            )}
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                        </button>
                      );
                    })
                  )}
                </div>
              </TabsContent>

              <TabsContent value="followups" className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                <div className="space-y-3">

                  {/* Card atendimentos do dia */}
                  {atendimentosHojeModal.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Bell className="w-3.5 h-3.5 text-blue-600" />
                        <p className="text-[10px] text-blue-700 uppercase tracking-wide font-bold">
                          Seus atendimentos hoje ({atendimentosHojeModal.length})
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        {atendimentosHojeModal.map(at => (
                          <div key={at.id} className="bg-white border border-blue-100 rounded-lg px-2.5 py-2 flex items-start gap-2">
                            <Video className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-semibold text-gray-800 truncate">{at.workshop_name || 'Cliente'}</p>
                              <p className="text-[10px] text-gray-500 capitalize">{(at.tipo_atendimento || 'atendimento').replace(/_/g, ' ')}</p>
                              <div className="flex items-center gap-1 mt-0.5">
                                <Clock className="w-3 h-3 text-blue-400" />
                                <span className="text-[10px] text-blue-600 font-medium">
                                  {at.data_agendada ? format(parseISO(at.data_agendada), 'HH:mm') : '—'}
                                </span>
                                <span className={`ml-auto text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                                  at.status === 'confirmado' ? 'bg-green-100 text-green-700' :
                                  at.status === 'reagendado' ? 'bg-amber-100 text-amber-700' :
                                  'bg-blue-100 text-blue-700'
                                }`}>{at.status}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* FU atual destacado */}
                  <div className="bg-white rounded-lg p-3 border border-red-200">
                    <Badge className="bg-red-600 text-white text-xs mb-1">Atual</Badge>
                    <p className="text-sm font-semibold text-gray-900">FU {followUp?.sequence_number || 1}</p>
                    <p className="text-xs text-gray-500 mt-1">{followUp?.reminder_date}</p>
                  </div>

                  {/* Timeline de sprint */}
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
                      {sprintLabelModal && (
                        <p className="text-[11px] text-orange-600 px-3 pt-2 pb-1 italic truncate">{sprintLabelModal}</p>
                      )}
                      <div className="px-3 pb-3 pt-1 space-y-1.5">
                        <div className="flex items-center gap-2 bg-orange-100 border border-orange-200 rounded px-2 py-1.5">
                          <div className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0 ring-2 ring-orange-300" />
                          <span className="text-[11px] font-bold text-orange-800">FU {followUp?.sequence_number} · Em andamento</span>
                          <span className="ml-auto text-[10px] text-orange-600">
                            {followUp?.reminder_date ? format(new Date(followUp.reminder_date + 'T00:00:00'), 'dd/MM') : '—'}
                          </span>
                        </div>
                        {fusDaSprintModal.map(f => (
                          <div key={f.id} className="flex items-center gap-2 px-2 py-1.5">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${f.is_completed ? 'bg-green-400' : 'bg-gray-300'}`} />
                            <span className={`text-[11px] ${f.is_completed ? 'text-green-700 font-semibold' : 'text-gray-600'}`}>
                              FU {f.sequence_number}
                            </span>
                            <span className={`text-[10px] ${f.is_completed ? 'text-green-500' : 'text-gray-400'}`}>
                              {f.is_completed ? '✓ concluído' : 'pendente'}
                            </span>
                            <span className="ml-auto text-[10px] text-gray-400">
                              {f.reminder_date ? format(new Date(f.reminder_date + 'T00:00:00'), 'dd/MM') : '—'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* FUs da semana com concatenação */}
                  {fusDaSemanaModal.length > 0 && (
                    <div className="border border-amber-200 bg-amber-50 rounded-lg overflow-hidden">
                      <button
                        onClick={() => setFusSemanaExpandido(v => !v)}
                        className="w-full flex items-center justify-between px-3 py-2 text-left"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">
                            {fusDaSemanaModal.length}
                          </span>
                          <span className="text-[11px] font-semibold text-amber-800">
                            {fusDaSemanaModal.length} outro{fusDaSemanaModal.length > 1 ? 's' : ''} FU{fusDaSemanaModal.length > 1 ? 's' : ''} esta semana
                          </span>
                        </div>
                        <ChevronRight className={`w-3.5 h-3.5 text-amber-600 transition-transform ${fusSemanaExpandido ? 'rotate-90' : ''}`} />
                      </button>
                      {fusSemanaExpandido && (
                        <div className="border-t border-amber-200 bg-white">
                          <p className="text-[10px] text-gray-500 px-3 pt-2 pb-1">Selecione para encerrar junto neste atendimento</p>
                          {fusDaSemanaModal.map(f => (
                            <label key={f.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0">
                              <input
                                type="checkbox"
                                checked={fusSemanaLocal.includes(f.id)}
                                onChange={e => {
                                  setFusSemanaLocal(prev =>
                                    e.target.checked
                                      ? [...prev, f.id]
                                      : prev.filter(id => id !== f.id)
                                  );
                                }}
                                className="w-3.5 h-3.5 accent-red-600"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-semibold text-gray-700">
                                  FU {f.sequence_number} · {f.reminder_date ? format(new Date(f.reminder_date + 'T00:00:00'), 'dd/MM') : '—'}
                                </p>
                                {f.consultor_nome && <p className="text-[10px] text-gray-400">{f.consultor_nome}</p>}
                              </div>
                            </label>
                          ))}
                          {fusSemanaLocal.length > 0 && (
                            <p className="text-[10px] text-amber-700 bg-amber-50 px-3 py-2 font-medium">
                              {fusSemanaLocal.length} FU{fusSemanaLocal.length > 1 ? 's' : ''} será{fusSemanaLocal.length > 1 ? 'ão' : ''} encerrado{fusSemanaLocal.length > 1 ? 's' : ''} com os mesmos dados
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </TabsContent>

              <TabsContent value="cliente" className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                <div className="space-y-6 text-sm">
                  {/* CONSULTOR RESPONSÁVEL */}
                  <div className="border-b pb-4">
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wide mb-3">Consultor Responsável</p>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-gray-500 font-semibold mb-1">Nome</p>
                        <p className="text-gray-900 font-medium">{followUp?.consultor_nome || "—"}</p>
                      </div>
                    </div>
                  </div>

                  {/* PROPRIETÁRIO DA OFICINA */}
                  {ownerEmployee && (
                    <div className="border-b pb-4">
                      <p className="text-xs text-gray-500 font-bold uppercase tracking-wide mb-3">Proprietário da Oficina</p>
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-gray-500 font-semibold mb-1">Nome Completo</p>
                          <p className="text-gray-900 font-medium">{ownerEmployee.full_name || "—"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-semibold mb-1">E-mail</p>
                          <p className="text-gray-900 break-all">{ownerEmployee.email || "—"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-semibold mb-1">Telefone</p>
                          <p className="text-gray-900">{ownerEmployee.telefone || "—"}</p>
                        </div>
                        {ownerEmployee.cpf && (
                          <div>
                            <p className="text-xs text-gray-500 font-semibold mb-1">CPF</p>
                            <p className="text-gray-900">{ownerEmployee.cpf}</p>
                          </div>
                        )}
                        {ownerEmployee.data_nascimento && (
                          <div>
                            <p className="text-xs text-gray-500 font-semibold mb-1">Data de Nascimento</p>
                            <p className="text-gray-900">{format(new Date(ownerEmployee.data_nascimento), "dd/MM/yyyy")}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* DADOS DA OFICINA */}
                  {workshop && (
                    <div className="border-b pb-4">
                      <p className="text-xs text-gray-500 font-bold uppercase tracking-wide mb-3">Dados da Oficina</p>
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-gray-500 font-semibold mb-1">Nome</p>
                          <p className="text-gray-900 font-medium">{workshop.name || "—"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-semibold mb-1">Razão Social</p>
                          <p className="text-gray-900">{workshop.razao_social || "—"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-semibold mb-1">CNPJ</p>
                          <p className="text-gray-900">{workshop.cnpj || "—"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-semibold mb-1">Localização</p>
                          <p className="text-gray-900">{workshop.city || "—"} / {workshop.state || "—"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-semibold mb-1">Endereço</p>
                          <p className="text-gray-900 text-xs">{workshop.endereco_rua} {workshop.endereco_numero && `, ${workshop.endereco_numero}`} {workshop.endereco_complemento && `- ${workshop.endereco_complemento}`}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-semibold mb-1">Telefone</p>
                          <p className="text-gray-900">{workshop.telefone || "—"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-semibold mb-1">E-mail</p>
                          <p className="text-gray-900 break-all">{workshop.email || "—"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-semibold mb-1">Segmento</p>
                          <p className="text-gray-900">{workshop.segment_auto || workshop.segment || "—"}</p>
                        </div>
                        {workshop.employees_count && (
                          <div>
                            <p className="text-xs text-gray-500 font-semibold mb-1">Colaboradores</p>
                            <p className="text-gray-900">{workshop.employees_count}</p>
                          </div>
                        )}
                        {workshop.planoAtual && (
                          <div>
                            <p className="text-xs text-gray-500 font-semibold mb-1">Plano</p>
                            <p className="text-gray-900 font-medium">{workshop.planoAtual}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* AÇÃO SUGERIDA */}
                  <div className="pt-3">
                    <div className="bg-amber-50 border border-amber-200 rounded p-3">
                      <AlertCircle className="w-4 h-4 text-amber-600 mb-2" />
                      <p className="text-xs text-amber-900">Ação sugerida: Confirmar disponibilidade</p>
                    </div>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="ia" className="flex-1 overflow-hidden flex flex-col">
  

                {/* Mini Chat embeddado */}
                <div className="flex-1 flex flex-col min-h-0 px-3 pb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-3.5 h-3.5 text-gray-500" />
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Chat com IA</p>
                  </div>

                  {!chatInicializado ? (
                    <div className="flex-1 flex items-center justify-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={iniciarChat}
                        className="text-xs gap-2"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Iniciar conversa com IA
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="overflow-y-auto bg-gray-50 rounded-lg border border-gray-200 px-2.5 py-2 space-y-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent" style={{ flex: '1 1 0', minHeight: 0 }}>
                        {chatMensagens.length === 0 && chatEnviando && (
                          <div className="flex items-center justify-center h-full">
                            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                          </div>
                        )}
                        {chatMensagens.map((msg, idx) => (
                          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[88%] rounded-xl px-2.5 py-1.5 text-[11px] leading-relaxed space-y-0.5 ${
                              msg.role === 'user'
                                ? 'bg-red-600 text-white rounded-br-sm'
                                : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
                            }`}>
                              {msg.role === 'user'
                            ? msg.content
                            : <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>{renderMarkdown(msg.content)}</div>
                          }
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
                        <input
                          type="text"
                          value={chatInput}
                          onChange={e => setChatInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviarMensagemChat()}
                          placeholder="Pergunte sobre o cliente..."
                          disabled={chatEnviando}
                          className="flex-1 text-[11px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-red-400 disabled:opacity-50"
                        />
                        <button
                          onClick={enviarMensagemChat}
                          disabled={!chatInput.trim() || chatEnviando}
                          className="w-7 h-7 rounded-lg bg-red-600 hover:bg-red-700 text-white flex items-center justify-center disabled:opacity-40 transition-colors flex-shrink-0"
                        >
                          <Send className="w-3 h-3" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* POST-IT ARRASTÁVEL — dica de IA */}
        <div
          ref={postItRef}
          onMouseDown={handlePostItMouseDown}
          style={{
            position: 'fixed',
            left: postItPos.x,
            top: postItPos.y,
            zIndex: 99999,
            width: '220px',
            cursor: 'grab',
            filter: 'drop-shadow(2px 6px 8px rgba(0,0,0,0.28))',
            userSelect: 'none',
          }}
        >
          {/* Pino vermelho */}
          <div style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', zIndex: 2, width: '22px', height: '22px' }}>
            <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, #ff6b6b, #c0392b)', margin: '0 auto', boxShadow: '0 2px 4px rgba(0,0,0,0.4)' }} />
            <div style={{ width: '2px', height: '10px', background: '#888', margin: '-2px auto 0', borderRadius: '1px' }} />
          </div>

          {/* Corpo do post-it */}
          <div style={{ background: 'linear-gradient(135deg, #fef08a 0%, #fde047 60%, #facc15 100%)', borderRadius: '2px', padding: '20px 14px 20px 14px', position: 'relative', minHeight: '120px' }}>
            {/* Canto dobrado */}
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: '28px', height: '28px', background: 'linear-gradient(225deg, #ca8a04 50%, transparent 50%)', borderRadius: '0 0 2px 0' }} />

            {/* Linhas decorativas */}
            {[36, 50, 64, 78, 92].map(top => (
              <div key={top} style={{ position: 'absolute', top: `${top}px`, left: '14px', right: '14px', height: '1px', background: 'rgba(0,0,0,0.06)' }} />
            ))}

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '10px', fontWeight: '700', color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dica de IA</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={gerarDicaIA}
                  disabled={carregandoDica}
                  title="Gerar nova dica"
                  style={{ width: '20px', height: '20px', borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: carregandoDica ? 0.4 : 1 }}
                >
                  <svg className={carregandoDica ? 'animate-spin' : ''} width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="#92400e" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                <button
                  onClick={() => setPostItMinimizado(v => !v)}
                  title={postItMinimizado ? 'Expandir' : 'Minimizar'}
                  style={{ width: '20px', height: '20px', borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <span style={{ fontSize: '12px', color: '#92400e', lineHeight: 1 }}>{postItMinimizado ? '+' : '−'}</span>
                </button>
              </div>
            </div>

            {/* Conteúdo */}
            {!postItMinimizado && (
              <div style={{ fontSize: '11px', color: '#1c1917', lineHeight: '1.5', position: 'relative', zIndex: 1 }}>
                {carregandoDica ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ca8a04' }} />
                    <span style={{ color: '#92400e', fontStyle: 'italic' }}>Analisando histórico...</span>
                  </div>
                ) : dicaIA ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>{renderMarkdown(dicaIA)}</div>
                ) : (
                  <span style={{ color: '#92400e', fontStyle: 'italic' }}>Clique em ↺ para gerar uma dica.</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* FOOTER - FIXO */}
         <div className="bg-white border-t border-gray-200 px-6 py-4 flex gap-3 justify-between flex-shrink-0">
           <Button variant="outline" onClick={() => { localStorage.removeItem(`draft_atendimento_${followUp?.id}`); onClose(); }} disabled={saving}>
             Fechar
           </Button>
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

      </>
      );
      }