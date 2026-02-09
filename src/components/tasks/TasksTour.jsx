import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function TasksTour({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const tourCompleted = localStorage.getItem('tasks_tour_completed');
    if (!tourCompleted) {
      setTimeout(() => setIsVisible(true), 500);
    }
  }, []);

  const steps = [
    {
      target: "create-task-button",
      title: "Criar Nova Tarefa",
      description: "Clique aqui para criar uma nova tarefa. Você pode adicionar título, descrição, prioridade, data de vencimento e atribuir pessoas.",
      position: "bottom"
    },
    {
      target: "view-mode-buttons",
      title: "Visualizações",
      description: "Alterne entre visualização em lista ou Kanban drag-and-drop para organizar suas tarefas da forma que preferir.",
      position: "bottom"
    },
    {
      target: "stats-section",
      title: "Estatísticas",
      description: "Acompanhe em tempo real o total de tarefas, pendentes, em andamento, concluídas e atrasadas.",
      position: "bottom"
    },
    {
      target: "filters-section",
      title: "Filtros Avançados",
      description: "Use os filtros para encontrar tarefas específicas por status, prioridade, responsável ou prazo.",
      position: "top"
    },
    {
      target: "task-card",
      title: "Cartão de Tarefa",
      description: "Cada tarefa mostra prioridade, status, progresso, vencimento e responsáveis. Você pode editar, excluir ou mudar o status rapidamente.",
      position: "top"
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTour();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeTour = () => {
    localStorage.setItem('tasks_tour_completed', 'true');
    setIsVisible(false);
    if (onComplete) onComplete();
  };

  const getTargetPosition = () => {
    const step = steps[currentStep];
    const element = document.getElementById(step.target);
    if (!element) return null;

    const rect = element.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    return {
      top: rect.top + scrollTop,
      left: rect.left + scrollLeft,
      width: rect.width,
      height: rect.height
    };
  };

  const getTooltipPosition = () => {
    const position = getTargetPosition();
    if (!position) return { top: 100, left: 100 };

    const step = steps[currentStep];
    const offset = 20;

    if (step.position === "bottom") {
      return {
        top: position.top + position.height + offset,
        left: position.left + (position.width / 2) - 200
      };
    } else if (step.position === "top") {
      return {
        top: position.top - 220,
        left: position.left + (position.width / 2) - 200
      };
    }

    return { top: position.top, left: position.left };
  };

  const highlightElement = () => {
    const position = getTargetPosition();
    if (!position) return null;

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed border-4 border-blue-500 rounded-lg pointer-events-none z-[9998]"
        style={{
          top: position.top - 4,
          left: position.left - 4,
          width: position.width + 8,
          height: position.height + 8,
          boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.5)"
        }}
      />
    );
  };

  if (!isVisible) return null;

  const step = steps[currentStep];
  const tooltipPos = getTooltipPosition();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999]">
        {highlightElement()}

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          style={{
            position: "absolute",
            top: tooltipPos.top,
            left: Math.max(20, Math.min(tooltipPos.left, window.innerWidth - 420)),
            width: 400
          }}
        >
          <Card className="shadow-2xl border-2 border-blue-500">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-lg text-gray-900">{step.title}</h3>
                </div>
                <Button variant="ghost" size="sm" onClick={completeTour}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <p className="text-gray-600 mb-4">{step.description}</p>

              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  {steps.map((_, index) => (
                    <div
                      key={index}
                      className={`h-2 rounded-full transition-all ${
                        index === currentStep ? "w-8 bg-blue-600" : "w-2 bg-gray-300"
                      }`}
                    />
                  ))}
                </div>

                <div className="flex gap-2">
                  {currentStep > 0 && (
                    <Button variant="outline" size="sm" onClick={handlePrevious}>
                      <ArrowLeft className="w-4 h-4 mr-1" />
                      Anterior
                    </Button>
                  )}
                  <Button size="sm" onClick={handleNext} className="bg-blue-600 hover:bg-blue-700">
                    {currentStep === steps.length - 1 ? "Concluir" : "Próximo"}
                    {currentStep < steps.length - 1 && <ArrowRight className="w-4 h-4 ml-1" />}
                  </Button>
                </div>
              </div>

              <div className="mt-4 text-center">
                <button
                  onClick={completeTour}
                  className="text-xs text-gray-500 hover:text-gray-700 underline"
                >
                  Pular tutorial
                </button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}