import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Activity, Lock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const faseLabels = {
  1: { nome: "Fase 1 - Sobrevivência", cor: "bg-red-100 text-red-700 border-red-300" },
  2: { nome: "Fase 2 - Estruturação", cor: "bg-yellow-100 text-yellow-700 border-yellow-300" },
  3: { nome: "Fase 3 - Crescimento", cor: "bg-blue-100 text-blue-700 border-blue-300" },
  4: { nome: "Fase 4 - Expansão", cor: "bg-green-100 text-green-700 border-green-300" }
};

export default function FaseOficinaCard({ workshop, diagnostic }) {
  if (!workshop) return null;
  
  const fase = diagnostic?.phase || workshop?.maturity_level || 1;
  const faseInfo = faseLabels[fase] || faseLabels[1];
  const dataAnalise = diagnostic?.created_date 
    ? new Date(diagnostic.created_date).toLocaleDateString('pt-BR')
    : 'Não realizada';

  const currentMonth = new Date().toISOString().substring(0, 7);
  const { data: monthlyPlan } = useQuery({
    queryKey: ['plan-evolution', workshop.id, currentMonth],
    queryFn: async () => {
      const plans = await base44.entities.MonthlyAccelerationPlan.filter({
        workshop_id: workshop.id,
        reference_month: currentMonth,
        status: 'ativo'
      });
      return plans?.[0] || null;
    },
    enabled: !!workshop?.id
  });

  const canEvolve = monthlyPlan?.completion_percentage >= 100;
  const nextPhase = fase < 4 ? fase + 1 : null;
  const nextPhaseInfo = nextPhase ? faseLabels[nextPhase] : null;

  return (
    <Card className="border-2 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="w-5 h-5 text-purple-600" />
          Fase da Oficina
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Fase Atual</span>
          <Badge className={`${faseInfo.cor} border text-base px-4 py-1`}>
            Fase {fase}
          </Badge>
        </div>
        
        <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
          <p className="font-semibold text-purple-900 mb-1">{faseInfo.nome}</p>
          <p className="text-sm text-gray-600">Última análise: {dataAnalise}</p>
        </div>

        <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <Activity className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-800">
            Complete as atividades do cronograma de implementação para evoluir para a próxima fase
          </p>
        </div>

        {nextPhaseInfo && (
          <div className={`p-4 rounded-lg border-2 ${canEvolve ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-300'}`}>
            <div className="flex items-center gap-2 mb-2">
              {canEvolve ? (
                <TrendingUp className="w-4 h-4 text-green-600" />
              ) : (
                <Lock className="w-4 h-4 text-gray-500" />
              )}
              <p className={`text-sm font-semibold ${canEvolve ? 'text-green-900' : 'text-gray-700'}`}>
                Próxima: {nextPhaseInfo.nome}
              </p>
            </div>
            
            {canEvolve ? (
              <p className="text-xs text-green-700">
                ✓ Plano concluído! Realize novo diagnóstico para evoluir.
              </p>
            ) : monthlyPlan ? (
              <div className="space-y-1">
                <p className="text-xs text-gray-700">
                  Complete o plano mensal para desbloquear
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                    <div 
                      className="bg-blue-600 h-1.5 rounded-full transition-all"
                      style={{ width: `${monthlyPlan.completion_percentage}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-gray-700">
                    {monthlyPlan.completion_percentage}%
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-600">
                Gere seu plano de aceleração para começar
              </p>
            )}
          </div>
        )}

        {diagnostic?.dominant_letter && (
          <div className="text-sm text-gray-600">
            <span className="font-medium">Perfil Dominante:</span> {diagnostic.dominant_letter}
          </div>
        )}
      </CardContent>
    </Card>
  );
}