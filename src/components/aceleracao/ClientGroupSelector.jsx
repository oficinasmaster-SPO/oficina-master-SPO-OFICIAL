import React, { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, X, ChevronDown } from "lucide-react";
import { toast } from "sonner";

export default function ClientGroupSelector({ 
  selectedIds = [], 
  onSelectionChange,
  workshops = []
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [groupPresets, setGroupPresets] = useState([]);

  // Carregar grupos salvos do localStorage
  useEffect(() => {
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

      {/* Grupos salvos */}
      {groupPresets.length > 0 && (
        <div className="bg-gray-50 border rounded-lg p-3 space-y-2">
          <p className="text-xs text-gray-600 font-medium">Grupos Salvos:</p>
          <div className="flex flex-wrap gap-2">
            {groupPresets.map(group => (
              <Button
                key={group.id}
                type="button"
                variant="secondary"
                size="sm"
                className="text-xs"
                onClick={() => loadGroup(group)}
                title={`Carregar: ${group.name} (${group.clientIds.length} clientes)`}
              >
                {group.name} ({group.clientIds.length})
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Resumo seleção atual */}
      {selectedIds.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm font-medium text-blue-900 mb-2">
            {selectedIds.length} cliente(s) selecionado(s)
          </p>
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


    </div>
  );
}