import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function SaveGroupDialog({ open, onOpenChange, selectedClients, onSave, isLoading }) {
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");

  const handleSave = () => {
    if (!groupName.trim()) {
      alert("Nome do grupo é obrigatório");
      return;
    }
    onSave({
      name: groupName,
      description: groupDescription
    });
    setGroupName("");
    setGroupDescription("");
  };

  const handleOpenChange = (newOpen) => {
    if (!newOpen) {
      setGroupName("");
      setGroupDescription("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Salvar Grupo de Clientes</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome do Grupo *</Label>
            <Input
              placeholder="Ex: Clientes GOLD São Paulo"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea
              placeholder="Qual a composição deste grupo? Ex: Clientes de SP com plano GOLD iniciados em 2025"
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm">
            <p className="font-medium">Resumo:</p>
            <p className="text-gray-700">{selectedClients.length} cliente(s) serão adicionados a este grupo</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || !groupName.trim()}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar Grupo"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}