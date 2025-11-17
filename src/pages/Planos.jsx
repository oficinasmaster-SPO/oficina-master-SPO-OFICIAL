import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Zap, Loader2, Crown } from "lucide-react";
import CheckoutModal from "../components/plans/CheckoutModal";

export default function Planos() {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

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
    setCheckoutOpen(true);
  };

  const isCurrentPlan = (planName) => {
    return workshop?.planoAtual === planName;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Escolha o Plano Ideal para Sua Oficina
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Transforme sua oficina com inteligência artificial e ferramentas profissionais de gestão
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

        {/* FAQ ou informações adicionais */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Dúvidas Frequentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Posso mudar de plano a qualquer momento?</h3>
              <p className="text-gray-600">Sim! Você pode fazer upgrade ou downgrade a qualquer momento.</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Como funciona o período de cobrança?</h3>
              <p className="text-gray-600">A cobrança é mensal e renovada automaticamente na data da assinatura.</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Há garantia de reembolso?</h3>
              <p className="text-gray-600">Sim, oferecemos garantia de 7 dias para todos os planos pagos.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <CheckoutModal 
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        plan={selectedPlan}
        workshop={workshop}
      />
    </div>
  );
}