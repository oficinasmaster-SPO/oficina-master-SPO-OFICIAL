import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Save, List } from "lucide-react";
import AudioRecorder from "./AudioRecorder";
import TechnicalChecklist from "./TechnicalChecklist";
import { base44 } from "@/api/base44Client";

const blockLabels = {
  tecnico: "Bloco Técnico (40%)",
  comportamental: "Bloco Comportamental (30%)",
  cultural: "Bloco Cultural (15%)",
  historico: "Bloco Histórico/Risco (15%)"
};

const blockColors = {
  tecnico: "bg-blue-100 text-blue-800",
  comportamental: "bg-purple-100 text-purple-800",
  cultural: "bg-green-100 text-green-800",
  historico: "bg-orange-100 text-orange-800"
};

export default function LeadScoreInterviewForm({
  form,
  currentStep,
  scores,
  onScoreChange,
  criteriaObservations,
  onObservationChange,
  criteriaAudios,
  onAudioChange,
  checklistResponses = {},
  onChecklistChange,
  onStepChange,
  interviewerNotes,
  onNotesChange,
  recommendation,
  onRecommendationChange,
  onSubmit,
  isLoading
}) {
  const criteria = form?.scoring_criteria || [];
  const currentCriteria = criteria[currentStep];
  const [showChecklist, setShowChecklist] = useState(false);

  // Determinar qual checklist mostrar baseado no critério técnico
  const getChecklistType = () => {
    if (!currentCriteria || currentCriteria.block !== 'tecnico') return null;
    
    const criteriaName = currentCriteria.criteria_name?.toLowerCase() || '';
    
    if (criteriaName.includes('conhecimento') || criteriaName.includes('técnico')) {
      return 'conhecimento_tecnico';
    }
    if (criteriaName.includes('experiência') || criteriaName.includes('prática')) {
      return 'experiencia_pratica';
    }
    if (criteriaName.includes('diagnóstico') || criteriaName.includes('capacidade')) {
      return 'capacidade_diagnostico';
    }
    
    return null;
  };

  const checklistType = getChecklistType();
  
  if (!currentCriteria) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Finalizar Avaliação Lead Score</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <p className="text-sm text-gray-600">Técnico</p>
                <p className="text-2xl font-bold text-blue-600">
                  {Object.entries(scores).filter(([k]) => k.startsWith('tecnico_')).reduce((sum, [, v]) => sum + v, 0)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Comportamental</p>
                <p className="text-2xl font-bold text-purple-600">
                  {Object.entries(scores).filter(([k]) => k.startsWith('comportamental_')).reduce((sum, [, v]) => sum + v, 0)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Cultural</p>
                <p className="text-2xl font-bold text-green-600">
                  {Object.entries(scores).filter(([k]) => k.startsWith('cultural_')).reduce((sum, [, v]) => sum + v, 0)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Histórico</p>
                <p className="text-2xl font-bold text-orange-600">
                  {Object.entries(scores).filter(([k]) => k.startsWith('historico_')).reduce((sum, [, v]) => sum + v, 0)}
                </p>
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg text-center">
              <p className="text-sm text-gray-600 mb-1">Score Total</p>
              <p className="text-4xl font-bold text-blue-600">
                {Object.values(scores).reduce((sum, v) => sum + v, 0)}/100
              </p>
            </div>

            <div>
              <Label>Observações do Entrevistador</Label>
              <Textarea
                value={interviewerNotes}
                onChange={(e) => onNotesChange(e.target.value)}
                rows={4}
                placeholder="Adicione observações importantes sobre o candidato..."
              />
            </div>

            <div>
              <Label>Recomendação Final</Label>
              <select
                value={recommendation}
                onChange={(e) => onRecommendationChange(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                required
              >
                <option value="">Selecione...</option>
                <option value="A">A - Excelente (85-100) - Contratar / Priorizar</option>
                <option value="B">B - Bom (70-84) - Contratar com plano</option>
                <option value="C">C - Risco (55-69) - Só se faltar opção</option>
                <option value="D">D - Não recomendado (&lt;55) - Não contratar</option>
              </select>
            </div>

            <div className="flex gap-2 justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onStepChange(currentStep - 1)}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Anterior
              </Button>
              <Button
                onClick={onSubmit}
                disabled={isLoading || !recommendation}
                className="bg-green-600 hover:bg-green-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {isLoading ? "Salvando..." : "Finalizar Entrevista"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const criteriaKey = `${currentCriteria.block}_${currentStep}`;
  const currentScore = scores[criteriaKey] || 0;
  const currentObservation = criteriaObservations?.[criteriaKey] || "";
  const currentAudio = criteriaAudios?.[criteriaKey] || null;
  const currentChecklistKey = `${criteriaKey}_checklist`;
  const currentChecklistResponses = checklistResponses?.[currentChecklistKey] || {};

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between mb-2">
            <Badge className={blockColors[currentCriteria.block]}>
              {blockLabels[currentCriteria.block]}
            </Badge>
            <span className="text-sm text-gray-500">
              Critério {currentStep + 1} de {criteria.length}
            </span>
          </div>
          <CardTitle className="text-xl">{currentCriteria.criteria_name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentCriteria.question && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-900 mb-1">Pergunta:</p>
              <p className="text-gray-700">{currentCriteria.question}</p>
            </div>
          )}

          {currentCriteria.scoring_guide && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-900 mb-1">Guia de Pontuação:</p>
              <p className="text-sm text-gray-700 whitespace-pre-line">{currentCriteria.scoring_guide}</p>
            </div>
          )}

          <div>
            <Label className="text-lg">
              Pontuação (0 - {currentCriteria.max_points})
            </Label>
            <div className="flex items-center gap-4 mt-2">
              <input
                type="range"
                min="0"
                max={currentCriteria.max_points}
                value={currentScore}
                onChange={(e) => onScoreChange(criteriaKey, parseInt(e.target.value))}
                className="flex-1 h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="text-3xl font-bold text-blue-600 min-w-[60px] text-center">
                {currentScore}
              </div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0</span>
              <span>{currentCriteria.max_points}</span>
            </div>
          </div>

          {/* Botão Checklist Técnico */}
          {checklistType && (
            <div className="mt-4">
              <Button
                type="button"
                onClick={() => setShowChecklist(!showChecklist)}
                variant="outline"
                className="w-full border-blue-600 text-blue-600 hover:bg-blue-50"
              >
                <List className="w-4 h-4 mr-2" />
                {showChecklist ? 'Ocultar Checklist' : 'Abrir Checklist Técnico'}
              </Button>
            </div>
          )}

          {/* Checklist Técnico */}
          {showChecklist && checklistType && (
            <div className="mt-4">
              <TechnicalChecklist
                checklistType={checklistType}
                criteriaName={currentCriteria.criteria_name}
                workshopId={form?.workshop_id}
                responses={currentChecklistResponses}
                onChange={(newResponses) => {
                  const allChecklists = { ...checklistResponses };
                  allChecklists[currentChecklistKey] = newResponses;
                  onChecklistChange?.(allChecklists);
                }}
              />
            </div>
          )}

          <div className="space-y-3 mt-6 p-4 bg-gray-50 rounded-lg border">
            <div>
              <Label>Observações do Entrevistador</Label>
              <Textarea
                value={currentObservation}
                onChange={(e) => onObservationChange(criteriaKey, e.target.value)}
                placeholder="Anote impressões, detalhes da conversa, pontos importantes..."
                rows={3}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Gravar Feedback em Áudio</Label>
              <div className="mt-2">
                <AudioRecorder
                  existingAudioUrl={currentAudio}
                  onAudioSave={(url) => onAudioChange(criteriaKey, url)}
                  onTranscription={(text) => {
                    // Adicionar transcrição às observações existentes
                    const currentObs = currentObservation || "";
                    const newObs = currentObs 
                      ? `${currentObs}\n\n[Transcrição do áudio]:\n${text}`
                      : `[Transcrição do áudio]:\n${text}`;
                    onObservationChange(criteriaKey, newObs);
                  }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                🎙️ Grave observações - serão transcritas automaticamente
              </p>
            </div>
          </div>

          <div className="flex gap-2 justify-between pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onStepChange(currentStep - 1)}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Anterior
            </Button>
            <Button
              type="button"
              onClick={() => onStepChange(currentStep + 1)}
            >
              Próximo
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}