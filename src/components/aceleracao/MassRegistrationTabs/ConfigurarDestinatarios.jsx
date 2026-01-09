import React, { useState, useMemo, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, Users, Plus, X, Trash2, Info } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

export default function ConfigurarDestinatarios({ 
  selectedIds, 
  onSelectionChange, 
  workshops = [] 
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [groupSearchTerm, setGroupSearchTerm] = useState("");
  const [selectedPlans, setSelectedPlans] = useState([]);
  const [savedGroups, setSavedGroups] = useState([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [presetGroups, setPresetGroups] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem("client-groups");
    if (saved) setPresetGroups(JSON.parse(saved));
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

  const getGroupFeedback = (groupIds) => {
    const plansInGroup = {};
    let totalClients = 0;
    groupIds.forEach(id => {
      const w = workshops.find(ws => ws.id === id);
      if (w) {
        const plan = w.planoAtual || "FREE";
        plansInGroup[plan] = (plansInGroup[plan] || 0) + 1;
        totalClients++;
      }
    });
    const plansList = Object.entries(plansInGroup).map(([plan, count]) => `${plan} (${count})`).join(", ");
    return { totalClients, plansList, plansInGroup };
  };

  const createGroup = () => {
    if (!groupName.trim()) {
      toast.error("Nome do grupo obrigatório");
      return;
    }
    if (selectedIds.length === 0) {
      toast.error("Selecione ao menos um cliente");
      return;
    }
    const feedback = getGroupFeedback(selectedIds);
    const newGroup = {
      id: Date.now(),
      name: groupName,
      clientIds: selectedIds,
      createdAt: new Date().toLocaleDateString("pt-BR"),
      feedback: `${feedback.totalClients} cliente(s) - ${feedback.plansList}`
    };
    setSavedGroups([...savedGroups, newGroup]);
    setGroupName("");
    setShowCreateGroup(false);
    toast.success(`Grupo "${newGroup.name}" criado com sucesso!`);
  };

  const filteredSavedGroups = savedGroups.filter(g => 
    g.name.toLowerCase().includes(groupSearchTerm.toLowerCase())
  );

  const deleteGroup = (id) => {
    setSavedGroups(savedGroups.filter(g => g.id !== id));
    toast.success("Grupo deletado");
  };

  return (
    <div className="space-y-6">
      {/* Criar novo grupo */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-sm">Criar Grupo de Destinatários</p>
            <p className="text-xs text-gray-600 mt-1">
              {selectedIds.length} cliente(s) selecionado(s)
            </p>
          </div>
          <Button
            type="button"
            onClick={() => setShowCreateGroup(true)}
            disabled={selectedIds.length === 0}
            className="bg-green-600 hover:bg-green-700"
            size="sm"
          >
            <Plus className="w-3 h-3 mr-1" />
            Criar Grupo
          </Button>
        </div>
      </div>

      {/* Grupos criados nesta sessão */}
      {savedGroups.length > 0 && (
        <div className="space-y-3">
          <div>
            <Label className="text-sm font-medium mb-2 block">Grupos Criados</Label>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar grupo..."
                value={groupSearchTerm}
                onChange={(e) => setGroupSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="grid gap-2">
            {filteredSavedGroups.length > 0 ? (
              filteredSavedGroups.map(group => (
                <div key={group.id} className="p-3 border rounded-lg bg-gray-50 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{group.name}</p>
                      <p className="text-xs text-gray-600 mt-1">{group.createdAt}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => loadGroup(group)}
                      >
                        Carregar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteGroup(group.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="bg-white rounded p-2 text-xs text-gray-700">
                    <p className="font-medium mb-1">📊 Composição:</p>
                    <p>{group.feedback}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-500 text-center py-2">Nenhum grupo encontrado</p>
            )}
          </div>
        </div>
      )}

      {/* Grupos de configuração anterior */}
      {presetGroups.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Grupos Configurados</Label>
          <div className="flex flex-wrap gap-2">
            {presetGroups.map(group => (
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
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm font-medium text-blue-900">
            ✓ {selectedIds.length} cliente(s) selecionado(s)
          </p>
        </div>
      )}

      {/* Dialog para criar grupo */}
      <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Criar Novo Grupo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Nome do Grupo</Label>
              <Input
                placeholder="Ex: Imersão SP - Janeiro"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                autoFocus
              />
            </div>
            <p className="text-xs text-gray-600">
              Este grupo conterá {selectedIds.length} cliente(s)
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateGroup(false)}>
              Cancelar
            </Button>
            <Button onClick={createGroup} className="bg-green-600 hover:bg-green-700">
              Criar Grupo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}