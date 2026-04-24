import React, { useState, useEffect } from "react";
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
  ChevronRight, Upload, Check
} from "lucide-react";
import { format, addDays } from "date-fns";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import VisualizarAtaModal from "@/components/aceleracao/VisualizarAtaModal";

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

export default function IniciarAtendimentoModal({ followUp, cliente, onClose, onSaved }) {
  const queryClient = useQueryClient();
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
  const [errors, setErrors] = useState({});
  const [selectedAta, setSelectedAta] = useState(null);
  const [pastedImages, setPastedImages] = useState([]);
  const [duracao, setDuracao] = useState(30);
  const [inicioContagem, setInicioContagem] = useState(null);
  const [cronometroAtivo, setCronometroAtivo] = useState(true);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

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

  // Timer in real-time
  useEffect(() => {
    const interval = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Countdown duration from 30 minutes
  useEffect(() => {
    if (!inicioContagem) {
      setInicioContagem(Date.now());
    }
  }, [inicioContagem]);

  useEffect(() => {
    if (!inicioContagem || !cronometroAtivo) return;
    
    const interval = setInterval(() => {
      const decorrido = Math.floor((Date.now() - inicioContagem) / 1000 / 60);
      const restante = Math.max(0, 30 - decorrido);
      setDuracao(restante);
    }, 1000);

    return () => clearInterval(interval);
  }, [inicioContagem, cronometroAtivo]);

  const formatTimer = () => {
    const mins = String(Math.floor(timer / 60)).padStart(2, "0");
    const secs = String(timer % 60).padStart(2, "0");
    return `${mins}:${secs}`;
  };

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
      try {
      // Primeiro executar o handleSave original
      const steps = [
        { name: "Gravando interação...", action: async () => {
          setSavingStep("Gravando interação...");
        }},
        { name: "Atualizando status do follow-up...", action: async () => {
          setSavingStep("Atualizando status do follow-up...");
          await base44.entities.FollowUpReminder.update(followUp.id, {
            is_completed: true,
            completed_at: new Date().toISOString(),
          });
        }},
      ];

      if (proximoPasso === "reagendar" && proxData) {
        steps.push({
          name: "Criando próximo follow-up...",
          action: async () => {
            setSavingStep("Criando próximo follow-up...");
            await base44.entities.FollowUpReminder.create({
              workshop_id: followUp.workshop_id,
              workshop_name: followUp.workshop_name,
              consultor_id: followUp.consultor_id,
              consultor_nome: followUp.consultor_nome,
              sequence_number: (followUp.sequence_number || 1) + 1,
              reminder_date: proxData,
              is_completed: false,
            });
          }
        });
      }

      steps.push({
        name: "Notificando consultor...",
        action: async () => {
          setSavingStep("Notificando consultor...");
        }
      });

      for (const step of steps) {
        await step.action();
        await new Promise(r => setTimeout(r, 600));
      }

      setSavingStep("completed");
      await new Promise(r => setTimeout(r, 1500));

      // Limpar o rascunho ao finalizar com sucesso
      const storageKey = `draft_atendimento_${followUp.id}`;
      localStorage.removeItem(storageKey);
      console.log('✅ Rascunho removido:', storageKey);

      queryClient.invalidateQueries({ queryKey: ["follow-up-reminders"] });
      onSaved?.();
      onClose();
      toast.success("Atendimento salvo com sucesso!");
      } catch (err) {
      console.error('Erro ao salvar:', err);
      toast.error("Erro ao salvar atendimento");
      setSavingStep(null);
      } finally {
      setSaving(false);
      }
      };

      const handleConfirmCancel = () => {
      // Limpar rascunho do localStorage
      const storageKey = `draft_atendimento_${followUp.id}`;
      localStorage.removeItem(storageKey);
      console.log('✅ Rascunho removido ao cancelar:', storageKey);

      toast.success("Dados descartados!");
      setShowCancelConfirm(false);
      onClose();
      };

      return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] p-0 flex flex-col overflow-hidden">
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
          <div className="flex gap-3">
            <Button variant="ghost" size="sm" onClick={() => setShowCancelConfirm(true)} className="text-gray-300 hover:text-white hover:bg-gray-800">
              Cancelar
            </Button>
            <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white">
              Finalizar atendimento
            </Button>
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
                      onClick={() => {
                        setResultado(opt.id);
                        setErrors(e => ({ ...e, resultado: null }));
                      }}
                      className={`px-3 py-2 rounded-lg border-2 text-xs font-medium transition ${
                        resultado === opt.id
                          ? `${opt.color} border-current`
                          : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                      } ${errors.resultado ? "border-red-500 bg-red-50" : ""}`}
                    >
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

          {/* RIGHT COLUMN - SIDEBAR */}
          <div className="w-96 border-l border-gray-200 bg-gradient-to-b from-white via-gray-50 to-gray-100 overflow-hidden flex flex-col shadow-[inset_-2px_0_8px_rgba(0,0,0,0.03)]">
            <Tabs defaultValue="atas" className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-3 rounded-none border-b bg-white">
                <TabsTrigger value="atas">Atas</TabsTrigger>
                <TabsTrigger value="followups">Follow-ups</TabsTrigger>
                <TabsTrigger value="cliente">Cliente</TabsTrigger>
              </TabsList>

              <TabsContent value="atas" className="flex-1 overflow-y-auto px-3 py-4">
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

              <TabsContent value="followups" className="flex-1 overflow-y-auto px-3 py-4">
                <div className="space-y-3">
                  <div className="bg-white rounded-lg p-3 border border-red-200">
                    <Badge className="bg-red-600 text-white text-xs mb-1">Atual</Badge>
                    <p className="text-sm font-semibold text-gray-900">FU {followUp?.sequence_number || 1}</p>
                    <p className="text-xs text-gray-500 mt-1">{followUp?.reminder_date}</p>
                  </div>
                  <div className="text-xs text-gray-500">Nenhum follow-up anterior</div>
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
            </Tabs>
          </div>
        </div>

        {/* FOOTER - FIXO */}
        <div className="bg-white border-t border-gray-200 px-6 py-4 flex gap-3 justify-end flex-shrink-0">
          <Button variant="outline" onClick={() => setShowCancelConfirm(true)} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="outline" onClick={handleSaveDraft} disabled={saving} className="border-cyan-300 text-cyan-700 hover:bg-cyan-50">
            {saving && savingStep ? savingStep : "Rascunho"}
          </Button>
          <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleSaveAndFinalize} disabled={saving}>
            {saving ? savingStep : "Salvar e finalizar atendimento"}
          </Button>
        </div>
      </DialogContent>

      {/* ATA Modal */}
      {selectedAta && (
        <VisualizarAtaModal
          ata={selectedAta}
          onClose={() => setSelectedAta(null)}
        />
      )}

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar todos os dados?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a cancelar o atendimento. Todos os dados não salvos serão perdidos permanentemente, incluindo o rascunho.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowCancelConfirm(false)}>
              Manter e continuar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmCancel}
              className="bg-red-600 hover:bg-red-700"
            >
              Descartar tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </Dialog>
      );
      }