import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Award } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import InterviewFormsList from "./InterviewFormsList";
import InterviewFormEditor from "./InterviewFormEditor";
import LeadScoreFormEditor from "./LeadScoreFormEditor";
import ChecklistManager from "./ChecklistManager";

export default function InterviewFormsManager({ open, onClose, workshopId, onSelectForm }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("list");
  const [editingForm, setEditingForm] = useState(null);
  const [editingLeadScore, setEditingLeadScore] = useState(false);
  const [editingChecklist, setEditingChecklist] = useState(null);
  const [isCreatingChecklist, setIsCreatingChecklist] = useState(false);

  const { data: forms = [] } = useQuery({
    queryKey: ['interview-forms', workshopId],
    queryFn: async () => {
      if (!workshopId) return [];
      const result = await base44.entities.InterviewForm.filter({
        workshop_id: workshopId
      });
      return Array.isArray(result) ? result : [];
    },
    enabled: !!workshopId && open
  });

  const createDefaultFormMutation = useMutation({
    mutationFn: async () => {
      return await base44.functions.invoke('createDefaultLeadScoreForm', {
        workshop_id: workshopId
      });
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['interview-forms'] });
      setEditingForm(response.data.form);
      setEditingLeadScore(true);
      setActiveTab("editor");
      toast.success("Formulário Lead Score criado!");
    },
    onError: (error) => {
      toast.error(error?.message || "Erro ao criar formulário padrão");
    }
  });

  const updateChecklistsMutation = useMutation({
    mutationFn: async (formId) => {
      const response = await base44.functions.invoke('updateLeadScoreWithChecklists', {
        form_id: formId
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview-forms'] });
      toast.success("Formulário atualizado com checklists!");
    },
    onError: (error) => {
      toast.error(error?.message || "Erro ao atualizar");
    }
  });

  const handleCreateNew = () => {
    setEditingForm(null);
    setEditingLeadScore(false);
    setActiveTab("editor");
  };

  const handleCreateLeadScore = () => {
    createDefaultFormMutation.mutate();
  };

  const handleEdit = (form) => {
    setEditingForm(form);
    setEditingLeadScore(form.is_lead_score_form || false);
    setActiveTab("editor");
  };

  const handleSaveComplete = () => {
    setActiveTab("list");
    setEditingForm(null);
    setEditingLeadScore(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Perguntas Poderosas de Entrevista (PPE)</span>
            <div className="flex gap-2">
              <Button 
                onClick={handleCreateLeadScore} 
                size="sm"
                className="bg-green-600 hover:bg-green-700"
                disabled={createDefaultFormMutation.isPending}
              >
                <Award className="w-4 h-4 mr-2" />
                {createDefaultFormMutation.isPending ? "Criando..." : "Lead Score"}
              </Button>
              {forms && forms.length > 0 && (
                <Button 
                  onClick={() => {
                    const leadScoreForm = forms.find(f => f.is_lead_score_form);
                    if (leadScoreForm) {
                      updateChecklistsMutation.mutate(leadScoreForm.id);
                    } else {
                      toast.error("Nenhum formulário Lead Score encontrado");
                    }
                  }}
                  disabled={updateChecklistsMutation.isPending}
                  size="sm"
                  variant="outline"
                >
                  🔄 Atualizar Checklists
                </Button>
              )}
              <Button onClick={handleCreateNew} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Novo Formulário
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="list">Meus Formulários</TabsTrigger>
            <TabsTrigger value="editor">
              {editingForm ? "Editar Formulário" : "Novo Formulário"}
            </TabsTrigger>
            <TabsTrigger value="checklists">Gerenciar Checklists</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-6">
            <InterviewFormsList
              forms={forms}
              onEdit={handleEdit}
              workshopId={workshopId}
              onSelect={onSelectForm}
            />
          </TabsContent>

          <TabsContent value="editor" className="mt-6">
            {editingLeadScore ? (
              <LeadScoreFormEditor
                form={editingForm}
                workshopId={workshopId}
                onSaveComplete={handleSaveComplete}
                onCancel={() => setActiveTab("list")}
              />
            ) : (
              <InterviewFormEditor
                form={editingForm}
                workshopId={workshopId}
                onSaveComplete={handleSaveComplete}
                onCancel={() => setActiveTab("list")}
              />
            )}
          </TabsContent>

          <TabsContent value="checklists" className="mt-6">
            <ChecklistManager workshopId={workshopId} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}