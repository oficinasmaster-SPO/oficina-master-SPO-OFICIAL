import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Check, Rocket, Loader2, ArrowRight } from "lucide-react";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";

export default function BemVindoPlanos() {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['planFeaturesPublicWelcome'],
    queryFn: () => base44.entities.PlanFeature.filter({ active: true })
  });

  const handleSelectPlan = (plan) => {
    // Se for um plano com link de checkout
    if (plan.kiwify_checkout_url_monthly) {
        window.open(plan.kiwify_checkout_url_monthly, "_blank");
    }
    // De qualquer forma, prosseguir para o sistema
    window.location.href = createPageUrl("Home");
  };

  const handleSkip = () => {
    window.location.href = createPageUrl("Home");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-slate-600">Preparando seus planos...</p>
        </div>
      </div>
    );
  }

  // Sort plans by order
  const sortedPlans = [...plans].sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50/50 flex flex-col items-center py-12 px-4">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-3xl mb-12"
      >
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
          <Rocket className="w-10 h-10 text-blue-600" />
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 mb-4">
          Tudo pronto, {user?.full_name?.split(' ')[0] || 'Gestor'}!
        </h1>
        <p className="text-xl text-slate-600">
          Seu ambiente foi criado com sucesso. Para destravar todo o potencial da nossa plataforma e acelerar seus resultados, escolha o plano ideal para o tamanho da sua oficina:
        </p>
      </motion.div>

      {sortedPlans.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full mb-12">
          {sortedPlans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex h-full"
            >
              <Card className={`relative w-full flex flex-col transition-all duration-300 ${plan.is_popular ? 'border-2 border-blue-500 shadow-xl scale-105 z-10' : 'border border-slate-200 hover:shadow-lg'}`}>
                {plan.is_popular && (
                  <div className="absolute -top-4 left-0 right-0 flex justify-center">
                    <span className="bg-blue-600 text-white text-sm font-bold py-1 px-6 rounded-full shadow-md">
                      {plan.badge_text || 'Mais Escolhido'}
                    </span>
                  </div>
                )}
                <CardHeader className="text-center pb-4 pt-8 bg-slate-50/50 rounded-t-xl">
                  <CardTitle className="text-2xl font-bold text-slate-900">{plan.plan_name}</CardTitle>
                  <CardDescription className="min-h-[40px] mt-2 font-medium">{plan.plan_description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 text-center pt-6">
                  <div className="mb-8">
                    <span className="text-5xl font-black text-slate-900">R$ {plan.price_monthly || 0}</span>
                    <span className="text-slate-500 font-medium">/mês</span>
                  </div>
                  
                  <ul className="space-y-4 text-left mb-6">
                    {plan.features_highlights?.map((highlight, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <div className="mt-0.5 bg-green-100 p-1 rounded-full shrink-0">
                          <Check className="w-3 h-3 text-green-700" strokeWidth={3} />
                        </div>
                        <span className="text-slate-700 font-medium">{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="pb-8 pt-4 px-6">
                  <Button 
                    onClick={() => handleSelectPlan(plan)}
                    className={`w-full text-lg h-14 shadow-md transition-all ${plan.is_popular ? 'bg-blue-600 hover:bg-blue-700 hover:shadow-xl' : 'bg-slate-800 hover:bg-slate-900'}`}
                  >
                    Assinar {plan.plan_name}
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-slate-100 w-full max-w-2xl mb-8">
          <p className="text-slate-500 mb-6">Nenhum plano configurado no momento.</p>
        </div>
      )}

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <Button variant="ghost" onClick={handleSkip} className="text-slate-500 hover:text-slate-800 font-medium h-12 px-6">
          Explorar o sistema e escolher depois <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </motion.div>
    </div>
  );
}