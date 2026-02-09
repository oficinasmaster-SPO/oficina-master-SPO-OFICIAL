import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, X, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ClientGroupForm({ group, workshops = [], onSave, onCancel }) {
  const [name, setName] = useState(group?.name || "");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState(group?.clientIds || []);

  const filteredWorkshops = useMemo(() => {
    return workshops.filter(w =>
      w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.city.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, workshops]);

  const toggleClient = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    if (!name.trim()) {
      alert("Nome do grupo é obrigatório");
      return;
    }
    if (selectedIds.length === 0) {
      alert("Selecione pelo menos um cliente");
      return;
    }
    onSave({ name: name.trim(), clientIds: selectedIds });
  };

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {group ? "Editar Grupo" : "Criar Novo Grupo"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Nome do Grupo */}
          <div className="space-y-2">
            <Label>Nome do Grupo *</Label>
            <Input
              placeholder="Ex: Clientes SP - Janeiro"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Seleção de Clientes */}
          <div className="space-y-3">
            <Label>Selecionar Clientes *</Label>

            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por nome ou cidade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Lista de clientes */}
            <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto border rounded-lg p-3 bg-gray-50">
              {filteredWorkshops.length > 0 ? (
                filteredWorkshops.map(w => (
                  <label
                    key={w.id}
                    className="flex items-center gap-3 p-2 border rounded cursor-pointer hover:bg-white transition"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(w.id)}
                      onChange={() => toggleClient(w.id)}
                      className="w-4 h-4"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{w.name}</p>
                      <p className="text-xs text-gray-600">{w.city}, {w.state}</p>
                    </div>
                    <Badge variant="outline" className="text-xs flex-shrink-0">
                      {w.planoAtual}
                    </Badge>
                  </label>
                ))
              ) : (
                <p className="text-center text-sm text-gray-500 py-4">
                  Nenhum cliente encontrado
                </p>
              )}
            </div>

            {/* Resumo de seleção */}
            {selectedIds.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm font-medium text-blue-900 mb-2">
                  {selectedIds.length} cliente(s) selecionado(s)
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedIds.map(id => {
                    const w = workshops.find(ws => ws.id === id);
                    return w ? (
                      <Badge key={id} variant="secondary" className="gap-2">
                        {w.name}
                        <X
                          className="w-3 h-3 cursor-pointer"
                          onClick={() => toggleClient(id)}
                        />
                      </Badge>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
            <Save className="w-4 h-4 mr-2" />
            {group ? "Atualizar Grupo" : "Criar Grupo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}