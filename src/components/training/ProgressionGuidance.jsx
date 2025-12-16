import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Info, Lightbulb } from "lucide-react";

export default function ProgressionGuidance({ 
  canAdvance, 
  canRetake, 
  requiresPass, 
  assessmentResult,
  progressionRules 
}) {
  
  if (!progressionRules) return null;

  const getGuidanceMessage = () => {
    if (!assessmentResult) {
      return {
        type: 'info',
        icon: Info,
        title: 'Avaliação Disponível',
        message: progressionRules.can_skip_to_assessment 
          ? 'Você pode pular direto para a avaliação ou assistir o conteúdo primeiro.'
          : 'Assista o conteúdo antes de fazer a avaliação.'
      };
    }

    if (assessmentResult.passed) {
      return {
        type: 'success',
        icon: CheckCircle,
        title: 'Avaliação Aprovada',
        message: progressionRules.can_retake_assessment
          ? 'Parabéns! Você pode avançar ou refazer para melhorar sua nota.'
          : 'Parabéns! Você está pronto para a próxima aula.'
      };
    }

    if (!assessmentResult.passed) {
      return {
        type: 'warning',
        icon: AlertCircle,
        title: 'Resultado Abaixo do Esperado',
        message: progressionRules.can_advance_if_failed
          ? 'Você pode avançar ou revisar o conteúdo e tentar novamente.'
          : 'Recomendamos revisar o conteúdo antes de avançar.',
        suggestion: progressionRules.can_retake_assessment 
          ? 'Refazer a avaliação pode ajudar a consolidar o aprendizado.'
          : null
      };
    }
  };

  const guidance = getGuidanceMessage();
  const colorClasses = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-orange-50 border-orange-200 text-orange-800'
  };

  const Icon = guidance.icon;

  return (
    <Card className={`border ${colorClasses[guidance.type]}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold mb-1">{guidance.title}</h4>
            <p className="text-sm">{guidance.message}</p>
            {guidance.suggestion && (
              <div className="flex items-start gap-2 mt-2 text-sm">
                <Lightbulb className="w-4 h-4 flex-shrink-0" />
                <span>{guidance.suggestion}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}