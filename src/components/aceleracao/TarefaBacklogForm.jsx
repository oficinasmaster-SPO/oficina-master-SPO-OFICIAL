import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Zap } from "lucide-react";
import { toast } from "sonner";
import TemplateBacklogSelector from "./TemplateBacklogSelector";
import { ORIGIN_OPTIONS, PRIORIDADE_OPTIONS, TAREFA_STATUS_OPTIONS, IMPACTO_OPTIONS } from "@/components/shared/backlogConstants";
import Combobox from "@/components/ui/combobox";

export default function TarefaBacklogForm({ tarefa, user, workshops: workshopsProp, workshopId, isFromAttendance = true, origemId, origemData, origemTitulo, onCancel, onSuccess, inline = false }) {
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

  // Busca workshops internamente se não recebeu como prop
  const { data: workshopsInternal = [] } = useQuery({
    queryKey: ['workshops-tarefa-form'],
    queryFn: async () => {
      const all = await base44.entities.Workshop.list();
      return all || [];
    },
    enabled: !workshopsProp || workshopsProp.length === 0,
  });

  const workshops = workshopsProp?.length > 0 ? workshopsProp : workshopsInternal;

  // Pré-seleciona cliente se workshopId foi passado
  const workshopPreSelecionado = workshopId ? workshops.find(w => w.id === workshopId) : null;

  const [formData, setFormData] = useState({
    workshop_id: tarefa?.workshop_id || workshopId || '',
    workshop_nome: tarefa?.workshop_nome || workshopPreSelecionado?.name || '',
    assignee_id: tarefa?.assignee_id || user?.id,
    assignee_name: tarefa?.assignee_name || user?.full_name,
    created_by_id: tarefa?.created_by_id || user?.id,
    assigned_to_id: tarefa?.assigned_to_id || user?.id,
    titulo: tarefa?.titulo || '',
    descricao: tarefa?.descricao || '',
    origin_type: tarefa?.origin_type || (origemId ? 'reuniao' : isFromAttendance ? 'reuniao' : 'manual'),
    origin_id: tarefa?.origin_id || origemId || '',
    origin_date: tarefa?.origin_date || origemData || '',
    origin_title: tarefa?.origin_title || origemTitulo || '',
    prazo: tarefa?.prazo || '',
    prioridade: tarefa?.prioridade || 'media',
    status: tarefa?.status || 'aberta',
    impacto: tarefa?.impacto || 'entrega',
    tempo_estimado_horas: tarefa?.tempo_estimado_horas || 0,
    motivo_bloqueio: tarefa?.motivo_bloqueio || '',
    notas: tarefa?.notas || ''
  });

  // Atualiza workshop_nome quando os workshops carregam (caso workshopId foi passado mas workshops ainda não tinham carregado)
  useEffect(() => {
    if (workshopId && !tarefa && formData.workshop_id === workshopId && !formData.workshop_nome) {
      const ws = workshops.find(w => w.id === workshopId);
      if (ws) setFormData(prev => ({ ...prev, workshop_nome: ws.name }));
    }
  }, [workshops, workshopId]);

  const { data: usuarios = [] } = useQuery({
    queryKey: ['employees-internal-consultores-tarefa'],
    queryFn: async () => {
      const employees = await base44.entities.Employee.filter({
        user_type: 'internal'
      }, 'full_name', 200);
      return (employees || []).filter(employee => employee.user_id && employee.full_name);
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (tarefa?.id) {
        if (data.status === 'concluida' && !data.data_conclusao) {
          data.data_conclusao = new Date().toISOString();
        }
        return await base44.entities.TarefaBacklog.update(tarefa.id, data);
      }
      return await base44.entities.TarefaBacklog.create(data);
    },
    onSuccess: (data) => {
      toast.success(tarefa?.id ? 'Tarefa atualizada!' : 'Tarefa criada!');
      onSuccess(data?.id);
    },
    onError: (error) => {
      toast.error('Erro ao salvar tarefa');
      console.error(error);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.titulo || !formData.workshop_id || !formData.assignee_id || !formData.prazo) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    saveMutation.mutate(formData);
  };

  const handleClienteChange = (workshopId) => {
    const workshop = workshops.find(w => w.id === workshopId);
    setFormData({
      ...formData,
      workshop_id: workshopId,
      workshop_nome: workshop?.name || ''
    });
  };

  const handleConsultorChange = (userId) => {
    const usuario = usuarios.find(u => u.user_id === userId);
    setFormData({
      ...formData,
      assignee_id: userId,
      assignee_name: usuario?.full_name || ''
    });
  };

  const handleTemplateSelect = (templateData) => {
    setFormData({
      ...formData,
      titulo: templateData.titulo,
      descricao: templateData.descricao,
      prioridade: templateData.prioridade,
      impacto: templateData.impacto
    });
    toast.success('Template aplicado com sucesso!');
  };

  // ── Header (compartilhado entre modal e inline) ──
  const header = (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onCancel} className="h-7 px-2">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm font-semibold text-gray-900">
          {tarefa ? 'Editar Tarefa' : 'Nova Tarefa no Backlog'}
        </span>
      </div>
      {!tarefa && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowTemplateSelector(true)}
          className="h-7 gap-1.5 text-xs"
        >
          <Zap className="w-3.5 h-3.5" />
          Usar Template
        </Button>
      )}
    </div>
  );

  const formFields = (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label>Título da Tarefa *</Label>
            <Input
              value={formData.titulo}
              onChange={(e) => setFormData({...formData, titulo: e.target.value})}
              placeholder="Ex: Implementar processo de vendas"
              required
            />
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea
              value={formData.descricao}
              onChange={(e) => setFormData({...formData, descricao: e.target.value})}
              placeholder="Descreva a tarefa..."
              rows={3}
            />
          </div>

          <div className={`grid ${inline ? 'grid-cols-1' : 'md:grid-cols-2'} gap-6`}>
            <div>
              <Label>Cliente *</Label>
              <Combobox
                value={formData.workshop_id}
                onChange={handleClienteChange}
                options={workshops.map(w => ({ value: w.id, label: w.name }))}
                placeholder="Selecione o cliente"
                searchPlaceholder="Pesquisar cliente..."
                emptyText="Nenhum cliente encontrado."
              />
            </div>

            <div>
              <Label>Consultor Responsável *</Label>
              <Combobox
                value={formData.assignee_id}
                onChange={handleConsultorChange}
                options={usuarios.map(usuario => ({
                  value: usuario.user_id,
                  label: usuario.full_name
                }))}
                placeholder="Selecione o consultor"
                searchPlaceholder="Pesquisar consultor..."
                emptyText="Nenhum consultor interno encontrado."
              />
            </div>
          </div>

          <div className={`grid ${inline ? 'grid-cols-1' : 'md:grid-cols-4'} gap-6`}>
            <div>
              <Label>Origem *</Label>
              <Combobox
                value={formData.origin_type}
                onChange={(v) => setFormData({...formData, origin_type: v})}
                options={ORIGIN_OPTIONS}
                placeholder="Selecione a origem"
              />
            </div>

            <div>
              <Label>Prioridade *</Label>
              <Combobox
                value={formData.prioridade}
                onChange={(v) => setFormData({...formData, prioridade: v})}
                options={PRIORIDADE_OPTIONS}
                placeholder="Selecione a prioridade"
              />
            </div>

            <div>
              <Label>Status *</Label>
              <Combobox
                value={formData.status}
                onChange={(v) => setFormData({...formData, status: v})}
                options={TAREFA_STATUS_OPTIONS}
                placeholder="Selecione o status"
              />
            </div>

            <div>
              <Label>Impacto</Label>
              <Combobox
                value={formData.impacto}
                onChange={(v) => setFormData({...formData, impacto: v})}
                options={IMPACTO_OPTIONS}
                placeholder="Selecione o impacto"
              />
            </div>
          </div>

          <div className={`grid ${inline ? 'grid-cols-1' : 'md:grid-cols-2'} gap-6`}>
            <div>
              <Label>Prazo *</Label>
              <Input
                type="date"
                value={formData.prazo}
                onChange={(e) => setFormData({...formData, prazo: e.target.value})}
                required
              />
            </div>

            <div>
              <Label>Tempo Estimado (horas) *</Label>
              <Input
                type="number"
                step="0.5"
                value={formData.tempo_estimado_horas}
                onChange={(e) => setFormData({...formData, tempo_estimado_horas: parseFloat(e.target.value) || 0})}
                placeholder="0"
                required
              />
              <p className="text-xs text-gray-600 mt-1">Obrigatório para calcular saturação real</p>
            </div>
          </div>

          {formData.status === 'bloqueada' && (
            <div>
              <Label>Motivo do Bloqueio</Label>
              <Textarea
                value={formData.motivo_bloqueio}
                onChange={(e) => setFormData({...formData, motivo_bloqueio: e.target.value})}
                placeholder="Descreva por que a tarefa está bloqueada..."
                rows={2}
              />
            </div>
          )}

          <div>
            <Label>Notas Adicionais</Label>
            <Textarea
              value={formData.notas}
              onChange={(e) => setFormData({...formData, notas: e.target.value})}
              placeholder="Informações adicionais sobre a tarefa..."
              rows={2}
            />
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Salvando...' : tarefa ? 'Atualizar' : 'Criar Tarefa'}
            </Button>
          </div>
        </form>
  );

  const templateSelector = (
    <TemplateBacklogSelector
      isOpen={showTemplateSelector}
      onClose={() => setShowTemplateSelector(false)}
      onSelect={handleTemplateSelect}
      workshopId={formData.workshop_id}
    />
  );

  // ── Modo inline (painel split) — scroll interno, sem Card ──
  if (inline) {
    return (
      <div className="flex h-full flex-col min-h-0 bg-white">
        <div className="shrink-0 border-b border-gray-100 px-5 py-3 bg-white">
          {header}
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
          {formFields}
        </div>
        {templateSelector}
      </div>
    );
  }

  // ── Modo modal (legado) — Card wrapper ──
  return (
    <Card>
      <CardHeader>
        {header}
      </CardHeader>
      <CardContent>
        {formFields}
      </CardContent>
      {templateSelector}
    </Card>
  );
}