import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Sparkles, CheckCircle2, Clock, FileText, Users } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

export default function OnboardingPlanGenerator({ employeeId, role, area, workshopId, onPlanGenerated }) {
  const [generating, setGenerating] = useState(false);
  const [plan, setPlan] = useState(null);

  const generatePlan = async () => {
    setGenerating(true);
    try {
      const response = await base44.functions.invoke('generateOnboardingPlan', {
        employee_id: employeeId,
        role,
        area,
        workshop_id: workshopId
      });

      if (response.data.success) {
        setPlan(response.data.plan);
        toast.success("Plano de onboarding gerado com sucesso!");
        if (onPlanGenerated) onPlanGenerated(response.data.plan);
      } else {
        throw new Error(response.data.error);
      }
    } catch (error) {
      toast.error("Erro ao gerar plano: " + error.message);
    } finally {
      setGenerating(false);
    }
  };

  const tasksByType = plan?.tasks?.reduce((acc, task) => {
    acc[task.type] = (acc[task.type] || 0) + 1;
    return acc;
  }, {}) || {};

  const typeIcons = {
    documento: FileText,
    treinamento: Users,
    reuniao: Users,
    outros: Clock
  };

  return (
    <div className="space-y-4">
      {!plan ? (
        <Card className="border-2 border-dashed">
          <CardContent className="py-12 text-center">
            <Sparkles className="w-12 h-12 mx-auto mb-4 text-purple-500" />
            <h3 className="text-lg font-semibold mb-2">Plano de Onboarding com IA</h3>
            <p className="text-gray-600 mb-4">
              Gere automaticamente um plano personalizado de integração
            </p>
            <Button onClick={generatePlan} disabled={generating} className="bg-purple-600 hover:bg-purple-700">
              {generating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" /> Gerar Plano com IA</>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  Plano de Onboarding Ativo
                </CardTitle>
                <Button variant="outline" size="sm" onClick={generatePlan} disabled={generating}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Regenerar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-gray-700">{plan.plan_content}</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Progresso</span>
                  <span className="text-sm text-gray-600">{plan.completion_percentage}%</span>
                </div>
                <Progress value={plan.completion_percentage} className="h-2" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(tasksByType).map(([type, count]) => {
                  const Icon = typeIcons[type] || Clock;
                  return (
                    <div key={type} className="bg-gray-50 rounded-lg p-3 text-center">
                      <Icon className="w-5 h-5 mx-auto mb-1 text-gray-600" />
                      <p className="text-xl font-bold text-gray-900">{count}</p>
                      <p className="text-xs text-gray-600 capitalize">{type}s</p>
                    </div>
                  );
                })}
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Próximas Tarefas</h4>
                <div className="space-y-2">
                  {plan.tasks?.slice(0, 3).map((task, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className={`w-2 h-2 rounded-full mt-2 ${
                        task.status === 'concluida' ? 'bg-green-500' : 
                        task.status === 'em_andamento' ? 'bg-blue-500' : 'bg-gray-300'
                      }`} />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{task.title}</p>
                        <p className="text-xs text-gray-600">{task.description}</p>
                        <p className="text-xs text-gray-500 mt-1">Prazo: {task.due_date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}