import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Sparkles, TrendingUp, AlertCircle } from "lucide-react";

export default function ActionPlanCard({ 
  plan, 
  onViewDetails, 
  onRefine,
  showRefineButton = true 
}) {
  if (!plan) return null;

  const { plan_data, completion_percentage, status, version } = plan;

  return (
    <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Sparkles className="w-6 h-6" />
            Plano de Ação Gerado por IA
          </CardTitle>
          <div className="flex items-center gap-2">
            {version > 1 && (
              <Badge variant="outline" className="bg-purple-100 text-purple-700">
                v{version} Refinado
              </Badge>
            )}
            <Badge className={`${
              completion_percentage >= 100 ? 'bg-green-600' : 
              completion_percentage >= 50 ? 'bg-blue-600' : 
              'bg-orange-600'
            } text-white`}>
              {completion_percentage}% Concluído
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-semibold text-gray-900 mb-2">Objetivo Principal:</h4>
          <p className="text-sm text-gray-700">{plan_data?.main_objective}</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all ${
                completion_percentage >= 100 ? 'bg-green-600' : 
                completion_percentage >= 50 ? 'bg-blue-600' : 
                'bg-orange-600'
              }`}
              style={{ width: `${completion_percentage}%` }}
            />
          </div>
        </div>

        {completion_percentage >= 100 && (
          <div className="flex items-start gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-green-800">
              Parabéns! Você completou todas as atividades do plano de ação.
            </p>
          </div>
        )}

        {plan_data?.next_steps_week && plan_data.next_steps_week.length > 0 && (
          <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
            <p className="text-xs font-semibold text-orange-900 mb-2">
              Próximos passos desta semana:
            </p>
            <ul className="space-y-1">
              {plan_data.next_steps_week.slice(0, 3).map((step, idx) => (
                <li key={idx} className="text-xs text-orange-800 flex items-start gap-1">
                  <span className="text-orange-600">•</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button 
            onClick={onViewDetails}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Ver Plano Completo
          </Button>
          {showRefineButton && (
            <Button 
              onClick={onRefine}
              variant="outline"
              className="flex-1"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Refinar com IA
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}