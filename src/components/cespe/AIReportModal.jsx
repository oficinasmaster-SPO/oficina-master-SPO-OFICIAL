import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  Target,
  Lightbulb,
  RefreshCw,
  Loader2,
  ThumbsUp,
  ThumbsDown
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function AIReportModal({ open, onClose, interview, onReportGenerated }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const report = interview?.ai_report;

  const handleGenerateReport = async () => {
    if (!interview?.id) return;
    
    setIsGenerating(true);
    try {
      const response = await base44.functions.invoke('generateInterviewAIReport', {
        interview_id: interview.id
      });
      
      if (response.data?.success) {
        toast.success("Relatório IA gerado com sucesso!");
        onReportGenerated?.(response.data.report);
      } else {
        throw new Error(response.data?.error || "Erro desconhecido");
      }
    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
      toast.error("Erro ao gerar relatório: " + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const getQualityColor = (score) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="w-6 h-6 text-purple-600" />
            Relatório de Entrevista com IA
          </DialogTitle>
        </DialogHeader>

        {!report ? (
          <div className="text-center py-12">
            <Sparkles className="w-16 h-16 text-purple-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Gerar Análise Inteligente
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Nossa IA irá analisar todas as respostas, observações e pontuações 
              para gerar um relatório executivo completo sobre o candidato.
            </p>
            <Button 
              onClick={handleGenerateReport}
              disabled={isGenerating}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analisando dados...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-2" />
                  Gerar Relatório IA
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header com Score de Qualidade */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Qualidade da Entrevista</p>
                <p className={`text-3xl font-bold ${getQualityColor(report.interview_quality_score)}`}>
                  {report.interview_quality_score}/100
                </p>
              </div>
              <div className="text-right text-sm text-gray-500">
                <p>Gerado em:</p>
                <p>{new Date(report.generated_at).toLocaleString('pt-BR')}</p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleGenerateReport}
                disabled={isGenerating}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                Regenerar
              </Button>
            </div>

            {/* Resumo Executivo */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  Resumo Executivo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-line">{report.summary}</p>
              </CardContent>
            </Card>

            {/* Pontos Fortes e Fracos */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="border-green-200">
                <CardHeader className="pb-2 bg-green-50">
                  <CardTitle className="text-lg flex items-center gap-2 text-green-800">
                    <ThumbsUp className="w-5 h-5" />
                    Pontos Fortes
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <ul className="space-y-2">
                    {report.strengths?.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-orange-200">
                <CardHeader className="pb-2 bg-orange-50">
                  <CardTitle className="text-lg flex items-center gap-2 text-orange-800">
                    <ThumbsDown className="w-5 h-5" />
                    Pontos de Atenção
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <ul className="space-y-2">
                    {report.weaknesses?.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Fatores de Risco */}
            {report.risk_factors?.length > 0 && (
              <Card className="border-red-200">
                <CardHeader className="pb-2 bg-red-50">
                  <CardTitle className="text-lg flex items-center gap-2 text-red-800">
                    <AlertTriangle className="w-5 h-5" />
                    Fatores de Risco
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="flex flex-wrap gap-2">
                    {report.risk_factors.map((item, idx) => (
                      <Badge key={idx} variant="outline" className="bg-red-50 text-red-700 border-red-300">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Áreas de Desenvolvimento */}
            <Card className="border-blue-200">
              <CardHeader className="pb-2 bg-blue-50">
                <CardTitle className="text-lg flex items-center gap-2 text-blue-800">
                  <TrendingUp className="w-5 h-5" />
                  Áreas de Desenvolvimento
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <ul className="space-y-2">
                  {report.development_areas?.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Target className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Recomendação de Contratação */}
            <Card className="border-purple-200">
              <CardHeader className="pb-2 bg-purple-50">
                <CardTitle className="text-lg flex items-center gap-2 text-purple-800">
                  <Brain className="w-5 h-5" />
                  Recomendação de Contratação
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-gray-700 whitespace-pre-line">{report.hiring_recommendation}</p>
              </CardContent>
            </Card>

            {/* Sugestões de Onboarding */}
            <Card className="border-green-200">
              <CardHeader className="pb-2 bg-green-50">
                <CardTitle className="text-lg flex items-center gap-2 text-green-800">
                  <Lightbulb className="w-5 h-5" />
                  Sugestões para Integração
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <ul className="space-y-2">
                  {report.onboarding_suggestions?.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Lightbulb className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}