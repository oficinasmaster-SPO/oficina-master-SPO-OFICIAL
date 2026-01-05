import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, CheckSquare, Save, X } from "lucide-react";
import { toast } from "sonner";
import ChecklistEditor from "@/components/cespe/ChecklistEditor";

const jobRoleLabels = {
  tecnico: "Técnico/Mecânico",
  vendas: "Vendas/Consultor",
  telemarketing: "Telemarketing/Atendimento",
  estoque: "Estoque/Logística",
  financeiro: "Financeiro",
  administrativo: "Administrativo",
  gerente: "Gerente/Supervisor",
  outros: "Outros"
};

const checklistTypeLabels = {
  conhecimento_tecnico: "Conhecimento Técnico",
  experiencia_pratica: "Experiência Prática",
  capacidade_diagnostico: "Capacidade de Diagnóstico",
  habilidades_vendas: "Habilidades de Vendas",
  atendimento_cliente: "Atendimento ao Cliente",
  organizacao: "Organização",
  financeiro: "Financeiro",
  custom: "Customizado"
};

export default function GerenciarChecklists() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  React.useEffect(() => {
    const loadData = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      const workshops = await base44.entities.Workshop.filter({ owner_id: currentUser.id });
      if (workshops && workshops.length > 0) {
        setWorkshop(workshops[0]);
      }
    };
    loadData();
  }, []);

  const { data: templates = [] } = useQuery({
    queryKey: ['checklist-templates', workshop?.id],
    queryFn: async () => {
      if (!workshop?.id) return [];
      const result = await base44.entities.ChecklistTemplate.filter({ workshop_id: workshop.id });
      return Array.isArray(result) ? result : [];
    },
    enabled: !!workshop?.id
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editingTemplate?.id) {
        return await base44.entities.ChecklistTemplate.update(editingTemplate.id, data);
      } else {
        return await base44.entities.ChecklistTemplate.create({ ...data, workshop_id: workshop.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-templates'] });
      toast.success("Checklist salvo!");
      setEditingTemplate(null);
      setIsCreating(false);
    },
    onError: (error) => {
      toast.error(error?.message || "Erro ao salvar");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return await base44.entities.ChecklistTemplate.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-templates'] });
      toast.success("Checklist excluído");
    },
    onError: (error) => {
      toast.error(error?.message || "Erro ao excluir");
    }
  });

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setIsCreating(false);
  };

  const handleCreate = () => {
    setEditingTemplate({
      template_name: "",
      job_role: "tecnico",
      checklist_type: "conhecimento_tecnico",
      items: [],
      description: "",
      is_active: true
    });
    setIsCreating(true);
  };

  const handleSave = () => {
    if (!editingTemplate.template_name.trim()) {
      toast.error("Digite o nome do checklist");
      return;
    }
    if (!editingTemplate.items || editingTemplate.items.length === 0) {
      toast.error("Adicione pelo menos um item ao checklist");
      return;
    }
    saveMutation.mutate(editingTemplate);
  };

  const handleCancel = () => {
    setEditingTemplate(null);
    setIsCreating(false);
  };

  if (!workshop) {
    return <div className="p-6">Carregando...</div>;
  }

  if (editingTemplate) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">
            {isCreating ? "Criar Novo Checklist" : "Editar Checklist"}
          </h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              <Save className="w-4 h-4 mr-2" />
              {saveMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <Label>Nome do Checklist</Label>
              <Input
                value={editingTemplate.template_name}
                onChange={(e) => setEditingTemplate({...editingTemplate, template_name: e.target.value})}
                placeholder="Ex: Checklist Técnico Mecânico Senior"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cargo</Label>
                <select
                  value={editingTemplate.job_role}
                  onChange={(e) => setEditingTemplate({...editingTemplate, job_role: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  {Object.entries(jobRoleLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Tipo de Checklist</Label>
                <select
                  value={editingTemplate.checklist_type}
                  onChange={(e) => setEditingTemplate({...editingTemplate, checklist_type: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  {Object.entries(checklistTypeLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={editingTemplate.description}
                onChange={(e) => setEditingTemplate({...editingTemplate, description: e.target.value})}
                placeholder="Descreva quando usar este checklist..."
                rows={2}
              />
            </div>

            <div className="border-t pt-4">
              <Label className="text-lg font-semibold">Itens do Checklist</Label>
              <ChecklistEditor
                items={editingTemplate.items}
                onChange={(items) => setEditingTemplate({...editingTemplate, items})}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gerenciar Checklists de Avaliação</h1>
          <p className="text-gray-600">Crie checklists personalizados por cargo para as entrevistas</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Checklist
        </Button>
      </div>

      <div className="grid gap-4">
        {templates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckSquare className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 mb-4">Nenhum checklist criado ainda</p>
              <Button onClick={handleCreate}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Checklist
              </Button>
            </CardContent>
          </Card>
        ) : (
          templates.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {template.template_name}
                      {!template.is_active && (
                        <Badge variant="outline">Inativo</Badge>
                      )}
                    </CardTitle>
                    <div className="flex gap-2 mt-2">
                      <Badge className="bg-blue-100 text-blue-800">
                        {jobRoleLabels[template.job_role]}
                      </Badge>
                      <Badge className="bg-purple-100 text-purple-800">
                        {checklistTypeLabels[template.checklist_type]}
                      </Badge>
                      <Badge variant="outline">
                        {template.items?.length || 0} itens
                      </Badge>
                    </div>
                    {template.description && (
                      <p className="text-sm text-gray-600 mt-2">{template.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(template)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (confirm("Tem certeza que deseja excluir este checklist?")) {
                          deleteMutation.mutate(template.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}