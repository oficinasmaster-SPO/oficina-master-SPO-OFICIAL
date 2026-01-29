import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Sparkles, AlertCircle, CheckCircle2, Mic } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import AudioCaptureField from "@/components/shared/AudioCaptureField";
import { questions } from "@/components/diagnostic/Questions";

export default function DiagnosticJustificationModal({ 
  open, 
  onClose, 
  diagnostic, 
  onJustificationsSaved,
  onGeneratePlan 
}) {
  const [justifications, setJustifications] = useState({});
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (open && diagnostic?.answers) {
      const initialJustifications = {};
      diagnostic.answers.forEach(answer => {
        initialJustifications[answer.question_id] = {
          justificativa_texto: answer.justificativa_texto || "",
          justificativa_audio_url: answer.justificativa_audio_url || "",
          observacoes: answer.observacoes || ""
        };
      });
      setJustifications(initialJustifications);
    }
  }, [open, diagnostic]);

  const getQuestionData = (questionId) => {
    return questions.find(q => q.id === questionId);
  };

  const getAnswerData = (questionId) => {
    return diagnostic?.answers?.find(a => a.question_id === questionId);
  };

  const handleJustificationChange = (questionId, field, value) => {
    setJustifications(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        [field]: value
      }
    }));
  };

  const validateJustifications = () => {
    const missingJustifications = diagnostic.answers.filter(answer => {
      const just = justifications[answer.question_id];
      return !just?.justificativa_texto?.trim();
    });

    return missingJustifications;
  };

  const handleSave = async () => {
    const missing = validateJustifications();
    
    if (missing.length > 0) {
      toast.error(`Preencha as justificativas de ${missing.length} pergunta(s) antes de salvar.`);
      return false;
    }

    setSaving(true);
    try {
      const updatedAnswers = diagnostic.answers.map(answer => ({
        ...answer,
        justificativa_texto: justifications[answer.question_id]?.justificativa_texto || "",
        justificativa_audio_url: justifications[answer.question_id]?.justificativa_audio_url || "",
        observacoes: justifications[answer.question_id]?.observacoes || ""
      }));

      console.log('💾 Salvando justificativas para diagnostic:', diagnostic.id);
      await base44.entities.Diagnostic.update(diagnostic.id, {
        answers: updatedAnswers,
        justifications_completed: true
      });

      console.log('✅ Justificativas salvas com sucesso');
      toast.success("Justificativas salvas com sucesso!");
      onJustificationsSaved?.();
      return true;
    } catch (error) {
      console.error('❌ Erro ao salvar justificativas:', error);
      toast.error("Erro ao salvar justificativas: " + error.message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleGeneratePlan = async () => {
    const missing = validateJustifications();
    
    if (missing.length > 0) {
      toast.error(`Preencha as justificativas de ${missing.length} pergunta(s) antes de gerar o plano.`);
      return;
    }

    setGenerating(true);
    try {
      // Auto-salvar se não foi salvo ainda
      if (!diagnostic.justifications_completed) {
        console.log('📝 Salvando justificativas antes de gerar plano...');
        const saved = await handleSave();
        if (!saved) {
          setGenerating(false);
          return;
        }
        // Aguardar um pouco para garantir que o banco salvou
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      console.log('🚀 Chamando onGeneratePlan...');
      toast.info('⏳ Gerando plano personalizado com IA... Aguarde.');
      await onGeneratePlan();
      console.log('✅ Plano gerado com sucesso');
    } catch (error) {
      console.error("❌ Erro ao gerar plano:", error);
      toast.error("Erro ao gerar plano: " + (error?.message || 'Erro desconhecido'));
      setGenerating(false);
    }
  };

  const missing = validateJustifications();
  const allFilled = missing.length === 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="w-6 h-6 text-blue-600" />
            Confirmação e Justificativas
          </DialogTitle>
          <DialogDescription>
            Antes de gerar seu plano personalizado com IA, justifique suas respostas para um resultado mais preciso.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Status de preenchimento */}
          <Card className={`border-2 ${allFilled ? 'border-green-500 bg-green-50' : 'border-yellow-500 bg-yellow-50'}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                {allFilled ? (
                  <>
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                    <div>
                      <p className="font-semibold text-green-900">Todas as justificativas preenchidas!</p>
                      <p className="text-sm text-green-700">Agora você pode salvar e gerar seu plano com IA.</p>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-6 h-6 text-yellow-600" />
                    <div>
                      <p className="font-semibold text-yellow-900">
                        Faltam {missing.length} justificativa(s)
                      </p>
                      <p className="text-sm text-yellow-700">
                        Preencha todas as justificativas para continuar.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Lista de perguntas e justificativas */}
          {diagnostic?.answers?.map((answer, index) => {
            const questionData = getQuestionData(answer.question_id);
            const selectedOption = questionData?.options?.find(opt => opt.letter === answer.selected_option);
            const currentJust = justifications[answer.question_id] || {};
            const isFilled = currentJust.justificativa_texto?.trim();

            return (
              <Card key={answer.question_id} className={`border-2 ${isFilled ? 'border-green-200' : 'border-gray-200'}`}>
                <CardContent className="p-6 space-y-4">
                  {/* Cabeçalho da pergunta */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="font-mono">
                          Pergunta {answer.question_id}
                        </Badge>
                        <Badge className={`${isFilled ? 'bg-green-600' : 'bg-gray-400'}`}>
                          {isFilled ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <AlertCircle className="w-3 h-3 mr-1" />}
                          {isFilled ? 'Preenchida' : 'Pendente'}
                        </Badge>
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-2">
                        {questionData?.question}
                      </h4>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-gray-700">
                          <span className="font-semibold text-blue-900">Sua resposta ({answer.selected_option}):</span> {selectedOption?.text}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Campos de justificativa */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Justificativa <span className="text-red-600">*</span>
                      </label>
                      <Textarea
                        value={currentJust.justificativa_texto || ""}
                        onChange={(e) => handleJustificationChange(answer.question_id, 'justificativa_texto', e.target.value)}
                        placeholder="Explique por que você escolheu esta resposta..."
                        className="min-h-[100px]"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <Mic className="w-4 h-4" />
                        Gravar Justificativa (transcreve automaticamente)
                      </label>
                      <AudioCaptureField
                        existingAudioUrl={currentJust.justificativa_audio_url}
                        onAudioSaved={(url) => handleJustificationChange(answer.question_id, 'justificativa_audio_url', url)}
                        onTranscribed={(text) => {
                          // Append ao texto existente ou sobrescreve se vazio
                          const currentText = currentJust.justificativa_texto || "";
                          const newText = currentText ? currentText + "\n\n" + text : text;
                          handleJustificationChange(answer.question_id, 'justificativa_texto', newText);
                        }}
                        mode="transcribe"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Observações adicionais (opcional)
                      </label>
                      <Textarea
                        value={currentJust.observacoes || ""}
                        onChange={(e) => handleJustificationChange(answer.question_id, 'observacoes', e.target.value)}
                        placeholder="Adicione observações extras se desejar..."
                        className="min-h-[60px]"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Botões de ação */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving || generating}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!allFilled || saving || generating || diagnostic.justifications_completed}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar Justificativas
              </>
            )}
          </Button>
          <Button
            onClick={handleGeneratePlan}
            disabled={!allFilled || saving || generating}
            className="bg-green-600 hover:bg-green-700"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Gerar Plano com IA
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}