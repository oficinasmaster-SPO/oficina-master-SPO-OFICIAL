import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, X, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function QuickTipsBar({ tips = [], pageName }) {
  const [isVisible, setIsVisible] = useState(true);
  const [currentTip, setCurrentTip] = useState(0);

  useEffect(() => {
    if (!pageName) return;
    const dismissed = localStorage.getItem(`tips_dismissed_${pageName}`);
    if (dismissed) {
      setIsVisible(false);
    }
  }, [pageName]);

  const handleDismiss = () => {
    if (pageName) {
      localStorage.setItem(`tips_dismissed_${pageName}`, 'true');
    }
    setIsVisible(false);
  };

  const nextTip = () => {
    setCurrentTip((prev) => (prev + 1) % tips.length);
  };

  const prevTip = () => {
    setCurrentTip((prev) => (prev - 1 + tips.length) % tips.length);
  };

  if (!isVisible || !tips || tips.length === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 p-4 mb-6 rounded-lg shadow-sm"
      >
        <div className="flex items-start gap-3">
          <Lightbulb className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-gray-900 text-sm">
                💡 Dica Rápida {tips.length > 1 && `(${currentTip + 1}/${tips.length})`}
              </h4>
              <button
                onClick={handleDismiss}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <p className="text-gray-700 text-sm leading-relaxed">
              {tips[currentTip]}
            </p>

            {tips.length > 1 && (
              <div className="flex items-center gap-2 mt-3">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={prevTip}
                  className="h-7 px-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="flex gap-1">
                  {tips.map((_, index) => (
                    <div
                      key={index}
                      className={`h-1.5 rounded-full transition-all ${
                        index === currentTip ? "w-6 bg-blue-600" : "w-1.5 bg-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={nextTip}
                  className="h-7 px-2"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}