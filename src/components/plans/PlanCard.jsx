import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Star, TrendingUp, TrendingDown, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PlanCard({ plan, currentPlan, actionType, onSelect, workshopLimits }) {
  const isCurrentPlan = plan.nome === currentPlan;
  const isHighlighted = plan.destacado || isCurrentPlan;

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
          onClick={onSelect}
        >
          <TrendingUp className="w-4 h-4 mr-2" />
          Fazer Upgrade
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
        onClick={onSelect}
      >
        Selecionar Plano
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
    if (!plan.preco || plan.preco === 0) {
      return (
        <div className="mb-6">
          <div className="text-4xl font-bold text-gray-900">Grátis</div>
          <p className="text-sm text-gray-600 mt-1">Sem custos</p>
        </div>
      );
    }

    return (
      <div className="mb-6">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-semibold text-gray-900">R$</span>
          <span className="text-4xl font-bold text-gray-900">
            {plan.preco.toFixed(2).replace('.', ',')}
          </span>
          <span className="text-gray-600">/mês</span>
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
          {plan.nome}
        </CardTitle>
        {plan.descricao && (
          <p className="text-sm text-gray-600">{plan.descricao}</p>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {getPriceDisplay()}

        <div className="space-y-3">
          <h4 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">
            Recursos Inclusos:
          </h4>
          
          {/* Limites Principais */}
          {plan.limites && (
            <div className="space-y-2">
              {Object.entries(plan.limites).map(([key, value]) => {
                // Pular alguns campos específicos que não queremos mostrar
                if (key === "usuarios" && value === 0) return null;

                return (
                  <div 
                    key={key} 
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                  >
                    <span className="text-sm text-gray-700 flex-1">
                      {getLimitLabel(key)}
                    </span>
                    <div className="font-semibold text-gray-900 flex items-center gap-2">
                      {renderLimitValue(key, value)}
                      
                      {/* Mostrar uso atual se disponível */}
                      {workshopLimits && typeof value === "number" && workshopLimits[key] !== undefined && (
                        <span className="text-xs text-gray-500">
                          ({workshopLimits[key]} usado)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Benefícios Adicionais */}
          {plan.beneficios && plan.beneficios.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h5 className="font-semibold text-gray-900 text-xs uppercase tracking-wide mb-2">
                Benefícios:
              </h5>
              <ul className="space-y-2">
                {plan.beneficios.map((beneficio, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{beneficio}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="pt-4">
          {getActionButton()}
        </div>
      </CardContent>
    </Card>
  );
}