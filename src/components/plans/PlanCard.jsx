import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Star, TrendingUp, TrendingDown, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import CheckoutDialog from "./CheckoutDialog";

export default function PlanCard({ plan, currentPlan, actionType, onSelect, workshopLimits, user, workshop }) {
  const isCurrentPlan = plan.plan_id === currentPlan;
  const isHighlighted = plan.destacado || isCurrentPlan;
  const [showCheckout, setShowCheckout] = useState(false);

  const getActionButton = () => {
    if (actionType === "current") {
      return (
        <Button className="w-full bg-green-600 hover:bg-green-700" disabled>
          <Crown className="w-4 h-4 mr-2" />
          Seu Plano Atual
        </Button>
      );
    }

    if (actionType === "upgrade") {
      return (
        <Button 
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          onClick={() => setShowCheckout(true)}
        >
          <TrendingUp className="w-4 h-4 mr-2" />
          Comprar Upgrade
        </Button>
      );
    }

    if (actionType === "downgrade") {
      return (
        <Button 
          variant="outline" 
          className="w-full border-2 hover:bg-gray-50"
          onClick={onSelect}
        >
          <TrendingDown className="w-4 h-4 mr-2" />
          Fazer Downgrade
        </Button>
      );
    }

    return (
      <Button 
        className="w-full bg-blue-600 hover:bg-blue-700"
        onClick={() => setShowCheckout(true)}
      >
        Comprar Plano
      </Button>
    );
  };

  const renderLimitValue = (key, value) => {
    if (typeof value === "boolean") {
      return value ? (
        <Check className="w-5 h-5 text-green-600" />
      ) : (
        <X className="w-5 h-5 text-gray-400" />
      );
    }

    if (typeof value === "number") {
      return value === -1 || value === 999999 ? "Ilimitado" : value;
    }

    return value || "-";
  };

  const getLimitLabel = (key) => {
    const labels = {
      diagnosticosMes: "Diagnósticos/Mês",
      colaboradores: "Colaboradores",
      filiais: "Filiais",
      usuarios: "Usuários",
      exportarPDF: "Exportar PDF",
      rhCompleto: "RH Completo",
      cdc: "CDC",
      coex: "COEX",
      iaBasica: "IA Básica",
      iaIntermediaria: "IA Intermediária",
      iaPreditiva: "IA Preditiva",
      iaCoach: "IA Coach",
      multilojas: "Multi-lojas",
      treinamentosPremium: "Treinamentos Premium",
      rankingNacional: "Ranking Nacional",
      alertsRHFinanceiro: "Alertas RH/Financeiro",
      gamificacao: "Gamificação",
      relatoriosAvancados: "Relatórios Avançados",
      dashboardsAvancados: "Dashboards Avançados",
      comparativosNacionais: "Comparativos Nacionais",
      scoreEmocional: "Score Emocional",
      dataLake: "Data Lake",
      consultoriaPersonalizada: "Consultoria Personalizada"
    };
    return labels[key] || key;
  };

  const getPriceDisplay = () => {
    if (!plan.price || plan.price === "0" || plan.price === "Grátis") {
      return (
        <div className="mb-6">
          <div className="text-4xl font-bold text-gray-900">Grátis</div>
          <p className="text-sm text-gray-600 mt-1">Sem custos</p>
        </div>
      );
    }

    return (
      <div className="mb-6">
        <div className="text-4xl font-bold text-gray-900">
          {plan.price}
        </div>
      </div>
    );
  };

  return (
    <Card
      className={cn(
        "relative transition-all duration-300 hover:shadow-2xl",
        isHighlighted && "border-4 border-blue-500 shadow-xl scale-105",
        isCurrentPlan && "bg-gradient-to-br from-green-50 to-emerald-50"
      )}
    >
      {isHighlighted && !isCurrentPlan && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <Badge className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-1 flex items-center gap-1">
            <Star className="w-3 h-3" />
            Recomendado
          </Badge>
        </div>
      )}

      {isCurrentPlan && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <Badge className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-1 flex items-center gap-1">
            <Crown className="w-3 h-3" />
            Seu Plano
          </Badge>
        </div>
      )}

      <CardHeader className={cn("text-center pb-4", isCurrentPlan && "pt-8")}>
        <CardTitle className="text-2xl font-bold text-gray-900 mb-2">
          {plan.plan_name}
        </CardTitle>
        {plan.plan_description && (
          <p className="text-sm text-gray-600">{plan.plan_description}</p>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {getPriceDisplay()}

        <div className="space-y-3">
          <h4 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">
            Recursos Inclusos:
          </h4>
          
          {/* Limites Principais */}
          {(plan.max_diagnostics_per_month || plan.max_employees || plan.max_branches) && (
            <div className="space-y-2">
              {plan.max_diagnostics_per_month && (
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-700 flex-1">Diagnósticos/Mês</span>
                  <div className="font-semibold text-gray-900">
                    {plan.max_diagnostics_per_month === -1 ? "Ilimitado" : plan.max_diagnostics_per_month}
                  </div>
                </div>
              )}
              {plan.max_employees && (
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-700 flex-1">Colaboradores</span>
                  <div className="font-semibold text-gray-900">
                    {plan.max_employees === -1 ? "Ilimitado" : plan.max_employees}
                  </div>
                </div>
              )}
              {plan.max_branches && (
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-700 flex-1">Filiais</span>
                  <div className="font-semibold text-gray-900">
                    {plan.max_branches === -1 ? "Ilimitado" : plan.max_branches}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Recursos Extras */}
          {plan.extra_resources && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h5 className="font-semibold text-gray-900 text-xs uppercase tracking-wide mb-2">
                Recursos:
              </h5>
              <p className="text-sm text-gray-700 whitespace-pre-line">
                {plan.extra_resources}
              </p>
            </div>
          )}
        </div>

        <div className="pt-4">
          {getActionButton()}
        </div>

        <CheckoutDialog 
          open={showCheckout}
          onClose={() => setShowCheckout(false)}
          plan={{
            id: plan.id,
            plan_id: plan.plan_id,
            plan_name: plan.plan_name,
            price: plan.price,
            kiwify_checkout_url: plan.kiwify_checkout_url
          }}
          user={user}
          workshop={workshop}
        />
      </CardContent>
    </Card>
  );
}