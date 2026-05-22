import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, ChevronRight, ChevronDown, Save } from "lucide-react";
import { toast } from "sonner";

export default function HierarquiaOrcamentaria({ workshopId }) {
  const [grupos, setGrupos] = useState([]);
  const [novoGrupo, setNovoGrupo] = useState({ name: '', type: 'despesa', color: '#000000' });
  const queryClient = useQueryClient();

  const { data: gruposExistentes } = useQuery({
    queryKey: ['budgetGroups', workshopId],
    queryFn: async () => {
      return await base44.entities.BudgetGroup.filter({
        workshop_id: workshopId,
        ativo: true
      }, 'order');
    }
  });

  const createMutation = useMutation({
    mutationFn: async (grupo) => {
      return await base44.entities.BudgetGroup.create({
        ...grupo,
        workshop_id: workshopId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['budgetGroups']);
      toast.success("Grupo criado com sucesso!");
      setNovoGrupo({ name: '', type: 'despesa', color: '#000000' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (grupoId) => {
      await base44.entities.BudgetGroup.delete(grupoId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['budgetGroups']);
      toast.success("Grupo removido!");
    }
  });

  const handleAddGrupo = () => {
    if (!novoGrupo.name) {
      toast.error("Nome do grupo é obrigatório");
      return;
    }
    createMutation.mutate(novoGrupo);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">📁 Hierarquia Orçamentária</h3>

      {/* Formulário de novo grupo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Novo Grupo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Nome</Label>
              <Input
                value={novoGrupo.name}
                onChange={(e) => setNovoGrupo(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Receitas, Despesas Operacionais"
              />
            </div>
            <div>
              <Label>Tipo</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2"
                value={novoGrupo.type}
                onChange={(e) => setNovoGrupo(prev => ({ ...prev, type: e.target.value }))}
              >
                <option value="receita">Receita</option>
                <option value="despesa">Despesa</option>
                <option value="custo">Custo</option>
              </select>
            </div>
            <div>
              <Label>Cor</Label>
              <Input
                type="color"
                value={novoGrupo.color}
                onChange={(e) => setNovoGrupo(prev => ({ ...prev, color: e.target.value }))}
                className="w-full h-10"
              />
            </div>
          </div>
          <Button onClick={handleAddGrupo} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Grupo
          </Button>
        </CardContent>
      </Card>

      {/* Lista de grupos */}
      <div className="space-y-2">
        {gruposExistentes?.map((grupo) => (
          <Card key={grupo.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: grupo.color }}
                  />
                  <div>
                    <p className="font-semibold">{grupo.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Tipo: {grupo.type} • {grupo.itens_count || 0} itens
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(grupo.id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}