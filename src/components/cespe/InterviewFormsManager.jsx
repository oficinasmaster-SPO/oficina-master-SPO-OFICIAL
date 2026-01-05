import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import InterviewFormsList from "./InterviewFormsList";
import InterviewFormEditor from "./InterviewFormEditor";

export default function InterviewFormsManager({ open, onClose, workshopId, onSelectForm }) {
  const [activeTab, setActiveTab] = useState("list");
  const [editingForm, setEditingForm] = useState(null);

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

  const handleCreateNew = () => {
    setEditingForm(null);
    setActiveTab("editor");
  };

  const handleEdit = (form) => {
    setEditingForm(form);
    setActiveTab("editor");
  };

  const handleSaveComplete = () => {
    setActiveTab("list");
    setEditingForm(null);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Perguntas Poderosas de Entrevista (PPE)</span>
            <Button onClick={handleCreateNew} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Novo Formulário
            </Button>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="list">Meus Formulários</TabsTrigger>
            <TabsTrigger value="editor">
              {editingForm ? "Editar Formulário" : "Novo Formulário"}
            </TabsTrigger>
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
            <InterviewFormEditor
              form={editingForm}
              workshopId={workshopId}
              onSaveComplete={handleSaveComplete}
              onCancel={() => setActiveTab("list")}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}