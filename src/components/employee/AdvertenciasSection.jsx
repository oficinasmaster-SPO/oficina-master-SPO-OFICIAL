import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, AlertTriangle, Printer, Mail, Mic, Wand2, CheckCircle2, XCircle, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import AudioRecorder from "@/components/audio/AudioRecorder";
import ProcessSelector from "@/components/employee/warning/ProcessSelector";
import CultureManualSelector from "@/components/employee/warning/CultureManualSelector";
import EmployeeAcknowledgmentModal from "@/components/employee/warning/EmployeeAcknowledgmentModal";

const LEGAL_DISCLAIMER = "Esta advertência é aplicada no exercício do poder disciplinar do empregador, visando à orientação, correção de conduta e preservação do bom ambiente de trabalho, conforme normas internas da empresa.";

export default function AdvertenciasSection({ employee }) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [showAckModal, setShowAckModal] = useState(false);
  const [selectedWarning, setSelectedWarning] = useState(null);
  const [processingAudio, setProcessingAudio] = useState(false);
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  
  const [formData, setFormData] = useState({
    occurrence_date: new Date().toISOString().split('T')[0],
    occurrence_location: "",
    reason: "",
    severity: "leve",
    description: "",
    rule_violated: "",
    rule_source: "outro",
    process_id: null,
    it_document_id: null,
    culture_manual_rule: "",
    corrective_guidance: ""
  });
  
  const [filters, setFilters] = useState({
    severity: "all",
    acknowledged: "all"
  });

  // Buscar advertências
  const { data: warnings = [], isLoading } = useQuery({
    queryKey: ['employee-warnings', employee.id],
    queryFn: async () => {
      const result = await base44.entities.EmployeeWarning.filter({ employee_id: employee.id }, '-created_date');
      return Array.isArray(result) ? result : [];
    },
    enabled: !!employee.id
  });

  // Criar advertência
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      const warningNumber = warnings.length + 1;
      
      return await base44.entities.EmployeeWarning.create({
        ...data,
        employee_id: employee.id,
        workshop_id: employee.workshop_id,
        evaluator_id: user.id,
        warning_number: warningNumber
      });
    },
    onSuccess: () => {
      toast.success("Advertência registrada!");
      setShowDialog(false);
      resetForm();
      queryClient.invalidateQueries(['employee-warnings']);
    },
    onError: (error) => {
      toast.error("Erro: " + error.message);
    }
  });

  // Atualizar ciência
  const acknowledgeMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await base44.entities.EmployeeWarning.update(id, data);
    },
    onSuccess: () => {
      toast.success("Ciência registrada!");
      setShowAckModal(false);
      queryClient.invalidateQueries(['employee-warnings']);
    }
  });

  const resetForm = () => {
    setFormData({
      occurrence_date: new Date().toISOString().split('T')[0],
      occurrence_location: "",
      reason: "",
      severity: "leve",
      description: "",
      rule_violated: "",
      rule_source: "outro",
      process_id: null,
      it_document_id: null,
      culture_manual_rule: "",
      corrective_guidance: ""
    });
  };

  const handleAudioTranscription = async (audioBlob) => {
    setProcessingAudio(true);
    try {
      const file = new File([audioBlob], "audio.webm", { type: audioBlob.type });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const prompt = `Transcreva e estruture este áudio de ADVERTÊNCIA TRABALHISTA para o colaborador ${employee.full_name} (${employee.position}).

Extraia e organize:
1. DESCRIÇÃO DO OCORRIDO: Fatos objetivos (o quê, quando, onde)
2. REGRA VIOLADA: Qual norma/regra foi descumprida
3. ORIENTAÇÃO DE CORREÇÃO: Como o colaborador deve proceder daqui em diante

Use linguagem profissional, clara e respeitosa.
Seja objetivo e evite julgamentos pessoais.

Retorne JSON: { 
  "description": "descrição objetiva...", 
  "rule_violated": "regra descumprida...",
  "corrective_guidance": "orientação clara..."
}`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            description: { type: "string" },
            rule_violated: { type: "string" },
            corrective_guidance: { type: "string" }
          }
        }
      });

      setFormData({
        ...formData,
        description: response.description,
        rule_violated: response.rule_violated,
        corrective_guidance: response.corrective_guidance,
        audio_url: file_url
      });
      setShowAudioRecorder(false);
      toast.success("Áudio transcrito e estruturado!");
    } catch (error) {
      console.error(error);
      toast.error("Erro: " + error.message);
    } finally {
      setProcessingAudio(false);
    }
  };

  const generateWithAI = async () => {
    if (!formData.description || !formData.reason) {
      toast.error("Preencha motivo e descrição primeiro");
      return;
    }

    try {
      const prompt = `Você é especialista em RH. Complete esta advertência trabalhista:

Colaborador: ${employee.full_name} - ${employee.position}
Motivo: ${formData.reason}
Descrição: ${formData.description}

Gere:
1. REGRA VIOLADA: Identifique qual regra/norma foi descumprida
2. ORIENTAÇÃO DE CORREÇÃO: Como o colaborador deve proceder

Use linguagem profissional e clara.
JSON: { "rule_violated": "...", "corrective_guidance": "..." }`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            rule_violated: { type: "string" },
            corrective_guidance: { type: "string" }
          }
        }
      });

      setFormData({
        ...formData,
        rule_violated: response.rule_violated,
        corrective_guidance: response.corrective_guidance
      });
      toast.success("IA completou os campos!");
    } catch (error) {
      toast.error("Erro: " + error.message);
    }
  };

  const handleSubmit = () => {
    if (!formData.occurrence_date || !formData.reason || !formData.description || 
        !formData.rule_violated || !formData.corrective_guidance) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    createMutation.mutate(formData);
  };

  const sendEmailNotification = async (warning) => {
    try {
      await base44.integrations.Core.SendEmail({
        to: employee.email,
        subject: `Advertência #${warning.warning_number} - ${warning.reason}`,
        body: `Prezado(a) ${employee.full_name},\n\nVocê recebeu uma advertência ${warning.severity}.\n\nMotivo: ${warning.reason}\nData do Ocorrido: ${format(new Date(warning.occurrence_date), 'dd/MM/yyyy')}\n\nAcesse a plataforma para ler o conteúdo completo e dar ciência.\n\n${LEGAL_DISCLAIMER}`
      });
      
      await base44.entities.EmployeeWarning.update(warning.id, {
        email_sent: true,
        email_sent_at: new Date().toISOString()
      });
      
      toast.success("Email enviado!");
      queryClient.invalidateQueries(['employee-warnings']);
    } catch (error) {
      toast.error("Erro ao enviar email: " + error.message);
    }
  };

  const handleAcknowledge = async (signatureUrl) => {
    acknowledgeMutation.mutate({
      id: selectedWarning.id,
      data: {
        employee_acknowledged: true,
        employee_acknowledged_at: new Date().toISOString(),
        employee_signature_url: signatureUrl
      }
    });
  };

  const handleRefuse = async (witnessName) => {
    acknowledgeMutation.mutate({
      id: selectedWarning.id,
      data: {
        employee_refused: true,
        witness_name: witnessName,
        employee_acknowledged_at: new Date().toISOString()
      }
    });
  };

  const filteredWarnings = warnings.filter(w => {
    const severityMatch = filters.severity === "all" || w.severity === filters.severity;
    const ackMatch = filters.acknowledged === "all" || 
      (filters.acknowledged === "yes" && w.employee_acknowledged) ||
      (filters.acknowledged === "no" && !w.employee_acknowledged);
    return severityMatch && ackMatch;
  });

  const severityConfig = {
    leve: { color: "border-yellow-200 bg-yellow-50", badge: "bg-yellow-100 text-yellow-800", label: "Leve" },
    grave: { color: "border-orange-200 bg-orange-50", badge: "bg-orange-100 text-orange-800", label: "Grave" },
    gravissima: { color: "border-red-200 bg-red-50", badge: "bg-red-100 text-red-800", label: "Gravíssima" }
  };

  return (
    <>
      <Card className="shadow-lg border-2 border-orange-200">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              Advertências Trabalhistas
            </CardTitle>
            <Button onClick={() => setShowDialog(true)} className="bg-orange-600 hover:bg-orange-700" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Registrar Advertência
            </Button>
          </div>

          <div className="flex gap-2 mt-4">
            <Select value={filters.severity} onValueChange={(v) => setFilters({...filters, severity: v})}>
              <SelectTrigger className="h-8 w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="leve">Leve</SelectItem>
                <SelectItem value="grave">Grave</SelectItem>
                <SelectItem value="gravissima">Gravíssima</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.acknowledged} onValueChange={(v) => setFilters({...filters, acknowledged: v})}>
              <SelectTrigger className="h-8 w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="yes">Com Ciência</SelectItem>
                <SelectItem value="no">Sem Ciência</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" />
            </div>
          ) : filteredWarnings.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Nenhuma advertência encontrada</p>
          ) : (
            <div className="space-y-3">
              {filteredWarnings.map((warning) => {
                const config = severityConfig[warning.severity];
                return (
                  <div key={warning.id} className={`p-4 rounded-lg border-2 ${config.color}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-orange-600" />
                        <span className="font-bold">#{warning.warning_number} - {warning.reason}</span>
                        <Badge className={config.badge}>{config.label}</Badge>
                        {warning.employee_acknowledged && (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Ciente
                          </Badge>
                        )}
                        {warning.employee_refused && (
                          <Badge className="bg-red-100 text-red-800">
                            <XCircle className="w-3 h-3 mr-1" />
                            Recusou
                          </Badge>
                        )}
                      </div>
                      <span className="text-sm text-gray-600">
                        {format(new Date(warning.occurrence_date), 'dd/MM/yyyy')}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-700 mb-2">{warning.description}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      📍 Local: {warning.occurrence_location} • 👤 Aplicada por: {warning.created_by}
                    </p>
                    
                    <div className="flex gap-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedWarning(warning);
                          setShowAckModal(true);
                        }}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Ver Detalhes
                      </Button>
                      {!warning.email_sent && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => sendEmailNotification(warning)}
                        >
                          <Mail className="w-3 h-3 mr-1" />
                          Enviar Email
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Criação */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              Registrar Advertência Trabalhista
            </DialogTitle>
          </DialogHeader>

          {/* Cabeçalho com dados do colaborador */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
            <h4 className="font-bold text-blue-900 mb-2">Colaborador</h4>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <span className="text-blue-700 font-medium">Nome:</span>
                <p className="text-blue-900">{employee.full_name}</p>
              </div>
              <div>
                <span className="text-blue-700 font-medium">Cargo:</span>
                <p className="text-blue-900">{employee.position}</p>
              </div>
              <div>
                <span className="text-blue-700 font-medium">Área:</span>
                <p className="text-blue-900">{employee.area || 'Não definida'}</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data do Ocorrido *</Label>
                <Input
                  type="date"
                  value={formData.occurrence_date}
                  onChange={(e) => setFormData({...formData, occurrence_date: e.target.value})}
                  className="bg-white"
                />
              </div>
              <div>
                <Label>Local *</Label>
                <Input
                  placeholder="Ex: Setor de mecânica"
                  value={formData.occurrence_location}
                  onChange={(e) => setFormData({...formData, occurrence_location: e.target.value})}
                  className="bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Motivo *</Label>
                <Input
                  placeholder="Ex: Atraso reincidente"
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                  className="bg-white"
                />
              </div>
              <div>
                <Label>Gravidade *</Label>
                <Select value={formData.severity} onValueChange={(v) => setFormData({...formData, severity: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="leve">Leve</SelectItem>
                    <SelectItem value="grave">Grave</SelectItem>
                    <SelectItem value="gravissima">Gravíssima</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-red-900 font-bold">Gravar Áudio da Advertência</Label>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setShowAudioRecorder(!showAudioRecorder)}
                  disabled={processingAudio}
                  className="text-red-600"
                >
                  <Mic className="w-3 h-3 mr-1" />
                  {showAudioRecorder ? "Fechar" : "Gravar"}
                </Button>
              </div>
              {showAudioRecorder && (
                <AudioRecorder
                  onRecordingComplete={handleAudioTranscription}
                  onCancel={() => setShowAudioRecorder(false)}
                />
              )}
              <p className="text-xs text-red-700 mt-2">
                🎙️ <strong>Áudio preenche automaticamente:</strong> Descrição do ocorrido, Regra violada e Orientação de correção
              </p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <Label>Descrição Objetiva do Ocorrido *</Label>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={generateWithAI}
                  className="text-purple-600"
                >
                  <Wand2 className="w-3 h-3 mr-1" />
                  IA: Completar
                </Button>
              </div>
              <Textarea
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Descreva objetivamente o que aconteceu..."
                className="bg-white"
                disabled={processingAudio}
              />
            </div>

            <div>
              <Label>Origem da Regra</Label>
              <Select value={formData.rule_source} onValueChange={(v) => setFormData({...formData, rule_source: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual_cultura">Manual da Cultura</SelectItem>
                  <SelectItem value="processo_it">Processo/IT</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.rule_source === 'manual_cultura' && (
              <>
                <CultureManualSelector
                  workshopId={employee.workshop_id}
                  currentValue={formData.culture_manual_rule}
                  onSelect={(value) => setFormData({...formData, culture_manual_rule: value})}
                />
                <ProcessSelector
                  workshopId={employee.workshop_id}
                  selectedProcessId={formData.process_id}
                  onSelect={(data) => setFormData({...formData, ...data})}
                />
              </>
            )}

            {formData.rule_source === 'processo_it' && (
              <ProcessSelector
                workshopId={employee.workshop_id}
                selectedProcessId={formData.process_id}
                onSelect={(data) => setFormData({...formData, ...data})}
              />
            )}

            <div>
              <Label>Regra/Norma Descumprida *</Label>
              <Textarea
                rows={3}
                value={formData.rule_violated}
                onChange={(e) => setFormData({...formData, rule_violated: e.target.value})}
                placeholder="Qual regra foi descumprida?"
                className="bg-white"
                disabled={processingAudio}
              />
            </div>

            <div>
              <Label>Orientação de Correção *</Label>
              <Textarea
                rows={3}
                value={formData.corrective_guidance}
                onChange={(e) => setFormData({...formData, corrective_guidance: e.target.value})}
                placeholder="Como o colaborador deve proceder daqui em diante?"
                className="bg-white"
                disabled={processingAudio}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <p className="text-xs text-blue-900 font-medium italic">
                📋 {LEGAL_DISCLAIMER}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button 
              onClick={handleSubmit} 
              disabled={createMutation.isPending}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {createMutation.isPending ? "Salvando..." : "Registrar Advertência"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Ciência */}
      <EmployeeAcknowledgmentModal
        open={showAckModal}
        onClose={() => setShowAckModal(false)}
        warning={selectedWarning}
        onAcknowledge={handleAcknowledge}
        onRefuse={handleRefuse}
      />
    </>
  );
}