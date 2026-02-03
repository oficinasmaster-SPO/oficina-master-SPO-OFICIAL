import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

/**
 * Widget de progresso de onboarding para dashboard do colaborador
 */
export default function OnboardingProgressWidget({ employeeId }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [onboardingPlan, setOnboardingPlan] = useState(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (employeeId) {
      loadOnboardingPlan();
    }
  }, [employeeId]);

  const loadOnboardingPlan = async () => {
    try {
      const plans = await base44.entities.OnboardingPlan.filter({ 
        employee_id: employeeId 
      });
      
      if (plans && plans.length > 0) {
        setOnboardingPlan(plans[0]);
        
        const items = plans[0].checklist_items || [];
        const completed = items.filter(item => item.completed).length;
        const total = items.length;
        const percentage = total > 0 ? (completed / total) * 100 : 0;
        
        setProgress(percentage);
      }
    } catch (error) {
      console.error("Erro ao carregar onboarding:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
        </CardContent>
      </Card>
    );
  }

  if (!onboardingPlan || progress >= 100) return null;

  const nextTask = onboardingPlan.checklist_items?.find(item => !item.completed);

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="text-lg">Onboarding</span>
          <Badge className="bg-blue-600 text-white">
            {progress.toFixed(0)}%
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={progress} className="h-3" />
        
        {nextTask && (
          <div className="bg-white p-3 rounded-lg">
            <p className="text-sm font-medium text-gray-900 mb-1">Próxima etapa:</p>
            <p className="text-sm text-gray-700">{nextTask.title}</p>
          </div>
        )}

        <Button
          onClick={() => navigate(createPageUrl('OnboardingColaborador'))}
          className="w-full bg-blue-600 hover:bg-blue-700"
          size="sm"
        >
          Continuar Onboarding
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}