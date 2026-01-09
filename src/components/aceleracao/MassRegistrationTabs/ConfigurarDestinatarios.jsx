import React, { useState, useMemo, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Users, Send, Mail, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export default function ConfigurarDestinatarios({ 
  selectedIds, 
  onSelectionChange, 
  workshops = [] 
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPlans, setSelectedPlans] = useState([]);
  const [groupPresets, setGroupPresets] = useState([]);
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);

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

  const workshopsByPlan = useMemo(() => {
    return workshops.reduce((acc, w) => {
      const plan = w.planoAtual || "FREE";
      if (!acc[plan]) acc[plan] = [];
      acc[plan].push(w);
      return acc;
    }, {});
  }, [workshops]);

  const toggleClient = (id) => {
    onSelectionChange(
      selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id]
    );
  };

  const selectPlan = (plan) => {
    const planIds = workshopsByPlan[plan]?.map(w => w.id) || [];
    setSelectedPlans(prev =>
      prev.includes(plan) ? prev.filter(p => p !== plan) : [...prev, plan]
    );
    onSelectionChange([...new Set([...selectedIds, ...planIds])]);
  };

  const loadGroup = (group) => {
    onSelectionChange(group.clientIds);
  };

  return (
    <div className="space-y-6">
      {/* Opções de envio */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
        <p className="font-medium text-sm">Enviar para:</p>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={sendWhatsApp} onCheckedChange={setSendWhatsApp} />
            <Send className="w-4 h-4" />
            <span className="text-sm">WhatsApp</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={sendEmail} onCheckedChange={setSendEmail} />
            <Mail className="w-4 h-4" />
            <span className="text-sm">Email</span>
          </label>
        </div>
      </div>

      {/* Grupos salvos */}
      {groupPresets.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Grupos Salvos</Label>
          <div className="flex flex-wrap gap-2">
            {groupPresets.map(group => (
              <Button
                key={group.id}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => loadGroup(group)}
                className="text-xs"
              >
                {group.name} ({group.clientIds.length})
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Filtro por plano */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Filtrar por Plano</Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {Object.keys(workshopsByPlan)
            .filter(p => p !== "FREE")
            .map(plan => (
              <label key={plan} className="flex items-center gap-2 cursor-pointer p-2 border rounded hover:bg-gray-50">
                <Checkbox 
                  checked={selectedPlans.includes(plan)} 
                  onCheckedChange={() => selectPlan(plan)}
                />
                <span className="text-xs font-medium">{plan}</span>
                <span className="text-xs text-gray-600">({workshopsByPlan[plan].length})</span>
              </label>
            ))}
        </div>
      </div>

      {/* Busca individual */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Ou Buscar Clientes</Label>
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar por nome ou cidade..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto border rounded-lg p-2 bg-gray-50">
          {filteredWorkshops.length > 0 ? (
            filteredWorkshops.map(w => (
              <label
                key={w.id}
                className="flex items-center gap-3 p-2 border rounded cursor-pointer hover:bg-white"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(w.id)}
                  onChange={() => toggleClient(w.id)}
                  className="w-4 h-4"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{w.name}</p>
                  <p className="text-xs text-gray-600">{w.city}</p>
                </div>
              </label>
            ))
          ) : (
            <p className="text-center text-xs text-gray-500 py-2">Nenhum cliente</p>
          )}
        </div>
      </div>

      {/* Resumo */}
      {selectedIds.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-sm font-medium text-green-900">
            ✓ {selectedIds.length} cliente(s) selecionado(s)
          </p>
        </div>
      )}
    </div>
  );
}