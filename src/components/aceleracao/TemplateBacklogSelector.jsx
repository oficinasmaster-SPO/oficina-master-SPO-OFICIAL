import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Search, Plus } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export default function TemplateBacklogSelector({ isOpen, onClose, onSelect, workshopId }) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    titulo: '',
    descricao: '',
    prioridade: 'media',
    impacto: 'entrega',
    categoria: ''
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['template-backlog', workshopId],
    queryFn: async () => {
      const allTemplates = await base44.entities.TemplateBacklog.filter({
        ativo: true
      });
      
      // Filtrar: templates gerais OU específicos do workshop
      return allTemplates.filter(t => !t.workshop_id || t.workshop_id === workshopId);
    },
    enabled: isOpen
  });

  const filtered = templates.filter(t =>
    t.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.categoria?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.descricao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TemplateBacklog.create(data),
    onSuccess: () => {
      toast.success('Template criado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['template-backlog', workshopId] });
      setShowCreateForm(false);
      setNewTemplate({
        titulo: '',
        descricao: '',
        prioridade: 'media',
        impacto: 'entrega',
        categoria: ''
      });
    },
    onError: () => {
      toast.error('Erro ao criar template');
    }
  });

  const handleSelect = (template) => {
    onSelect({
      titulo: template.titulo,
      descricao: template.descricao,
      prioridade: template.prioridade,
      impacto: template.impacto
    });
    onClose();
  };

  const handleCreateTemplate = (e) => {
    e.preventDefault();
    if (!newTemplate.titulo || !newTemplate.descricao) {
      toast.error('Título e descrição são obrigatórios');
      return;
    }
    createMutation.mutate(newTemplate);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Selecionar Template de Tarefa</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por título, categoria ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowCreateForm(true)}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Criar
            </Button>
          </div>

          <ScrollArea className="h-[400px] border rounded-lg p-4">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <Search className="w-8 h-8 mb-2 opacity-50" />
                <p>Nenhum template encontrado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleSelect(template)}
                    className="w-full p-4 border rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all text-left"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{template.titulo}</h3>
                        <p className="text-sm text-gray-600 line-clamp-2">{template.descricao}</p>
                        <div className="flex gap-2 mt-2">
                          {template.categoria && (
                            <Badge variant="outline">{template.categoria}</Badge>
                          )}
                          <Badge className="bg-blue-100 text-blue-700">{template.prioridade}</Badge>
                          {template.impacto && (
                            <Badge className="bg-purple-100 text-purple-700">{template.impacto}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Form de Criação Rápida */}
        {showCreateForm && (
          <div className="border-t pt-4 mt-4">
            <h3 className="font-semibold mb-3">Criar Novo Template</h3>
            <form onSubmit={handleCreateTemplate} className="space-y-3">
              <div>
                <Label className="text-xs">Título *</Label>
                <Input
                  placeholder="Ex: Diagnosticar Processo de Vendas"
                  value={newTemplate.titulo}
                  onChange={(e) => setNewTemplate({...newTemplate, titulo: e.target.value})}
                  className="text-sm"
                />
              </div>

              <div>
                <Label className="text-xs">Descrição *</Label>
                <Textarea
                  placeholder="Descrição detalhada da tarefa..."
                  value={newTemplate.descricao}
                  onChange={(e) => setNewTemplate({...newTemplate, descricao: e.target.value})}
                  rows={3}
                  className="text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Categoria</Label>
                  <Input
                    placeholder="Ex: Processos"
                    value={newTemplate.categoria}
                    onChange={(e) => setNewTemplate({...newTemplate, categoria: e.target.value})}
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Prioridade</Label>
                  <Select value={newTemplate.prioridade} onValueChange={(value) => setNewTemplate({...newTemplate, prioridade: value})}>
                    <SelectTrigger className="text-sm h-9">
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
                <Label className="text-xs">Impacto</Label>
                <Select value={newTemplate.impacto} onValueChange={(value) => setNewTemplate({...newTemplate, impacto: value})}>
                  <SelectTrigger className="text-sm h-9">
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

              <div className="flex gap-2 justify-end pt-2">
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  size="sm"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? 'Criando...' : 'Criar'}
                </Button>
              </div>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}