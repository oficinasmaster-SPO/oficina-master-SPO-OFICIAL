import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Calendar, ShoppingCart, Users, DollarSign, ArrowLeft, CheckCircle2 } from "lucide-react";
import { actionPlanTemplates } from "../components/diagnostic/ActionPlans";
import { toast } from "sonner";

export default function PlanoAcao() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [diagnostic, setDiagnostic] = useState(null);
  const [actionPlan, setActionPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const id = params.get("id");
      
      if (!id) {
        navigate(createPageUrl("Home"));
        return;
      }

      const diagnostics = await base44.entities.Diagnostic.list();
      const diag = diagnostics.find(d => d.id === id);
      
      if (!diag) {
        navigate(createPageUrl("Home"));
        return;
      }

      setDiagnostic(diag);

      // Buscar ou criar plano de ação
      const plans = await base44.entities.ActionPlan.list();
      let plan = plans.find(p => p.diagnostic_id === id);
      
      if (!plan) {
        const template = actionPlanTemplates[diag.phase];
        plan = await base44.entities.ActionPlan.create({
          diagnostic_id: id,
          phase: diag.phase,
          actions: template
        });
      }
      
      setActionPlan(plan);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar plano de ação");
    } finally {
      setLoading(false);
    }
  };

  const updateActionMutation = useMutation({
    mutationFn: async ({ actionIndex, newStatus }) => {
      const updatedActions = [...actionPlan.actions];
      updatedActions[actionIndex].status = newStatus;
      
      return await base44.entities.ActionPlan.update(actionPlan.id, {
        actions: updatedActions
      });
    },
    onSuccess: (updated) => {
      setActionPlan(updated);
      queryClient.invalidateQueries(['actionPlans']);
      toast.success("Status atualizado!");
    }
  });

  const handleStatusChange = (actionIndex, currentStatus) => {
    const statusFlow = {
      'a_fazer': 'em_andamento',
      'em_andamento': 'concluido',
      'concluido': 'a_fazer'
    };
    
    const newStatus = statusFlow[currentStatus];
    updateActionMutation.mutate({ actionIndex, newStatus });
  };

  const getCategoryInfo = (category) => {
    const categories = {
      vendas: { icon: ShoppingCart, label: "Vendas e Atendimento", color: "bg-blue-100 text-blue-700" },
      prospeccao: { icon: Users, label: "Prospecção Ativa", color: "bg-purple-100 text-purple-700" },
      precificacao: { icon: DollarSign, label: "Precificação e Rentabilidade", color: "bg-green-100 text-green-700" },
      pessoas: { icon: Users, label: "Pessoas e Time", color: "bg-orange-100 text-orange-700" }
    };
    return categories[category] || categories.vendas;
  };

  const getStatusColor = (status) => {
    const colors = {
      'a_fazer': 'bg-gray-100 text-gray-700 border-gray-300',
      'em_andamento': 'bg-yellow-100 text-yellow-700 border-yellow-300',
      'concluido': 'bg-green-100 text-green-700 border-green-300'
    };
    return colors[status];
  };

  const getStatusLabel = (status) => {
    const labels = {
      'a_fazer': 'A Fazer',
      'em_andamento': 'Em Andamento',
      'concluido': 'Concluído'
    };
    return labels[status];
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!actionPlan) return null;

  const completedCount = actionPlan.actions.filter(a => a.status === 'concluido').length;
  const progressPercentage = (completedCount / actionPlan.actions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <Button
          variant="outline"
          onClick={() => navigate(createPageUrl("Resultado") + `?id=${diagnostic.id}`)}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar ao Resultado
        </Button>

        {/* Header */}
        <Card className="shadow-xl mb-8">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <CardTitle className="text-3xl">
              Plano de Ação Personalizado - Fase {diagnostic.phase}
            </CardTitle>
            <p className="text-blue-100 mt-2">
              Siga estas ações estratégicas para evoluir sua oficina
            </p>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Progresso Geral</p>
                <p className="text-2xl font-bold text-gray-900">
                  {completedCount} de {actionPlan.actions.length} ações concluídas
                </p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold text-blue-600">
                  {Math.round(progressPercentage)}%
                </div>
                <p className="text-sm text-gray-600">Completo</p>
              </div>
            </div>
            <div className="mt-4 h-3 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions List */}
        <div className="space-y-6">
          {actionPlan.actions.map((action, index) => {
            const categoryInfo = getCategoryInfo(action.category);
            const CategoryIcon = categoryInfo.icon;
            
            return (
              <Card key={index} className="shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <button
                      onClick={() => handleStatusChange(index, action.status)}
                      disabled={updateActionMutation.isLoading}
                      className="flex-shrink-0 mt-1"
                    >
                      {action.status === 'concluido' ? (
                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                      ) : (
                        <div className="w-6 h-6 rounded-full border-2 border-gray-300 hover:border-blue-500 transition-colors" />
                      )}
                    </button>

                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <Badge className={categoryInfo.color}>
                          <CategoryIcon className="w-3 h-3 mr-1" />
                          {categoryInfo.label}
                        </Badge>
                        <Badge variant="outline" className={`border-2 ${getStatusColor(action.status)}`}>
                          {getStatusLabel(action.status)}
                        </Badge>
                        <Badge variant="outline" className="border-gray-300">
                          <Calendar className="w-3 h-3 mr-1" />
                          {action.deadline_days} dias
                        </Badge>
                      </div>

                      <h3 className={`text-lg font-semibold mb-2 ${
                        action.status === 'concluido' ? 'line-through text-gray-500' : 'text-gray-900'
                      }`}>
                        {action.title}
                      </h3>

                      <p className="text-gray-600 leading-relaxed">
                        {action.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Footer Actions */}
        <Card className="mt-8 shadow-xl bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="p-6 text-center">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Próximos Passos
            </h3>
            <p className="text-gray-600 mb-4">
              Comece pelas ações de prazo mais curto e mantenha o foco nos seus objetivos
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => navigate(createPageUrl("Home"))}
                variant="outline"
                className="px-6"
              >
                Fazer Novo Diagnóstico
              </Button>
              <Button
                onClick={() => navigate(createPageUrl("Historico"))}
                className="bg-blue-600 hover:bg-blue-700 px-6"
              >
                Ver Histórico
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}