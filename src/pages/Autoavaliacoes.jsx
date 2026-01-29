import React, { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, Phone, Megaphone, Users, DollarSign, Building2, LayoutGrid, ArrowRight, History, CalendarClock, AlertCircle, Lock } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { differenceInDays } from "date-fns";

export default function Autoavaliacoes() {
  const navigate = useNavigate();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: workshop } = useQuery({
    queryKey: ['user-workshop', user?.id],
    queryFn: async () => {
      const workshops = await base44.entities.Workshop.list();
      return workshops.find(w => w.owner_id === user?.id);
    },
    enabled: !!user
  });

  const { data: assessmentsHistory = [] } = useQuery({
    queryKey: ['process-assessments-check', workshop?.id],
    queryFn: () => base44.entities.ProcessAssessment.filter({ workshop_id: workshop.id }),
    initialData: [],
    enabled: !!workshop
  });

  const checkAvailability = (typeId) => {
    // Filter assessments of this type
    const typeHistory = assessmentsHistory
      .filter(a => a.assessment_type === typeId)
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

    if (typeHistory.length === 0) return { available: true };

    const lastAssessment = typeHistory[0];
    const daysSince = differenceInDays(new Date(), new Date(lastAssessment.created_date));
    const daysRemaining = 7 - daysSince;

    if (daysSince < 7) {
      return {
        available: false,
        daysRemaining,
        lastDate: new Date(lastAssessment.created_date)
      };
    }

    return { available: true };
  };

  const assessments = [
    {
      title: "Processos de Vendas",
      description: "Controle, ticket médio, TCMP2, R70/I30, comissão e metas",
      icon: TrendingUp,
      color: "from-green-500 to-emerald-600",
      href: "AutoavaliacaoVendas",
      typeId: "vendas"
    },
    {
      title: "Processos Comerciais",
      description: "Ligações, agendamento, no show, pós-venda e indicações",
      icon: Phone,
      color: "from-blue-500 to-blue-600",
      href: "AutoavaliacaoComercial",
      typeId: "comercial"
    },
    {
      title: "Processos de Marketing",
      description: "Anúncios, Google Ads, Meta Ads, redes sociais e conteúdo",
      icon: Megaphone,
      color: "from-amber-500 to-orange-600",
      href: "AutoavaliacaoMarketing",
      typeId: "marketing"
    },
    {
      title: "Processos de Pessoas",
      description: "One-on-one, treinamento, CDC, feedbacks e plano de carreira",
      icon: Users,
      color: "from-purple-500 to-purple-600",
      href: "AutoavaliacaoPessoas",
      typeId: "pessoas"
    },
    {
      title: "Processos Financeiros",
      description: "Controle, compras, geração de caixa, despesas e orçamento",
      icon: DollarSign,
      color: "from-green-500 to-teal-600",
      href: "AutoavaliacaoFinanceiro",
      typeId: "financeiro"
    },
    {
      title: "Avaliação Empresarial",
      description: "Gestão, inovação, lucros, visão, clima e produtividade",
      icon: Building2,
      color: "from-pink-500 to-rose-600",
      href: "AutoavaliacaoEmpresarial",
      typeId: "empresarial"
    },
    {
      title: "Avaliação MA3 - Áreas",
      description: "Vendas, comercial, financeiro, técnico, estoque e RH",
      icon: LayoutGrid,
      color: "from-cyan-500 to-blue-600",
      href: "AutoavaliacaoMA3",
      typeId: "ma3"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Mapa da Autoavaliação da Empresa
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Avalie processos semanalmente, identifique gargalos e acompanhe a evolução mensal.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
          <Button 
            size="lg" 
            variant="outline" 
            className="bg-white hover:bg-gray-50 shadow-sm border-blue-200 hover:border-blue-400 text-blue-700"
            onClick={() => navigate(createPageUrl("Historico"))}
          >
            <History className="w-5 h-5 mr-2" />
            Histórico Completo
          </Button>
          
          <Button 
            size="lg" 
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all"
            onClick={() => navigate(createPageUrl("ConsolidadoMensal"))}
          >
            <CalendarClock className="w-5 h-5 mr-2" />
            Ver Consolidado Mensal
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assessments.map((assessment) => {
            const Icon = assessment.icon;
            const status = checkAvailability(assessment.typeId);
            const isLocked = !status.available;

            return (
              <div key={assessment.href} className="h-full relative">
                <Card className={`h-full transition-all duration-300 border-2 ${isLocked ? 'opacity-75 bg-gray-50 border-gray-200' : 'hover:shadow-2xl hover:border-blue-300 hover:-translate-y-1 bg-white'}`}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${isLocked ? 'from-gray-400 to-gray-500' : assessment.color} flex items-center justify-center mb-3 transition-transform`}>
                        <Icon className="w-7 h-7 text-white" />
                        </div>
                        {isLocked && (
                            <div className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                <Lock className="w-3 h-3" />
                                {status.daysRemaining} dias
                            </div>
                        )}
                    </div>
                    <CardTitle className={`text-xl transition-colors ${isLocked ? 'text-gray-500' : 'text-gray-900'}`}>
                      {assessment.title}
                    </CardTitle>
                    <CardDescription className="text-sm leading-relaxed">
                      {assessment.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLocked ? (
                        <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-100 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <span>
                                Disponível em {status.daysRemaining} dia(s). 
                                <br/>
                                <span className="text-xs opacity-80">Avaliação permitida apenas uma vez por semana.</span>
                            </span>
                        </div>
                    ) : (
                        <div className="text-sm text-green-600 bg-green-50 p-3 rounded-lg border border-green-100 flex items-center gap-2">
                            <CalendarClock className="w-4 h-4" />
                            <span>Disponível para avaliação semanal</span>
                        </div>
                    )}
                  </CardContent>
                  <CardFooter>
                    <Button 
                        variant={isLocked ? "outline" : "default"} 
                        className={`w-full ${isLocked ? '' : 'bg-slate-900 hover:bg-slate-800'}`}
                        disabled={isLocked}
                        onClick={() => navigate(createPageUrl(assessment.href))}
                    >
                      {isLocked ? 'Aguardando Prazo' : 'Iniciar Avaliação'}
                      {!isLocked && <ArrowRight className="w-4 h-4 ml-2" />}
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}