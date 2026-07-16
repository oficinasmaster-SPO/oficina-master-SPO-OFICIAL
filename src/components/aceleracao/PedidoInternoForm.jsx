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
import PedidoInternoMediaUpload from "./PedidoInternoMediaUpload";
import Combobox from "@/components/ui/combobox";
import { TIPO_PEDIDO_OPTIONS, PRIORIDADE_OPTIONS, PEDIDO_STATUS_OPTIONS, IMPACTO_CLIENTE_OPTIONS } from "@/components/shared/backlogConstants";

export default function PedidoInternoForm({ pedido, user, usuarios: usuariosProp = [], workshops: workshopsProp = [], clienteId = '', onCancel, onSuccess }) {
  // Pré-seleciona cliente se clienteId foi passado
  const clientePreSelecionado = clienteId && workshopsProp?.length > 0 
    ? workshopsProp.find(w => w.id === clienteId)
    : null;

  const [formData, setFormData] = useState({
    tipo: pedido?.tipo || 'apoio_tecnico',
    titulo: pedido?.titulo || '',
    descricao: pedido?.descricao || '',
    requester_id: pedido?.requester_id || user?.id,
    requester_name: pedido?.requester_name || user?.full_name,
    assignee_id: pedido?.assignee_id || '',
    assignee_name: pedido?.assignee_name || '',
    workshop_id: pedido?.workshop_id || clienteId || '',
    workshop_nome: pedido?.workshop_nome || clientePreSelecionado?.name || '',
    prazo: pedido?.prazo || '',
    status: pedido?.status || 'pendente',
    prioridade: pedido?.prioridade || 'media',
    impacto_cliente: pedido?.impacto_cliente || 'medio',
    resposta: pedido?.resposta || '',
    midias_anexas: pedido?.midias_anexas || []
  });

  // Busca sempre os employees internos para popular o select de responsável.
  // H2: Filtra apenas employees com user_id vinculado — assignee_id deve armazenar User.id.
  const { data: usuariosInternos = [] } = useQuery({
    queryKey: ['employees-internos-pedido'],
    queryFn: async () => {
      const employees = await base44.entities.Employee.filter({ user_type: 'internal' }, 'full_name', 200);
      return (employees || []).filter(e => e.full_name && e.user_id);
    },
  });

  const usuarios = usuariosInternos;

  // Busca workshops internamente se não recebeu como prop
  const { data: workshopsInternal = [] } = useQuery({
    queryKey: ['workshops-pedido-interno'],
    queryFn: async () => {
      const all = await base44.entities.Workshop.list();
      return all || [];
    },
    enabled: !workshopsProp || workshopsProp.length === 0,
  });

  const workshops = workshopsProp?.length > 0 ? workshopsProp : workshopsInternal;

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (pedido?.id) {
        return await base44.entities.PedidoInterno.update(pedido.id, data);
      }
      return await base44.entities.PedidoInterno.create(data);
    },
    onSuccess: (data) => {
      toast.success(pedido?.id ? 'Pedido atualizado!' : 'Pedido criado!');
      onSuccess(data?.id);
    },
    onError: (error) => {
      toast.error('Erro ao salvar pedido');
      console.error(error);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.titulo || !formData.assignee_id || !formData.prazo) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    saveMutation.mutate(formData);
  };

  // H2: assignee_id deve armazenar User.id (não Employee.id)
  const handleResponsavelChange = (userId) => {
    const emp = usuarios.find(u => u.user_id === userId);
    setFormData({
      ...formData,
      assignee_id: userId,
      assignee_name: emp?.full_name || ''
    });
  };

  const handleClienteChange = (workshopId) => {
    const workshop = workshops.find(w => w.id === workshopId);
    setFormData({
      ...formData,
      workshop_id: workshopId,
      workshop_nome: workshop?.name || ''
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <CardTitle>{pedido ? 'Editar Pedido Interno' : 'Novo Pedido Interno'}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Label>Tipo de Pedido *</Label>
              <Select value={formData.tipo} onValueChange={(value) => setFormData({...formData, tipo: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPO_PEDIDO_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
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
                  {PRIORIDADE_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Título do Pedido *</Label>
            <Input
              value={formData.titulo}
              onChange={(e) => setFormData({...formData, titulo: e.target.value})}
              placeholder="Ex: Solicitar aprovação de desconto especial"
              required
            />
          </div>

          <div>
            <Label>Descrição Detalhada</Label>
            <Textarea
              value={formData.descricao}
              onChange={(e) => setFormData({...formData, descricao: e.target.value})}
              placeholder="Descreva o pedido com todos os detalhes necessários..."
              rows={4}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Label>Responsável *</Label>
              <Select value={formData.assignee_id} onValueChange={handleResponsavelChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o responsável" />
                </SelectTrigger>
                <SelectContent>
                  {usuarios.map(u => (
                    <SelectItem key={u.user_id} value={u.user_id}>
                      {u.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Cliente Relacionado</Label>
              <Combobox
                value={formData.workshop_id}
                onChange={handleClienteChange}
                options={workshops.map(w => ({ value: w.id, label: w.name }))}
                placeholder="Selecione o cliente"
                searchPlaceholder="Pesquisar cliente..."
                emptyText="Nenhum cliente encontrado."
              />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
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
              <Label>Impacto no Cliente</Label>
              <Select value={formData.impacto_cliente} onValueChange={(value) => setFormData({...formData, impacto_cliente: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IMPACTO_CLIENTE_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {pedido && (
              <div>
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PEDIDO_STATUS_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {pedido && (
            <div>
              <Label>Resposta/Resolução</Label>
              <Textarea
                value={formData.resposta}
                onChange={(e) => setFormData({...formData, resposta: e.target.value})}
                placeholder="Descreva a resolução ou resposta ao pedido..."
                rows={3}
              />
            </div>
          )}

          <PedidoInternoMediaUpload
            medias={formData.midias_anexas}
            onMediasChange={(midias) => setFormData({...formData, midias_anexas: midias})}
          />

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Salvando...' : pedido ? 'Atualizar' : 'Criar Pedido'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}