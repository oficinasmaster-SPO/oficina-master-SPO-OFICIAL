import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";

export default function PlanLimitWarning({ workshopId, type }) {
  const { data: limits, isLoading } = useQuery({
    queryKey: ['plan-limits', workshopId],
    queryFn: async () => {
      // 1. Get workshop
      const workshop = await base44.entities.Workshop.get(workshopId);
      if (!workshop) return null;

      const planType = workshop.planoAtual || "FREE";
      
      // 2. Define plan limits
      let cdcLimit = 5;
      let coexLimit = 3;
      
      if (['START', 'BRONZE'].includes(planType)) {
        cdcLimit = 20;
        coexLimit = 15;
      } else if (['PRATA', 'GOLD', 'IOM', 'MILLIONS'].includes(planType)) {
        cdcLimit = 9999; // Unlimited
        coexLimit = 9999;
      }

      // 3. Count current month usage (since dia 1)
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      let currentUsage = 0;
      let limit = type === 'cdc' ? cdcLimit : coexLimit;

      if (type === 'cdc') {
        const cdcs = await base44.entities.CDCRecord.filter({ workshop_id: workshopId });
        currentUsage = cdcs.filter(c => c.created_date >= startOfMonth).length;
      } else if (type === 'coex') {
        const coexs = await base44.entities.COEXContract.filter({ workshop_id: workshopId });
        currentUsage = coexs.filter(c => c.created_date >= startOfMonth).length;
      }

      const remaining = Math.max(0, limit - currentUsage);
      const isUnlimited = limit > 1000;
      const percentUsed = isUnlimited ? 0 : (currentUsage / limit) * 100;
      
      return {
        planType,
        limit,
        currentUsage,
        remaining,
        isUnlimited,
        percentUsed,
        isNearLimit: !isUnlimited && percentUsed >= 80 && percentUsed < 100,
        isExceeded: !isUnlimited && percentUsed >= 100
      };
    },
    enabled: !!workshopId && !!type
  });

  if (isLoading || !limits || limits.isUnlimited) return null;

  if (limits.isExceeded) {
    return (
      <Card className="border-red-300 bg-red-50 mb-6 shadow-sm">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-red-900 mb-1">
              Limite Mensal Atingido ({limits.limit}/{limits.limit})
            </h4>
            <p className="text-sm text-red-800 mb-3">
              O seu plano atual ({limits.planType}) permite realizar {limits.limit} {type === 'cdc' ? 'CDCs' : 'COEX'} por mês. 
              Você já atingiu este limite. Faça o upgrade do seu plano para continuar gerando contratos.
            </p>
            <Link to={createPageUrl("Planos")}>
              <Button size="sm" variant="outline" className="border-red-300 text-red-700 hover:bg-red-100">
                Fazer Upgrade do Plano
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (limits.isNearLimit) {
    return (
      <Card className="border-yellow-300 bg-yellow-50 mb-6 shadow-sm">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-yellow-900 mb-1">
              Atenção: Limite Mensal Próximo ({limits.currentUsage}/{limits.limit})
            </h4>
            <p className="text-sm text-yellow-800 mb-3">
              Você ainda pode realizar {limits.remaining} {type === 'cdc' ? 'CDCs' : 'COEX'} este mês no plano {limits.planType}. 
              Considere fazer o upgrade se sua equipe está crescendo.
            </p>
            <Link to={createPageUrl("Planos")}>
              <Button size="sm" variant="outline" className="border-yellow-300 text-yellow-800 hover:bg-yellow-100">
                Ver Opções de Upgrade
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Safe usage
  return (
    <Card className="border-green-200 bg-green-50 mb-6 shadow-sm">
      <CardContent className="p-3 flex items-center gap-3">
        <CheckCircle2 className="w-5 h-5 text-green-600" />
        <p className="text-sm text-green-800">
          Você utilizou {limits.currentUsage} de {limits.limit} {type === 'cdc' ? 'CDCs' : 'COEX'} disponíveis neste mês.
        </p>
      </CardContent>
    </Card>
  );
}