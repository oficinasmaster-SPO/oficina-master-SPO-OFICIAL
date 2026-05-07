import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Search, Plus, Edit2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

// Templates padrão do sistema
const TEMPLATES_PADRAO = [
  {
    id: 'template-ppr',
    titulo: "Liberação do curso PPR na Quizify",
    descricao: "Garantir que o cliente tenha acesso completo ao curso PPR na plataforma Quizify.",
    prioridade: "media",
    impacto: "entrega",
    passos: [
      "Validar se o acesso foi liberado corretamente",
      "Confirmar se o cliente conseguiu logar na plataforma",
      "Validar se ele está conseguindo navegar e utilizar 100%",
      "Solicitar um print do acesso ao curso e anexar na tarefa como evidência",
      "Confirmar se o cliente irá participar do Acelera Time",
      "Orientar o cliente sobre o horário de atendimento (horário comercial) para suporte",
      "Reforçar que, caso vá reunir a equipe, deve se antecipar caso precise de ajuda"
    ]
  },
  {
    id: 'template-posvenda',
    titulo: "Pós-venda — Percepção do cliente",
    descricao: "Entrar em contato com o cliente para entender a percepção dele sobre o projeto/programa e identificar oportunidades de melhoria.",
    prioridade: "alta",
    impacto: "satisfacao",
    passos: [
      "Entrar em contato com o cliente (ligação ou WhatsApp)",
      "Perguntar como está a experiência com o programa",
      "Entender o que ele mais gostou até agora",
      "Identificar pontos de melhoria ou insatisfação",
      "Perguntar como podemos contribuir mais com o resultado dele",
      "Registrar feedback detalhado na tarefa",
      "Sinalizar possíveis riscos ou oportunidades para o time"
    ]
  },
  {
    id: 'template-suporte',
    titulo: "Suporte da consultoria",
    descricao: "Atender o cliente de forma consultiva, entendendo profundamente sua necessidade e direcionando a melhor solução.",
    prioridade: "media",
    impacto: "satisfacao",
    passos: [
      "Entrar em contato com o cliente",
      "Escutar ativamente a demanda",
      "Utilizar o Mapa 3D (Dor, Dúvida, Desejo)",
      "Aplicar os 5 porquês para encontrar a raiz do problema",
      "Registrar detalhadamente a necessidade",
      "🔧 SUPORTE DE TI: Entrar em contato via ligação ou WhatsApp",
      "🔧 Se necessário, realizar call via Meet",
      "🔧 Gravar a call",
      "🔧 Ajudar o cliente com acesso, plataforma ou dificuldades técnicas",
      "📈 SUPORTE DE TRÁFEGO: Agendar reunião com o cliente",
      "📈 Realizar call via Meet",
      "📈 Gravar a reunião",
      "📈 Tirar dúvidas da equipe",
      "📈 Alinhar estratégia e execução de tráfego"
    ]
  }
];

export default function TemplateBacklogSelector({ isOpen, onClose, onSelect, workshopId }) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
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
      try {
        const allTemplates = await base44.entities.TemplateBacklog.filter({
          ativo: true
        });
        
        // Filtrar: templates gerais OU específicos do workshop
        const resultado = allTemplates.filter(t => !t.workshop_id || t.workshop_id === workshopId);
        
        // Se não houver, usar templates padrão
        return resultado.length > 0 ? resultado : TEMPLATES_PADRAO;
      } catch {
        // Se BD falhar, usar templates padrão
        return TEMPLATES_PADRAO;
      }
    },
    enabled: isOpen
  });

  const filtered = templates.filter(t =>
    t.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.categoria?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.descricao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TemplateBacklog.create({
      ...data,
      ativo: true
    }),
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
    onError: (error) => {
      toast.error(error?.message || 'Erro ao criar template');
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.TemplateBacklog.update(data.id, {
      titulo: data.titulo,
      descricao: data.descricao,
      prioridade: data.prioridade,
      impacto: data.impacto,
      categoria: data.categoria
    }),
    onSuccess: () => {
      toast.success('Template atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['template-backlog', workshopId] });
      setEditingTemplate(null);
    },
    onError: (error) => {
      toast.error(error?.message || 'Erro ao atualizar template');
    }
  });

  const handleSelect = (template) => {
    onSelect({
      titulo: template.titulo,
      descricao: template.descricao,
      prioridade: template.prioridade,
      impacto: template.impacto,
      ...(template.passos && { notas: template.passos.join('\n• ') })
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

  const handleEditTemplate = (template) => {
    setEditingTemplate({ ...template });
  };

  const handleSaveTemplate = (e) => {
    e.preventDefault();
    if (!editingTemplate.titulo || !editingTemplate.descricao) {
      toast.error('Título e descrição são obrigatórios');
      return;
    }
    updateMutation.mutate(editingTemplate);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
        <DialogHeader>
          <DialogTitle>Selecionar Template de Tarefa</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-y-auto">
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
            {templates.length === 0 && !showCreateForm ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <Search className="w-8 h-8 mb-2 opacity-50" />
                <p>Nenhum template encontrado</p>
                <p className="text-xs mt-2">Clique em "Criar" para adicionar um novo</p>
              </div>
            ) : filtered.length === 0 && templates.length > 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <Search className="w-8 h-8 mb-2 opacity-50" />
                <p>Nenhum resultado para sua busca</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((template) => (
                  <div
                    key={template.id}
                    className="p-4 border rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <button
                        onClick={() => handleSelect(template)}
                        className="flex-1 text-left"
                      >
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
                      </button>
                      {template.id && !template.id.startsWith('template-') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditTemplate(template)}
                          className="gap-2 flex-shrink-0 hover:bg-amber-50 hover:border-amber-300"
                        >
                          <Edit2 className="w-4 h-4" />
                          <span className="hidden sm:inline text-xs">Editar</span>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Form de Edição */}
        {editingTemplate && (
          <div className="border-t pt-4 mt-4 max-h-[500px] overflow-y-auto bg-amber-50 p-4 rounded">
            <h3 className="font-semibold mb-3">Editar Template</h3>
            <form onSubmit={handleSaveTemplate} className="space-y-3">
              <div>
                <Label className="text-xs">Título *</Label>
                <Input
                  placeholder="Ex: Diagnosticar Processo de Vendas"
                  value={editingTemplate.titulo}
                  onChange={(e) => setEditingTemplate({...editingTemplate, titulo: e.target.value})}
                  className="text-sm"
                />
              </div>

              <div>
                <Label className="text-xs">Descrição *</Label>
                <Textarea
                  placeholder="Descrição detalhada da tarefa..."
                  value={editingTemplate.descricao}
                  onChange={(e) => setEditingTemplate({...editingTemplate, descricao: e.target.value})}
                  rows={3}
                  className="text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Categoria</Label>
                  <Input
                    placeholder="Ex: Processos"
                    value={editingTemplate.categoria || ''}
                    onChange={(e) => setEditingTemplate({...editingTemplate, categoria: e.target.value})}
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Prioridade</Label>
                  <Select value={editingTemplate.prioridade} onValueChange={(value) => setEditingTemplate({...editingTemplate, prioridade: value})}>
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
                <Select value={editingTemplate.impacto} onValueChange={(value) => setEditingTemplate({...editingTemplate, impacto: value})}>
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
                  onClick={() => setEditingTemplate(null)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  size="sm"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Form de Criação Rápida */}
        {showCreateForm && !createMutation.isPending && (
          <div className="border-t pt-4 mt-4 max-h-[500px] overflow-y-auto">
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