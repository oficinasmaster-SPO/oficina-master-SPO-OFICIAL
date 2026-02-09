import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { AlertTriangle, XCircle, TrendingUp, X } from "lucide-react";

/**
 * Monitor de créditos de integração - exibe alertas visuais
 * quando o usuário está próximo do limite
 */
export default function IntegrationCreditsMonitor({ 
  creditsUsed, 
  creditsLimit, 
  userTier,
  onDismiss 
}) {
  const [dismissed, setDismissed] = useState(false);
  const [alertSent, setAlertSent] = useState(false);

  const percentage = creditsLimit > 0 ? (creditsUsed / creditsLimit) * 100 : 0;

  // Determinar severidade
  const getSeverity = () => {
    if (percentage >= 100) return 'critical';
    if (percentage >= 90) return 'danger';
    if (percentage >= 70) return 'warning';
    return 'normal';
  };

  const severity = getSeverity();

  // Enviar alerta ao backend quando atingir threshold
  useEffect(() => {
    const sendAlert = async () => {
      if (alertSent || severity === 'normal') return;

      try {
        await base44.functions.invoke('checkIntegrationCredits', {
          credits_used: creditsUsed,
          credits_limit: creditsLimit,
          user_tier: userTier
        });
        setAlertSent(true);
      } catch (error) {
        console.error('Error sending credit alert:', error);
      }
    };

    sendAlert();
  }, [creditsUsed, creditsLimit, userTier, severity, alertSent]);

  if (dismissed || severity === 'normal') {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  const getAlertConfig = () => {
    switch (severity) {
      case 'critical':
        return {
          variant: 'destructive',
          icon: XCircle,
          title: 'Limite de Créditos Atingido',
          message: `Você atingiu o limite de ${creditsLimit} créditos de integração. Algumas funcionalidades podem estar indisponíveis.`,
          bgColor: 'bg-red-50 border-red-200',
          progressColor: 'bg-red-600'
        };
      case 'danger':
        return {
          variant: 'destructive',
          icon: AlertTriangle,
          title: '90% dos Créditos Utilizados',
          message: `Você usou ${creditsUsed} de ${creditsLimit} créditos. Faça upgrade para evitar interrupções.`,
          bgColor: 'bg-orange-50 border-orange-200',
          progressColor: 'bg-orange-500'
        };
      case 'warning':
        return {
          variant: 'default',
          icon: TrendingUp,
          title: '70% dos Créditos Utilizados',
          message: `Você usou ${creditsUsed} de ${creditsLimit} créditos. Considere fazer upgrade do seu plano.`,
          bgColor: 'bg-yellow-50 border-yellow-200',
          progressColor: 'bg-yellow-500'
        };
      default:
        return null;
    }
  };

  const config = getAlertConfig();
  if (!config) return null;

  const Icon = config.icon;

  return (
    <div className={`rounded-lg border p-4 ${config.bgColor} relative`}>
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 hover:bg-black/10 rounded"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 mt-0.5 ${
          severity === 'critical' ? 'text-red-600' :
          severity === 'danger' ? 'text-orange-600' : 'text-yellow-600'
        }`} />
        
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900">{config.title}</h4>
          <p className="text-sm text-gray-600 mt-1">{config.message}</p>
          
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{creditsUsed} créditos usados</span>
              <span>{Math.round(percentage)}%</span>
            </div>
            <Progress value={percentage} className="h-2" />
          </div>

          <div className="flex gap-2 mt-4">
            <Link to={createPageUrl('CadastroPlanos')}>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                Fazer Upgrade
              </Button>
            </Link>
            <Link to={createPageUrl('DiagnosticoPlano')}>
              <Button size="sm" variant="outline">
                Ver Diagnóstico
              </Button>
            </Link>
          </div>

          <p className="text-xs text-gray-500 mt-3">
            Plano atual: <span className="font-medium">{userTier || 'Não identificado'}</span>
          </p>
        </div>
      </div>
    </div>
  );
}