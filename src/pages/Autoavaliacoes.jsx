import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, Phone, Megaphone, Users, DollarSign, Building2, LayoutGrid, Target, ArrowRight, History, FileText, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";

export default function Autoavaliacoes() {
  const navigate = useNavigate();

  const { data: history = [] } = useQuery({
    queryKey: ['assessments-history'],
    queryFn: async () => {
      try {
        const user = await base44.auth.me();
        if (!user) return [];
        // Filter by evaluator_id to show only user's assessments
        const results = await base44.entities.ProcessAssessment.filter({ evaluator_id: user.id }, '-created_date');
        return Array.isArray(results) ? results : [];
      } catch (error) {
        console.error("Erro ao carregar histórico:", error);
        return [];
      }
    }
  });
  const assessments = [
  {
    title: "Processos de Vendas",
    description: "Controle, ticket médio, TCMP2, R70/I30, comissão e metas",
    icon: TrendingUp,
    color: "from-green-500 to-emerald-600",
    href: "AutoavaliacaoVendas"
  },
  {
    title: "Processos Comerciais",
    description: "Ligações, agendamento, no show, pós-venda e indicações",
    icon: Phone,
    color: "from-blue-500 to-blue-600",
    href: "AutoavaliacaoComercial"
  },
  {
    title: "Processos de Marketing",
    description: "Anúncios, Google Ads, Meta Ads, redes sociais e conteúdo",
    icon: Megaphone,
    color: "from-amber-500 to-orange-600",
    href: "AutoavaliacaoMarketing"
  },
  {
    title: "Processos de Pessoas",
    description: "One-on-one, treinamento, CDC, feedbacks e plano de carreira",
    icon: Users,
    color: "from-purple-500 to-purple-600",
    href: "AutoavaliacaoPessoas"
  },
  {
    title: "Processos Financeiros",
    description: "Controle, compras, geração de caixa, despesas e orçamento",
    icon: DollarSign,
    color: "from-green-500 to-teal-600",
    href: "AutoavaliacaoFinanceiro"
  },
  {
    title: "Avaliação Empresarial",
    description: "Gestão, inovação, lucros, visão, clima e produtividade",
    icon: Building2,
    color: "from-pink-500 to-rose-600",
    href: "AutoavaliacaoEmpresarial"
  },
  {
    title: "Avaliação MA3 - Áreas",
    description: "Vendas, comercial, financeiro, técnico, estoque e RH",
    icon: LayoutGrid,
    color: "from-cyan-500 to-blue-600",
    href: "AutoavaliacaoMA3"
  },
  {
    title: "Missão, Visão e Valores",
    description: "Defina a cultura e direção estratégica da oficina",
    icon: Target,
    color: "from-indigo-500 to-violet-600",
    href: "MissaoVisaoValores"
  }];


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Mapa da Autoavaliação da Empresa

          </h1>
          <p className="text-xl text-gray-600">
            Avalie processos, identifique gargalos e receba planos de ação com IA
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assessments.map((assessment) => {
            const Icon = assessment.icon;
            return (
              <Link key={assessment.href} to={createPageUrl(assessment.href)}>
                <Card className="h-full hover:shadow-2xl transition-all duration-300 border-2 hover:border-blue-300 group">
                  <CardHeader>
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${assessment.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <CardTitle className="text-xl group-hover:text-blue-600 transition-colors">
                      {assessment.title}
                    </CardTitle>
                    <CardDescription className="text-sm leading-relaxed">
                      {assessment.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="ghost" className="w-full group-hover:bg-blue-50">
                      Iniciar Avaliação
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </CardContent>
                </Card>
              </Link>);
          })}
        </div>

        {/* Histórico de Avaliações */}
        {history.length > 0 && (
          <div className="mt-16">
            <div className="flex items-center gap-3 mb-6">
              <History className="w-8 h-8 text-blue-600" />
              <h2 className="text-3xl font-bold text-gray-900">Minhas Avaliações Realizadas</h2>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
              <div className="grid gap-4 p-6">
                {history.map((item) => (
                  <div 
                    key={item.id} 
                    className="flex items-center justify-between p-4 rounded-lg bg-gray-50 hover:bg-blue-50 transition-colors border border-gray-200 cursor-pointer group"
                    onClick={() => navigate(createPageUrl("ResultadoAutoavaliacao") + `?id=${item.id}`)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 capitalize">
                          Avaliação {item.assessment_type?.replace('_', ' ')}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {item.created_date ? format(new Date(item.created_date), 'dd/MM/yyyy HH:mm') : 'Data N/A'}
                          </span>
                          <span className={`font-medium ${
                            item.average_score >= 8 ? 'text-green-600' : 
                            item.average_score >= 6 ? 'text-blue-600' : 'text-orange-600'
                          }`}>
                            Nota: {item.average_score?.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="text-blue-600 group-hover:bg-blue-100">
                      Ver Relatório <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>);
}