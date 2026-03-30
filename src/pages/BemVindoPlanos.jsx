import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Check, Loader2, ArrowRight } from "lucide-react";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";

export default function BemVindoPlanos() {
  const [user, setUser] = useState(null);
  const [isAnnual, setIsAnnual] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['planFeaturesPublicWelcome'],
    queryFn: () => base44.entities.PlanFeature.filter({ active: true })
  });

  const handleSelectPlan = (plan) => {
    const checkoutUrl = isAnnual ? plan.kiwify_checkout_url_annual : plan.kiwify_checkout_url_monthly;
    if (checkoutUrl) {
        window.open(checkoutUrl, "_blank");
    }
    window.location.href = createPageUrl("Home");
  };

  const handleSkip = () => {
    window.location.href = createPageUrl("Home");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
        <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-red-500" />
            <p className="text-gray-400">Preparando seus planos...</p>
        </div>
      </div>
    );
  }

  // Ordena os planos pela coluna order
  const sortedPlans = [...plans].sort((a, b) => (a.order || 0) - (b.order || 0));

  // Planos de fallback caso o banco não tenha nenhum configurado
  const displayPlans = sortedPlans.length > 0 ? sortedPlans : [
    {
      id: "free",
      plan_name: "Free",
      plan_description: "O essencial para oficinas iniciantes.",
      price_monthly: 0,
      price_annual: 0,
      features_highlights: ["Acesso básico ao sistema", "Gestão de 1 usuário", "Dashboards simples", "Suporte da comunidade"],
      is_popular: false
    },
    {
      id: "growth",
      plan_name: "Growth",
      plan_description: "Para oficinas em crescimento que buscam organizar o caos.",
      price_monthly: 197,
      price_annual: 1890,
      features_highlights: ["Tudo do Free", "Diagnósticos Ilimitados", "Gestão Financeira e OS", "Suporte prioritário via WhatsApp", "Acesso a relatórios e KPIs"],
      is_popular: true,
      badge_text: "Mais Escolhido"
    },
    {
      id: "pro",
      plan_name: "Pro",
      plan_description: "Controle total para multi-unidades e alta performance.",
      price_monthly: 497,
      price_annual: 4770,
      features_highlights: ["Tudo do Growth", "Multi Unidades", "Integrações via API", "Atendimento exclusivo com especialista", "Treinamentos e Academias ilimitados"],
      is_popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center py-16 px-4 font-sans text-gray-200 overflow-x-hidden">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-4xl mb-12"
      >
        <div className="mb-8 flex justify-center">
          <img 
            src="https://media.base44.com/images/public/69540822472c4a70b54d47aa/121a4c254_Horizontal_Fundo_Claro.png" 
            alt="Oficinas Master" 
            className="h-24 object-contain brightness-0 invert"
          />
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-6 tracking-tight leading-tight">
          Bem-vindo à plataforma que organiza <br className="hidden md:block"/> e faz sua oficina crescer
        </h1>
        <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto">
          Escolha o plano ideal para o tamanho da sua oficina. Você pode alterar ou cancelar quando quiser.
        </p>
      </motion.div>

      {/* Toggle */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex items-center bg-[#111827] border border-gray-800 p-1.5 rounded-full mb-16"
      >
        <button
          onClick={() => setIsAnnual(false)}
          className={`px-8 py-3 rounded-full text-sm font-semibold transition-all ${!isAnnual ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
        >
          Mensal
        </button>
        <button
          onClick={() => setIsAnnual(true)}
          className={`px-8 py-3 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${isAnnual ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
        >
          Anual <span className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-2.5 py-0.5 rounded-full font-bold ml-1">Economize 20%</span>
        </button>
      </motion.div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl w-full mb-20 px-4 md:px-0">
        {displayPlans.map((plan, index) => {
          const isPopular = plan.is_popular;
          return (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -8 }}
            className="flex h-full"
          >
            <div className={`relative w-full flex flex-col transition-all duration-300 rounded-3xl bg-[#111827] ${isPopular ? 'border-2 border-red-500 shadow-[0_0_50px_-12px_rgba(239,68,68,0.25)] z-10 md:scale-105' : 'border border-[#1f2937] hover:border-gray-600'}`}>
              {isPopular && (
                <div className="absolute -top-4 left-0 right-0 flex justify-center">
                  <span className="bg-red-500 text-white text-xs font-bold py-1.5 px-4 rounded-full shadow-lg tracking-wide uppercase border border-red-400/50">
                    {plan.badge_text || 'Mais Escolhido'}
                  </span>
                </div>
              )}
              
              <div className="p-8 md:p-10 flex flex-col h-full">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-white mb-3">{plan.plan_name}</h3>
                  <p className="text-gray-400 text-sm min-h-[40px] leading-relaxed">{plan.plan_description}</p>
                </div>

                <div className="mb-8">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl text-gray-500 font-bold">R$</span>
                    <span className="text-5xl md:text-6xl font-extrabold text-white tracking-tight">
                       {isAnnual ? (plan.price_annual || 0) : (plan.price_monthly || 0)}
                    </span>
                  </div>
                  <span className="text-gray-500 text-sm font-medium mt-2 inline-block">
                    /{isAnnual ? 'ano' : 'mês'} faturado {isAnnual ? 'anualmente' : 'mensalmente'}
                  </span>
                </div>
                
                <div className="flex-1 flex flex-col">
                  <ul className="space-y-4 mb-4">
                    {plan.features_highlights?.slice(0, 5).map((highlight, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <div className="mt-1 shrink-0 bg-red-500/10 p-1 rounded-full">
                          <Check className="w-3.5 h-3.5 text-red-500" strokeWidth={3} />
                        </div>
                        <span className="text-gray-300 text-sm leading-relaxed">{highlight}</span>
                      </li>
                    ))}
                  </ul>
                  
                  {plan.features_highlights?.length > 5 ? (
                    <Dialog>
                      <DialogTrigger asChild>
                        <button className="text-red-400 hover:text-red-300 text-sm font-semibold mb-6 flex items-center transition-colors text-left w-full">
                          + {plan.features_highlights.length - 5} recursos inclusos
                        </button>
                      </DialogTrigger>
                      <DialogContent className="bg-[#111827] border border-gray-800 text-white sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle className="text-2xl font-bold mb-2">Todos os recursos - {plan.plan_name}</DialogTitle>
                        </DialogHeader>
                        <div className="max-h-[60vh] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                          <ul className="space-y-4 py-2">
                            {plan.features_highlights.map((highlight, idx) => (
                              <li key={idx} className="flex items-start gap-3">
                                <div className="mt-1 shrink-0 bg-red-500/10 p-1 rounded-full">
                                  <Check className="w-3.5 h-3.5 text-red-500" strokeWidth={3} />
                                </div>
                                <span className="text-gray-300 text-sm leading-relaxed">{highlight}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </DialogContent>
                    </Dialog>
                  ) : (
                    <div className="mb-6"></div>
                  )}
                </div>

                <Button 
                  onClick={() => handleSelectPlan(plan)}
                  className={`w-full py-7 text-base font-bold transition-all rounded-xl border-none ${isPopular ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25' : 'bg-white hover:bg-gray-100 text-gray-900'}`}
                >
                  Começar agora
                </Button>
              </div>
            </div>
          </motion.div>
        )})}
      </div>

      {/* Footer Section */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex flex-col items-center text-center mt-4 space-y-8"
      >
        <div className="space-y-4">
          <p className="text-gray-400 text-lg">Não tem certeza de qual plano escolher?</p>
          <Button variant="outline" className="border-gray-700 bg-transparent text-gray-300 hover:bg-gray-800 hover:text-white rounded-full px-8 py-6">
            Falar com especialista
          </Button>
        </div>

        <div className="pt-8 border-t border-gray-800 w-full max-w-sm">
          <Button variant="link" onClick={handleSkip} className="text-gray-500 hover:text-gray-300 transition-colors group">
            Comece grátis. Sem cartão de crédito. <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
}