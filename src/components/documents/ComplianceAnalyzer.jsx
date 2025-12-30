import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Shield, AlertTriangle, CheckCircle, XCircle, FileCheck, Lightbulb, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

/**
 * Análise avançada de conformidade com LGPD, ISO 9001, ISO 27001 e legislação brasileira
 */
export default function ComplianceAnalyzer({ document, onClose }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Você é um especialista em conformidade regulatória. Analise o documento "${document.title}" disponível em ${document.file_url}.

VERIFICAÇÕES OBRIGATÓRIAS:

1. LGPD (Lei Geral de Proteção de Dados - Brasil):
   - Identifique qualquer dado pessoal mencionado
   - Verifique se há base legal para tratamento
   - Avalie se há cláusulas de consentimento adequadas
   - Identifique direitos do titular (acesso, correção, exclusão)
   - Verifique nomeação de DPO se necessário
   - Avalie medidas de segurança mencionadas

2. ISO 9001 (Sistema de Gestão da Qualidade):
   - Verifique rastreabilidade e versionamento
   - Avalie se há processo de aprovação definido
   - Identifique responsáveis e autoridades
   - Verifique se há procedimento de revisão periódica

3. ISO 27001 (Segurança da Informação):
   - Identifique classificação de informações
   - Avalie controles de acesso mencionados
   - Verifique política de backup/recuperação

4. Legislação Trabalhista (CLT):
   - Se for contrato de trabalho, verifique cláusulas obrigatórias
   - Avalie conformidade com direitos trabalhistas
   - Identifique riscos trabalhistas

5. Código Civil/Comercial:
   - Para contratos: verificar objeto, partes, valor, prazo
   - Avaliar cláusulas de rescisão e penalidades
   - Identificar vícios ou cláusulas abusivas

ANÁLISE PROFUNDA:
- Atribua uma nota de 0-100 para conformidade geral
- Identifique TODOS os requisitos atendidos
- Identifique TODOS os requisitos NÃO atendidos (crítico)
- Liste recomendações PRÁTICAS e ESPECÍFICAS
- Identifique riscos legais com severidade (alta/média/baixa)
- Para cada risco, sugira ação corretiva

Seja rigoroso e específico. Cite artigos de lei quando relevante.`,
        file_urls: [document.file_url],
        response_json_schema: {
          type: "object",
          properties: {
            overall_score: { type: "number", description: "0-100" },
            status: { type: "string", enum: ["conforme", "parcialmente_conforme", "nao_conforme"] },
            lgpd_analysis: {
              type: "object",
              properties: {
                score: { type: "number" },
                personal_data_found: { type: "boolean" },
                legal_basis: { type: "string" },
                issues: { type: "array", items: { type: "string" } },
                compliant: { type: "boolean" }
              }
            },
            iso9001_analysis: {
              type: "object",
              properties: {
                score: { type: "number" },
                version_control: { type: "boolean" },
                approval_process: { type: "boolean" },
                issues: { type: "array", items: { type: "string" } }
              }
            },
            requirements_met: { 
              type: "array", 
              items: { 
                type: "object",
                properties: {
                  requirement: { type: "string" },
                  regulation: { type: "string" },
                  evidence: { type: "string" }
                }
              }
            },
            requirements_not_met: { 
              type: "array", 
              items: { 
                type: "object",
                properties: {
                  requirement: { type: "string" },
                  regulation: { type: "string" },
                  impact: { type: "string" },
                  priority: { type: "string", enum: ["alta", "media", "baixa"] }
                }
              }
            },
            recommendations: { 
              type: "array", 
              items: {
                type: "object",
                properties: {
                  action: { type: "string" },
                  priority: { type: "string" },
                  estimated_time: { type: "string" }
                }
              }
            },
            legal_risks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  risk: { type: "string" },
                  severity: { type: "string", enum: ["alta", "media", "baixa"] },
                  regulation: { type: "string" },
                  consequence: { type: "string" },
                  action: { type: "string" }
                }
              }
            }
          }
        }
      });

      setAnalysis(result);
      toast.success("Análise concluída com sucesso!");
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
        label: "Totalmente Conforme",
        textColor: "text-green-700"
      },
      parcialmente_conforme: {
        color: "bg-yellow-500",
        icon: AlertTriangle,
        label: "Parcialmente Conforme",
        textColor: "text-yellow-700"
      },
      nao_conforme: {
        color: "bg-red-500",
        icon: XCircle,
        label: "Não Conforme",
        textColor: "text-red-700"
      }
    };
    return configs[status] || configs.parcialmente_conforme;
  };

  const getSeverityBadge = (severity) => {
    const variants = {
      baixa: { className: "bg-blue-100 text-blue-800", label: "Baixa" },
      media: { className: "bg-yellow-100 text-yellow-800", label: "Média" },
      alta: { className: "bg-red-100 text-red-800", label: "Alta" }
    };
    return variants[severity] || variants.media;
  };

  return (
    <Dialog open={!!document} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-600" />
            Análise Avançada de Conformidade: {document?.title}
          </DialogTitle>
          <p className="text-sm text-gray-600">
            Verificação automática de LGPD, ISO 9001, ISO 27001 e legislação brasileira
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {!analysis && !analyzing && (
            <Card className="border-2 border-dashed border-blue-300">
              <CardContent className="p-10 text-center">
                <Shield className="w-20 h-20 mx-auto mb-4 text-blue-500" />
                <h3 className="text-xl font-bold mb-3">
                  Análise Inteligente de Conformidade
                </h3>
                <p className="text-gray-600 mb-2">
                  Nossa IA realizará uma análise profunda verificando:
                </p>
                <ul className="text-sm text-gray-700 mb-6 space-y-1 max-w-md mx-auto text-left">
                  <li>✓ LGPD - Lei Geral de Proteção de Dados</li>
                  <li>✓ ISO 9001 - Gestão da Qualidade</li>
                  <li>✓ ISO 27001 - Segurança da Informação</li>
                  <li>✓ CLT - Legislação Trabalhista</li>
                  <li>✓ Código Civil e Comercial</li>
                </ul>
                <Button onClick={handleAnalyze} className="bg-blue-600 hover:bg-blue-700">
                  <Shield className="w-4 h-4 mr-2" />
                  Iniciar Análise Completa
                </Button>
              </CardContent>
            </Card>
          )}

          {analyzing && (
            <Card>
              <CardContent className="p-10 text-center">
                <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin text-blue-600" />
                <p className="text-lg font-medium text-gray-700 mb-2">
                  Analisando conformidade regulatória...
                </p>
                <p className="text-sm text-gray-500">
                  Processamento profundo - isso pode levar 30-90 segundos
                </p>
                <Progress value={undefined} className="h-2 mt-4 max-w-md mx-auto" />
              </CardContent>
            </Card>
          )}

          {analysis && (
            <>
              {/* Score Geral */}
              <Card className="border-t-4 border-t-blue-500">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-lg font-semibold">Pontuação Geral de Conformidade</span>
                    <span className="text-3xl font-bold text-blue-600">{analysis.overall_score}/100</span>
                  </div>
                  <Progress value={analysis.overall_score} className="h-3 mb-4" />
                  <div className="flex items-center gap-2">
                    {React.createElement(getStatusConfig(analysis.status).icon, {
                      className: `w-6 h-6 ${getStatusConfig(analysis.status).textColor}`
                    })}
                    <span className={`font-bold text-lg ${getStatusConfig(analysis.status).textColor}`}>
                      {getStatusConfig(analysis.status).label}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Análise LGPD */}
              {analysis.lgpd_analysis && (
                <Card>
                  <CardHeader className="bg-blue-50">
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-blue-600" />
                      Análise LGPD (Lei Geral de Proteção de Dados)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <span className="text-sm text-gray-600">Pontuação LGPD</span>
                        <p className="text-2xl font-bold text-blue-600">{analysis.lgpd_analysis.score}/100</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Dados Pessoais Identificados</span>
                        <Badge variant={analysis.lgpd_analysis.personal_data_found ? "default" : "secondary"} className="mt-1">
                          {analysis.lgpd_analysis.personal_data_found ? "Sim" : "Não"}
                        </Badge>
                      </div>
                    </div>
                    {analysis.lgpd_analysis.legal_basis && (
                      <div className="mb-3">
                        <span className="text-sm font-semibold">Base Legal Identificada:</span>
                        <p className="text-sm text-gray-700 mt-1">{analysis.lgpd_analysis.legal_basis}</p>
                      </div>
                    )}
                    {analysis.lgpd_analysis.issues && analysis.lgpd_analysis.issues.length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded p-3">
                        <span className="text-sm font-semibold text-red-800 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          Problemas LGPD Identificados
                        </span>
                        <ul className="mt-2 space-y-1">
                          {analysis.lgpd_analysis.issues.map((issue, i) => (
                            <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                              <span>•</span>
                              <span>{issue}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Análise ISO 9001 */}
              {analysis.iso9001_analysis && (
                <Card>
                  <CardHeader className="bg-green-50">
                    <CardTitle className="flex items-center gap-2">
                      <FileCheck className="w-5 h-5 text-green-600" />
                      Análise ISO 9001 (Gestão da Qualidade)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-gray-600">Pontuação ISO 9001</span>
                      <span className="text-2xl font-bold text-green-600">{analysis.iso9001_analysis.score}/100</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        {analysis.iso9001_analysis.version_control ? 
                          <CheckCircle className="w-5 h-5 text-green-600" /> : 
                          <XCircle className="w-5 h-5 text-red-600" />
                        }
                        <span className="text-sm">Controle de Versão</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        {analysis.iso9001_analysis.approval_process ? 
                          <CheckCircle className="w-5 h-5 text-green-600" /> : 
                          <XCircle className="w-5 h-5 text-red-600" />
                        }
                        <span className="text-sm">Processo de Aprovação</span>
                      </div>
                    </div>
                    {analysis.iso9001_analysis.issues && analysis.iso9001_analysis.issues.length > 0 && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mt-3">
                        <span className="text-sm font-semibold text-yellow-800">Melhorias Necessárias:</span>
                        <ul className="mt-2 space-y-1">
                          {analysis.iso9001_analysis.issues.map((issue, i) => (
                            <li key={i} className="text-sm text-yellow-700">• {issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Requisitos Atendidos */}
              {analysis.requirements_met?.length > 0 && (
                <Card>
                  <CardHeader className="bg-green-50">
                    <CardTitle className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="w-5 h-5" />
                      Requisitos Atendidos ({analysis.requirements_met.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      {analysis.requirements_met.map((req, i) => (
                        <div key={i} className="p-3 bg-green-50 rounded border border-green-200">
                          <div className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm font-medium">{req.requirement || req}</p>
                              {req.regulation && (
                                <Badge variant="outline" className="mt-1 text-xs">
                                  {req.regulation}
                                </Badge>
                              )}
                              {req.evidence && (
                                <p className="text-xs text-gray-600 mt-1">{req.evidence}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Requisitos Não Atendidos */}
              {analysis.requirements_not_met?.length > 0 && (
                <Card className="border-red-200 border-2">
                  <CardHeader className="bg-red-50">
                    <CardTitle className="flex items-center gap-2 text-red-700">
                      <AlertCircle className="w-5 h-5" />
                      Requisitos Não Atendidos - ATENÇÃO ({analysis.requirements_not_met.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      {analysis.requirements_not_met.map((req, i) => (
                        <div key={i} className="p-3 bg-red-50 rounded-lg border-2 border-red-300">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-start gap-2 flex-1">
                              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                              <p className="text-sm font-semibold text-red-800">{req.requirement || req}</p>
                            </div>
                            {req.priority && (
                              <Badge className={req.priority === 'alta' ? 'bg-red-600' : 'bg-yellow-600'}>
                                Prioridade {req.priority}
                              </Badge>
                            )}
                          </div>
                          {req.regulation && (
                            <p className="text-xs font-medium text-red-700 mb-1">
                              📋 {req.regulation}
                            </p>
                          )}
                          {req.impact && (
                            <p className="text-xs text-gray-700">
                              <strong>Impacto:</strong> {req.impact}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Riscos Legais */}
              {analysis.legal_risks?.length > 0 && (
                <Card className="border-orange-200">
                  <CardHeader className="bg-orange-50">
                    <CardTitle className="flex items-center gap-2 text-orange-700">
                      <AlertTriangle className="w-5 h-5" />
                      Riscos Legais Identificados ({analysis.legal_risks.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      {analysis.legal_risks.map((risk, i) => (
                        <div key={i} className="p-4 bg-orange-50 rounded-lg border border-orange-300">
                          <div className="flex items-start justify-between mb-2">
                            <p className="font-semibold text-sm flex-1">{risk.risk}</p>
                            <Badge className={getSeverityBadge(risk.severity).className}>
                              {getSeverityBadge(risk.severity).label}
                            </Badge>
                          </div>
                          {risk.regulation && (
                            <p className="text-xs text-orange-800 font-medium mb-1">
                              📋 {risk.regulation}
                            </p>
                          )}
                          {risk.consequence && (
                            <p className="text-xs text-gray-700 mb-2">
                              <strong>Consequência:</strong> {risk.consequence}
                            </p>
                          )}
                          <div className="mt-2 pt-2 border-t border-orange-200">
                            <p className="text-xs text-gray-800">
                              <strong>💡 Ação Corretiva:</strong> {risk.action}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recomendações */}
              {analysis.recommendations?.length > 0 && (
                <Card>
                  <CardHeader className="bg-blue-50">
                    <CardTitle className="flex items-center gap-2 text-blue-700">
                      <Lightbulb className="w-5 h-5" />
                      Recomendações de Melhoria ({analysis.recommendations.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      {analysis.recommendations.map((rec, i) => (
                        <div key={i} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-start gap-2">
                            <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {i + 1}
                            </span>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{rec.action || rec}</p>
                              <div className="flex gap-2 mt-2">
                                {rec.priority && (
                                  <Badge variant="outline" className="text-xs">
                                    Prioridade: {rec.priority}
                                  </Badge>
                                )}
                                {rec.estimated_time && (
                                  <Badge variant="secondary" className="text-xs">
                                    Prazo: {rec.estimated_time}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Ações */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={onClose}>
                  Fechar
                </Button>
                <Button onClick={handleAnalyze} className="bg-blue-600 hover:bg-blue-700">
                  <Shield className="w-4 h-4 mr-2" />
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