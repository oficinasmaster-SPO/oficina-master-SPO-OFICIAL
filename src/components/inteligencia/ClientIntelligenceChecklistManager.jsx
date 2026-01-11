import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { Plus, X, GripVertical, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { INTELLIGENCE_AREAS } from "@/components/lib/clientIntelligenceConstants";

export default function ClientIntelligenceChecklistManager({
  open,
  onOpenChange,
  area: defaultArea,
  type,
  workshopId,
  onChecklistCreated
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedArea, setSelectedArea] = useState(defaultArea || "");
  const [items, setItems] = useState([]);
  const [newItemLabel, setNewItemLabel] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleAddItem = () => {
    if (!newItemLabel.trim()) return;

    setItems([
      ...items,
      {
        id: `item_${Date.now()}`,
        label: newItemLabel,
        order: items.length
      }
    ]);
    setNewItemLabel("");
  };

  const handleRemoveItem = (itemId) => {
    setItems(items.filter(i => i.id !== itemId).map((item, idx) => ({ ...item, order: idx })));
  };

  const handleSaveChecklist = async () => {
    if (!title.trim() || items.length === 0) {
      toast.error("Preencha o título e adicione pelo menos um item");
      return;
    }

    setIsLoading(true);
    try {
      await base44.entities.ClientIntelligenceChecklist.create({
        workshop_id: workshopId,
        area,
        type,
        title,
        description,
        items: items.map((item, idx) => ({
          id: item.id,
          label: item.label,
          order: idx
        })),
        is_default: false,
        status: "ativo"
      });

      toast.success("Checklist criado com sucesso");
      resetForm();
      onOpenChange(false);
      onChecklistCreated?.();
    } catch (error) {
      toast.error("Erro ao criar checklist");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setItems([]);
    setNewItemLabel("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Criar/Editar Checklist</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Título */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1 block">
              Nome do Checklist
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Validação de Causa-Raiz"
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1 block">
              Descrição (opcional)
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o propósito deste checklist"
              className="h-20"
            />
          </div>

          {/* Items */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">
              Items do Checklist
            </label>

            <div className="space-y-2 mb-4 max-h-48 overflow-y-auto bg-gray-50 p-3 rounded-lg">
              {items.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  Nenhum item adicionado
                </p>
              ) : (
                items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 bg-white p-2 rounded border border-gray-200"
                  >
                    <GripVertical className="w-4 h-4 text-gray-400" />
                    <span className="flex-1 text-sm text-gray-700">{item.label}</span>
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-1 hover:bg-red-100 rounded transition-colors"
                    >
                      <X className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Adicionar novo item */}
            <div className="flex gap-2">
              <Input
                value={newItemLabel}
                onChange={(e) => setNewItemLabel(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAddItem()}
                placeholder="Digite o item e pressione Enter"
              />
              <Button
                variant="outline"
                onClick={handleAddItem}
                className="px-3"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSaveChecklist}
            disabled={isLoading}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar Checklist"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}