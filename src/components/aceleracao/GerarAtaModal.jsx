import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Save, FileText, Sparkles } from "lucide-react";
import { toast } from "sonner";
import ProcessSearchSelect from "@/components/aceleracao/ProcessSearchSelect";
import AudioTranscriptionField from "@/components/aceleracao/AudioTranscriptionField";
import NextSteps from "@/components/aceleracao/NextSteps";
import AtaSaveConfirmDialog from "@/components/aceleracao/AtaSaveConfirmDialog";

export default function GerarAtaModal({ atendimento, workshop, planoAceleracao, onClose, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [showAISummary, setShowAISummary] = useState(false);
  const [aiSummary, setAISummary] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingSaveStatus, setPendingSaveStatus] = useState(null);
  const [formData, setFormData] = useState({
    meeting_date: new Date().toISOString().split('T')[0],
    meeting_time: new Date().toTimeString().slice(0, 5),
    tipo_aceleracao: atendimento?.tipo || "mensal",
    participantes: [],
    responsavel: { name: "", role: "" },
    pautas: "",
    objetivos_atendimento: "",
    objetivos_consultor: "",
    proximos_passos: [],
    visao_geral_projeto: "",
    processos_vinculados: []
  });

  // Carregar processos disponíveis
  const [processos, setProcessos] = React.useState([]);
  
  React.useEffect(() => {
    const loadProcessos = async () => {
      try {
        const procs = await base44.entities.ProcessDocument.list();
        setProcessos(procs);
      } catch (error) {
        console.error("Erro ao carregar processos:", error);
      }
    };
    loadProcessos();
  }, []);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const user = await base44.auth.me();
      
      // Converter participantes do atendimento para formato da ATA
      const participantesIniciais = [
        { name: user.full_name || user.email, role: "Consultor/Acelerador" }
      ];

      if (atendimento?.participantes && Array.isArray(atendimento.participantes)) {
        atendimento.participantes.forEach(p => {
          if (p.nome) {
            participantesIniciais.push({
              name: p.nome,
              role: p.cargo || "Participante"
            });
          }
        });
      }

      // Converter pauta do atendimento
      let pautasTexto = "";
      if (atendimento?.pauta && Array.isArray(atendimento.pauta)) {
        pautasTexto = atendimento.pauta
          .filter(p => p.titulo)
          .map(p => `• ${p.titulo}${p.descricao ? ': ' + p.descricao : ''}`)
          .join('\n');
      }

      // Incluir tópicos discutidos
      if (atendimento?.topicos_discutidos && atendimento.topicos_discutidos.length > 0) {
        pautasTexto += (pautasTexto ? '\n\n' : '') + '**Tópicos Discutidos:**\n' + 
          atendimento.topicos_discutidos.map(t => `• ${t}`).join('\n');
      }

      // Converter objetivos
      let objetivosTexto = "";
      if (atendimento?.objetivos && Array.isArray(atendimento.objetivos)) {
        objetivosTexto = atendimento.objetivos
          .filter(o => o)
          .map(o => `• ${o}`)
          .join('\n');
      }

      // Incluir decisões tomadas nos objetivos/consultor
      let objetivosConsultorTexto = atendimento?.observacoes_consultor || "";
      if (atendimento?.decisoes_tomadas && atendimento.decisoes_tomadas.length > 0) {
        objetivosConsultorTexto += (objetivosConsultorTexto ? '\n\n' : '') + '**Decisões Tomadas:**\n' + 
          atendimento.decisoes_tomadas
            .map(d => `• ${d.decisao}${d.responsavel ? ' (Responsável: ' + d.responsavel + ')' : ''}${d.prazo ? ' - Prazo: ' + d.prazo : ''}`)
            .join('\n');
      }

      // Converter ações geradas em próximos passos
      const proximosPassosIniciais = [];
      if (atendimento?.acoes_geradas && atendimento.acoes_geradas.length > 0) {
        atendimento.acoes_geradas.forEach(acao => {
          if (acao.acao) {
            proximosPassosIniciais.push({
              descricao: acao.acao,
              responsavel: acao.responsavel || "",
              prazo: acao.prazo || ""
            });
          }
        });
      }

      // If atendimento already has proximos_passos_list, use it
      if (atendimento?.proximos_passos_list && atendimento.proximos_passos_list.length > 0) {
          atendimento.proximos_passos_list.forEach(p => {
              // avoid duplicates
              if (!proximosPassosIniciais.find(x => x.descricao === p.descricao)) {
                  proximosPassosIniciais.push(p);
              }
          });
      }

      // Data e hora do atendimento (usar hora real se disponível)
      const dataAtendimento = atendimento?.data_realizada || atendimento?.data_agendada 
        ? new Date(atendimento.data_realizada || atendimento.data_agendada)
        : new Date();

      setFormData(prev => ({
        ...prev,
        meeting_date: dataAtendimento.toISOString().split('T')[0],
        meeting_time: atendimento?.hora_inicio_real 
          ? new Date(atendimento.hora_inicio_real).toTimeString().slice(0, 5)
          : dataAtendimento.toTimeString().slice(0, 5),
        tipo_aceleracao: atendimento?.tipo_atendimento?.replace('acompanhamento_', '') || 'mensal',
        consultor_name: atendimento?.consultor_nome || user.full_name || user.email,
        consultor_id: atendimento?.consultor_id || user.id,
        participantes: participantesIniciais,
        responsavel: {
          name: workshop?.owner_name || workshop?.name || "",
          role: "Proprietário"
        },
        plano_nome: planoAceleracao?.plan_data?.title || "Plano de Aceleração",
        pautas: pautasTexto,
        objetivos_atendimento: objetivosTexto,
        objetivos_consultor: objetivosConsultorTexto,
        proximos_passos_list: proximosPassosIniciais,
        proximos_passos: typeof atendimento?.proximos_passos === 'string' ? atendimento.proximos_passos : "",
        visao_geral_projeto: planoAceleracao?.plan_data?.overview || planoAceleracao?.plan_data?.executive_summary || ""
      }));
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados do atendimento");
    }
  };

  const addParticipante = () => {
    setFormData(prev => ({
      ...prev,
      participantes: [...prev.participantes, { name: "", role: "" }]
    }));
  };

  const removeParticipante = (index) => {
    setFormData(prev => ({
      ...prev,
      participantes: prev.participantes.filter((_, i) => i !== index)
    }));
  };

  const updateParticipante = (index, field, value) => {
    const updated = [...(formData.participantes || [])];
    updated[index] = {...updated[index], [field]: value};
    setFormData(prev => ({ ...prev, participantes: updated }));
  };

  const handleRequestSave = (status) => {
    if (!formData.meeting_date || !formData.meeting_time) {
      toast.error("Preencha data e hora da reunião");
      return;
    }
    setPendingSaveStatus(status);
    setShowConfirmDialog(true);
  };

  const handleSave = async (status = "rascunho") => {
    setShowConfirmDialog(false);

    setLoading(true);
    try {
      const ataCount = await base44.entities.MeetingMinutes.list();
      const code = `AT.${String(ataCount.length + 1).padStart(4, '0')}`;

      const ataData = {
        code,
        workshop_id: workshop.id,
        atendimento_id: atendimento?.id,
        plano_aceleracao_id: planoAceleracao?.id,
        meeting_date: formData.meeting_date,
        meeting_time: formData.meeting_time,
        tipo_aceleracao: formData.tipo_aceleracao,
        consultor_name: formData.consultor_name,
        consultor_id: formData.consultor_id,
        participantes: (formData.participantes || []).filter(p => p.name),
        responsavel: formData.responsavel,
        plano_nome: formData.plano_nome,
        pautas: formData.pautas,
        objetivos_atendimento: formData.objetivos_atendimento,
        objetivos_consultor: formData.objetivos_consultor,
        proximos_passos_list: (formData.proximos_passos_list || []).filter(p => p.descricao),
        proximos_passos: formData.proximos_passos,
        visao_geral_projeto: formData.visao_geral_projeto,
        processos_vinculados: atendimento?.processos_vinculados || formData.processos_vinculados || [],
        videoaulas_vinculadas: atendimento?.videoaulas_vinculadas || [],
        midias_anexas: atendimento?.midias_anexas || [],
        ai_summary: aiSummary || null,
        status
      };

      console.log("Salvando ATA com dados:", ataData);
      const newAta = await base44.entities.MeetingMinutes.create(ataData);
      console.log("ATA criada:", newAta);

      if (atendimento?.id) {
        await base44.entities.ConsultoriaAtendimento.update(atendimento.id, {
          ata_id: newAta.id,
          ata_gerada: true,
          status: 'realizado',
          data_realizada: new Date().toISOString()
        });
      }

      toast.success("ATA salva e atendimento finalizado!");
      if (onSaved) onSaved(newAta);
      onClose();
    } catch (error) {
      console.error("Erro ao salvar ATA:", error);
      toast.error("Erro ao salvar ATA: " + (error.message || "Verifique os campos obrigatórios"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Gerar ATA de Atendimento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <h3 className="font-semibold text-lg">Identificação</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data da Reunião *</Label>
                  <Input
                    type="date"
                    value={formData.meeting_date}
                    onChange={(e) => setFormData({...formData, meeting_date: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Hora da Reunião *</Label>
                  <Input
                    type="time"
                    value={formData.meeting_time}
                    onChange={(e) => setFormData({...formData, meeting_time: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Tipo de Aceleração</Label>
                  <Select
                    value={formData.tipo_aceleracao}
                    onValueChange={(value) => setFormData({...formData, tipo_aceleracao: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mensal">Mensal</SelectItem>
                      <SelectItem value="quinzenal">Quinzenal</SelectItem>
                      <SelectItem value="semanal">Semanal</SelectItem>
                      <SelectItem value="pontual">Pontual</SelectItem>
                      <SelectItem value="emergencial">Emergencial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Cliente / Empresa</Label>
                  <Input value={workshop?.name || ""} disabled />
                </div>
                <div>
                  <Label>Consultor</Label>
                  <Input value={formData.consultor_name || ""} disabled />
                </div>
                <div>
                  <Label>Plano</Label>
                  <Input value={formData.plano_nome || ""} disabled />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">Participantes</h3>
                <Button size="sm" onClick={addParticipante}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar
                </Button>
              </div>
              {(formData.participantes || []).map((p, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="Nome"
                    value={p.name || ""}
                    onChange={(e) => updateParticipante(index, 'name', e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Função"
                    value={p.role || ""}
                    onChange={(e) => updateParticipante(index, 'role', e.target.value)}
                    className="flex-1"
                  />
                  <Button size="icon" variant="destructive" onClick={() => removeParticipante(index)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <h3 className="font-semibold text-lg">Responsável</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nome</Label>
                  <Input
                    value={formData.responsavel.name}
                    onChange={(e) => setFormData({
                      ...formData,
                      responsavel: {...formData.responsavel, name: e.target.value}
                    })}
                  />
                </div>
                <div>
                  <Label>Função</Label>
                  <Input
                    value={formData.responsavel.role}
                    onChange={(e) => setFormData({
                      ...formData,
                      responsavel: {...formData.responsavel, role: e.target.value}
                    })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <h3 className="font-semibold text-lg">1. Pautas</h3>
              <Textarea
                placeholder="Temas tratados, pontos discutidos, demandas levantadas..."
                value={formData.pautas}
                onChange={(e) => setFormData({...formData, pautas: e.target.value})}
                rows={4}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <h3 className="font-semibold text-lg">2. Objetivos do Atendimento</h3>
              <Textarea
                placeholder="Objetivo principal da reunião e resultados esperados..."
                value={formData.objetivos_atendimento}
                onChange={(e) => setFormData({...formData, objetivos_atendimento: e.target.value})}
                rows={4}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <h3 className="font-semibold text-lg">3. Objetivos do Consultor</h3>
              <AudioTranscriptionField
                label=""
                value={formData.objetivos_consultor}
                onChange={(text) => setFormData({...formData, objetivos_consultor: text})}
                placeholder="Direcionamento estratégico do acelerador, foco técnico ou gerencial..."
                rows={4}
              />
            </CardContent>
          </Card>

          {/* Processos Vinculados */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <h3 className="font-semibold text-lg">MAPs / Processos Discutidos</h3>
              <ProcessSearchSelect
                processos={processos}
                selectedIds={formData.processos_vinculados.map(p => p.id)}
                onAdd={(processoId) => {
                  const processo = processos?.find(p => p.id === processoId);
                  if (processo) {
                    setFormData({
                      ...formData,
                      processos_vinculados: [...formData.processos_vinculados, {
                        id: processo.id,
                        titulo: processo.title,
                        categoria: processo.category
                      }]
                    });
                  }
                }}
              />
              {formData.processos_vinculados.length > 0 && (
                <div className="mt-3 space-y-2">
                  {formData.processos_vinculados.map((proc, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-blue-50 rounded border">
                      <span className="text-sm">{proc.titulo}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            processos_vinculados: formData.processos_vinculados.filter((_, i) => i !== idx)
                          });
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <h3 className="font-semibold text-lg">4. Próximos Passos</h3>
              <NextSteps 
                steps={formData.proximos_passos_list || []} 
                onChange={(steps) => setFormData({ ...formData, proximos_passos_list: steps })} 
                editable={true} 
              />
              
              {/* Fallback for legacy text */}
              <div className="mt-6 pt-4 border-t">
                <Label className="text-sm font-medium text-gray-700">Observações Adicionais (Antigo Próximos Passos)</Label>
                <Textarea
                  placeholder="Notas textuais extras caso necessário..."
                  value={formData.proximos_passos || ""}
                  onChange={(e) => setFormData({ ...formData, proximos_passos: e.target.value })}
                  rows={2}
                  className="mt-2"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <h3 className="font-semibold text-lg">5. Visão Geral do Projeto de Aceleração</h3>
              <Textarea
                placeholder="Status atual do cliente no plano de aceleração, progresso, desafios..."
                value={formData.visao_geral_projeto}
                onChange={(e) => setFormData({...formData, visao_geral_projeto: e.target.value})}
                rows={4}
              />

              {atendimento?.id && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={async () => {
                    setShowAISummary(true);
                    try {
                      const { data } = await base44.functions.invoke('generateAtaSummaryWithContext', {
                        atendimento_id: atendimento.id
                      });
                      setAISummary(data.analise);
                      toast.success("Análise gerada!");
                    } catch (error) {
                      toast.error("Erro: " + error.message);
                      setShowAISummary(false);
                    }
                  }}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Gerar Resumo Inteligente (últimas 10 atas)
                </Button>
              )}

              {showAISummary && aiSummary && (
                <div className="border rounded-lg p-4 bg-gradient-to-br from-blue-50 to-purple-50 space-y-3">
                  <h4 className="font-semibold text-blue-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Análise Inteligente Contextual
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="font-medium text-gray-900">📝 Resumo Executivo:</p>
                      <p className="text-gray-700 mt-1">{aiSummary.resumo_executivo}</p>
                    </div>
                    {aiSummary.problemas_recorrentes?.length > 0 && (
                      <div>
                        <p className="font-medium text-red-900">🔴 Problemas Recorrentes:</p>
                        <ul className="list-disc ml-4 text-gray-700 mt-1">
                          {aiSummary.problemas_recorrentes.map((p, i) => <li key={i}>{p}</li>)}
                        </ul>
                      </div>
                    )}
                    {aiSummary.evolucao_cliente && (
                      <div>
                        <p className="font-medium text-green-900">📈 Evolução do Cliente:</p>
                        <p className="text-gray-700 mt-1">{aiSummary.evolucao_cliente}</p>
                      </div>
                    )}
                    {aiSummary.recomendacoes?.length > 0 && (
                      <div>
                        <p className="font-medium text-blue-900">💡 Recomendações:</p>
                        <ul className="list-disc ml-4 text-gray-700 mt-1">
                          {aiSummary.recomendacoes.map((r, i) => <li key={i}>{r}</li>)}
                        </ul>
                      </div>
                    )}
                    {aiSummary.pontos_atencao?.length > 0 && (
                      <div>
                        <p className="font-medium text-orange-900">⚠️ Pontos de Atenção:</p>
                        <ul className="list-disc ml-4 text-gray-700 mt-1">
                          {aiSummary.pontos_atencao.map((p, i) => <li key={i}>{p}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => handleRequestSave("rascunho")}
            disabled={loading}
            variant="outline"
          >
            Salvar Rascunho
          </Button>
          <Button
            onClick={() => handleRequestSave("finalizada")}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? "Gerando..." : "Finalizar ATA"}
          </Button>
        </div>

        <AtaSaveConfirmDialog
          open={showConfirmDialog}
          onOpenChange={setShowConfirmDialog}
          formData={formData}
          workshop={workshop}
          status={pendingSaveStatus}
          loading={loading}
          onConfirm={() => handleSave(pendingSaveStatus)}
        />
      </DialogContent>
    </Dialog>
  );
}