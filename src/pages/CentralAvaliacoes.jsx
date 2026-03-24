import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { 
  Rocket, Users, Brain, DollarSign, TrendingUp, BarChart3, Calculator, ArrowLeft, CheckCircle2, Loader2 
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

export default function CentralAvaliacoes() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const workshop_id = user?.data?.workshop_id || user?.workshop_id;

  const { data: statusDiagnosticos, isLoading } = useQuery({
    queryKey: ['status-diagnosticos', workshop_id],
    queryFn: async () => {
      if (!workshop_id) return {};
      
      const [
        diagOficina,
        diagEmpresario,
        diagMaturidade,
        diagOS,
        diagProducao,
        diagDesempenho,
        diagDISC,
        diagCarga
      ] = await Promise.all([
        base44.entities.Diagnostic.filter({ workshop_id }),
        base44.entities.EntrepreneurDiagnostic.filter({ workshop_id }),
        base44.entities.CollaboratorMaturityDiagnostic.filter({ workshop_id }),
        base44.entities.ServiceOrderDiagnostic.filter({ workshop_id }),
        base44.entities.ProductivityDiagnostic.filter({ workshop_id }),
        base44.entities.PerformanceMatrixDiagnostic.filter({ workshop_id }),
        base44.entities.DISCDiagnostic.filter({ workshop_id }),
        base44.entities.WorkloadDiagnostic.filter({ workshop_id })
      ]);

      // Reflete corretamente o status baseado no workshop_id isolado
      return {
        fase_oficina: diagOficina.length > 0,
        perfil_empresario: diagEmpresario.length > 0,
        maturidade: diagMaturidade.length > 0,
        ordem_servico: diagOS.length > 0,
        producao: diagProducao.length > 0,
        desempenho: diagDesempenho.length > 0,
        disc: diagDISC.length > 0,
        carga: diagCarga.length > 0,
      };
    },
    enabled: !!workshop_id
  });

  const categories = [
    {
      title: "Oficina",
      description: "Diagnósticos estruturais do negócio",
      items: [
        {
          id: "fase_oficina",
          title: "Fase da Oficina",
          description: "Descubra em qual das 4 fases sua oficina se encontra",
          icon: Rocket,
          href: createPageUrl("Questionario"),
          color: "bg-blue-100 text-blue-700",
          iconColor: "text-blue-600"
        },
        {
          id: "perfil_empresario",
          title: "Perfil do Empresário",
          description: "Aventureiro, Empreendedor ou Gestor?",
          icon: Users,
          href: createPageUrl("DiagnosticoEmpresario"),
          color: "bg-green-100 text-green-700",
          iconColor: "text-green-600"
        },
        {
          id: "ordem_servico",
          title: "Ordem de Serviço (OS)",
          description: "Análise de rentabilidade e precificação de OS",
          icon: DollarSign,
          href: createPageUrl("DiagnosticoOS"),
          color: "bg-yellow-100 text-yellow-700",
          iconColor: "text-yellow-600"
        }
      ]
    },
    {
      title: "Equipe",
      description: "Avaliações e performance dos colaboradores",
      items: [
        {
          id: "maturidade",
          title: "Maturidade do Colaborador",
          description: "Avalie o nível de maturidade da sua equipe",
          icon: Brain,
          href: createPageUrl("DiagnosticoMaturidade"),
          color: "bg-purple-100 text-purple-700",
          iconColor: "text-purple-600"
        },
        {
          id: "disc",
          title: "Teste DISC",
          description: "Perfil comportamental da equipe",
          icon: Users,
          href: createPageUrl("DiagnosticoDISC"),
          color: "bg-indigo-100 text-indigo-700",
          iconColor: "text-indigo-600"
        },
        {
          id: "desempenho",
          title: "Matriz de Desempenho",
          description: "Competências técnicas e emocionais",
          icon: BarChart3,
          href: createPageUrl("DiagnosticoDesempenho"),
          color: "bg-teal-100 text-teal-700",
          iconColor: "text-teal-600"
        },
        {
          id: "producao",
          title: "Produtividade vs Salário",
          description: "Relação custo x produtividade por colaborador",
          icon: TrendingUp,
          href: createPageUrl("DiagnosticoProducao"),
          color: "bg-red-100 text-red-700",
          iconColor: "text-red-600"
        },
        {
          id: "carga",
          title: "Carga de Trabalho",
          description: "Distribuição e saturação da equipe",
          icon: Calculator,
          href: createPageUrl("DiagnosticoCarga"),
          color: "bg-orange-100 text-orange-700",
          iconColor: "text-orange-600"
        }
      ]
    },
    {
      title: "Resultados & Estratégia",
      description: "Matrizes cruzadas e visões consolidadas",
      items: [
        {
          id: "matriz_9box",
          title: "Nine-Box (DISC x Desempenho)",
          description: "Matriz de talentos cruzando perfil e entrega",
          icon: BarChart3,
          href: createPageUrl("MatrizDesempenho"),
          color: "bg-slate-100 text-slate-700",
          iconColor: "text-slate-600"
        },
        {
          id: "nps_cliente",
          title: "Dashboard NPS",
          description: "Acompanhamento da satisfação de clientes",
          icon: Users,
          href: createPageUrl("AnalisesRH"),
          color: "bg-pink-100 text-pink-700",
          iconColor: "text-pink-600"
        }
      ]
    }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Link to={createPageUrl("Home")}>
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Voltar ao Início
            </Button>
          </Link>
        </div>

        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Central de Avaliações</h1>
          <p className="text-lg text-gray-600">
            Acesse e gerencie todos os diagnósticos e matrizes estratégicas da sua oficina.
          </p>
        </div>

        <div className="space-y-12">
          {categories.map((category, idx) => (
            <div key={idx}>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">{category.title}</h2>
                <p className="text-gray-600">{category.description}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {category.items.map((item, itemIdx) => {
                  const Icon = item.icon;
                  const isCompleted = statusDiagnosticos?.[item.id];
                  return (
                    <Card key={itemIdx} className="group hover:shadow-xl transition-all border-2 hover:border-blue-200 flex flex-col">
                      <CardHeader className="pb-4">
                        <div className="flex justify-between items-start mb-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${item.color} group-hover:scale-110 transition-transform`}>
                            <Icon className={`w-6 h-6 ${item.iconColor}`} />
                          </div>
                          {isCompleted && (
                            <Badge className="bg-green-100 text-green-700 border-none flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Concluído
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-lg">{item.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="flex-1">
                        <p className="text-gray-600 text-sm">{item.description}</p>
                      </CardContent>
                      <CardFooter>
                        <Button 
                          className="w-full" 
                          variant={isCompleted ? "outline" : "default"}
                          onClick={() => navigate(item.href)}
                        >
                          {isCompleted ? "Acessar Novamente" : "Iniciar"}
                        </Button>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}