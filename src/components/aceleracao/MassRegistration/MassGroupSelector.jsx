import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import GroupFilters from "../MassRegistrationTabs/GroupFilters";
import { Checkbox } from "@/components/ui/checkbox";

export default function MassGroupSelector({ selectedGroupId, onGroupSelect, selectedClients, onClientsChange }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [groupFilters, setGroupFilters] = useState({});
  const [selectedPlans, setSelectedPlans] = useState([]);

  // Carregar workshops
  const { data: workshops = [] } = useQuery({
    queryKey: ["workshops-mass"],
    queryFn: async () => {
      const all = await base44.entities.Workshop.list();
      return all.filter(w => w.planoAtual && w.planoAtual !== "FREE");
    }
  });

  // Carregar grupos salvos
  const { data: savedGroups = [] } = useQuery({
    queryKey: ["client-groups-mass"],
    queryFn: async () => {
      const groups = await base44.entities.ClientGroup.filter({ is_active: true });
      return Array.isArray(groups) ? groups : [];
    }
  });

  const filteredWorkshops = workshops.filter(w => {
    const matchSearch = w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       w.city.toLowerCase().includes(searchTerm.toLowerCase());
    const matchPlans = selectedPlans.length === 0 || selectedPlans.includes(w.planoAtual);
    return matchSearch && matchPlans;
  });

  const filteredGroups = savedGroups.filter(g =>
    g.name.toLowerCase().includes(groupFilters.name?.toLowerCase() || "")
  );

  return (
    <div className="space-y-6">
      {/* Seleção por Grupos Salvos */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Grupos Salvos</Label>
        <GroupFilters
          filters={groupFilters}
          onFilterChange={setGroupFilters}
          onClear={() => setGroupFilters({})}
        />
        <div className="grid gap-2 max-h-48 overflow-y-auto">
          {filteredGroups.length > 0 ? (
            filteredGroups.map(group => (
              <div
                key={group.id}
                className="p-3 border rounded-lg cursor-pointer hover:bg-blue-50 transition"
                onClick={() => onGroupSelect(group.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{group.name}</p>
                    <p className="text-xs text-gray-600 mt-1">{group.description}</p>
                  </div>
                  <div className="text-xs text-gray-500">{group.client_ids.length} clientes</div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-gray-500 text-center py-4">Nenhum grupo encontrado</p>
          )}
        </div>
      </div>

      <div className="border-t pt-6">
        {/* Seleção por Planos */}
        <Label className="text-base font-semibold mb-3 block">Ou Selecione por Plano</Label>
        <div className="flex gap-2 mb-4 flex-wrap">
          {["START", "BRONZE", "PRATA", "GOLD", "IOM", "MILLIONS"].map(plan => (
            <Button
              key={plan}
              type="button"
              variant={selectedPlans.includes(plan) ? "default" : "outline"}
              size="sm"
              onClick={() => {
                const newPlans = selectedPlans.includes(plan)
                  ? selectedPlans.filter(p => p !== plan)
                  : [...selectedPlans, plan];
                setSelectedPlans(newPlans);
              }}
            >
              {plan}
            </Button>
          ))}
        </div>

        {/* Busca de workshops */}
        <div className="mb-3">
          <Input
            placeholder="Buscar por nome ou cidade..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Lista de workshops */}
        <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-3 bg-gray-50">
          {filteredWorkshops.length > 0 ? (
            filteredWorkshops.map(workshop => (
              <div key={workshop.id} className="flex items-center gap-2 p-2 hover:bg-white rounded">
                <Checkbox
                  checked={selectedClients.includes(workshop.id)}
                  onCheckedChange={(checked) => {
                    const newClients = checked
                      ? [...selectedClients, workshop.id]
                      : selectedClients.filter(id => id !== workshop.id);
                    onClientsChange(newClients);
                  }}
                />
                <div className="flex-1 text-xs">
                  <p className="font-medium">{workshop.name}</p>
                  <p className="text-gray-600">{workshop.city} • {workshop.planoAtual}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-gray-500 text-center py-4">Nenhum cliente encontrado</p>
          )}
        </div>

        {selectedClients.length > 0 && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded text-sm">
            ✓ {selectedClients.length} cliente(s) selecionado(s)
          </div>
        )}
      </div>
    </div>
  );
}