import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Target, TrendingUp, Users, Send, CheckCircle, AlertCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function HiringGoalsManager({ open, onClose, workshopId }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [formData, setFormData] = useState({
    position: "",
    target_hires: 1,
    target_leads_per_day: 5,
    conversion_rate: 10,
    deadline: "",
    priority: "media",
    notes: ""
  });

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['hiring-goals', workshopId],
    queryFn: async () => {
      const result = await base44.entities.HiringGoal.filter({ 
        workshop_id: workshopId,
        status: 'ativa'
      });
      return Array.isArray(result) ? result : [];
    },
    enabled: !!workshopId && open
  });

  const { data: candidates = [] } = useQuery({
    queryKey: ['candidates-for-goals', workshopId],
    queryFn: async () => {
      const result = await base44.entities.Candidate.filter({ workshop_id: workshopId });
      return Array.isArray(result) ? result : [];
    },
    enabled: !!workshopId && open
  });

  const { data: proposals = [] } = useQuery({
    queryKey: ['proposals-for-goals', workshopId],
    queryFn: async () => {
      const result = await base44.entities.JobProposal.filter({ workshop_id: workshopId });
      return Array.isArray(result) ? result : [];
    },
    enabled: !!workshopId && open
  });

  const saveGoalMutation = useMutation({
    mutationFn: async (data) => {
      const requiredLeads = Math.ceil((data.target_hires * 100) / data.conversion_rate);
      
      if (editingGoal) {
        return await base44.entities.HiringGoal.update(editingGoal.id, {
          ...data,
          required_leads: requiredLeads
        });
      } else {
        return await base44.entities.HiringGoal.create({
          ...data,
          workshop_id: workshopId,
          required_leads: requiredLeads,
          current_leads: 0,
          current_proposals: 0,
          current_hires: 0,
          status: 'ativa'
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hiring-goals'] });
      setShowForm(false);
      setEditingGoal(null);
      setFormData({
        position: "",
        target_hires: 1,
        target_leads_per_day: 5,
        conversion_rate: 10,
        deadline: "",
        priority: "media",
        notes: ""
      });
      toast.success(editingGoal ? "Meta atualizada!" : "Meta criada!");
    }
  });

  const deleteGoalMutation = useMutation({
    mutationFn: (id) => base44.entities.HiringGoal.update(id, { status: 'pausada' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hiring-goals'] });
      toast.success("Meta pausada");
    }
  });

  const updateGoalProgressMutation = useMutation({
    mutationFn: async (goalId) => {
      const goal = goals.find(g => g.id === goalId);
      if (!goal) return;

      const positionLeads = candidates.filter(c => 
        c.desired_position?.toLowerCase().includes(goal.position.toLowerCase())
      ).length;

      const positionProposals = proposals.filter(p => 
        p.position?.toLowerCase().includes(goal.position.toLowerCase())
      ).length;

      const positionHires = candidates.filter(c => 
        c.desired_position?.toLowerCase().includes(goal.position.toLowerCase()) &&
        c.status === 'contratado'
      ).length;

      return await base44.entities.HiringGoal.update(goalId, {
        current_leads: positionLeads,
        current_proposals: positionProposals,
        current_hires: positionHires
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hiring-goals'] });
    }
  });

  const handleEdit = (goal) => {
    setEditingGoal(goal);
    setFormData({
      position: goal.position,
      target_hires: goal.target_hires,
      target_leads_per_day: goal.target_leads_per_day,
      conversion_rate: goal.conversion_rate,
      deadline: goal.deadline || "",
      priority: goal.priority,
      notes: goal.notes || ""
    });
    setShowForm(true);
  };

  const priorityColors = {
    baixa: "bg-gray-100 text-gray-800",
    media: "bg-blue-100 text-blue-800",
    alta: "bg-orange-100 text-orange-800",
    urgente: "bg-red-100 text-red-800"
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-6 h-6 text-blue-600" />
            Metas de Contratação
          </DialogTitle>
        </DialogHeader>

        {showForm ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Cargo</label>
                <Input
                  placeholder="Ex: Mecânico, Vendedor, Financeiro..."
                  value={formData.position}
                  onChange={(e) => setFormData({...formData, position: e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Meta de Contratações</label>
                <Input
                  type="number"
                  min="1"
                  value={formData.target_hires}
                  onChange={(e) => setFormData({...formData, target_hires: parseInt(e.target.value) || 1})}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Leads por Dia (Meta)</label>
                <Input
                  type="number"
                  min="1"
                  value={formData.target_leads_per_day}
                  onChange={(e) => setFormData({...formData, target_leads_per_day: parseInt(e.target.value) || 1})}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Taxa de Conversão (%)</label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.conversion_rate}
                  onChange={(e) => setFormData({...formData, conversion_rate: parseInt(e.target.value) || 10})}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leads necessários: {Math.ceil((formData.target_hires * 100) / formData.conversion_rate)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Prazo</label>
                <Input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({...formData, deadline: e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Prioridade</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({...formData, priority: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="baixa">Baixa</option>
                  <option value="media">Média</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Observações</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="w-full px-3 py-2 border rounded-md h-20"
                placeholder="Observações sobre esta meta..."
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => {
                setShowForm(false);
                setEditingGoal(null);
              }}>
                Cancelar
              </Button>
              <Button onClick={() => saveGoalMutation.mutate(formData)}>
                {editingGoal ? 'Atualizar' : 'Criar'} Meta
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Button onClick={() => setShowForm(true)} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Nova Meta de Contratação
            </Button>

            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Carregando...</div>
            ) : goals.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Nenhuma meta ativa. Crie sua primeira meta!
              </div>
            ) : (
              <div className="grid gap-4">
                {goals.map(goal => {
                  const leadsProgress = (goal.current_leads / goal.required_leads) * 100;
                  const proposalsProgress = (goal.current_proposals / goal.target_hires) * 100;
                  const hiresProgress = (goal.current_hires / goal.target_hires) * 100;

                  return (
                    <Card key={goal.id} className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-xl font-bold text-gray-900">{goal.position}</h3>
                            <Badge className={priorityColors[goal.priority]}>
                              {goal.priority}
                            </Badge>
                          </div>
                          {goal.deadline && (
                            <p className="text-sm text-gray-600">
                              Prazo: {new Date(goal.deadline).toLocaleDateString('pt-BR')}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => updateGoalProgressMutation.mutate(goal.id)}>
                            <TrendingUp className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleEdit(goal)}>
                            Editar
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => deleteGoalMutation.mutate(goal.id)}>
                            Pausar
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Users className="w-5 h-5 text-blue-600" />
                            <p className="text-sm font-medium text-gray-700">Leads</p>
                          </div>
                          <p className="text-2xl font-bold text-blue-600">
                            {goal.current_leads}/{goal.required_leads}
                          </p>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{ width: `${Math.min(leadsProgress, 100)}%` }}
                            />
                          </div>
                        </div>

                        <div className="bg-green-50 p-4 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Send className="w-5 h-5 text-green-600" />
                            <p className="text-sm font-medium text-gray-700">Propostas</p>
                          </div>
                          <p className="text-2xl font-bold text-green-600">
                            {goal.current_proposals}/{goal.target_hires}
                          </p>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                            <div 
                              className="bg-green-600 h-2 rounded-full transition-all"
                              style={{ width: `${Math.min(proposalsProgress, 100)}%` }}
                            />
                          </div>
                        </div>

                        <div className="bg-purple-50 p-4 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="w-5 h-5 text-purple-600" />
                            <p className="text-sm font-medium text-gray-700">Contratados</p>
                          </div>
                          <p className="text-2xl font-bold text-purple-600">
                            {goal.current_hires}/{goal.target_hires}
                          </p>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                            <div 
                              className="bg-purple-600 h-2 rounded-full transition-all"
                              style={{ width: `${Math.min(hiresProgress, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-gray-700">
                          <strong>Meta diária:</strong> {goal.target_leads_per_day} leads/dia • 
                          <strong className="ml-2">Taxa conversão:</strong> {goal.conversion_rate}%
                        </p>
                        {goal.notes && (
                          <p className="text-sm text-gray-600 mt-2">{goal.notes}</p>
                        )}
                      </div>

                      {goal.current_hires >= goal.target_hires && (
                        <div className="mt-3 flex items-center gap-2 text-green-700 bg-green-100 p-3 rounded-lg">
                          <CheckCircle className="w-5 h-5" />
                          <p className="font-semibold">Meta atingida!</p>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}