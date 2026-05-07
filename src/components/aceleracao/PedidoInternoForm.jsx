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

export default function PedidoInternoForm({ pedido, user, usuarios, onCancel, onSuccess }) {
  const [formData, setFormData] = useState({
    tipo: pedido?.tipo || 'apoio_tecnico',
    titulo: pedido?.titulo || '',
    descricao: pedido?.descricao || '',
    solicitante_id: pedido?.solicitante_id || user?.id,
    solicitante_nome: pedido?.solicitante_nome || user?.full_name,
    responsavel_id: pedido?.responsavel_id || '',
    responsavel_nome: pedido?.responsavel_nome || '',
    cliente_id: pedido?.cliente_id || '',
    cliente_nome: pedido?.cliente_nome || '',
    prazo: pedido?.prazo || '',
    status: pedido?.status || 'pendente',
    prioridade: pedido?.prioridade || 'media',
    impacto_cliente: pedido?.impacto_cliente || 'medio',
    resposta: pedido?.resposta || ''
  });

  const { data: workshops = [] } = useQuery({
    queryKey: ['workshops-select'],
    queryFn: async () => {
      const all = await base44.entities.Workshop.list();
      return all || [];
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (pedido?.id) {
        return await base44.entities.PedidoInterno.update(pedido.id, data);
      }
      return await base44.entities.PedidoInterno.create(data);
    },
    onSuccess: () => {
      toast.success(pedido?.id ? 'Pedido atualizado!' : 'Pedido criado!');
      onSuccess();
    },
    onError: (error) => {
      toast.error('Erro ao salvar pedido');
      console.error(error);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.titulo || !formData.responsavel_id || !formData.prazo) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    saveMutation.mutate(formData);
  };

  const handleResponsavelChange = (userId) => {
    const usuario = usuarios.find(u => u.id === userId);
    setFormData({
      ...formData,
      responsavel_id: userId,
      responsavel_nome: usuario?.full_name || ''
    });
  };

  const handleClienteChange = (workshopId) => {
    const workshop = workshops.find(w => w.id === workshopId);
    setFormData({
      ...formData,
      cliente_id: workshopId,
      cliente_nome: workshop?.name || ''
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
                  <SelectItem value="apoio_tecnico">Apoio Técnico</SelectItem>
                  <SelectItem value="decisao_estrategica">Decisão Estratégica</SelectItem>
                  <SelectItem value="liberacao_material">Liberação de Material</SelectItem>
                  <SelectItem value="excecao_escopo">Exceção de Escopo</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
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
              <Select value={formData.responsavel_id} onValueChange={handleResponsavelChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o responsável" />
                </SelectTrigger>
                <SelectContent>
                  {usuarios.filter(u => u.role === 'admin').map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Cliente Relacionado</Label>
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
                  <SelectItem value="nenhum">Nenhum</SelectItem>
                  <SelectItem value="baixo">Baixo</SelectItem>
                  <SelectItem value="medio">Médio</SelectItem>
                  <SelectItem value="alto">Alto</SelectItem>
                  <SelectItem value="critico">Crítico</SelectItem>
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
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="em_analise">Em Análise</SelectItem>
                    <SelectItem value="aprovado">Aprovado</SelectItem>
                    <SelectItem value="recusado">Recusado</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
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