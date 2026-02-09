import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, FileText, Trash2, Edit2 } from "lucide-react";
import { toast } from "sonner";

export default function FormulariosTab() {
  const [forms, setForms] = useState([]);
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingForm, setEditingForm] = useState(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");

  const saveForm = () => {
    if (!formName.trim()) {
      toast.error("Nome do formulário obrigatório");
      return;
    }

    if (editingForm) {
      setForms(forms.map(f => f.id === editingForm.id ? { ...editingForm, name: formName, description: formDescription } : f));
      toast.success("Formulário atualizado");
    } else {
      const newForm = { id: Date.now(), name: formName, description: formDescription, responses: [] };
      setForms([...forms, newForm]);
      toast.success("Formulário criado");
    }

    setFormName("");
    setFormDescription("");
    setShowFormDialog(false);
    setEditingForm(null);
  };

  const deleteForm = (id) => {
    setForms(forms.filter(f => f.id !== id));
    toast.success("Formulário deletado");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Formulários de Evento/Treinamento</h3>
          <p className="text-xs text-gray-600 mt-1">Crie formulários para capturar participantes e gerar grupos automáticos</p>
        </div>
        <Button onClick={() => setShowFormDialog(true)} size="sm" className="bg-blue-600">
          <Plus className="w-3 h-3 mr-2" />
          Novo
        </Button>
      </div>

      {forms.length > 0 ? (
        <div className="grid gap-3">
          {forms.map(form => (
            <Card key={form.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{form.name}</p>
                    <p className="text-xs text-gray-600 mt-1">{form.description}</p>
                    <p className="text-xs text-gray-500 mt-2">{form.responses.length} resposta(s)</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingForm(form);
                        setFormName(form.name);
                        setFormDescription(form.description);
                        setShowFormDialog(true);
                      }}
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteForm(form.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 border rounded-lg bg-gray-50">
          <FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p className="text-sm text-gray-600">Nenhum formulário criado</p>
        </div>
      )}

      <Dialog open={showFormDialog} onOpenChange={setShowFormDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingForm ? "Editar" : "Novo"} Formulário</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Nome</label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ex: Imersão Janeiro 2026" />
            </div>
            <div>
              <label className="text-sm font-medium">Descrição</label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Descrição e objetivos do formulário..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFormDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={saveForm} className="bg-blue-600">
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}