import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, RotateCcw, Send, Clock } from "lucide-react";

export default function ConsultorReviewPanel({ phase, onApprove, onReturn, isSaving }) {
  const [feedback, setFeedback] = useState("");
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [action, setAction] = useState(null); // "approve" | "return"

  if (phase.status === "completed") {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
        <Badge className="bg-green-100 text-green-700">Fase Aprovada e Concluída</Badge>
        {phase.reviewed_at && (
          <p className="text-xs text-green-600 mt-1">
            Revisada em {new Date(phase.reviewed_at).toLocaleDateString("pt-BR")}
          </p>
        )}
      </div>
    );
  }

  if (phase.status !== "pending_review") {
    if (phase.status === "in_progress" && phase.review_feedback) {
      return (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <p className="text-xs font-medium text-orange-700 mb-1">Último feedback enviado:</p>
          <p className="text-sm text-orange-800 italic">"{phase.review_feedback}"</p>
        </div>
      );
    }
    return null;
  }

  // Phase is pending_review
  return (
    <div className="border-2 border-amber-300 bg-amber-50 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-amber-600" />
        <span className="text-sm font-semibold text-amber-800">Fase aguardando sua revisão</span>
      </div>

      {phase.submitted_for_review_at && (
        <p className="text-xs text-amber-600">
          Submetida em {new Date(phase.submitted_for_review_at).toLocaleDateString("pt-BR")}
        </p>
      )}

      {!showFeedbackForm ? (
        <div className="flex gap-2">
          <Button
            onClick={() => { setAction("approve"); setShowFeedbackForm(true); }}
            className="flex-1 bg-green-600 hover:bg-green-700 gap-1"
            size="sm"
          >
            <CheckCircle className="w-4 h-4" /> Aprovar Fase
          </Button>
          <Button
            onClick={() => { setAction("return"); setShowFeedbackForm(true); }}
            variant="outline"
            className="flex-1 border-orange-300 text-orange-700 hover:bg-orange-50 gap-1"
            size="sm"
          >
            <RotateCcw className="w-4 h-4" /> Devolver com Feedback
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-700">
            {action === "approve" ? "Feedback de aprovação (opcional):" : "Feedback para a oficina (obrigatório):"}
          </p>
          <Textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder={action === "approve" ? "Parabéns, ótimo trabalho..." : "Precisa ajustar..."}
            rows={3}
          />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => { setShowFeedbackForm(false); setFeedback(""); setAction(null); }}>
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={isSaving || (action === "return" && !feedback.trim())}
              className={action === "approve" ? "bg-green-600 hover:bg-green-700" : "bg-orange-600 hover:bg-orange-700"}
              onClick={async () => {
                if (action === "approve") await onApprove(feedback);
                else await onReturn(feedback);
                setShowFeedbackForm(false);
                setFeedback("");
                setAction(null);
              }}
            >
              <Send className="w-3 h-3 mr-1" />
              {action === "approve" ? "Confirmar Aprovação" : "Devolver Fase"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}