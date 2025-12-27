import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function ITFormDialog({ open, onClose, onSubmit, it, mapCode, isLoading }) {
  const [formData, setFormData] = useState({
    code: "",
    title: "",
    description: "",
    execution_steps: [],
    status: "rascunho"
  });

  useEffect(() => {
    if (it) {
      setFormData({
        code: it.code,
        title: it.title,
        description: it.description || "",
        execution_steps: it.execution_steps || [],
        status: it.status || "rascunho"
      });
    } else if (mapCode) {
      setFormData(prev => ({ ...prev, code: `${mapCode}.01` }));
    }
  }, [it, mapCode, open]);

  const addStep = () => {
    setFormData(prev => ({
      ...prev,
      execution_steps: [
        ...(prev.execution_steps || []),
        { step: (prev.execution_steps?.length || 0) + 1, description: "", responsible: "", estimated_time: "", tools_required: [] }
      ]
    }));
  };

  const updateStep = (index, field, value) => {
    const newSteps = [...formData.execution_steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setFormData(prev => ({ ...prev, execution_steps: newSteps }));
  };

  const removeStep = (index) => {
    setFormData(prev => ({
      ...prev,
      execution_steps: prev.execution_steps.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.code || !formData.title) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{it ? "Editar IT" : "Nova IT"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Código *</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="Ex: IT01.01"
                required
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={v => setFormData({...formData, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rascunho">Rascunho</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="revisao">Revisão</SelectItem>
                  <SelectItem value="obsoleto">Obsoleto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Título *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Abertura de Ordem de Serviço"
              required
            />
          </div>
          <div>
            <Label>Descrição (Como Executar)</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
            />
          </div>
          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-3">
              <Label className="text-base">Passos de Execução</Label>
              <Button type="button" size="sm" onClick={addStep}>
                <Plus className="w-4 h-4 mr-1" /> Adicionar Passo
              </Button>
            </div>
            {formData.execution_steps?.map((step, idx) => (
              <div key={idx} className="bg-gray-50 p-3 rounded mb-2 relative">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="absolute right-1 top-1"
                  onClick={() => removeStep(idx)}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
                <div className="grid grid-cols-2 gap-2 pr-8">
                  <div className="col-span-2">
                    <Label className="text-xs">Passo {idx + 1}</Label>
                    <Textarea
                      value={step.description}
                      onChange={(e) => updateStep(idx, 'description', e.target.value)}
                      placeholder="Descrição do passo..."
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Responsável</Label>
                    <Input
                      value={step.responsible}
                      onChange={(e) => updateStep(idx, 'responsible', e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Tempo Estimado</Label>
                    <Input
                      value={step.estimated_time}
                      onChange={(e) => updateStep(idx, 'estimated_time', e.target.value)}
                      placeholder="Ex: 10 min"
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar IT
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}