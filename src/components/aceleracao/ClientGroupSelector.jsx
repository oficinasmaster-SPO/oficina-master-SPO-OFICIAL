import React, { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, X, ChevronDown, Save, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function ClientGroupSelector({ 
  selectedIds = [], 
  onSelectionChange,
  workshops = []
}) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [showSaveGroup, setShowSaveGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupPresets, setGroupPresets] = useState([]);

  // Buscar grupos salvos do localStorage
  React.useEffect(() => {
    const saved = localStorage.getItem("client-groups");
    if (saved) setGroupPresets(JSON.parse(saved));
  }, []);

  const filteredWorkshops = useMemo(() => {
    return workshops.filter(w => 
      w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.city.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, workshops]);

  const toggleClient = (workshopId) => {
    onSelectionChange(
      selectedIds.includes(workshopId)
        ? selectedIds.filter(id => id !== workshopId)
        : [...selectedIds, workshopId]
    );
  };

  const saveGroup = () => {
    if (!groupName.trim()) {
      toast.error("Nome do grupo é obrigatório");
      return;
    }
    
    const newGroup = {
      id: Date.now(),
      name: groupName,
      clientIds: selectedIds
    };
    
    const updated = [...groupPresets, newGroup];
    localStorage.setItem("client-groups", JSON.stringify(updated));
    setGroupPresets(updated);
    setGroupName("");
    setShowSaveGroup(false);
    toast.success(`Grupo "${groupName}" salvo com sucesso!`);
  };

  const deleteGroup = (groupId) => {
    const updated = groupPresets.filter(g => g.id !== groupId);
    localStorage.setItem("client-groups", JSON.stringify(updated));
    setGroupPresets(updated);
    toast.success("Grupo deletado");
  };

  const loadGroup = (group) => {
    onSelectionChange(group.clientIds);
    toast.success(`Grupo "${group.name}" carregado`);
  };

  return (
    <div className="space-y-4">
      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Buscar clientes por nome ou cidade..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Clientes selecionados em resumo */}
      {selectedIds.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-900">
              {selectedIds.length} cliente(s) selecionado(s)
            </span>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setShowSaveGroup(true)}
                className="h-7 text-xs"
              >
                <Save className="w-3 h-3 mr-1" />
                Salvar Grupo
              </Button>
            </div>
          </div>
          
          {/* Grupos salvos como botões */}
          {groupPresets.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-600 font-medium">Grupos Salvos:</p>
              <div className="flex flex-wrap gap-2">
                {groupPresets.map(group => (
                  <div key={group.id} className="relative group/btn">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        setExpandedGroup(expandedGroup === group.id ? null : group.id);
                      }}
                    >
                      <ChevronDown className={`w-3 h-3 mr-1 transition ${expandedGroup === group.id ? 'rotate-180' : ''}`} />
                      {group.name} ({group.clientIds.length})
                    </Button>

                    {/* Menu de ações */}
                    <div className="absolute right-0 top-8 hidden group-hover/btn:flex flex-col bg-white border rounded shadow-lg z-10">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs justify-start rounded-none"
                        onClick={() => loadGroup(group)}
                      >
                        Carregar
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs justify-start text-red-600 rounded-none"
                        onClick={() => deleteGroup(group.id)}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Deletar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expandir grupo para ver clientes */}
          {expandedGroup && (
            <div className="mt-3 p-2 bg-white border rounded text-xs max-h-40 overflow-y-auto">
              <p className="font-medium mb-2">
                {groupPresets.find(g => g.id === expandedGroup)?.name}:
              </p>
              <div className="flex flex-wrap gap-1">
                {groupPresets.find(g => g.id === expandedGroup)?.clientIds.map(id => {
                  const w = workshops.find(ws => ws.id === id);
                  return w ? (
                    <Badge key={id} variant="outline" className="text-xs">
                      {w.name}
                    </Badge>
                  ) : null;
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lista de clientes filtrados */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto border rounded-lg p-3 bg-gray-50">
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
            </label>
          ))
        ) : (
          <p className="col-span-2 text-center text-sm text-gray-500 py-4">
            Nenhum cliente encontrado
          </p>
        )}
      </div>

      {/* Modal para salvar grupo */}
      <Dialog open={showSaveGroup} onOpenChange={setShowSaveGroup}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Salvar Grupo de Clientes</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Nome do Grupo</label>
              <Input
                placeholder="Ex: Clientes SP - Janeiro"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                autoFocus
              />
            </div>
            <p className="text-xs text-gray-600">
              Este grupo contém {selectedIds.length} cliente(s) e poderá ser reutilizado futuramente.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveGroup(false)}>
              Cancelar
            </Button>
            <Button onClick={saveGroup} className="bg-blue-600 hover:bg-blue-700">
              Salvar Grupo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}