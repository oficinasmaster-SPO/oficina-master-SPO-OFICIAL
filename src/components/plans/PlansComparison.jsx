import React from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PlansComparison({ plans }) {
  // Extrair todas as features únicas de todos os planos
  const allFeatures = new Set();
  plans.forEach(plan => {
    if (plan.limites) Object.keys(plan.limites).forEach(f => allFeatures.add(f));
    if (plan.beneficios) plan.beneficios.forEach(b => allFeatures.add(b));
  });

  const featureList = Array.from(allFeatures);

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

  const hasFeature = (plan, feature) => {
    if (plan.limites?.[feature] !== undefined) {
      const val = plan.limites[feature];
      return val !== null && val !== false && val !== 0;
    }
    return plan.beneficios?.includes(feature) || false;
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full">
        <thead>
          <tr className="bg-gradient-to-r from-blue-600 to-indigo-600">
            <th className="px-6 py-4 text-left text-white font-semibold">Características</th>
            {plans.map(plan => (
              <th key={plan.id} className="px-4 py-4 text-center text-white font-semibold min-w-[140px]">
                <div className="font-bold">{plan.nome}</div>
                {plan.preco ? (
                  <div className="text-sm font-normal text-blue-100">
                    R$ {plan.preco.toFixed(2).replace('.', ',')}
                  </div>
                ) : (
                  <div className="text-sm font-normal text-blue-100">Grátis</div>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {featureList.map((feature, idx) => (
            <tr 
              key={feature} 
              className={cn(
                "border-t border-gray-200",
                idx % 2 === 0 ? "bg-white" : "bg-gray-50"
              )}
            >
              <td className="px-6 py-4 text-sm font-medium text-gray-900">
                {getLimitLabel(feature)}
              </td>
              {plans.map(plan => (
                <td key={`${plan.id}-${feature}`} className="px-4 py-4 text-center">
                  {hasFeature(plan, feature) ? (
                    <Check className="w-5 h-5 text-green-500 mx-auto" />
                  ) : (
                    <X className="w-5 h-5 text-gray-300 mx-auto" />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}