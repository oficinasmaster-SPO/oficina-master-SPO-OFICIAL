import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Check, X, Search, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import CheckoutConfirmModal from "./CheckoutConfirmModal";

export default function PlanComparisonTable({ plans, billingCycle, currentPlan, onSelectPlan }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showDifferencesOnly, setShowDifferencesOnly] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState({});
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState(null);

  // Agrupar features por categoria
  const featuresByCategory = useMemo(() => {
    const categoryMap = {};

    plans.forEach(plan => {
      plan.comparison_features?.forEach(feature => {
        const category = feature.category || "Outros";
        if (!categoryMap[category]) {
          categoryMap[category] = [];
        }
        
        // Adicionar feature se ainda não existe
        const exists = categoryMap[category].some(f => f.feature_key === feature.feature_key);
        if (!exists) {
          categoryMap[category].push({
            feature_key: feature.feature_key,
            feature_label: feature.feature_label,
            value_type: feature.value_type
          });
        }
      });
    });

    return categoryMap;
  }, [plans]);

  // Filtrar features por busca
  const filteredCategories = useMemo(() => {
    if (!searchQuery) return featuresByCategory;

    const filtered = {};
    const query = searchQuery.toLowerCase();

    Object.entries(featuresByCategory).forEach(([category, features]) => {
      const matchingFeatures = features.filter(f => 
        f.feature_label.toLowerCase().includes(query) ||
        category.toLowerCase().includes(query)
      );

      if (matchingFeatures.length > 0) {
        filtered[category] = matchingFeatures;
      }
    });

    return filtered;
  }, [featuresByCategory, searchQuery]);

  // Filtrar por diferenças
  const displayCategories = useMemo(() => {
    if (!showDifferencesOnly) return filteredCategories;

    const withDifferences = {};

    Object.entries(filteredCategories).forEach(([category, features]) => {
      const differentFeatures = features.filter(feature => {
        const values = plans.map(plan => getFeatureValue(plan, feature.feature_key));
        const firstValue = JSON.stringify(values[0]);
        return values.some(v => JSON.stringify(v) !== firstValue);
      });

      if (differentFeatures.length > 0) {
        withDifferences[category] = differentFeatures;
      }
    });

    return withDifferences;
  }, [filteredCategories, showDifferencesOnly, plans]);

  const getFeatureValue = (plan, featureKey) => {
    const feature = plan.comparison_features?.find(f => f.feature_key === featureKey);
    return feature?.value;
  };

  const renderFeatureValue = (value, valueType) => {
    if (value === undefined || value === null) {
      return <X className="w-5 h-5 text-gray-300 mx-auto" />;
    }

    if (valueType === "boolean") {
      return value ? (
        <Check className="w-5 h-5 text-green-500 mx-auto" />
      ) : (
        <X className="w-5 h-5 text-gray-300 mx-auto" />
      );
    }

    if (valueType === "number") {
      return (
        <span className="text-sm font-medium text-gray-900">
          {value === -1 ? "Ilimitado" : value}
        </span>
      );
    }

    return (
      <span className="text-sm text-gray-700">{value}</span>
    );
  };

  const toggleCategory = (category) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const getPrice = (plan) => {
    if (billingCycle === "monthly") {
      return plan.price_display_monthly || `R$ ${(plan.price_monthly || 0).toFixed(2)}`;
    }
    return plan.price_display_annual || `R$ ${(plan.price_annual || 0).toFixed(2)}`;
  };

  const getCheckoutUrl = (plan) => {
    if (billingCycle === "monthly") {
      return plan.kiwify_checkout_url_monthly || plan.kiwify_checkout_url;
    }
    return plan.kiwify_checkout_url_annual || plan.kiwify_checkout_url;
  };

  const handleSelectPlan = (plan) => {
    if (plan.plan_id === 'FREE') {
      onSelectPlan?.(plan, billingCycle);
    } else {
      setSelectedPlanForCheckout(plan);
    }
  };

  const isCurrentPlan = (plan) => {
    return currentPlan?.toUpperCase() === plan.plan_id?.toUpperCase();
  };

  return (
    <>
      <div className="space-y-4">
        {/* Controles */}
        <div className="flex items-center justify-between gap-4 mb-6">
          {/* Busca */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Pesquisar recursos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Toggle diferenças */}
          <div className="flex items-center gap-2">
            <Switch
              checked={showDifferencesOnly}
              onCheckedChange={setShowDifferencesOnly}
              id="show-differences"
            />
            <Label htmlFor="show-differences" className="text-sm font-medium cursor-pointer">
              Mostrar apenas diferenças
            </Label>
          </div>
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 text-left text-white font-semibold min-w-[250px]">
                  Recursos
                </th>
                {plans.map(plan => {
                  const isCurrent = isCurrentPlan(plan);
                  return (
                    <th key={plan.id} className="px-4 py-4 text-center text-white font-semibold min-w-[160px]">
                      <div className="space-y-2">
                        <div className="font-bold text-lg">{plan.plan_name}</div>
                        <div className="text-sm font-normal text-blue-100">
                          {getPrice(plan)}
                        </div>
                        {isCurrent && (
                          <div className="text-xs bg-green-500 text-white px-2 py-1 rounded-full inline-block">
                            Plano Atual
                          </div>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {Object.entries(displayCategories).map(([category, features], categoryIdx) => (
                <React.Fragment key={category}>
                  {/* Linha de categoria */}
                  <tr className="bg-gray-100 border-t-2 border-gray-300">
                    <td 
                      colSpan={plans.length + 1}
                      className="px-6 py-3 cursor-pointer hover:bg-gray-200 transition-colors"
                      onClick={() => toggleCategory(category)}
                    >
                      <div className="flex items-center gap-2">
                        {collapsedCategories[category] ? (
                          <ChevronRight className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                        <span className="font-semibold text-gray-900">{category}</span>
                        <span className="text-xs text-gray-500">({features.length} recursos)</span>
                      </div>
                    </td>
                  </tr>

                  {/* Features da categoria */}
                  {!collapsedCategories[category] && features.map((feature, featureIdx) => (
                    <tr 
                      key={feature.feature_key}
                      className={cn(
                        "border-t border-gray-200",
                        featureIdx % 2 === 0 ? "bg-white" : "bg-gray-50"
                      )}
                    >
                      <td className="px-6 py-3 text-sm font-medium text-gray-900">
                        {feature.feature_label}
                      </td>
                      {plans.map(plan => (
                        <td key={`${plan.id}-${feature.feature_key}`} className="px-4 py-3 text-center">
                          {renderFeatureValue(
                            getFeatureValue(plan, feature.feature_key),
                            feature.value_type
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </React.Fragment>
              ))}

              {/* Linha de CTAs */}
              <tr className="bg-gray-50 border-t-2 border-gray-300">
                <td className="px-6 py-4 font-semibold text-gray-900">
                  Escolher Plano
                </td>
                {plans.map(plan => {
                  const isCurrent = isCurrentPlan(plan);
                  return (
                    <td key={`cta-${plan.id}`} className="px-4 py-4 text-center">
                      <Button
                        onClick={() => handleSelectPlan(plan)}
                        disabled={isCurrent}
                        className={cn(
                          "w-full",
                          plan.is_popular 
                            ? "bg-blue-600 hover:bg-blue-700" 
                            : "bg-gray-900 hover:bg-gray-800",
                          isCurrent && "bg-gray-300 cursor-not-allowed"
                        )}
                      >
                        {isCurrent 
                          ? "Plano Atual" 
                          : plan.price_monthly > 0 || plan.price_annual > 0
                            ? "Assinar"
                            : "Começar Grátis"
                        }
                      </Button>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>

        {Object.keys(displayCategories).length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Nenhum recurso encontrado com os filtros aplicados.
          </div>
        )}
      </div>

      {/* Modal de confirmação */}
      {selectedPlanForCheckout && (
        <CheckoutConfirmModal
          open={!!selectedPlanForCheckout}
          onClose={() => setSelectedPlanForCheckout(null)}
          plan={selectedPlanForCheckout}
          billingCycle={billingCycle}
          checkoutUrl={getCheckoutUrl(selectedPlanForCheckout)}
        />
      )}
    </>
  );
}