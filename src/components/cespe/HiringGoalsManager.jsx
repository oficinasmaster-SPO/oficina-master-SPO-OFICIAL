import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Target, TrendingUp, Users, Send, CheckCircle, AlertCircle, Phone, UserCheck, FileCheck, Briefcase, Clock, Filter } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function HiringGoalsManager({ open, onClose, workshopId }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [filterPosition, setFilterPosition] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterDeadline, setFilterDeadline] = useState("all");
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

      const positionCandidates = candidates.filter(c => 
        c.desired_position?.toLowerCase().includes(goal.position.toLowerCase())
      );

      const positionProposals = proposals.filter(p => 
        p.position?.toLowerCase().includes(goal.position.toLowerCase())
      );

      // Calcular etapas do funil
      const funnel_leads = positionCandidates.length;
      const funnel_contacted = positionCandidates.filter(c => c.status !== 'novo_lead').length;
      const funnel_interviewed = positionCandidates.filter(c => 
        c.status === 'em_entrevista' || c.status === 'aprovado' || c.status === 'contratado'
      ).length;
      const funnel_approved = positionCandidates.filter(c => 
        c.status === 'aprovado' || c.status === 'contratado'
      ).length;
      const funnel_proposal_sent = positionProposals.filter(p => 
        p.status === 'enviada' || p.status === 'aceita'
      ).length;
      const funnel_proposal_accepted = positionProposals.filter(p => p.status === 'aceita').length;
      const funnel_hired = positionCandidates.filter(c => c.status === 'contratado').length;

      return await base44.entities.HiringGoal.update(goalId, {
        funnel_leads,
        funnel_contacted,
        funnel_interviewed,
        funnel_approved,
        funnel_proposal_sent,
        funnel_proposal_accepted,
        funnel_hired
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hiring-goals'] });
      toast.success("Funil atualizado!");
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

  // Filtrar metas
  const filteredGoals = goals.filter(goal => {
    const matchPosition = filterPosition === "all" || goal.position === filterPosition;
    const matchPriority = filterPriority === "all" || goal.priority === filterPriority;
    
    let matchDeadline = true;
    if (filterDeadline !== "all" && goal.deadline) {
      const deadline = new Date(goal.deadline);
      const today = new Date();
      const diffDays = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
      
      if (filterDeadline === "urgent") matchDeadline = diffDays <= 7;
      else if (filterDeadline === "soon") matchDeadline = diffDays > 7 && diffDays <= 30;
      else if (filterDeadline === "future") matchDeadline = diffDays > 30;
    }
    
    return matchPosition && matchPriority && matchDeadline;
  });

  // Lista única de cargos
  const uniquePositions = [...new Set(goals.map(g => g.position))].sort();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-6 h-6 text-blue-600" />
            🎯 Metas de Contratação - Funil Completo
          </DialogTitle>
        </DialogHeader>

        {showForm ? (
          <div className="space-y-4 bg-white p-6 rounded-lg border border-gray-200">
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
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg mb-4 border border-blue-200">
              <p className="text-sm text-gray-700 mb-2">
                💡 <strong>Dica:</strong> O funil de contratação com 7 etapas aparecerá após criar sua primeira meta. 
                Clique em "Atualizar Funil" depois para calcular as taxas de conversão.
              </p>
            </div>

            <Button onClick={() => setShowForm(true)} className="w-full bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              ➕ Nova Meta de Contratação
            </Button>

            {/* Filtros */}
            {goals.length > 0 && (
              <Card className="bg-gray-50 p-4">
                <div className="flex gap-3 flex-wrap items-center">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Filtros:</span>
                  </div>
                  
                  <select
                    value={filterPosition}
                    onChange={(e) => setFilterPosition(e.target.value)}
                    className="px-3 py-1.5 border rounded-md text-sm"
                  >
                    <option value="all">Todos os Cargos</option>
                    {uniquePositions.map(pos => (
                      <option key={pos} value={pos}>{pos}</option>
                    ))}
                  </select>

                  <select
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                    className="px-3 py-1.5 border rounded-md text-sm"
                  >
                    <option value="all">Todas Prioridades</option>
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>

                  <select
                    value={filterDeadline}
                    onChange={(e) => setFilterDeadline(e.target.value)}
                    className="px-3 py-1.5 border rounded-md text-sm"
                  >
                    <option value="all">Todos os Prazos</option>
                    <option value="urgent">Urgente (≤7 dias)</option>
                    <option value="soon">Próximo (8-30 dias)</option>
                    <option value="future">Futuro (>30 dias)</option>
                  </select>

                  {(filterPosition !== "all" || filterPriority !== "all" || filterDeadline !== "all") && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => {
                        setFilterPosition("all");
                        setFilterPriority("all");
                        setFilterDeadline("all");
                      }}
                    >
                      Limpar Filtros
                    </Button>
                  )}
                </div>
              </Card>
            )}

            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Carregando...</div>
            ) : filteredGoals.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {goals.length === 0 ? "Nenhuma meta ativa. Crie sua primeira meta!" : "Nenhuma meta encontrada com os filtros selecionados"}
              </div>
            ) : goals.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Nenhuma meta ativa. Crie sua primeira meta!
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredGoals.map(goal => {
                  // Calcular taxas de conversão
                  const contactRate = goal.funnel_leads > 0 ? (goal.funnel_contacted / goal.funnel_leads * 100).toFixed(0) : 0;
                  const interviewRate = goal.funnel_contacted > 0 ? (goal.funnel_interviewed / goal.funnel_contacted * 100).toFixed(0) : 0;
                  const approvalRate = goal.funnel_interviewed > 0 ? (goal.funnel_approved / goal.funnel_interviewed * 100).toFixed(0) : 0;
                  const proposalRate = goal.funnel_approved > 0 ? (goal.funnel_proposal_sent / goal.funnel_approved * 100).toFixed(0) : 0;
                  const acceptRate = goal.funnel_proposal_sent > 0 ? (goal.funnel_proposal_accepted / goal.funnel_proposal_sent * 100).toFixed(0) : 0;
                  const hireRate = goal.funnel_proposal_accepted > 0 ? (goal.funnel_hired / goal.funnel_proposal_accepted * 100).toFixed(0) : 0;

                  const overallProgress = goal.target_hires > 0 ? (goal.funnel_hired / goal.target_hires * 100).toFixed(0) : 0;

                  return (
                    <Card key={goal.id} className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-xl font-bold text-gray-900">{goal.position}</h3>
                            <Badge className={priorityColors[goal.priority]}>
                              {goal.priority}
                            </Badge>
                            <Badge variant="outline" className="text-sm">
                              {goal.funnel_hired}/{goal.target_hires} contratados
                            </Badge>
                          </div>
                          {goal.deadline && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Clock className="w-4 h-4" />
                              <span>Prazo: {new Date(goal.deadline).toLocaleDateString('pt-BR')}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => updateGoalProgressMutation.mutate(goal.id)} className="bg-blue-600 hover:bg-blue-700">
                            <TrendingUp className="w-4 h-4 mr-1" />
                            Atualizar Funil
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleEdit(goal)}>
                            Editar
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => deleteGoalMutation.mutate(goal.id)}>
                            Pausar
                          </Button>
                        </div>
                      </div>

                      {/* Barra de progresso geral */}
                      <div className="mb-6 bg-gray-100 p-4 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-sm font-medium text-gray-700">Progresso Geral</p>
                          <p className="text-2xl font-bold text-blue-600">{overallProgress}%</p>
                        </div>
                        <div className="w-full bg-gray-300 rounded-full h-3">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all"
                            style={{ width: `${Math.min(overallProgress, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Funil de Contratação */}
                      <div className="bg-gradient-to-br from-slate-50 to-blue-50 p-4 rounded-lg mb-4">
                        <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                          <Target className="w-5 h-5 text-blue-600" />
                          Funil de Contratação
                        </h4>
                        
                        <div className="space-y-3">
                          {/* Etapa 1: Leads */}
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <Users className="w-6 h-6 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-center mb-1">
                                <p className="text-sm font-medium text-gray-700">1. Leads Gerados</p>
                                <p className="text-lg font-bold text-blue-600">{goal.funnel_leads}</p>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '100%' }} />
                              </div>
                            </div>
                          </div>

                          {/* Etapa 2: Contato */}
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <Phone className="w-6 h-6 text-indigo-600" />
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-center mb-1">
                                <p className="text-sm font-medium text-gray-700">2. Contato Realizado</p>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">{contactRate}%</Badge>
                                  <p className="text-lg font-bold text-indigo-600">{goal.funnel_contacted}</p>
                                </div>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${contactRate}%` }} />
                              </div>
                            </div>
                          </div>

                          {/* Etapa 3: Entrevista */}
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <UserCheck className="w-6 h-6 text-purple-600" />
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-center mb-1">
                                <p className="text-sm font-medium text-gray-700">3. Entrevista Realizada</p>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">{interviewRate}%</Badge>
                                  <p className="text-lg font-bold text-purple-600">{goal.funnel_interviewed}</p>
                                </div>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${interviewRate}%` }} />
                              </div>
                            </div>
                          </div>

                          {/* Etapa 4: Aprovado */}
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <CheckCircle className="w-6 h-6 text-green-600" />
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-center mb-1">
                                <p className="text-sm font-medium text-gray-700">4. Aprovado/Qualificado</p>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">{approvalRate}%</Badge>
                                  <p className="text-lg font-bold text-green-600">{goal.funnel_approved}</p>
                                </div>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div className="bg-green-600 h-2 rounded-full" style={{ width: `${approvalRate}%` }} />
                              </div>
                            </div>
                          </div>

                          {/* Etapa 5: Proposta Enviada */}
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <Send className="w-6 h-6 text-orange-600" />
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-center mb-1">
                                <p className="text-sm font-medium text-gray-700">5. Proposta Enviada</p>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">{proposalRate}%</Badge>
                                  <p className="text-lg font-bold text-orange-600">{goal.funnel_proposal_sent}</p>
                                </div>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div className="bg-orange-600 h-2 rounded-full" style={{ width: `${proposalRate}%` }} />
                              </div>
                            </div>
                          </div>

                          {/* Etapa 6: Proposta Aceita */}
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <FileCheck className="w-6 h-6 text-teal-600" />
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-center mb-1">
                                <p className="text-sm font-medium text-gray-700">6. Proposta Aceita</p>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">{acceptRate}%</Badge>
                                  <p className="text-lg font-bold text-teal-600">{goal.funnel_proposal_accepted}</p>
                                </div>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div className="bg-teal-600 h-2 rounded-full" style={{ width: `${acceptRate}%` }} />
                              </div>
                            </div>
                          </div>

                          {/* Etapa 7: Contratação Efetiva */}
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <Briefcase className="w-6 h-6 text-emerald-600" />
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-center mb-1">
                                <p className="text-sm font-medium text-gray-700">7. Contratação Efetiva</p>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">{hireRate}%</Badge>
                                  <p className="text-lg font-bold text-emerald-600">{goal.funnel_hired}</p>
                                </div>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div className="bg-emerald-600 h-2 rounded-full" style={{ width: `${hireRate}%` }} />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Gargalos detectados */}
                      <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                        <p className="text-sm font-semibold text-yellow-900 mb-2">⚠️ Análise de Gargalos:</p>
                        <div className="text-xs text-yellow-800 space-y-1">
                          {contactRate < 70 && <p>• Taxa de contato baixa ({contactRate}%) - melhorar follow-up</p>}
                          {interviewRate < 60 && <p>• Taxa de entrevista baixa ({interviewRate}%) - confirmar agendamentos</p>}
                          {approvalRate < 40 && <p>• Taxa de aprovação baixa ({approvalRate}%) - revisar critérios ou triagem</p>}
                          {acceptRate < 50 && <p>• Taxa de aceite baixa ({acceptRate}%) - revisar proposta/salário</p>}
                          {contactRate >= 70 && interviewRate >= 60 && approvalRate >= 40 && acceptRate >= 50 && (
                            <p className="text-green-700">✅ Funil saudável! Continue assim.</p>
                          )}
                        </div>
                      </div>

                      {goal.funnel_hired >= goal.target_hires && (
                        <div className="mt-3 flex items-center gap-2 text-green-700 bg-green-100 p-3 rounded-lg">
                          <CheckCircle className="w-5 h-5" />
                          <p className="font-semibold">🎉 Meta atingida!</p>
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