import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Phone, MessageCircle, Mail, Video, MapPin, CheckCircle2, X, Clock, AlertCircle,
  ChevronRight, Upload
} from "lucide-react";
import { format, addDays } from "date-fns";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";

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
  const [duracao, setDuracao] = useState("");
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

  // Timer in real-time
  useEffect(() => {
    const interval = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

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

  const handleSave = async () => {
    if (!validate()) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setSaving(true);
    try {
      const steps = [
        { name: "Gravando interação...", action: async () => {
          setSavingStep("Gravando interação...");
          // Aqui você criaria um registro de Interacao
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
      
      queryClient.invalidateQueries({ queryKey: ["follow-up-reminders"] });
      onSaved?.();
      onClose();
      toast.success("Atendimento salvo com sucesso!");
    } catch (err) {
      toast.error("Erro ao salvar atendimento");
      setSavingStep(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] p-0 flex flex-col">
        {/* HEADER */}
        <div className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between border-b border-gray-800">
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
            <Badge className="bg-red-600 text-white border-0 ml-4">
              <Clock className="w-3 h-3 mr-1" /> Em atendimento · {formatTimer()}
            </Badge>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-300 hover:text-white hover:bg-gray-800">
              Cancelar
            </Button>
            <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white">
              Finalizar atendimento
            </Button>
          </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-hidden flex">
          {/* LEFT COLUMN - FORM */}
          <div className="flex-1 overflow-y-auto border-r border-gray-200 p-6">
            <div className="space-y-6 max-w-2xl">
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
                  <Input type="date" value={dataContato} onChange={e => setDataContato(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2 block">Duração (min)</label>
                  <Input type="number" placeholder="30" value={duracao} onChange={e => setDuracao(e.target.value)} />
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
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition cursor-pointer">
                  <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                  <p className="text-xs text-gray-600">Arraste arquivos ou clique para selecionar</p>
                  <p className="text-xs text-gray-400 mt-1">PDF, XLSX, DOCX, PNG (máx 10MB)</p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN - SIDEBAR */}
          <div className="w-96 border-l border-gray-200 bg-gray-50 overflow-hidden flex flex-col">
            <Tabs defaultValue="atas" className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-3 rounded-none border-b">
                <TabsTrigger value="atas">Atas</TabsTrigger>
                <TabsTrigger value="followups">Follow-ups</TabsTrigger>
                <TabsTrigger value="cliente">Cliente</TabsTrigger>
              </TabsList>

              <TabsContent value="atas" className="flex-1 overflow-y-auto p-4">
                <div className="space-y-2">
                  {/* Placeholder for ATAs */}
                  <p className="text-xs text-gray-500">Sem atas registradas</p>
                </div>
              </TabsContent>

              <TabsContent value="followups" className="flex-1 overflow-y-auto p-4">
                <div className="space-y-3">
                  <div className="bg-white rounded-lg p-3 border border-red-200">
                    <Badge className="bg-red-600 text-white text-xs mb-1">Atual</Badge>
                    <p className="text-sm font-semibold text-gray-900">FU {followUp?.sequence_number || 1}</p>
                    <p className="text-xs text-gray-500 mt-1">{followUp?.reminder_date}</p>
                  </div>
                  <div className="text-xs text-gray-500">Nenhum follow-up anterior</div>
                </div>
              </TabsContent>

              <TabsContent value="cliente" className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-500 font-semibold mb-1">Responsável</p>
                    <p className="text-gray-900">{followUp?.consultor_nome || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-semibold mb-1">Telefone</p>
                    <p className="text-gray-900">{cliente?.phone || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-semibold mb-1">Setor</p>
                    <p className="text-gray-900">{cliente?.sector || "—"}</p>
                  </div>
                  <div className="pt-3 border-t">
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

        {/* FOOTER */}
        <div className="bg-white border-t border-gray-200 px-6 py-4 flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="outline" onClick={() => toast.info("Rascunho salvo")} disabled={saving}>
            Rascunho
          </Button>
          <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleSave} disabled={saving}>
            {saving ? savingStep : "Salvar e finalizar atendimento"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}