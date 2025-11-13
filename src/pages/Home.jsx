import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight, TrendingUp, Users, BarChart3, Rocket } from "lucide-react";

export default function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [hasWorkshop, setHasWorkshop] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUserAndWorkshop();
  }, []);

  const checkUserAndWorkshop = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      const workshops = await base44.entities.Workshop.list();
      const userWorkshop = workshops.find(w => w.owner_id === currentUser.id);
      setHasWorkshop(!!userWorkshop);
    } catch (error) {
      console.log("User not authenticated");
    } finally {
      setLoading(false);
    }
  };

  const handleStartDiagnostic = () => {
    if (!user) {
      base44.auth.redirectToLogin(createPageUrl("Cadastro"));
      return;
    }
    
    if (!hasWorkshop) {
      navigate(createPageUrl("Cadastro"));
    } else {
      navigate(createPageUrl("Questionario"));
    }
  };

  const phases = [
    {
      phase: 1,
      title: "Sobrevivência e Geração de Caixa",
      description: "Foco em gerar lucro imediato para consolidar o negócio. Equipe reduzida com múltiplas funções.",
      icon: TrendingUp,
      color: "from-red-500 to-orange-500"
    },
    {
      phase: 2,
      title: "Crescimento com Equipe em Formação",
      description: "Necessidade de aumentar o time para continuar crescendo e lucrando. Início da estruturação.",
      icon: Users,
      color: "from-yellow-500 to-amber-500"
    },
    {
      phase: 3,
      title: "Organização, Liderança e Processos",
      description: "Estruturação de atividades, estabelecimento de processos e desenvolvimento de liderança.",
      icon: BarChart3,
      color: "from-blue-500 to-cyan-500"
    },
    {
      phase: 4,
      title: "Consolidação e Escala",
      description: "Empresa consolidada com planejamento estratégico de longo prazo e processos estabelecidos.",
      icon: Rocket,
      color: "from-green-500 to-emerald-500"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 text-white">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center space-y-8">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
              Descubra em que fase sua oficina está hoje
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
              Responda 12 perguntas rápidas e receba um plano de ação personalizado para aumentar lucro, 
              organização e crescimento da sua oficina.
            </p>
            <Button 
              onClick={handleStartDiagnostic}
              disabled={loading}
              size="lg" 
              className="bg-white text-blue-700 hover:bg-blue-50 text-lg px-8 py-6 rounded-full shadow-xl hover:shadow-2xl transition-all"
            >
              Começar Diagnóstico
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Phases Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            As 4 Fases de Evolução
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Entenda em qual estágio sua oficina se encontra e o que precisa fazer para evoluir
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {phases.map((phase) => {
            const Icon = phase.icon;
            return (
              <Card key={phase.phase} className="group hover:shadow-2xl transition-all duration-300 border-2 hover:border-blue-200">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${phase.color} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-500 mb-1">
                        FASE {phase.phase}
                      </div>
                      <CardTitle className="text-xl text-gray-900">
                        {phase.title}
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 leading-relaxed">
                    {phase.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-16 text-center">
          <Button 
            onClick={handleStartDiagnostic}
            disabled={loading}
            size="lg" 
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-lg px-8 py-6 rounded-full shadow-lg"
          >
            Iniciar Diagnóstico Agora
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}