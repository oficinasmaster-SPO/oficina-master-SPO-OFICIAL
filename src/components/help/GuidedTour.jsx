import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X, ArrowRight, ArrowLeft, Sparkles, SkipForward } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function GuidedTour({ tourId, steps, onComplete, autoStart = false }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const tourCompleted = localStorage.getItem(`tour_${tourId}_completed`);
    if (!tourCompleted && autoStart) {
      setTimeout(() => setIsVisible(true), 800);
    }
  }, [tourId, autoStart]);

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
    localStorage.setItem(`tour_${tourId}_completed`, 'true');
    setIsVisible(false);
    if (onComplete) onComplete();
  };

  const skipTour = () => {
    completeTour();
  };

  const restartTour = () => {
    setCurrentStep(0);
    setIsVisible(true);
  };

  const getTargetPosition = () => {
    const step = steps[currentStep];
    if (!step.target) return null;

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
        left: Math.max(20, Math.min(position.left + (position.width / 2) - 200, window.innerWidth - 420))
      };
    } else if (step.position === "top") {
      return {
        top: position.top - 240,
        left: Math.max(20, Math.min(position.left + (position.width / 2) - 200, window.innerWidth - 420))
      };
    } else if (step.position === "left") {
      return {
        top: position.top,
        left: Math.max(20, position.left - 420)
      };
    } else if (step.position === "right") {
      return {
        top: position.top,
        left: Math.min(position.left + position.width + offset, window.innerWidth - 420)
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
          boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.6)"
        }}
      />
    );
  };

  // Botão flutuante para reabrir o tour
  if (!isVisible) {
    return (
      <Button
        onClick={restartTour}
        variant="outline"
        size="sm"
        className="fixed bottom-6 right-6 z-40 shadow-lg"
      >
        <Sparkles className="w-4 h-4 mr-2" />
        Ver Tour Novamente
      </Button>
    );
  }

  const step = steps[currentStep];
  const tooltipPos = getTooltipPosition();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999]">
        {step.target && highlightElement()}

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          style={{
            position: "absolute",
            top: tooltipPos.top,
            left: tooltipPos.left,
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
                <Button variant="ghost" size="sm" onClick={skipTour}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <p className="text-gray-600 mb-4 leading-relaxed">{step.description}</p>

              <div className="flex items-center justify-between mb-4">
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
                <span className="text-xs text-gray-500">
                  {currentStep + 1} de {steps.length}
                </span>
              </div>

              <div className="flex gap-2">
                {currentStep > 0 && (
                  <Button variant="outline" size="sm" onClick={handlePrevious} className="flex-1">
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Anterior
                  </Button>
                )}
                <Button 
                  size="sm" 
                  onClick={handleNext} 
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {currentStep === steps.length - 1 ? "Concluir" : "Próximo"}
                  {currentStep < steps.length - 1 && <ArrowRight className="w-4 h-4 ml-1" />}
                </Button>
              </div>

              <div className="mt-4 text-center">
                <button
                  onClick={skipTour}
                  className="text-xs text-gray-500 hover:text-gray-700 underline flex items-center gap-1 mx-auto"
                >
                  <SkipForward className="w-3 h-3" />
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