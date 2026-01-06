import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Copy, Search } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import ProposalTemplateForm from "./ProposalTemplateForm";

const CARGO_CATEGORIES = [
  "Todos",
  "Mecânico",
  "Eletricista",
  "Funileiro",
  "Pintor",
  "Consultor de Vendas",
  "Borracheiro",
  "Estoque",
  "Financeiro",
  "Administrativo",
  "Gerencial",
  "Comercial/Telemarketing",
  "Lavador"
];

export default function ProposalTemplatesManager({ open, onClose, workshopId, onSelectTemplate }) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCargo, setSelectedCargo] = useState("Todos");
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['proposal-templates', workshopId],
    queryFn: async () => {
      const result = await base44.entities.JobProposalTemplate.filter({ 
        is_active: true
      });
      return Array.isArray(result) ? result.filter(t => !workshopId || t.workshop_id === workshopId) : [];
    },
    enabled: !!workshopId && open
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.JobProposalTemplate.update(id, { is_active: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-templates'] });
      toast.success("Template removido");
    }
  });

  const duplicateTemplateMutation = useMutation({
    mutationFn: async (template) => {
      const { id, created_date, updated_date, created_by, ...data } = template;
      return await base44.entities.JobProposalTemplate.create({
        ...data,
        template_name: `${data.template_name} (Cópia)`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-templates'] });
      toast.success("Template duplicado");
    }
  });

  const filteredTemplates = templates.filter(t => {
    const matchSearch = t.template_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       t.position?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCargo = selectedCargo === "Todos" || t.position?.toLowerCase().includes(selectedCargo.toLowerCase());
    return matchSearch && matchCargo;
  });

  const handleNewTemplate = () => {
    setEditingTemplate(null);
    setShowForm(true);
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setShowForm(true);
  };

  const handleSelectTemplate = (template) => {
    if (onSelectTemplate) {
      onSelectTemplate(template);
      onClose();
    }
  };

  if (showForm) {
    return (
      <ProposalTemplateForm
        open={open}
        onClose={() => {
          setShowForm(false);
          setEditingTemplate(null);
        }}
        onBack={() => setShowForm(false)}
        template={editingTemplate}
        workshopId={workshopId}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>📋 Gerenciar Templates de Proposta</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={handleNewTemplate}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Template
            </Button>
          </div>

          <div className="flex gap-2 flex-wrap">
            {CARGO_CATEGORIES.map(cargo => (
              <Button
                key={cargo}
                size="sm"
                variant={selectedCargo === cargo ? "default" : "outline"}
                onClick={() => setSelectedCargo(cargo)}
              >
                {cargo}
              </Button>
            ))}
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-gray-500">Carregando templates...</div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">Nenhum template encontrado</p>
              <Button onClick={handleNewTemplate} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Template
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredTemplates.map(template => (
                <Card key={template.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{template.template_name}</h3>
                        <Badge variant="outline">{template.position}</Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                        <div>
                          <p className="font-medium">Salário Base:</p>
                          <p>R$ {template.fixed_salary?.toLocaleString('pt-BR')}</p>
                        </div>
                        <div>
                          <p className="font-medium">Modelo:</p>
                          <p>{template.contract_type?.toUpperCase()} - {template.work_model}</p>
                        </div>
                      </div>

                      {template.benefits && template.benefits.length > 0 && (
                        <div className="text-sm">
                          <p className="font-medium text-gray-700 mb-1">Benefícios:</p>
                          <div className="flex gap-2 flex-wrap">
                            {template.benefits.slice(0, 3).map((b, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {b.name}
                              </Badge>
                            ))}
                            {template.benefits.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{template.benefits.length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 ml-4">
                      {onSelectTemplate && (
                        <Button
                          size="sm"
                          onClick={() => handleSelectTemplate(template)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Usar
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditTemplate(template)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => duplicateTemplateMutation.mutate(template)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (confirm('Tem certeza que deseja remover este template?')) {
                            deleteTemplateMutation.mutate(template.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}