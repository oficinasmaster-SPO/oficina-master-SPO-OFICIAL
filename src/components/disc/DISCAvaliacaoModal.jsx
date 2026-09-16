import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { discQuestions } from "@/components/disc/DISCQuestions";

// Modal de avaliação DISC com perguntas individuais (padrão 1 = mais parecido).
// Usado pelo diagnóstico do gestor; conversão, cálculo e e-mail ficam no backend.
export default function DISCAvaliacaoModal({ open, onOpenChange, employeeName, submitting, onComplete }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [selected, setSelected] = useState({});

  // Reset do progresso ao fechar o modal
  useEffect(() => {
    if (!open) {
      setCurrentQuestion(0);
      setAnswers([]);
      setSelected({});
    }
  }, [open]);

  const question = discQuestions[currentQuestion];
  const progress = ((currentQuestion + 1) / discQuestions.length) * 100;

  const isNumberUsed = (num) => Object.values(selected).includes(num);

  const handleSelect = (trait, value) => {
    if (submitting) return;

    const usedNumbers = Object.entries(selected)
      .filter(([key]) => key !== trait)
      .map(([, val]) => val);

    if (usedNumbers.includes(value)) {
      toast.error(`Número ${value} já foi usado. Escolha outro número (1-4).`);
      return;
    }

    const newSelected = { ...selected, [trait]: value };
    setSelected(newSelected);

    if (Object.keys(newSelected).length === 4) {
      const newAnswers = [
        ...answers,
        { question_id: question.id, d: newSelected.d, i: newSelected.i, s: newSelected.s, c: newSelected.c }
      ];
      setTimeout(() => {
        if (currentQuestion < discQuestions.length - 1) {
          setAnswers(newAnswers);
          setSelected({});
          setCurrentQuestion(currentQuestion + 1);
        } else {
          onComplete(newAnswers);
        }
      }, 300);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !submitting && onOpenChange(v)}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Avaliação DISC {employeeName ? `— ${employeeName}` : ""}
          </DialogTitle>
          <DialogDescription>
            Pergunta {currentQuestion + 1} de {discQuestions.length} — ordene as características de 1 (mais parecido) a 4 (menos parecido).
          </DialogDescription>
          <Progress value={progress} className="h-2 mt-3" />
        </DialogHeader>

        {submitting ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <p className="text-sm text-gray-600">Processando resultado...</p>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="bg-amber-50 border border-amber-300 rounded-lg p-3">
              <p className="text-xs text-amber-900">
                <strong>⚠️ Use cada número apenas uma vez:</strong> 1 = mais parecido, 4 = menos parecido.
              </p>
            </div>
            {Object.entries(question.traits).map(([key, trait]) => (
              <div key={key} className="border-2 rounded-lg p-4 bg-white hover:border-indigo-300 transition-colors">
                <p className="text-gray-700 mb-3 font-medium text-sm">{trait}</p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map((val) => (
                    <Button
                      key={val}
                      variant={selected[key] === val ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleSelect(key, val)}
                      disabled={isNumberUsed(val) && selected[key] !== val}
                      className={`${selected[key] === val ? "bg-indigo-600" : ""} ${isNumberUsed(val) && selected[key] !== val ? "opacity-40" : ""}`}
                    >
                      {val}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
            <p className="text-xs text-gray-400 text-center">
              A pergunta avança automaticamente ao preencher os 4 números.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}