import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

export default function TemplateBacklogManager() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    prioridade: 'media',
    impacto: 'entrega',
    categoria: '',
    ativo: true
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['templates-backlog-all'],
    queryFn: () => base44.entities.TemplateBacklog.list()
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editingTemplate?.id) {
        return await base44.entities.TemplateBacklog.update(editingTemplate.id, data);
      }
      return await base44.entities.TemplateBacklog.create(data);
    },
    onSuccess: () => {
      toast.success(editingTemplate ? 'Template atualizado!' : 'Template criado!');
      queryClient.invalidateQueries({ queryKey: ['templates-backlog-all'] });
      resetForm();
    },
    onError: () => {
      toast.error('Erro ao salvar template');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (templateId) => base44.entities.TemplateBacklog.delete(templateId),
    onSuccess: () => {
      toast.success('Template removido!');
      queryClient.invalidateQueries({ queryKey: ['templates-backlog-all'] });
    },
    onError: () => {
      toast.error('Erro ao remover template');
    }
  });

  const resetForm = () => {
    setFormData({
      titulo: '',
      descricao: '',
      prioridade: 'media',
      impacto: 'entrega',
      categoria: '',
      ativo: true
    });
    setEditingTemplate(null);
    setShowForm(false);
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      titulo: template.titulo,
      descricao: template.descricao,
      prioridade: template.prioridade,
      impacto: template.impacto,
      categoria: template.categoria || '',
      ativo: template.ativo
    });
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.titulo || !formData.descricao) {
      toast.error('Título e descrição são obrigatórios');
      return;
    }
    saveMutation.mutate(formData);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Gerenciar Templates de Tarefas</CardTitle>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Template
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {templates.length === 0 ? (
            <p className="text-gray-500 text-center py-6">Nenhum template criado ainda</p>
          ) : (
            templates.map((template) => (
              <div key={template.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold">{template.titulo}</h3>
                    <p className="text-sm text-gray-600 mt-1">{template.descricao}</p>
                    <div className="flex gap-2 mt-3">
                      {template.categoria && (
                        <Badge variant="outline">{template.categoria}</Badge>
                      )}
                      <Badge className="bg-blue-100 text-blue-700">{template.prioridade}</Badge>
                      {template.impacto && (
                        <Badge className="bg-purple-100 text-purple-700">{template.impacto}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(template)}>
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(template.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Editar Template' : 'Novo Template de Tarefa'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Título *</Label>
              <Input
                value={formData.titulo}
                onChange={(e) => setFormData({...formData, titulo: e.target.value})}
                placeholder="Ex: Diagnosticar Processo de Vendas"
              />
            </div>

            <div>
              <Label>Descrição *</Label>
              <Textarea
                value={formData.descricao}
                onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                placeholder="Descrição padrão da tarefa..."
                rows={4}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Categoria</Label>
                <Input
                  value={formData.categoria}
                  onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                  placeholder="Ex: Processos, RH, Comercial"
                />
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

            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}