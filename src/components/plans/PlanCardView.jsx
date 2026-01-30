import React, { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Star, TrendingUp, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import CheckoutConfirmModal from "./CheckoutConfirmModal";

export default function PlanCardView({ plans, billingCycle, currentPlan, onSelectPlan }) {
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState(null);

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
      // Plano gratuito - chama diretamente
      onSelectPlan?.(plan, billingCycle);
    } else {
      // Plano pago - abre modal de confirmação
      setSelectedPlanForCheckout(plan);
    }
  };

  const getBadgeIcon = (plan) => {
    if (plan.is_popular) return <Star className="w-3 h-3" />;
    if (plan.is_recommended) return <TrendingUp className="w-3 h-3" />;
    return <Zap className="w-3 h-3" />;
  };

  const isCurrentPlan = (plan) => {
    return currentPlan?.toUpperCase() === plan.plan_id?.toUpperCase();
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-4">
        {plans.map((plan) => {
          const isCurrent = isCurrentPlan(plan);
          const showBadge = plan.badge_text || plan.is_popular;

          return (
            <Card
              key={plan.id}
              className={cn(
                "relative transition-all duration-300 hover:shadow-xl border-2",
                plan.is_popular 
                  ? "border-blue-500 shadow-blue-100 scale-105" 
                  : "border-gray-200",
                isCurrent && "ring-2 ring-green-500"
              )}
            >
              {/* Badge no topo */}
              {showBadge && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge 
                    className={cn(
                      "flex items-center gap-1 px-3 py-1",
                      plan.is_popular 
                        ? "bg-blue-600 text-white" 
                        : "bg-gradient-to-r from-orange-500 to-pink-500 text-white"
                    )}
                  >
                    {getBadgeIcon(plan)}
                    {plan.badge_text || "Mais Popular"}
                  </Badge>
                </div>
              )}

              {isCurrent && (
                <div className="absolute -top-3 right-4">
                  <Badge className="bg-green-600 text-white">
                    Plano Atual
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-4 pt-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {plan.plan_name}
                </h3>
                
                {/* Preço */}
                <div className="mb-4">
                  {plan.price_monthly > 0 || plan.price_annual > 0 ? (
                    <>
                      <div className="text-4xl font-bold text-blue-600">
                        {getPrice(plan)}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        por {billingCycle === "monthly" ? "mês" : "ano"}
                      </div>
                    </>
                  ) : (
                    <div className="text-4xl font-bold text-green-600">
                      Grátis
                    </div>
                  )}
                </div>

                {/* Descrição */}
                {plan.plan_description && (
                  <p className="text-sm text-gray-600 min-h-[40px]">
                    {plan.plan_description}
                  </p>
                )}
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Features Highlights */}
                <div className="space-y-2">
                  {plan.features_highlights?.slice(0, 8).map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <Button
                  onClick={() => handleSelectPlan(plan)}
                  disabled={isCurrent}
                  className={cn(
                    "w-full mt-6",
                    plan.is_popular 
                      ? "bg-blue-600 hover:bg-blue-700" 
                      : "bg-gray-900 hover:bg-gray-800",
                    isCurrent && "bg-gray-300 cursor-not-allowed"
                  )}
                >
                  {isCurrent 
                    ? "Plano Atual" 
                    : plan.price_monthly > 0 || plan.price_annual > 0
                      ? "Escolher Plano"
                      : "Começar Grátis"
                  }
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Modal de confirmação para checkout */}
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