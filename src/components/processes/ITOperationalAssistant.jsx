import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { Sparkles, Loader2, AlertCircle, CheckCircle2, Lightbulb } from "lucide-react";
import { toast } from "react-hot-toast";

export default function ITOperationalAssistant({ open, onClose, mapData, existingITs, onCreateIT }) {
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(null);

  const scenarios = [
    { id: "error", label: "Erro Recorrente", description: "Algo está dando errado na execução" },
    { id: "doubt", label: "Dúvida Frequente", description: "Equipe sempre pergunta a mesma coisa" },
    { id: "tool", label: "Mudança de Ferramenta", description: "Sistema/equipamento foi alterado" },
    { id: "goal", label: "Ajuste de Meta", description: "Volume ou objetivo mudou" },
    { id: "responsible", label: "Novo Responsável", description: "Pessoa ou área mudou" },
    { id: "improvement", label: "Melhoria Operacional", description: "Forma de fazer pode ser melhor" }
  ];

  const analyzeContext = async () => {
    if (!context.trim()) {
      toast.error("Descreva o contexto operacional");
      return;
    }

    setLoading(true);
    try {
      const prompt = `
Você é um especialista em gestão de processos operacionais de oficinas mecânicas.

CONTEXTO DO PROCESSO (MAP):
Título: ${mapData?.title || "Não informado"}
Objetivo: ${mapData?.objective || "Não informado"}
Etapas principais: ${mapData?.activities?.map(a => a.activity).join(", ") || "Não informado"}

ITs EXISTENTES:
${existingITs.map(it => `- ${it.code}: ${it.title} (v${it.version})`).join("\n") || "Nenhuma IT criada ainda"}

SITUAÇÃO OPERACIONAL RELATADA:
${context}

TAREFA:
Analise a situação e determine:
1. Se é necessário CRIAR UMA NOVA IT ou ATUALIZAR UMA EXISTENTE
2. Justifique sua recomendação
3. Sugira título, objetivo e principais passos da IT
4. Indique qual indicador do MAP será impactado
5. Classifique a urgência (baixa/média/alta)

Retorne um JSON com esta estrutura:
{
  "action": "create" | "update",
  "target_it_code": "código da IT existente se for update, null se create",
  "justification": "por que essa IT é necessária agora",
  "suggested_title": "título sugerido",
  "suggested_objective": "objetivo claro e operacional",
  "suggested_steps": ["passo 1", "passo 2", "passo 3"],
  "impacted_indicator": "qual KPI do MAP será afetado",
  "urgency": "baixa" | "média" | "alta",
  "common_errors": ["erro comum 1", "erro comum 2"],
  "version_rationale": "por que incrementar versão (se update)"
}
`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            action: { type: "string", enum: ["create", "update"] },
            target_it_code: { type: "string" },
            justification: { type: "string" },
            suggested_title: { type: "string" },
            suggested_objective: { type: "string" },
            suggested_steps: { type: "array", items: { type: "string" } },
            impacted_indicator: { type: "string" },
            urgency: { type: "string", enum: ["baixa", "média", "alta"] },
            common_errors: { type: "array", items: { type: "string" } },
            version_rationale: { type: "string" }
          }
        }
      });

      setSuggestions(response);
      toast.success("Análise concluída!");
    } catch (error) {
      console.error("Erro ao analisar:", error);
      toast.error("Erro ao processar análise operacional");
    } finally {
      setLoading(false);
    }
  };

  const applyRecommendation = () => {
    if (!suggestions) return;

    const targetIT = suggestions.target_it_code 
      ? existingITs.find(it => it.code === suggestions.target_it_code)
      : null;

    const newITData = {
      type: "IT",
      title: suggestions.suggested_title,
      objective: suggestions.suggested_objective,
      description: suggestions.justification,
      activities: suggestions.suggested_steps.map((step, idx) => ({
        sequence: idx + 1,
        activity: step,
        responsible: "A definir"
      })),
      risks: suggestions.common_errors.map((error, idx) => ({
        risk: error,
        severity: suggestions.urgency === "alta" ? "alto" : suggestions.urgency === "média" ? "médio" : "baixo",
        mitigation: "A definir durante implementação"
      })),
      indicators: [{
        name: suggestions.impacted_indicator,
        target: "A definir",
        frequency: "Diário"
      }]
    };

    if (suggestions.action === "update" && targetIT) {
      onCreateIT({
        ...targetIT,
        ...newITData,
        title: `${targetIT.title} (Atualizado)`,
        version_rationale: suggestions.version_rationale
      });
    } else {
      onCreateIT(newITData);
    }

    onClose();
    setSuggestions(null);
    setContext("");
  };

  const getUrgencyColor = (urgency) => {
    return urgency === "alta" ? "bg-red-100 text-red-800" :
           urgency === "média" ? "bg-yellow-100 text-yellow-800" :
           "bg-green-100 text-green-800";
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Assistente Operacional de ITs
          </DialogTitle>
          <p className="text-sm text-gray-600 mt-2">
            Descreva uma situação operacional e receba sugestões inteligentes de criação ou atualização de ITs
          </p>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Gatilhos Rápidos */}
          <div>
            <Label className="text-sm font-semibold mb-2 block">Gatilhos Comuns para Criar/Atualizar IT</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {scenarios.map(scenario => (
                <button
                  key={scenario.id}
                  onClick={() => setContext(`${scenario.label}: ${scenario.description}\n\n`)}
                  className="p-3 border rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors text-left"
                >
                  <div className="font-medium text-sm">{scenario.label}</div>
                  <div className="text-xs text-gray-600 mt-1">{scenario.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Input de Contexto */}
          <div>
            <Label>Descreva o Contexto Operacional</Label>
            <Textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Exemplo: 'A equipe tem demorado muito na prospecção. Vários contatos são perdidos porque não seguem um script padronizado. O indicador de conversão caiu 30% no último mês.'"
              rows={5}
              className="mt-2"
            />
            <div className="flex gap-2 mt-3">
              <Button
                onClick={analyzeContext}
                disabled={loading || !context.trim()}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analisando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Analisar Situação
                  </>
                )}
              </Button>
              {suggestions && (
                <Button variant="outline" onClick={() => setSuggestions(null)}>
                  Nova Análise
                </Button>
              )}
            </div>
          </div>

          {/* Sugestões da IA */}
          {suggestions && (
            <div className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50 space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-600 rounded-lg">
                  <Lightbulb className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={getUrgencyColor(suggestions.urgency)}>
                      Urgência: {suggestions.urgency}
                    </Badge>
                    <Badge variant="outline" className="bg-white">
                      {suggestions.action === "create" ? "Criar Nova IT" : "Atualizar IT Existente"}
                    </Badge>
                  </div>
                  <h4 className="font-semibold text-lg">{suggestions.suggested_title}</h4>
                  {suggestions.target_it_code && (
                    <p className="text-sm text-gray-600 mt-1">
                      Atualizar: <span className="font-mono text-purple-700">{suggestions.target_it_code}</span>
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label className="text-sm font-semibold">Justificativa</Label>
                <p className="text-sm text-gray-700 mt-1">{suggestions.justification}</p>
              </div>

              <div>
                <Label className="text-sm font-semibold">Objetivo da IT</Label>
                <p className="text-sm text-gray-700 mt-1">{suggestions.suggested_objective}</p>
              </div>

              <div>
                <Label className="text-sm font-semibold">Passos Sugeridos</Label>
                <ol className="list-decimal list-inside space-y-1 mt-2">
                  {suggestions.suggested_steps.map((step, idx) => (
                    <li key={idx} className="text-sm text-gray-700">{step}</li>
                  ))}
                </ol>
              </div>

              <div>
                <Label className="text-sm font-semibold">Erros Comuns a Evitar</Label>
                <ul className="list-disc list-inside space-y-1 mt-2">
                  {suggestions.common_errors.map((error, idx) => (
                    <li key={idx} className="text-sm text-red-700">{error}</li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center gap-2 p-3 bg-blue-100 rounded-lg">
                <AlertCircle className="w-5 h-5 text-blue-700" />
                <div className="text-sm">
                  <strong>Indicador Impactado:</strong> {suggestions.impacted_indicator}
                </div>
              </div>

              {suggestions.version_rationale && (
                <div className="flex items-center gap-2 p-3 bg-yellow-100 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-yellow-700" />
                  <div className="text-sm">
                    <strong>Motivo da Nova Versão:</strong> {suggestions.version_rationale}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={applyRecommendation}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Aplicar Recomendação
                </Button>
                <Button variant="outline" onClick={() => setSuggestions(null)}>
                  Descartar
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}