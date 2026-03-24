import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, User, Lock, AlertCircle, Activity, Sparkles, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const nivelLabels = {
  bebe: { 
    nome: "Júnior", 
    cor: "bg-red-100 text-red-700 border-red-300",
    descricao: "Nível inicial - necessita desenvolvimento básico"
  },
  crianca: { 
    nome: "Pleno", 
    cor: "bg-orange-100 text-orange-700 border-orange-300",
    descricao: "Nível intermediário - em desenvolvimento"
  },
  adolescente: { 
    nome: "Sênior", 
    cor: "bg-blue-100 text-blue-700 border-blue-300",
    descricao: "Nível avançado - quase autônomo"
  },
  adulto: { 
    nome: "Master", 
    cor: "bg-green-100 text-green-700 border-green-300",
    descricao: "Nível máximo - totalmente autônomo"
  }
};

const proximoNivel = {
  bebe: "crianca",
  crianca: "adolescente",
  adolescente: "adulto",
  adulto: null
};

export default function MaturidadeColaboradorCard({ employee, diagnostic }) {
  const navigate = useNavigate();

  if (!employee) return null;
  
  const nivelAtual = diagnostic?.maturity_level || "bebe";
  const nivelInfo = nivelLabels[nivelAtual] || nivelLabels.bebe;
  const dataAnalise = diagnostic?.created_date 
    ? new Date(diagnostic.created_date).toLocaleDateString('pt-BR')
    : 'Não realizada';

  const proximoNivelKey = proximoNivel[nivelAtual];
  const proximoNivelInfo = proximoNivelKey ? nivelLabels[proximoNivelKey] : null;

  // Buscar treinamentos concluídos pelo colaborador
  const { data: trainingProgress } = useQuery({
    queryKey: ['employee-training-progress', employee.id],
    queryFn: async () => {
      const progress = await base44.entities.EmployeeTrainingProgress.filter({
        employee_id: employee.id
      });
      return progress || [];
    },
    enabled: !!employee?.id
  });

  // Buscar feedbacks e avaliações do colaborador
  const { data: feedbacks } = useQuery({
    queryKey: ['employee-feedbacks', employee.id],
    queryFn: async () => {
      const feedbackList = await base44.entities.EmployeeFeedback.filter({
        employee_id: employee.id
      });
      return feedbackList || [];
    },
    enabled: !!employee?.id
  });

  // Calcular progresso de desenvolvimento
  const trainingCompleted = trainingProgress?.filter(t => t.status === 'concluido').length || 0;
  const trainingTotal = trainingProgress?.length || 0;
  const feedbacksPositivos = feedbacks?.filter(f => f.type === 'positivo').length || 0;
  
  // Percentual de progresso baseado em treinamentos e feedbacks
  const progressoTreinamentos = trainingTotal > 0 ? (trainingCompleted / trainingTotal) * 100 : 0;
  const progressoTotal = Math.min(Math.round(progressoTreinamentos), 100);

  // Pode evoluir se tiver 100% de progresso e feedbacks positivos
  const canEvolve = progressoTotal >= 100 && feedbacksPositivos >= 3;

  const handleIniciarDiagnostico = () => {
    navigate(createPageUrl("DiagnosticoMaturidade"));
  };

  const handleVerResultado = () => {
    if (diagnostic?.id) {
      navigate(createPageUrl("ResultadoMaturidade") + `?id=${diagnostic.id}`);
    }
  };

  return (
    <Card className="border-2 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <User className="w-5 h-5 text-purple-600" />
          Maturidade do Colaborador
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Nível Atual</span>
          <Badge className={`${nivelInfo.cor} border text-base px-4 py-1`}>
            {nivelInfo.nome}
          </Badge>
        </div>
        
        <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
          <p className="font-semibold text-purple-900 mb-1">{nivelInfo.descricao}</p>
          <p className="text-sm text-gray-600">Última análise: {dataAnalise}</p>
        </div>

        {!diagnostic?.completed && (
          <div className="flex items-start gap-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
            <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-orange-800">
              Diagnóstico pendente. Realize a avaliação para identificar o nível de maturidade.
            </p>
          </div>
        )}

        <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <Activity className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-blue-800 mb-2">
              Complete treinamentos e receba feedbacks positivos para evoluir de nível
            </p>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-blue-700">Treinamentos: {trainingCompleted}/{trainingTotal}</span>
                <span className="text-blue-700">Feedbacks+: {feedbacksPositivos}</span>
              </div>
            </div>
          </div>
        </div>

        {proximoNivelInfo && (
          <div className={`p-4 rounded-lg border-2 ${canEvolve ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-300'}`}>
            <div className="flex items-center gap-2 mb-2">
              {canEvolve ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <Lock className="w-4 h-4 text-gray-500" />
              )}
              <p className={`text-sm font-semibold ${canEvolve ? 'text-green-900' : 'text-gray-700'}`}>
                Próximo: {proximoNivelInfo.nome}
              </p>
            </div>
            
            {canEvolve ? (
              <p className="text-xs text-green-700">
                ✓ Progresso completo! Realize novo diagnóstico para evoluir.
              </p>
            ) : trainingTotal > 0 ? (
              <div className="space-y-1">
                <p className="text-xs text-gray-700">
                  Complete o desenvolvimento para desbloquear
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                    <div 
                      className="bg-blue-600 h-1.5 rounded-full transition-all"
                      style={{ width: `${progressoTotal}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-gray-700">
                    {progressoTotal}%
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-600">
                Inicie treinamentos para começar o desenvolvimento
              </p>
            )}
          </div>
        )}

        {!proximoNivelInfo && diagnostic?.completed && (
          <div className="p-4 rounded-lg border-2 bg-green-50 border-green-300">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <p className="text-sm font-semibold text-green-900">
                Nível máximo alcançado! 🎉
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          {diagnostic?.completed ? (
            <>
              <Button 
                onClick={handleVerResultado}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                Ver Resultado
              </Button>
              <Button 
                onClick={handleIniciarDiagnostico}
                variant="outline"
                className="flex-1"
              >
                Refazer Diagnóstico
              </Button>
            </>
          ) : (
            <Button 
              onClick={handleIniciarDiagnostico}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              Iniciar Diagnóstico
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}