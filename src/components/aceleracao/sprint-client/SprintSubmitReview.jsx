import React from "react";
import { Button } from "@/components/ui/button";
import { Send, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function SprintSubmitReview({ phase, canSubmit, allTasksDone, onSubmit, isSubmitting }) {
  if (phase.status === "pending_review") {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
        <Badge className="bg-amber-100 text-amber-700 mb-2">Aguardando Revisão do Consultor</Badge>
        <p className="text-sm text-amber-800">
          Fase enviada para revisão. O consultor irá avaliar e aprovar ou devolver com feedback.
        </p>
        {phase.submitted_for_review_at && (
          <p className="text-xs text-amber-600 mt-1">
            Enviada em {new Date(phase.submitted_for_review_at).toLocaleDateString("pt-BR")}
          </p>
        )}
      </div>
    );
  }

  if (phase.status === "completed") {
    return null;
  }

  if (phase.status !== "in_progress" && phase.status !== "not_started") {
    return null;
  }

  // Show feedback from last review if phase was returned
  const hasFeedback = phase.review_feedback && phase.status === "in_progress";

  return (
    <div className="space-y-3">
      {hasFeedback && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-orange-800">Feedback do Consultor</p>
              <p className="text-sm text-orange-700 mt-1">{phase.review_feedback}</p>
            </div>
          </div>
        </div>
      )}

      {canSubmit && (
        <Button
          onClick={onSubmit}
          disabled={!allTasksDone || isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-700 gap-2"
        >
          <Send className="w-4 h-4" />
          {isSubmitting ? "Enviando..." : "Enviar Fase para Revisão"}
        </Button>
      )}

      {!allTasksDone && canSubmit && (
        <p className="text-xs text-gray-500 text-center">
          Complete todas as tarefas antes de enviar para revisão.
        </p>
      )}
    </div>
  );
}