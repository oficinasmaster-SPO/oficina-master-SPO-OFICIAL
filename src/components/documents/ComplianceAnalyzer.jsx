import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Shield, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

/**
 * Análise automatizada de conformidade com IA
 */
export default function ComplianceAnalyzer({ document, onClose }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analise este documento quanto à conformidade legal e regulatória brasileira.
                 
                 Retorne uma análise estruturada com:
                 1. Score de conformidade (0-100)
                 2. Status geral (conforme, atenção, não_conforme)
                 3. Lista de requisitos atendidos
                 4. Lista de requisitos não atendidos ou ausentes
                 5. Recomendações de melhorias
                 6. Riscos jurídicos identificados
                 
                 Foque em: LGPD, trabalhista, tributário, contratual, societário.`,
        file_urls: [document.file_url],
        response_json_schema: {
          type: "object",
          properties: {
            score: { type: "number" },
            status: { type: "string", enum: ["conforme", "atencao", "nao_conforme"] },
            requirements_met: {
              type: "array",
              items: { type: "string" }
            },
            requirements_missing: {
              type: "array",
              items: { type: "string" }
            },
            recommendations: {
              type: "array",
              items: { type: "string" }
            },
            legal_risks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  risk: { type: "string" },
                  severity: { type: "string", enum: ["baixa", "media", "alta", "critica"] }
                }
              }
            }
          }
        }
      });

      setAnalysis(result);
      toast.success("Análise concluída!");
    } catch (error) {
      toast.error("Erro ao analisar: " + error.message);
      console.error(error);
    } finally {
      setAnalyzing(false);
    }
  };

  const getStatusConfig = (status) => {
    const configs = {
      conforme: {
        color: "bg-green-500",
        icon: CheckCircle,
        label: "Conforme",
        textColor: "text-green-700"
      },
      atencao: {
        color: "bg-yellow-500",
        icon: AlertTriangle,
        label: "Atenção Necessária",
        textColor: "text-yellow-700"
      },
      nao_conforme: {
        color: "bg-red-500",
        icon: XCircle,
        label: "Não Conforme",
        textColor: "text-red-700"
      }
    };
    return configs[status] || configs.atencao;
  };

  const getSeverityBadge = (severity) => {
    const variants = {
      baixa: "bg-blue-100 text-blue-800",
      media: "bg-yellow-100 text-yellow-800",
      alta: "bg-orange-100 text-orange-800",
      critica: "bg-red-100 text-red-800"
    };
    return variants[severity] || variants.media;
  };

  return (
    <Dialog open={!!document} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Análise de Conformidade: {document?.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {!analysis && !analyzing && (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <Shield className="w-16 h-16 mx-auto mb-4 text-blue-500" />
                <h3 className="text-lg font-semibold mb-2">
                  Análise Inteligente de Conformidade
                </h3>
                <p className="text-gray-600 mb-4">
                  Nossa IA irá analisar o documento e verificar conformidade com:
                  LGPD, legislação trabalhista, tributária, contratual e societária.
                </p>
                <Button onClick={handleAnalyze}>
                  Iniciar Análise
                </Button>
              </CardContent>
            </Card>
          )}

          {analyzing && (
            <Card>
              <CardContent className="p-8 text-center">
                <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-blue-600" />
                <p className="text-gray-600 mb-2">
                  Analisando conformidade...
                </p>
                <p className="text-sm text-gray-500">
                  Isso pode levar 30-60 segundos
                </p>
              </CardContent>
            </Card>
          )}

          {analysis && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Score de Conformidade</span>
                    <Badge className={getStatusConfig(analysis.status).textColor + " text-lg"}>
                      {analysis.score}/100
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Progress value={analysis.score} className="h-3 mb-4" />
                  <div className="flex items-center gap-2">
                    {React.createElement(getStatusConfig(analysis.status).icon, {
                      className: `w-5 h-5 ${getStatusConfig(analysis.status).textColor}`
                    })}
                    <span className={`font-semibold ${getStatusConfig(analysis.status).textColor}`}>
                      {getStatusConfig(analysis.status).label}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {analysis.requirements_met?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="w-5 h-5" />
                      Requisitos Atendidos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analysis.requirements_met.map((req, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{req}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {analysis.requirements_missing?.length > 0 && (
                <Card className="border-red-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-700">
                      <XCircle className="w-5 h-5" />
                      Requisitos Não Atendidos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analysis.requirements_missing.map((req, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{req}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {analysis.legal_risks?.length > 0 && (
                <Card className="border-orange-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-orange-700">
                      <AlertTriangle className="w-5 h-5" />
                      Riscos Jurídicos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analysis.legal_risks.map((risk, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                          <Badge className={getSeverityBadge(risk.severity)}>
                            {risk.severity}
                          </Badge>
                          <span className="text-sm flex-1">{risk.risk}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {analysis.recommendations?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Recomendações</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analysis.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-blue-600 font-bold mt-0.5">{i + 1}.</span>
                          <span className="text-sm">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={onClose}>
                  Fechar
                </Button>
                <Button onClick={handleAnalyze}>
                  Analisar Novamente
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}