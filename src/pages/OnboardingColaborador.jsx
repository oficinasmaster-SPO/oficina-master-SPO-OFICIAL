import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, Circle, Heart, FileText, Users, Award } from "lucide-react";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";

export default function OnboardingColaborador() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [onboardingPlan, setOnboardingPlan] = useState(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const employees = await base44.entities.Employee.filter({ user_id: currentUser.id });
      if (employees && employees.length > 0) {
        setEmployee(employees[0]);
        
        // Buscar plano de onboarding
        const plans = await base44.entities.OnboardingPlan.filter({ 
          employee_id: employees[0].id 
        });
        
        if (plans && plans.length > 0) {
          setOnboardingPlan(plans[0]);
          calculateProgress(plans[0]);
        } else {
          // Criar plano automático
          await createOnboardingPlan(employees[0]);
        }
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const createOnboardingPlan = async (emp) => {
    try {
      const result = await base44.functions.invoke('generateOnboardingPlan', {
        employee_id: emp.id,
        job_role: emp.job_role,
        area: emp.area
      });

      if (result.data.success && result.data.plan_id) {
        const newPlan = await base44.entities.OnboardingPlan.get(result.data.plan_id);
        setOnboardingPlan(newPlan);
        calculateProgress(newPlan);
        toast.success("Plano de onboarding criado!");
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao criar plano de onboarding");
    }
  };

  const calculateProgress = (plan) => {
    if (!plan || !plan.checklist_items) return;
    
    const items = plan.checklist_items;
    const completed = items.filter(item => item.completed).length;
    const total = items.length;
    const percentage = total > 0 ? (completed / total) * 100 : 0;
    
    setProgress(percentage);
  };

  const toggleChecklistItem = async (itemIndex) => {
    if (!onboardingPlan) return;
    
    try {
      const updatedItems = [...onboardingPlan.checklist_items];
      updatedItems[itemIndex] = {
        ...updatedItems[itemIndex],
        completed: !updatedItems[itemIndex].completed,
        completed_at: !updatedItems[itemIndex].completed ? new Date().toISOString() : null
      };

      await base44.entities.OnboardingPlan.update(onboardingPlan.id, {
        checklist_items: updatedItems
      });

      setOnboardingPlan({ ...onboardingPlan, checklist_items: updatedItems });
      calculateProgress({ ...onboardingPlan, checklist_items: updatedItems });
      toast.success("Checklist atualizado!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atualizar");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <p className="text-gray-600">Nenhum colaborador vinculado à sua conta</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">
          Bem-vindo(a), {employee.full_name}! 🎉
        </h1>
        <p className="text-gray-600">
          Complete seu onboarding para se integrar à equipe
        </p>
      </div>

      {/* Progress Bar */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700">Progresso do Onboarding</p>
            <p className="text-2xl font-bold text-blue-600">{progress.toFixed(0)}%</p>
          </div>
          <Progress value={progress} className="h-3" />
        </CardContent>
      </Card>

      {/* Checklist */}
      {onboardingPlan && (
        <Card>
          <CardHeader>
            <CardTitle>Checklist de Integração</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {onboardingPlan.checklist_items?.map((item, index) => (
              <div 
                key={index}
                className={`flex items-start gap-4 p-4 rounded-lg border-2 transition-all cursor-pointer hover:shadow-md ${
                  item.completed ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                }`}
                onClick={() => toggleChecklistItem(index)}
              >
                {item.completed ? (
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                ) : (
                  <Circle className="w-6 h-6 text-gray-400 flex-shrink-0 mt-1" />
                )}
                <div className="flex-1">
                  <p className={`font-medium ${item.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                    {item.title}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                  {item.completed && item.completed_at && (
                    <p className="text-xs text-green-600 mt-1">
                      ✓ Concluído em {new Date(item.completed_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                {item.action_url && !item.completed && (
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(item.action_url);
                    }}
                  >
                    Ir para ação
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Ações Importantes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-2 border-pink-200 bg-pink-50 hover:shadow-lg transition-all cursor-pointer"
              onClick={() => navigate(createPageUrl('CDCList'))}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-pink-900">
              <Heart className="w-5 h-5" />
              CDC - Conexão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700">
              Complete sua conexão com a equipe
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 border-purple-200 bg-purple-50 hover:shadow-lg transition-all cursor-pointer"
              onClick={() => navigate(createPageUrl('COEXList'))}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-900">
              <FileText className="w-5 h-5" />
              COEX - Expectativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700">
              Alinhe expectativas com seu gestor
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-200 bg-blue-50 hover:shadow-lg transition-all cursor-pointer"
              onClick={() => navigate(createPageUrl('MeusTreinamentos'))}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Award className="w-5 h-5" />
              Treinamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700">
              Acesse cursos e capacitações
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}