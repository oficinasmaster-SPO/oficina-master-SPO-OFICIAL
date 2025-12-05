import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, ArrowRight, CheckCircle2, BarChart3, TrendingUp } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function AIProcessOptimizer({ processData, onApplyOptimization }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(null);

  const generateOptimization = async () => {
    setLoading(true);
    try {
      const prompt = `
        Atue como um Consultor Especialista em Processos de Oficinas Mecânicas (Lean / Qualidade).
        Analise este processo existente e sugira otimizações baseadas em benchmarks de mercado.
        
        PROCESSO ATUAL:
        Título: ${processData.title}
        Objetivo: ${processData.content_json?.objetivo || '-'}
        Atividades Atuais: ${JSON.stringify(processData.content_json?.atividades || [])}
        Indicadores Atuais: ${JSON.stringify(processData.content_json?.indicadores || [])}

        Foque em:
        1. Eliminar desperdícios e redundâncias
        2. Aumentar a clareza das responsabilidades
        3. Sugerir indicadores (KPIs) mais assertivos para resultado
        
        Retorne um JSON com:
        {
          "analysis_summary": "Breve análise do estado atual",
          "suggested_improvements": [
            {"type": "fluxo", "suggestion": "...", "impact": "Impacto esperado"},
            {"type": "atividade", "suggestion": "...", "impact": "..."}
          ],
          "optimized_content": {
            "fluxo_processo": "Texto melhorado do fluxo...",
            "atividades": [{"atividade": "...", "responsavel": "...", "ferramentas": "..."}],
            "indicadores": [{"indicador": "...", "meta": "...", "como_medir": "..."}]
          }
        }
      `;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            analysis_summary: { type: "string" },
            suggested_improvements: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  suggestion: { type: "string" },
                  impact: { type: "string" }
                }
              }
            },
            optimized_content: {
              type: "object",
              properties: {
                fluxo_processo: { type: "string" },
                atividades: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      atividade: { type: "string" },
                      responsavel: { type: "string" },
                      ferramentas: { type: "string" }
                    }
                  }
                },
                indicadores: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      indicador: { type: "string" },
                      meta: { type: "string" },
                      como_medir: { type: "string" }
                    }
                  }
                }
              }
            }
          }
        }
      });

      setSuggestions(response);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar otimização.");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (suggestions?.optimized_content) {
      onApplyOptimization(suggestions.optimized_content);
      toast.success("Melhorias aplicadas ao formulário!");
      setIsOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100">
          <TrendingUp className="w-4 h-4 mr-2" />
          Otimizar (Benchmark)
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Otimizador de Processos (IA Benchmark)
          </DialogTitle>
        </DialogHeader>

        {!suggestions ? (
          <div className="flex flex-col items-center justify-center flex-1 py-12 text-center">
            <BarChart3 className="w-12 h-12 text-purple-200 mb-4" />
            <p className="text-gray-600 mb-6 max-w-md">
              A IA comparará seu processo com as melhores práticas do mercado automotivo e sugerirá melhorias de fluxo e indicadores.
            </p>
            <Button onClick={generateOptimization} disabled={loading} className="bg-purple-600 hover:bg-purple-700">
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analisando Benchmark...</>
              ) : (
                "Gerar Sugestões de Otimização"
              )}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col h-full overflow-hidden">
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-6 py-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <h4 className="font-semibold text-blue-900 mb-2">Diagnóstico IA</h4>
                  <p className="text-sm text-blue-800 leading-relaxed">{suggestions.analysis_summary}</p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Sugestões de Melhoria</h4>
                  <div className="grid gap-3">
                    {suggestions.suggested_improvements?.map((imp, idx) => (
                      <div key={idx} className="bg-white border rounded-lg p-3 shadow-sm">
                        <div className="flex justify-between items-start mb-1">
                          <Badge variant="secondary" className="capitalize">{imp.type}</Badge>
                          <span className="text-xs font-medium text-green-600 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" /> {imp.impact}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mt-2">{imp.suggestion}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Prévia das Alterações</h4>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div className="bg-gray-50 p-3 rounded">
                      <strong className="block mb-2 text-gray-700">Novas Atividades ({suggestions.optimized_content?.atividades?.length})</strong>
                      <ul className="list-disc list-inside text-gray-600 space-y-1">
                        {suggestions.optimized_content?.atividades?.slice(0, 3).map((a, i) => (
                          <li key={i} className="truncate">{a.atividade}</li>
                        ))}
                        {(suggestions.optimized_content?.atividades?.length || 0) > 3 && <li>...</li>}
                      </ul>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <strong className="block mb-2 text-gray-700">Novos Indicadores ({suggestions.optimized_content?.indicadores?.length})</strong>
                      <ul className="list-disc list-inside text-gray-600 space-y-1">
                        {suggestions.optimized_content?.indicadores?.map((a, i) => (
                          <li key={i} className="truncate">{a.indicador}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
            
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t bg-white">
              <Button variant="outline" onClick={() => setIsOpen(false)}>Fechar</Button>
              <Button onClick={handleApply} className="bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Aplicar Otimizações
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}