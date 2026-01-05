import React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Save } from "lucide-react";

export default function InterviewForm({
  questions,
  currentStep,
  answers,
  onAnswerChange,
  onStepChange,
  interviewerNotes,
  onNotesChange,
  recommendation,
  onRecommendationChange,
  onSubmit,
  isLoading
}) {
  const currentQuestion = questions[currentStep];
  const currentAnswer = answers.find(a => a.question_id === currentQuestion?.id);

  const handleScoreChange = (score) => {
    const newAnswers = answers.filter(a => a.question_id !== currentQuestion.id);
    newAnswers.push({
      question_id: currentQuestion.id,
      question_text: currentQuestion.question_text,
      answer: currentAnswer?.answer || "",
      score: parseInt(score)
    });
    onAnswerChange(newAnswers);
  };

  const handleAnswerTextChange = (text) => {
    const newAnswers = answers.filter(a => a.question_id !== currentQuestion.id);
    newAnswers.push({
      question_id: currentQuestion.id,
      question_text: currentQuestion.question_text,
      answer: text,
      score: currentAnswer?.score || 5
    });
    onAnswerChange(newAnswers);
  };

  if (!currentQuestion) {
    return (
      <div className="space-y-6">
        <div>
          <Label>Observações do Entrevistador</Label>
          <Textarea
            value={interviewerNotes}
            onChange={(e) => onNotesChange(e.target.value)}
            rows={4}
            placeholder="Impressões gerais sobre o candidato..."
          />
        </div>
        <div>
          <Label>Recomendação Final</Label>
          <Select value={recommendation} onValueChange={onRecommendationChange}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="A">A - Contratar</SelectItem>
              <SelectItem value="B">B - Avaliar Mais</SelectItem>
              <SelectItem value="C">C - Não Contratar</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={onSubmit} disabled={isLoading} className="w-full">
          <Save className="w-4 h-4 mr-2" />
          {isLoading ? "Salvando..." : "Finalizar Entrevista"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-700 rounded">
            {currentQuestion.category}
          </span>
        </div>
        <h3 className="text-lg font-medium">{currentQuestion.question_text}</h3>
      </div>

      <div>
        <Label>Resposta do Candidato</Label>
        <Textarea
          value={currentAnswer?.answer || ""}
          onChange={(e) => handleAnswerTextChange(e.target.value)}
          rows={4}
          placeholder="Digite a resposta..."
        />
      </div>

      <div>
        <Label>Pontuação (0-10)</Label>
        <Select 
          value={currentAnswer?.score?.toString() || "5"} 
          onValueChange={handleScoreChange}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
              <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => onStepChange(currentStep - 1)}
          disabled={currentStep === 0}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          className="flex-1"
          onClick={() => onStepChange(currentStep + 1)}
        >
          {currentStep === questions.length - 1 ? "Finalizar" : "Próxima"}
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}