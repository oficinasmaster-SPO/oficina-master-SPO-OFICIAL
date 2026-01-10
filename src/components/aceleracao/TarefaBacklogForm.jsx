import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function TarefaBacklogForm({ tarefa, user, workshops, onCancel, onSuccess }) {
  const [formData, setFormData] = useState({
    cliente_id: tarefa?.cliente_id || '',
    cliente_nome: tarefa?.cliente_nome || '',
    consultor_id: tarefa?.consultor_id || user?.id,
    consultor_nome: tarefa?.consultor_nome || user?.full_name,
    titulo: tarefa?.titulo || '',
    descricao: tarefa?.descricao || '',
    origem: tarefa?.origem || 'manual',
    prazo: tarefa?.prazo || '',
    prioridade: tarefa?.prioridade || 'media',
    status: tarefa?.status || 'aberta',
    impacto: tarefa?.impacto || 'entrega',
    tempo_estimado_horas: tarefa?.tempo_estimado_horas || 0,
    motivo_bloqueio: tarefa?.motivo_bloqueio || '',
    notas: tarefa?.notas || ''
  });

  const { data: usuarios = [] } = useQuery({
    queryKey: ['usuarios-consultores'],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.filter(u => u.role === 'admin') || [];
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
    onSuccess: () => {
      toast.success(tarefa?.id ? 'Tarefa atualizada!' : 'Tarefa criada!');
      onSuccess();
    },
    onError: (error) => {
      toast.error('Erro ao salvar tarefa');
      console.error(error);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.titulo || !formData.cliente_id || !formData.consultor_id || !formData.prazo) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    saveMutation.mutate(formData);
  };

  const handleClienteChange = (workshopId) => {
    const workshop = workshops.find(w => w.id === workshopId);
    setFormData({
      ...formData,
      cliente_id: workshopId,
      cliente_nome: workshop?.name || ''
    });
  };

  const handleConsultorChange = (userId) => {
    const usuario = usuarios.find(u => u.id === userId);
    setFormData({
      ...formData,
      consultor_id: userId,
      consultor_nome: usuario?.full_name || ''
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <CardTitle>{tarefa ? 'Editar Tarefa' : 'Nova Tarefa no Backlog'}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
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

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Label>Cliente *</Label>
              <Select value={formData.cliente_id} onValueChange={handleClienteChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {workshops.map(w => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Consultor Responsável *</Label>
              <Select value={formData.consultor_id} onValueChange={handleConsultorChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o consultor" />
                </SelectTrigger>
                <SelectContent>
                  {usuarios.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            <div>
              <Label>Origem *</Label>
              <Select value={formData.origem} onValueChange={(value) => setFormData({...formData, origem: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reuniao">Reunião</SelectItem>
                  <SelectItem value="contrato">Contrato</SelectItem>
                  <SelectItem value="pedido">Pedido</SelectItem>
                  <SelectItem value="diagnostico">Diagnóstico</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Prioridade *</Label>
              <Select value={formData.prioridade} onValueChange={(value) => setFormData({...formData, prioridade: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="critica">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Status *</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aberta">Aberta</SelectItem>
                  <SelectItem value="em_execucao">Em Execução</SelectItem>
                  <SelectItem value="bloqueada">Bloqueada</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Impacto</Label>
              <Select value={formData.impacto} onValueChange={(value) => setFormData({...formData, impacto: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="financeiro">Financeiro</SelectItem>
                  <SelectItem value="entrega">Entrega</SelectItem>
                  <SelectItem value="satisfacao">Satisfação</SelectItem>
                  <SelectItem value="multiplo">Múltiplo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
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

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Salvando...' : tarefa ? 'Atualizar' : 'Criar Tarefa'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}