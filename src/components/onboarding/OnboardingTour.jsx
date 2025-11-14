import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X, ArrowRight, ArrowLeft, Check, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";

const tourSteps = [
  {
    target: "home-hero",
    title: "🎉 Bem-vindo ao Oficinas Master!",
    content: "Vamos fazer um tour rápido para você conhecer as principais funcionalidades da plataforma. Isso levará apenas 2 minutos!",
    placement: "center",
    spotlightPadding: 0
  },
  {
    target: "start-diagnostic-button",
    title: "📋 Diagnóstico da Oficina",
    content: "Comece respondendo 12 perguntas rápidas sobre sua oficina. Com base nas respostas, identificaremos em qual fase sua oficina está e criaremos um plano de ação personalizado.",
    placement: "bottom",
    spotlightPadding: 20
  },
  {
    target: "phases-section",
    title: "🎯 As 4 Fases de Evolução",
    content: "Toda oficina passa por 4 fases: Sobrevivência, Crescimento, Organização e Consolidação. Vamos identificar em qual você está e o que fazer para evoluir.",
    placement: "top",
    spotlightPadding: 20
  },
  {
    target: "sidebar-navigation",
    title: "🧭 Navegação Lateral",
    content: "Use a barra lateral para acessar todas as funcionalidades: fazer diagnóstico, ver histórico, acompanhar notificações e muito mais.",
    placement: "right",
    spotlightPadding: 10
  },
  {
    target: "sidebar-historico",
    title: "📊 Histórico de Diagnósticos",
    content: "Aqui você pode acessar todos os seus diagnósticos anteriores e acompanhar a evolução da sua oficina ao longo do tempo.",
    placement: "right",
    spotlightPadding: 10
  },
  {
    target: "sidebar-notificacoes",
    title: "🔔 Notificações e Alertas",
    content: "Receba notificações sobre prazos, tarefas atrasadas e atualizações importantes do seu plano de ação.",
    placement: "right",
    spotlightPadding: 10
  },
  {
    target: "user-profile",
    title: "👤 Seu Perfil",
    content: "Acesse suas informações de perfil e faça logout quando necessário. Se você for administrador, terá acesso ao Dashboard de Consultoria.",
    placement: "right",
    spotlightPadding: 10
  },
  {
    target: "home-hero",
    title: "✅ Pronto para Começar!",
    content: "Agora você já conhece as principais funcionalidades. Clique em 'Começar Diagnóstico' para criar seu primeiro plano de ação personalizado!",
    placement: "center",
    spotlightPadding: 0
  }
];

export default function OnboardingTour({ user, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [targetRect, setTargetRect] = useState(null);

  useEffect(() => {
    if (isActive && currentStep < tourSteps.length) {
      updateTargetPosition();
      window.addEventListener("resize", updateTargetPosition);
      window.addEventListener("scroll", updateTargetPosition);
      
      return () => {
        window.removeEventListener("resize", updateTargetPosition);
        window.removeEventListener("scroll", updateTargetPosition);
      };
    }
  }, [isActive, currentStep]);

  const updateTargetPosition = () => {
    const step = tourSteps[currentStep];
    if (step.placement === "center") {
      setTargetRect(null);
      return;
    }

    const element = document.getElementById(step.target);
    if (element) {
      const rect = element.getBoundingClientRect();
      setTargetRect(rect);
    }
  };

  const startTour = () => {
    setIsActive(true);
    setCurrentStep(0);
  };

  const nextStep = async () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
      
      // Atualizar progresso
      if (user) {
        try {
          const progressList = await base44.entities.UserProgress.list();
          const userProgress = progressList.find(p => p.user_id === user.id);
          
          if (userProgress) {
            await base44.entities.UserProgress.update(userProgress.id, {
              tour_step: currentStep + 1
            });
          }
        } catch (error) {
          console.error("Erro ao atualizar progresso:", error);
        }
      }
    } else {
      await completeTour();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipTour = async () => {
    if (user) {
      try {
        const progressList = await base44.entities.UserProgress.list();
        const userProgress = progressList.find(p => p.user_id === user.id);
        
        if (userProgress) {
          await base44.entities.UserProgress.update(userProgress.id, {
            tour_completed: true,
            tour_step: tourSteps.length
          });
        }
      } catch (error) {
        console.error("Erro ao pular tour:", error);
      }
    }
    
    setIsActive(false);
    if (onComplete) onComplete();
  };

  const completeTour = async () => {
    if (user) {
      try {
        const progressList = await base44.entities.UserProgress.list();
        const userProgress = progressList.find(p => p.user_id === user.id);
        
        if (userProgress) {
          await base44.entities.UserProgress.update(userProgress.id, {
            tour_completed: true,
            tour_step: tourSteps.length
          });
        }
      } catch (error) {
        console.error("Erro ao completar tour:", error);
      }
    }
    
    setIsActive(false);
    if (onComplete) onComplete();
  };

  if (!isActive) {
    return (
      <Button
        onClick={startTour}
        className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-2xl"
        size="lg"
      >
        <Sparkles className="w-5 h-5 mr-2" />
        Iniciar Tour Guiado
      </Button>
    );
  }

  const step = tourSteps[currentStep];
  const isCenter = step.placement === "center";

  return createPortal(
    <>
      {/* Overlay escuro */}
      <div className="fixed inset-0 bg-black/50 z-[9998] transition-opacity" />

      {/* Spotlight no elemento target */}
      {targetRect && !isCenter && (
        <div
          className="fixed z-[9999] pointer-events-none transition-all duration-300"
          style={{
            top: targetRect.top - step.spotlightPadding,
            left: targetRect.left - step.spotlightPadding,
            width: targetRect.width + (step.spotlightPadding * 2),
            height: targetRect.height + (step.spotlightPadding * 2),
            boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.5)",
            borderRadius: "12px"
          }}
        />
      )}

      {/* Card do tour */}
      <div
        className={cn(
          "fixed z-[10000] transition-all duration-300",
          isCenter && "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        )}
        style={
          !isCenter && targetRect
            ? {
                top:
                  step.placement === "bottom"
                    ? targetRect.bottom + 20
                    : step.placement === "top"
                    ? targetRect.top - 220
                    : targetRect.top,
                left:
                  step.placement === "right"
                    ? targetRect.right + 20
                    : step.placement === "left"
                    ? targetRect.left - 400
                    : targetRect.left,
              }
            : {}
        }
      >
        <Card className="w-96 shadow-2xl border-2 border-blue-500">
          <CardContent className="p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 pr-8">
                {step.title}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={skipTour}
                className="absolute top-2 right-2"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Conteúdo */}
            <p className="text-gray-700 leading-relaxed mb-6">
              {step.content}
            </p>

            {/* Progress */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">
                  Passo {currentStep + 1} de {tourSteps.length}
                </span>
                <span className="text-sm font-semibold text-blue-600">
                  {Math.round(((currentStep + 1) / tourSteps.length) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentStep + 1) / tourSteps.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Botões */}
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 0}
                className="flex-1"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Anterior
              </Button>

              {currentStep === tourSteps.length - 1 ? (
                <Button
                  onClick={completeTour}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Concluir
                </Button>
              ) : (
                <Button
                  onClick={nextStep}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  Próximo
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>

            {/* Pular tour */}
            <div className="text-center mt-4">
              <button
                onClick={skipTour}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Pular tour
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>,
    document.body
  );
}