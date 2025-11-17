
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Zap, Loader2, Crown } from "lucide-react";
import CheckoutModal from "../components/plans/CheckoutModal";
import DynamicHelpSystem from "@/components/help/DynamicHelpSystem";
import QuickTipsBar from "@/components/help/QuickTipsBar";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function Planos() {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false); // Renamed for consistency with outline

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: workshops = [] } = useQuery({
    queryKey: ['workshops', user?.id],
    queryFn: () => base44.entities.Workshop.filter({ owner_id: user.id }),
    enabled: !!user
  });

  const workshop = workshops[0];

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: () => base44.entities.Plan.list('ordem')
  });

  const handleSelectPlan = (plan) => {
    if (!user) {
      base44.auth.redirectToLogin(window.location.href);
      return;
    }
    setSelectedPlan(plan);
    setIsCheckoutOpen(true); // Renamed for consistency with outline
  };

  const isCurrentPlan = (planName) => {
    return workshop?.planoAtual === planName;
  };

  const planosTips = [
    "Cada plano oferece limites diferentes de diagnósticos, colaboradores e recursos de IA",
    "Planos superiores desbloqueiam ferramentas avançadas de RH e relatórios",
    "Você pode fazer upgrade a qualquer momento - o valor será proporcional",
    "Experimente o plano FREE para conhecer a plataforma antes de assinar"
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4">
      <DynamicHelpSystem pageName="Planos" />
      
      <div className="max-w-7xl mx-auto">
        <QuickTipsBar tips={planosTips} pageName="planos" />

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Escolha o Plano Ideal para sua Oficina
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Acelere o crescimento do seu negócio com as ferramentas certas
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
          {plans.map((plan) => {
            const isCurrent = isCurrentPlan(plan.nome);
            const isHighlighted = plan.destacado;
            
            return (
              <Card 
                key={plan.id} 
                className={`relative shadow-lg hover:shadow-2xl transition-all ${
                  isHighlighted ? 'border-4 border-blue-500 scale-105' : ''
                } ${isCurrent ? 'border-2 border-green-500' : ''}`}
              >
                {isHighlighted && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-blue-600 text-white px-4 py-1 flex items-center gap-1">
                      <Crown className="w-4 h-4" />
                      Mais Popular
                    </Badge>
                  </div>
                )}
                
                {isCurrent && (
                  <div className="absolute -top-4 right-4">
                    <Badge className="bg-green-600 text-white px-3 py-1">
                      Plano Atual
                    </Badge>
                  </div>
                )}

                <CardHeader className={isHighlighted ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg' : ''}>
                  <CardTitle className="text-2xl mb-2">{plan.nome}</CardTitle>
                  <div className={`text-3xl font-bold mb-2 ${isHighlighted ? 'text-white' : 'text-blue-600'}`}>
                    {plan.preco ? `R$ ${plan.preco.toFixed(2)}` : 'Grátis'}
                  </div>
                  {plan.preco && (
                    <div className={isHighlighted ? 'text-blue-100' : 'text-gray-600'}>
                      por mês
                    </div>
                  )}
                </CardHeader>

                <CardContent className="pt-6 pb-4">
                  <p className="text-gray-600 mb-6 min-h-[60px]">{plan.descricao}</p>

                  {/* Limites principais */}
                  <div className="space-y-2 mb-6 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Diagnósticos/mês:</span>
                      <span className="font-medium">
                        {plan.limites.diagnosticosMes === -1 ? 'Ilimitado' : plan.limites.diagnosticosMes}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Colaboradores:</span>
                      <span className="font-medium">
                        {plan.limites.colaboradores === -1 ? 'Ilimitado' : plan.limites.colaboradores}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Filiais:</span>
                      <span className="font-medium">
                        {plan.limites.filiais === -1 ? 'Ilimitado' : plan.limites.filiais}
                      </span>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="border-t pt-4 mb-6">
                    <div className="space-y-2 text-sm">
                      {plan.limites.exportarPDF && (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <span>Exportar PDF</span>
                        </div>
                      )}
                      {plan.limites.rhCompleto && (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <span>RH Completo</span>
                        </div>
                      )}
                      {plan.limites.cdc && (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <span>CDC e COEX</span>
                        </div>
                      )}
                      {plan.limites.iaBasica && (
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                          <span>IA Básica</span>
                        </div>
                      )}
                      {plan.limites.iaIntermediaria && (
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                          <span>IA Intermediária</span>
                        </div>
                      )}
                      {plan.limites.iaPreditiva && (
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-purple-600 flex-shrink-0" />
                          <span>IA Preditiva</span>
                        </div>
                      )}
                      {plan.limites.iaCoach && (
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-purple-600 flex-shrink-0" />
                          <span>IA Coach</span>
                        </div>
                      )}
                      {plan.limites.multilojas && (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <span>Multilojas</span>
                        </div>
                      )}
                      {plan.limites.gamificacao && (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <span>Gamificação</span>
                        </div>
                      )}
                      {plan.limites.consultoriaPersonalizada && (
                        <div className="flex items-center gap-2">
                          <Crown className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                          <span>Consultoria Personalizada</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <Button 
                    onClick={() => handleSelectPlan(plan)}
                    disabled={isCurrent}
                    className={`w-full ${
                      isHighlighted 
                        ? 'bg-blue-600 hover:bg-blue-700' 
                        : isCurrent 
                        ? 'bg-gray-300' 
                        : 'bg-gray-900 hover:bg-gray-800'
                    }`}
                  >
                    {isCurrent ? 'Plano Atual' : 'Selecionar Plano'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="mt-16 max-w-3xl mx-auto" id="faq-planos">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Perguntas Frequentes
          </h2>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>Como funciona o período de teste?</AccordionTrigger>
              <AccordionContent>
                O plano FREE é gratuito para sempre e permite que você explore as funcionalidades básicas. 
                Planos pagos podem ser testados com garantia de 7 dias.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>Posso mudar de plano depois?</AccordionTrigger>
              <AccordionContent>
                Sim! Você pode fazer upgrade ou downgrade a qualquer momento. 
                O valor será ajustado proporcionalmente ao período restante.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger>Quais formas de pagamento são aceitas?</AccordionTrigger>
              <AccordionContent>
                Aceitamos cartão de crédito, PIX e boleto bancário. 
                Pagamentos mensais ou anuais (com desconto).
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4">
              <AccordionTrigger>O que acontece se eu exceder os limites?</AccordionTrigger>
              <AccordionContent>
                Você receberá notificações quando estiver próximo dos limites. 
                Para continuar usando, será necessário fazer upgrade do plano.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>

      <CheckoutModal 
        isOpen={isCheckoutOpen} // Updated prop name
        onClose={() => setIsCheckoutOpen(false)} // Updated setter
        plan={selectedPlan}
        workshop={workshop}
      />
    </div>
  );
}
