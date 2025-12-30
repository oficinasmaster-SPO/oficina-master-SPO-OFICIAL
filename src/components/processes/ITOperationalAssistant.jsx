import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { Sparkles, Loader2, AlertCircle, CheckCircle2, Lightbulb } from "lucide-react";
import { toast } from "sonner";

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
    setSuggestions(null);
    
    try {
      console.log("🔍 Iniciando análise operacional...");
      console.log("📝 Contexto:", context);
      
      const prompt = `
VOCÊ É A IA OPERACIONAL DO BASE44.

MISSÃO PRINCIPAL:
Atuar de forma ativa na melhoria contínua dos processos, operando no nível de INSTRUÇÃO DE TRABALHO (IT).
O MAP é apenas referência estrutural e NÃO deve ser alterado, salvo solicitação explícita.

MODO DE OPERAÇÃO:
- Proibido atuar apenas em modo análise.
- É OBRIGATÓRIO propor melhorias sempre que houver qualquer falha, ambiguidade ou oportunidade operacional.

ESCOPO DE ANÁLISE (OBRIGATÓRIO VERIFICAR SEMPRE):
1. Passos genéricos ou subjetivos
2. Falta de critério objetivo de execução
3. Risco de erro humano
4. Falta de responsável claro
5. Ausência de indicador ou impacto mensurável
6. Repetição de dúvida ou retrabalho potencial
7. Dependência excessiva de conhecimento tácito

CONTEXTO DO PROCESSO (MAP - REFERÊNCIA):
Título: ${mapData?.title || "Não informado"}
Objetivo: ${mapData?.content_json?.objetivo || mapData?.objective || "Não informado"}
Etapas principais: ${mapData?.content_json?.atividades?.map(a => a.atividade).join(", ") || "Não informado"}
Indicadores: ${mapData?.content_json?.indicadores?.map(i => i.indicador).join(", ") || "Não definidos"}

ITs EXISTENTES:
${existingITs.map(it => `- ${it.code}: ${it.title} (v${it.version}) - Última alteração: ${it.version_history?.[it.version_history.length - 1]?.changes || "Criação inicial"}`).join("\n") || "Nenhuma IT criada ainda"}

SITUAÇÃO OPERACIONAL RELATADA:
${context}

REGRA DE GERAÇÃO DE IT:
- Sempre que QUALQUER item do escopo acima for identificado, você DEVE:
  a) Gerar uma ATUALIZAÇÃO SUGERIDA
  b) Criar nova IT ou versionar IT existente
  c) Registrar motivo da alteração
  d) Manter o MAP inalterado

VERSIONAMENTO:
- v1.0 → Criação inicial
- v1.1 → Ajuste leve (clareza, texto, critério)
- v2.0 → Mudança operacional relevante
- v3.0 → Mudança estrutural

REGRA CRÍTICA:
Se NÃO houver melhoria, você DEVE justificar explicitamente por que o processo está operacionalmente correto.
É proibido responder sem propor melhoria ou justificativa formal.

**FORMATO DE RESPOSTA JSON:**

**Caso 1: Ação Necessária (action_required = true)**
{
  "action_required": true,
  "action_type": "create_it" ou "update_it",
  "target_it_code": "IT-XXX" ou null,
  "current_version": "X.X" ou null,
  "proposed_version": "X.X" ou null,
  "change_reason": "motivo técnico obrigatório",
  "change_summary": "resumo executivo obrigatório",
  "operational_impact": "impacto esperado obrigatório",
  "affected_indicator": "indicador impactado obrigatório",
  "urgency": "baixa" | "média" | "alta",
  "suggested_title": "OBRIGATÓRIO - título da IT",
  "suggested_objective": "OBRIGATÓRIO - objetivo claro",
  "suggested_steps": ["OBRIGATÓRIO - mínimo 3 passos"],
  "common_errors": ["OBRIGATÓRIO - mínimo 2 erros comuns"],
  "controlled_risks": [],
  "validation_justification": null
}

**Caso 2: Processo Validado (action_required = false)**
{
  "action_required": false,
  "action_type": "validated",
  "target_it_code": null,
  "current_version": null,
  "proposed_version": null,
  "change_reason": "Análise realizada sem identificar necessidade de melhoria",
  "change_summary": "Processo operacionalmente adequado",
  "operational_impact": "Manutenção do padrão atual",
  "affected_indicator": "N/A",
  "urgency": "baixa",
  "suggested_title": "",
  "suggested_objective": "",
  "suggested_steps": [],
  "common_errors": [],
  "controlled_risks": ["risco 1 já controlado", "risco 2 já controlado"],
  "validation_justification": "OBRIGATÓRIO - justificativa detalhada"
}
`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            action_required: { type: "boolean" },
            action_type: { type: "string", enum: ["create_it", "update_it", "validated"] },
            target_it_code: { type: ["string", "null"] },
            current_version: { type: ["string", "null"] },
            proposed_version: { type: ["string", "null"] },
            change_reason: { type: "string" },
            change_summary: { type: "string" },
            operational_impact: { type: "string" },
            affected_indicator: { type: "string" },
            urgency: { type: "string", enum: ["baixa", "média", "alta"] },
            suggested_title: { type: "string" },
            suggested_objective: { type: "string" },
            suggested_steps: { type: "array", items: { type: "string" } },
            common_errors: { type: "array", items: { type: "string" } },
            controlled_risks: { type: "array", items: { type: "string" } },
            validation_justification: { type: ["string", "null"] }
          },
          required: ["action_required", "action_type", "change_reason"]
        }
      });

      console.log("✅ IA Response completa:", JSON.stringify(response, null, 2));
      
      if (!response || typeof response !== 'object') {
        console.error("❌ Resposta inválida da IA:", response);
        toast.error("Resposta inválida da IA");
        setLoading(false);
        return;
      }

      // Validação condicional baseada no action_type
      if (response.action_required && response.action_type !== "validated") {
        if (!response.suggested_title || !Array.isArray(response.suggested_steps) || response.suggested_steps.length === 0) {
          console.error("❌ Resposta incompleta para action_required:", response);
          toast.error("IA não retornou campos obrigatórios - tente descrever mais detalhes");
          setLoading(false);
          return;
        }
      }

      setSuggestions(response);
      console.log("✅ Sugestões definidas com sucesso");
      toast.success("Análise concluída!");
    } catch (error) {
      console.error("❌ Erro ao analisar:", error);
      console.error("Stack trace:", error.stack);
      toast.error(`Erro: ${error.message || "Erro ao processar análise operacional"}`);
    } finally {
      setLoading(false);
    }
  };

  const applyRecommendation = () => {
    if (!suggestions || !suggestions.action_required) {
      console.error("No suggestions or action not required", suggestions);
      return;
    }

    const targetIT = suggestions.target_it_code 
      ? existingITs.find(it => it.code === suggestions.target_it_code)
      : null;

    const newITData = {
      type: "IT",
      title: suggestions.suggested_title || "IT Gerada pela IA",
      description: suggestions.change_summary || suggestions.change_reason,
      content: {
        objetivo: suggestions.suggested_objective || "",
        campo_aplicacao: "Processo operacional identificado pela análise da IA",
        fluxo_descricao: Array.isArray(suggestions.suggested_steps) ? suggestions.suggested_steps.join("\n\n") : "",
        atividades: Array.isArray(suggestions.suggested_steps) ? suggestions.suggested_steps.map((step, idx) => ({
          atividade: step,
          responsavel: "A definir",
          frequencia: "A definir",
          observacao: ""
        })) : [],
        matriz_riscos: Array.isArray(suggestions.common_errors) ? suggestions.common_errors.map((error) => ({
          risco: error,
          categoria: suggestions.urgency === "alta" ? "Alto" : suggestions.urgency === "média" ? "Médio" : "Baixo",
          causa: "Identificado pela análise operacional",
          impacto: suggestions.urgency === "alta" ? "Alto" : suggestions.urgency === "média" ? "Médio" : "Baixo",
          controle: "A definir durante implementação"
        })) : [],
        inter_relacoes: [],
        indicadores: [{
          nome: suggestions.affected_indicator || "Qualidade do processo",
          formula: "A definir",
          meta: "A definir",
          frequencia: "Mensal"
        }],
        evidencia_execucao: {
          tipo_evidencia: "Registro manual",
          descricao: "A definir durante implementação",
          periodo_retencao: "12_meses"
        }
      },
      reason: suggestions.change_reason,
      origin: "melhoria_continua",
      expected_impact: suggestions.operational_impact
    };

    console.log("Applying IT data:", newITData);

    if (suggestions.action_type === "update_it" && targetIT) {
      onCreateIT({
        ...targetIT,
        ...newITData,
        title: suggestions.suggested_title,
        version_rationale: suggestions.change_reason
      });
    } else {
      onCreateIT(newITData);
    }

    toast.success("IT criada! Revise e ajuste os campos antes de salvar.");
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

          {/* Sugestões da IA - Formato Estruturado Base44 */}
          {suggestions && (
            <>
              {suggestions.action_required && suggestions.action_type !== "validated" ? (
                <div className="border-2 border-purple-200 rounded-lg p-5 bg-purple-50 space-y-4">
                  <div className="flex items-start gap-3 pb-3 border-b border-purple-200">
                    <div className="p-2 bg-purple-600 rounded-lg">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-purple-900 mb-1">🔄 ATUALIZAÇÃO SUGERIDA</h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={getUrgencyColor(suggestions.urgency)}>
                          Urgência: {suggestions.urgency}
                        </Badge>
                        <Badge variant="outline" className="bg-white">
                          {suggestions.action_type === "create_it" ? "Nova IT" : "Atualização de IT"}
                        </Badge>
                        {suggestions.target_it_code && (
                          <Badge className="bg-purple-700 text-white font-mono">
                            {suggestions.target_it_code}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-white rounded-lg">
                      <Label className="text-xs font-semibold text-gray-600">IT Impactada</Label>
                      <p className="text-sm font-bold text-gray-900 mt-1">
                        {suggestions.target_it_code || "Nova IT"}
                      </p>
                    </div>
                    <div className="p-3 bg-white rounded-lg">
                      <Label className="text-xs font-semibold text-gray-600">Versão</Label>
                      <p className="text-sm font-bold text-gray-900 mt-1">
                        {suggestions.current_version ? `${suggestions.current_version} → ${suggestions.proposed_version}` : suggestions.proposed_version || "v1.0"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="p-4 bg-white rounded-lg border border-purple-200">
                      <Label className="text-sm font-bold text-gray-900 mb-2 block">Motivo da Alteração</Label>
                      <p className="text-sm text-gray-700 leading-relaxed">{suggestions.change_reason}</p>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <Label className="text-sm font-bold text-blue-900 mb-2 block">Resumo da Alteração</Label>
                      <p className="text-sm text-gray-700 leading-relaxed">{suggestions.change_summary}</p>
                    </div>

                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <Label className="text-sm font-bold text-green-900 mb-2 block">Impacto Operacional</Label>
                      <p className="text-sm text-gray-700 leading-relaxed">{suggestions.operational_impact}</p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-semibold mb-2 block">Título da IT</Label>
                    <p className="text-base font-bold text-gray-900 p-3 bg-white rounded-lg border">
                      {suggestions.suggested_title}
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-semibold mb-2 block">Objetivo Operacional</Label>
                    <p className="text-sm text-gray-700 p-3 bg-white rounded-lg border">
                      {suggestions.suggested_objective}
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-semibold mb-2 block">Passos Operacionais Objetivos</Label>
                    <ol className="space-y-2">
                      {suggestions.suggested_steps.map((step, idx) => (
                        <li key={idx} className="flex gap-3 p-3 bg-white rounded-lg border">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="text-sm text-gray-700 flex-1">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div>
                    <Label className="text-sm font-semibold mb-2 block text-red-700">Erros Comuns a Evitar</Label>
                    <ul className="space-y-2">
                      {suggestions.common_errors.map((error, idx) => (
                        <li key={idx} className="flex gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
                          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-red-900">{error}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 bg-blue-100 rounded-lg flex items-center gap-3">
                    <Lightbulb className="w-6 h-6 text-blue-700" />
                    <div className="flex-1">
                      <Label className="text-sm font-bold text-blue-900 block mb-1">Indicador Afetado</Label>
                      <p className="text-sm text-blue-900 font-semibold">{suggestions.affected_indicator}</p>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t-2 border-purple-300">
                    <Button
                      onClick={applyRecommendation}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3"
                    >
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                      Aplicar Atualização Sugerida
                    </Button>
                    <Button variant="outline" onClick={() => setSuggestions(null)} className="px-6">
                      Descartar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-green-200 rounded-lg p-5 bg-green-50 space-y-4">
                  <div className="flex items-start gap-3 pb-3 border-b border-green-200">
                    <div className="p-2 bg-green-600 rounded-lg">
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-green-900 mb-1">✅ PROCESSO OPERACIONALMENTE VÁLIDO</h3>
                      <p className="text-sm text-green-700">Nenhuma melhoria crítica identificada no momento</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="p-4 bg-white rounded-lg border border-green-200">
                      <Label className="text-sm font-bold text-gray-900 mb-2 block">Justificativa Técnica</Label>
                      <p className="text-sm text-gray-700 leading-relaxed">{suggestions.validation_justification}</p>
                    </div>

                    {suggestions.controlled_risks && suggestions.controlled_risks.length > 0 && (
                      <div className="p-4 bg-white rounded-lg border border-green-200">
                        <Label className="text-sm font-bold text-gray-900 mb-2 block">Riscos Controlados</Label>
                        <ul className="list-disc list-inside space-y-1">
                          {suggestions.controlled_risks.map((risk, idx) => (
                            <li key={idx} className="text-sm text-gray-700">{risk}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <Button variant="outline" onClick={() => setSuggestions(null)} className="w-full">
                    Fechar
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}