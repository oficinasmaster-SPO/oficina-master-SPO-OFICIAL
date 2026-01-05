import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function FormTypeManager({ open, onClose, customTypes, onSave }) {
  const [newType, setNewType] = useState({ key: "", label: "" });
  const [types, setTypes] = useState(customTypes || []);

  const addType = () => {
    if (!newType.key || !newType.label) {
      toast.error("Preencha todos os campos");
      return;
    }
    
    const key = newType.key.toLowerCase().replace(/\s+/g, '_');
    if (types.find(t => t.key === key)) {
      toast.error("Este tipo já existe");
      return;
    }

    setTypes([...types, { key, label: newType.label }]);
    setNewType({ key: "", label: "" });
  };

  const removeType = (key) => {
    setTypes(types.filter(t => t.key !== key));
  };

  const handleSave = () => {
    onSave(types);
    toast.success("Tipos salvos!");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Gerenciar Tipos de Formulário</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Identificador</Label>
              <Input
                value={newType.key}
                onChange={(e) => setNewType({...newType, key: e.target.value})}
                placeholder="ex: tecnico_mecanica"
              />
            </div>
            <div>
              <Label>Nome de Exibição</Label>
              <Input
                value={newType.label}
                onChange={(e) => setNewType({...newType, label: e.target.value})}
                placeholder="ex: Técnico de Mecânica"
              />
            </div>
          </div>
          <Button onClick={addType} size="sm" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Tipo
          </Button>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Tipos Cadastrados</h4>
            <div className="space-y-2">
              {types.map((type) => (
                <div key={type.key} className="flex items-center justify-between p-2 border rounded">
                  <Badge>{type.label}</Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeType(type.key)}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}