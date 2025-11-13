import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, Users, BarChart3, Rocket, ArrowRight } from "lucide-react";

export default function Resultado() {
  const navigate = useNavigate();
  const [diagnostic, setDiagnostic] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDiagnostic();
  }, []);

  const loadDiagnostic = async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const id = params.get("id");
      
      if (!id) {
        navigate(createPageUrl("Home"));
        return;
      }

      const diagnostics = await base44.entities.Diagnostic.list();
      const diag = diagnostics.find(d => d.id === id);
      
      if (diag) {
        setDiagnostic(diag);
      } else {
        navigate(createPageUrl("Home"));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getPhaseInfo = (phase) => {
    const phases = {
      1: {
        title: "Fase 1 – Sobrevivência e Geração de Lucro",
        description: "Sua oficina está na fase inicial, focada em gerar lucro para consolidar o negócio. Nesta etapa, é fundamental trabalhar com foco em resultados imediatos, controlar custos rigorosamente e estabelecer uma base sólida de clientes.",
        icon: TrendingUp,
        color: "from-red-500 to-orange-500",
        bgColor: "bg-red-50",
        textColor: "text-red-700",
        borderColor: "border-red-200"
      },
      2: {
        title: "Fase 2 – Crescimento e Ampliação de Time",
        description: "Sua oficina está em crescimento! Já tem lucro razoável e agora precisa aumentar a equipe para continuar expandindo. É hora de contratar pessoas certas e começar a estruturar processos básicos de gestão.",
        icon: Users,
        color: "from-yellow-500 to-amber-500",
        bgColor: "bg-yellow-50",
        textColor: "text-yellow-700",
        borderColor: "border-yellow-200"
      },
      3: {
        title: "Fase 3 – Organização, Processos e Liderança",
        description: "Sua oficina está se organizando! Você já tem uma equipe formada e agora precisa estabelecer processos claros, desenvolver liderança e criar indicadores para medir resultados. Foco em estruturação e eficiência.",
        icon: BarChart3,
        color: "from-blue-500 to-cyan-500",
        bgColor: "bg-blue-50",
        textColor: "text-blue-700",
        borderColor: "border-blue-200"
      },
      4: {
        title: "Fase 4 – Consolidação e Escala",
        description: "Parabéns! Sua oficina está consolidada no mercado. Você tem processos estabelecidos, equipe engajada e pode focar em planejamento estratégico de longo prazo. É hora de pensar em expansão e escala.",
        icon: Rocket,
        color: "from-green-500 to-emerald-500",
        bgColor: "bg-green-50",
        textColor: "text-green-700",
        borderColor: "border-green-200"
      }
    };
    return phases[phase] || phases[1];
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!diagnostic) {
    return null;
  }

  const phaseInfo = getPhaseInfo(diagnostic.phase);
  const Icon = phaseInfo.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Result Card */}
        <Card className={`shadow-2xl border-4 ${phaseInfo.borderColor}`}>
          <CardHeader className={`${phaseInfo.bgColor} border-b-4 ${phaseInfo.borderColor}`}>
            <div className="flex items-center gap-4">
              <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${phaseInfo.color} flex items-center justify-center flex-shrink-0`}>
                <Icon className="w-10 h-10 text-white" />
              </div>
              <div className="flex-1">
                <Badge className={`mb-2 ${phaseInfo.bgColor} ${phaseInfo.textColor}`}>
                  RESULTADO DO DIAGNÓSTICO
                </Badge>
                <CardTitle className="text-2xl md:text-3xl text-gray-900">
                  {phaseInfo.title}
                </CardTitle>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-8">
            <p className="text-lg text-gray-700 leading-relaxed mb-8">
              {phaseInfo.description}
            </p>

            <div className={`p-6 rounded-xl ${phaseInfo.bgColor} border-2 ${phaseInfo.borderColor}`}>
              <h3 className="font-semibold text-gray-900 mb-3">
                Suas Respostas Predominantes:
              </h3>
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${phaseInfo.color} flex items-center justify-center text-white font-bold text-xl`}>
                  {diagnostic.dominant_letter}
                </div>
                <div className="text-gray-700">
                  A maioria das suas respostas indicou características da <span className="font-semibold">Fase {diagnostic.phase}</span>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Button
                onClick={() => navigate(createPageUrl("PlanoAcao") + `?id=${diagnostic.id}`)}
                className={`flex-1 bg-gradient-to-r ${phaseInfo.color} hover:opacity-90 text-white text-lg py-6`}
              >
                Ver Plano de Ação Personalizado
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              
              <Button
                variant="outline"
                onClick={() => navigate(createPageUrl("Home"))}
                className="flex-1 py-6"
              >
                Voltar ao Início
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}