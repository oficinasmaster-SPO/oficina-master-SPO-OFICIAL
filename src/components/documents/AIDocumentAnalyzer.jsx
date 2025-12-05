import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Sparkles, FileSearch, ShieldAlert, CheckCircle2, AlertTriangle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function AIDocumentAnalyzer({ document, onClose }) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [activeTab, setActiveTab] = useState("extraction");

  const analyzeDocument = async (type) => {
    if (!document?.file_url) {
      toast.error("Documento sem arquivo para analisar.");
      return;
    }

    setLoading(true);
    try {
      let prompt = "";
      let schema = null;

      if (type === "extraction") {
        prompt = `
          Analise este documento (contrato ou documento corporativo).
          Extraia as informações chave para facilitar a gestão.
          
          Identifique:
          1. Partes envolvidas (Contratante/Contratada)
          2. Datas importantes (Assinatura, Início, Fim, Renovação)
          3. Valores financeiros e condições de pagamento
          4. Principais obrigações/objeto do contrato
          5. Condições de rescisão e multas
          
          Retorne um JSON com:
          {
            "summary": "Resumo de 1 parágrafo",
            "parties": ["Parte A", "Parte B"],
            "dates": [{"label": "Tipo da data", "value": "dd/mm/aaaa"}],
            "values": [{"label": "Descrição", "value": "Valor"}],
            "key_clauses": [{"title": "Título", "description": "Resumo"}],
            "risks": ["Risco 1", "Risco 2"]
          }
        `;
        schema = {
          type: "object",
          properties: {
            summary: { type: "string" },
            parties: { type: "array", items: { type: "string" } },
            dates: { 
              type: "array", 
              items: { 
                type: "object", 
                properties: { label: { type: "string" }, value: { type: "string" } } 
              } 
            },
            values: { 
              type: "array", 
              items: { 
                type: "object", 
                properties: { label: { type: "string" }, value: { type: "string" } } 
              } 
            },
            key_clauses: { 
              type: "array", 
              items: { 
                type: "object", 
                properties: { title: { type: "string" }, description: { type: "string" } } 
              } 
            },
            risks: { type: "array", items: { type: "string" } }
          }
        };
      } else if (type === "compliance") {
        prompt = `
          Atue como um auditor de compliance e jurídico.
          Revise este documento em busca de inconsistências, riscos ou falta de conformidade.
          
          Considere:
          - Clareza e ambiguidade
          - Cláusulas abusivas ou riscos legais
          - Erros de formatação ou consistência
          - Ausência de cláusulas padrão para documentos do tipo "${document.category}"
          
          Retorne um JSON com:
          {
            "compliance_score": 0-100,
            "status": "Aprovado/Atenção/Reprovado",
            "issues": [
              {"severity": "alta/media/baixa", "issue": "Descrição do problema", "suggestion": "Sugestão de correção"}
            ],
            "missing_clauses": ["Cláusula 1", "Cláusula 2"]
          }
        `;
        schema = {
          type: "object",
          properties: {
            compliance_score: { type: "integer" },
            status: { type: "string" },
            issues: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  severity: { type: "string" },
                  issue: { type: "string" },
                  suggestion: { type: "string" }
                }
              }
            },
            missing_clauses: { type: "array", items: { type: "string" } }
          }
        };
      }

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: [document.file_url],
        response_json_schema: schema
      });

      setAnalysis(response);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao analisar documento. Verifique se o arquivo é acessível.");
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (val) => {
    setActiveTab(val);
    setAnalysis(null);
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            Análise Inteligente de Documento
          </DialogTitle>
          <p className="text-sm text-gray-500">{document?.title}</p>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="extraction" className="flex gap-2">
              <FileSearch className="w-4 h-4" /> Extração de Dados
            </TabsTrigger>
            <TabsTrigger value="compliance" className="flex gap-2">
              <ShieldAlert className="w-4 h-4" /> Revisão de Conformidade
            </TabsTrigger>
          </TabsList>

          <div className="min-h-[300px]">
            {!analysis && !loading && (
              <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg bg-slate-50">
                <Sparkles className="w-12 h-12 text-blue-300 mb-4" />
                <p className="text-gray-600 mb-6 max-w-md">
                  {activeTab === "extraction" 
                    ? "A IA lerá o documento e extrairá datas, valores, partes e cláusulas importantes automaticamente."
                    : "A IA revisará o documento buscando riscos, inconsistências e conformidade com as melhores práticas."}
                </p>
                <Button onClick={() => analyzeDocument(activeTab)} className="bg-blue-600 hover:bg-blue-700">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Iniciar Análise
                </Button>
              </div>
            )}

            {loading && (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
                <p className="text-gray-600 animate-pulse">Lendo e analisando documento...</p>
                <p className="text-xs text-gray-400 mt-2">Isso pode levar alguns segundos.</p>
              </div>
            )}

            {analysis && !loading && activeTab === "extraction" && (
              <div className="space-y-6 animate-in fade-in">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <h4 className="font-semibold text-blue-900 mb-2">Resumo Executivo</h4>
                  <p className="text-sm text-blue-800 leading-relaxed">{analysis.summary}</p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">Partes Envolvidas</CardTitle></CardHeader>
                    <CardContent>
                      <ul className="list-disc list-inside text-sm">
                        {analysis.parties?.map((p, i) => <li key={i}>{p}</li>)}
                      </ul>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">Datas Chave</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {analysis.dates?.map((d, i) => (
                          <div key={i} className="flex justify-between text-sm border-b pb-1 last:border-0">
                            <span className="text-gray-600">{d.label}</span>
                            <span className="font-medium">{d.value}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">Valores Financeiros</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {analysis.values?.map((v, i) => (
                          <div key={i} className="flex justify-between text-sm border-b pb-1 last:border-0">
                            <span className="text-gray-600">{v.label}</span>
                            <span className="font-medium text-green-600">{v.value}</span>
                          </div>
                        ))}
                        {(!analysis.values || analysis.values.length === 0) && <p className="text-sm text-gray-400">Nenhum valor encontrado.</p>}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-red-100 bg-red-50/30">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-red-600">Riscos Identificados</CardTitle></CardHeader>
                    <CardContent>
                      <ul className="list-disc list-inside text-sm text-red-700">
                        {analysis.risks?.map((r, i) => <li key={i}>{r}</li>)}
                        {(!analysis.risks || analysis.risks.length === 0) && <li className="text-green-600 list-none flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/> Nenhum risco evidente.</li>}
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">Cláusulas Principais</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analysis.key_clauses?.map((c, i) => (
                        <div key={i} className="bg-gray-50 p-3 rounded text-sm">
                          <p className="font-semibold text-gray-900 mb-1">{c.title}</p>
                          <p className="text-gray-600">{c.description}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {analysis && !loading && activeTab === "compliance" && (
              <div className="space-y-6 animate-in fade-in">
                <div className="flex items-center justify-between bg-white p-6 rounded-xl border shadow-sm">
                  <div>
                    <h4 className="text-lg font-bold text-gray-900">Score de Conformidade</h4>
                    <p className="text-sm text-gray-500">Baseado em boas práticas de mercado</p>
                  </div>
                  <div className="text-right">
                    <div className={`text-4xl font-black ${analysis.compliance_score >= 80 ? 'text-green-600' : analysis.compliance_score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {analysis.compliance_score}/100
                    </div>
                    <Badge className={`mt-2 ${analysis.status === 'Aprovado' ? 'bg-green-100 text-green-800' : analysis.status === 'Atenção' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                      {analysis.status}
                    </Badge>
                  </div>
                </div>

                {analysis.missing_clauses?.length > 0 && (
                  <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded-r">
                    <h4 className="text-orange-800 font-bold text-sm mb-2 flex items-center">
                      <AlertTriangle className="w-4 h-4 mr-2" /> Cláusulas Ausentes / Recomendadas
                    </h4>
                    <ul className="list-disc list-inside text-sm text-orange-800 grid grid-cols-1 md:grid-cols-2 gap-1">
                      {analysis.missing_clauses.map((clause, i) => (
                        <li key={i}>{clause}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Pontos de Atenção e Inconsistências</h4>
                  {analysis.issues?.map((issue, i) => (
                    <div key={i} className="border rounded-lg p-4 bg-white hover:shadow-sm transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={issue.severity === 'alta' ? 'bg-red-50 text-red-700 border-red-200' : issue.severity === 'media' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-blue-50 text-blue-700 border-blue-200'}>
                            {issue.severity.toUpperCase()}
                          </Badge>
                          <span className="font-medium text-gray-900">{issue.issue}</span>
                        </div>
                      </div>
                      <div className="bg-slate-50 p-3 rounded text-sm text-slate-700 mt-2 border-l-2 border-slate-300">
                        <span className="font-semibold text-slate-900">Sugestão: </span>
                        {issue.suggestion}
                      </div>
                    </div>
                  ))}
                  {(!analysis.issues || analysis.issues.length === 0) && (
                    <div className="text-center py-8 text-green-600 bg-green-50 rounded-lg border border-green-100">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2" />
                      <p>Nenhuma inconsistência encontrada!</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}