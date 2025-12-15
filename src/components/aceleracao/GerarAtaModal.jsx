import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Save, FileText } from "lucide-react";
import { toast } from "sonner";

export default function GerarAtaModal({ atendimento, workshop, planoAceleracao, onClose, onSaved }) {
  const [loading, setLoading] = useState(false);
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
    visao_geral_projeto: ""
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const user = await base44.auth.me();
      
      const participantesIniciais = [
        { name: user.full_name || user.email, role: "Consultor/Acelerador" }
      ];

      if (atendimento?.participantes && Array.isArray(atendimento.participantes)) {
        participantesIniciais.push(...atendimento.participantes);
      }

      setFormData(prev => ({
        ...prev,
        consultor_name: user.full_name || user.email,
        consultor_id: user.id,
        participantes: participantesIniciais,
        responsavel: {
          name: workshop?.owner_name || workshop?.name || "",
          role: "Proprietário"
        },
        plano_nome: planoAceleracao?.nome || planoAceleracao?.titulo || "Plano de Aceleração",
        visao_geral_projeto: planoAceleracao?.status_atual || planoAceleracao?.descricao || ""
      }));
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
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

  const addProximoPasso = () => {
    setFormData(prev => ({
      ...prev,
      proximos_passos: [...(prev.proximos_passos || []), { descricao: "", responsavel: "", prazo: "" }]
    }));
  };

  const removeProximoPasso = (index) => {
    setFormData(prev => ({
      ...prev,
      proximos_passos: (prev.proximos_passos || []).filter((_, i) => i !== index)
    }));
  };

  const updateProximoPasso = (index, field, value) => {
    const updated = [...(formData.proximos_passos || [])];
    updated[index] = {...updated[index], [field]: value};
    setFormData(prev => ({ ...prev, proximos_passos: updated }));
  };

  const handleSave = async (status = "rascunho") => {
    if (!formData.meeting_date || !formData.meeting_time) {
      toast.error("Preencha data e hora da reunião");
      return;
    }

    setLoading(true);
    try {
      const ataCount = await base44.entities.MeetingMinutes.list();
      const code = `IT.${String(ataCount.length + 1).padStart(4, '0')}`;

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
        proximos_passos: (formData.proximos_passos || []).filter(p => p.descricao),
        visao_geral_projeto: formData.visao_geral_projeto,
        status
      };

      console.log("Salvando ATA com dados:", ataData);
      const newAta = await base44.entities.MeetingMinutes.create(ataData);
      console.log("ATA criada:", newAta);

      if (atendimento?.id) {
        await base44.entities.ConsultoriaAtendimento.update(atendimento.id, {
          ata_id: newAta.id,
          ata_gerada: true
        });
      }

      toast.success("ATA salva com sucesso!");
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
              <Textarea
                placeholder="Direcionamento estratégico do acelerador, foco técnico ou gerencial..."
                value={formData.objetivos_consultor}
                onChange={(e) => setFormData({...formData, objetivos_consultor: e.target.value})}
                rows={4}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">4. Próximos Passos</h3>
                <Button size="sm" onClick={addProximoPasso}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar
                </Button>
              </div>
              {(formData.proximos_passos || []).map((passo, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="Descrição da ação"
                    value={passo.descricao || ""}
                    onChange={(e) => updateProximoPasso(index, 'descricao', e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Responsável"
                    value={passo.responsavel || ""}
                    onChange={(e) => updateProximoPasso(index, 'responsavel', e.target.value)}
                    className="w-40"
                  />
                  <Input
                    type="date"
                    value={passo.prazo || ""}
                    onChange={(e) => updateProximoPasso(index, 'prazo', e.target.value)}
                    className="w-40"
                  />
                  <Button size="icon" variant="destructive" onClick={() => removeProximoPasso(index)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
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
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => handleSave("rascunho")}
            disabled={loading}
            variant="outline"
          >
            Salvar Rascunho
          </Button>
          <Button
            onClick={() => handleSave("finalizada")}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? "Gerando..." : "Finalizar ATA"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}