import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { Sparkles, Loader2, AlertCircle, CheckCircle2, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

export default function ITOperationalAssistant({ open, onClose, mapData, existingITs, onCreateIT }) {
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [mode, setMode] = useState("structured"); // "structured" | "free"
  const [freeResponse, setFreeResponse] = useState("");

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
    setFreeResponse("");
    
    try {
      console.log("🔍 Iniciando análise operacional...");
      console.log("📝 Contexto:", context);
      console.log("🎯 Modo:", mode);

      // Buscar material de referência contextual
      console.log("📚 Buscando material de referência...");
      let referenceMaterial = "";
      
      try {
        // Buscar MAPs relacionados
        const allMaps = await base44.entities.ProcessDocument.list();
        const relevantMaps = allMaps.filter(m => 
          m.category === mapData?.category || 
          m.title?.toLowerCase().includes(context.toLowerCase().split(" ")[0])
        ).slice(0, 3);

        if (relevantMaps.length > 0) {
          referenceMaterial += "\n\n📋 MATERIAL DE REFERÊNCIA - MAPs RELACIONADOS:\n";
          relevantMaps.forEach(map => {
            referenceMaterial += `\n--- MAP: ${map.title} (${map.code}) ---\n`;
            referenceMaterial += `Objetivo: ${map.content_json?.objetivo || "N/A"}\n`;
            if (map.content_json?.atividades) {
              referenceMaterial += `Atividades:\n${map.content_json.atividades.map(a => `  • ${a.atividade} (${a.responsavel})`).join("\n")}\n`;
            }
            if (map.content_json?.indicadores) {
              referenceMaterial += `Indicadores:\n${map.content_json.indicadores.map(i => `  • ${i.indicador}: ${i.meta}`).join("\n")}\n`;
            }
          });
        }

        // Buscar ITs completas com conteúdo
        if (existingITs.length > 0) {
          referenceMaterial += "\n\n📄 ITs EXISTENTES DETALHADAS:\n";
          for (const it of existingITs.slice(0, 5)) {
            referenceMaterial += `\n--- IT: ${it.code} - ${it.title} ---\n`;
            referenceMaterial += `Objetivo: ${it.content?.objetivo || "N/A"}\n`;
            if (it.content?.atividades) {
              referenceMaterial += `Passos:\n${it.content.atividades.map((a, i) => `  ${i+1}. ${a.atividade}`).join("\n")}\n`;
            }
          }
        }
      } catch (searchError) {
        console.error("Erro ao buscar material:", searchError);
      }

      // Modo Livre - sem JSON schema
      if (mode === "free") {
        const freePrompt = `
VOCÊ É A IA OPERACIONAL DO BASE44 - MODO CONSULTIVO PROATIVO.

CONTEXTO DO PROCESSO (MAP - REFERÊNCIA):
Título: ${mapData?.title || "Não informado"}
Objetivo: ${mapData?.content_json?.objetivo || mapData?.objective || "Não informado"}
Etapas principais: ${mapData?.content_json?.atividades?.map(a => a.atividade).join(", ") || "Não informado"}
${referenceMaterial}

SITUAÇÃO OPERACIONAL RELATADA:
${context}

INSTRUÇÃO - SEJA PROATIVO E ACIONÁVEL:
Analise a situação operacional e forneça uma resposta estruturada com **sugestões práticas e acionáveis**.

**Formato da resposta:**

## 🔍 Análise da Situação
[Diagnóstico claro do problema/contexto operacional]

## 💡 Recomendações Proativas

### 1️⃣ [NOME DA AÇÃO SUGERIDA]
**Tipo:** [Criar nova IT | Atualizar IT existente | Adicionar indicador | Implementar controle | Outro]
**Justificativa:** [Por que essa ação é necessária]
**Objetivo:** [O que será alcançado]
**Elementos principais:** [Passos, responsáveis, ou componentes chave]
**Prioridade:** [Alta | Média | Baixa]

### 2️⃣ [PRÓXIMA AÇÃO, SE HOUVER]
...

## ⚠️ Riscos Identificados
[Listar riscos operacionais detectados na situação]

## 📊 Indicadores Sugeridos
[Sugerir métricas para monitorar o processo]

## ✅ Próximos Passos Imediatos
1. [Ação específica 1]
2. [Ação específica 2]
3. [Ação específica 3]

**SEJA ESPECÍFICO E ACIONÁVEL** - Ao invés de "considere melhorar", diga "Crie uma IT chamada 'Processo X' com objetivo Y contendo os passos A, B, C".
Use formatação Markdown clara. Seja consultivo, mas prático e direto.`;

        const { result } = await base44.functions.invoke('invokeLLMUnlimited', { prompt: freePrompt });
        setFreeResponse(result);
        console.log("✅ Resposta livre recebida");
        toast.success("Análise concluída!");
        return;
      }

      // Modo Estruturado - SEM schema, parse manual
      const prompt = `Você é a IA Operacional do BASE44.

CONTEXTO DO PROCESSO:
Título: ${mapData?.title || "Não informado"}
Objetivo: ${mapData?.content_json?.objetivo || "Não informado"}
${referenceMaterial}

SITUAÇÃO:
${context}

IMPORTANTE: Use o MATERIAL DE REFERÊNCIA acima para basear suas sugestões. 
Analise os MAPs e ITs existentes e sugira melhorias BASEADAS nesse conteúdo real, 
não crie sugestões genéricas. Reutilize padrões, atividades e estruturas já documentadas.

RETORNE APENAS UM JSON VÁLIDO (sem markdown, sem \`\`\`):

Para AÇÃO NECESSÁRIA:
{
  "action_required": true,
  "action_type": "create_it",
  "change_reason": "motivo",
  "change_summary": "resumo",
  "operational_impact": "impacto",
  "affected_indicator": "indicador",
  "urgency": "alta",
  "suggested_title": "Título da IT",
  "suggested_objective": "Objetivo",
  "suggested_steps": ["Passo 1", "Passo 2", "Passo 3"],
  "common_errors": ["Erro 1", "Erro 2"]
}

Para PROCESSO OK:
{
  "action_required": false,
  "action_type": "validated",
  "validation_justification": "justificativa detalhada"
}`;

      console.log("📤 Enviando prompt para IA...");
      const apiResponse = await base44.functions.invoke('invokeLLMUnlimited', { prompt });
      console.log("📦 Resposta completa:", JSON.stringify(apiResponse, null, 2));
      
      // Extrair resultado de múltiplos formatos possíveis
      const rawResponse = apiResponse?.data?.result || apiResponse?.result || apiResponse?.data;
      console.log("📥 Resposta RAW extraída:", rawResponse);
      console.log("📏 Tipo da resposta:", typeof rawResponse);
      
      // Parse manual com tratamento de erro
      let response;
      try {
        // Se já for objeto, use direto
        if (typeof rawResponse === 'object' && rawResponse !== null) {
          response = rawResponse;
          console.log("✅ Resposta já é objeto");
        } else {
          // Se for string, tenta parse
          const cleanJson = String(rawResponse).replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          console.log("🧹 JSON limpo:", cleanJson);
          response = JSON.parse(cleanJson);
          console.log("✅ Parse JSON bem-sucedido");
        }
      } catch (parseError) {
        console.error("❌ ERRO DE PARSE:", parseError);
        console.error("❌ String que falhou:", rawResponse);
        toast.error("IA retornou formato inválido. Ver console para detalhes.");
        setLoading(false);
        return;
      }

      console.log("✅ Response parseado:", JSON.stringify(response, null, 2));

      // Validação simples
      if (!response || typeof response !== 'object') {
        console.error("❌ Response não é objeto:", response);
        toast.error("Formato inválido da IA");
        setLoading(false);
        return;
      }

      if (response.action_required && !response.suggested_title) {
        console.error("❌ Faltam campos obrigatórios:", response);
        toast.error("IA não retornou dados completos");
        setLoading(false);
        return;
      }

      setSuggestions(response);
      console.log("✅ Sugestões aplicadas");
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

          {/* Seletor de Modo */}
          <div>
            <Label className="text-sm font-semibold mb-2 block">Modo de Análise</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setMode("structured")}
                className={`p-4 border-2 rounded-lg transition-all ${
                  mode === "structured"
                    ? "border-purple-600 bg-purple-50"
                    : "border-gray-200 hover:border-purple-300"
                }`}
              >
                <div className="font-semibold text-sm">📋 Estruturado</div>
                <div className="text-xs text-gray-600 mt-1">Gera IT pronta para aplicar</div>
              </button>
              <button
                onClick={() => setMode("free")}
                className={`p-4 border-2 rounded-lg transition-all ${
                  mode === "free"
                    ? "border-blue-600 bg-blue-50"
                    : "border-gray-200 hover:border-blue-300"
                }`}
              >
                <div className="font-semibold text-sm">💭 Consultivo Livre</div>
                <div className="text-xs text-gray-600 mt-1">IA responde livremente</div>
              </button>
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
              {(suggestions || freeResponse) && (
                <Button variant="outline" onClick={() => {
                  setSuggestions(null);
                  setFreeResponse("");
                }}>
                  Nova Análise
                </Button>
              )}
            </div>
          </div>

          {/* Resposta Livre da IA */}
          {freeResponse && (
            <div className="border-2 border-blue-200 rounded-lg p-5 bg-blue-50 space-y-4">
              <div className="flex items-start gap-3 pb-3 border-b border-blue-200">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-blue-900 mb-1">💭 Análise Consultiva</h3>
                  <p className="text-sm text-blue-700">Resposta livre da IA especialista</p>
                </div>
              </div>
              
              <div className="prose prose-sm max-w-none bg-white p-4 rounded-lg">
                <ReactMarkdown>{freeResponse}</ReactMarkdown>
              </div>

              <div className="flex gap-3 pt-4 border-t-2 border-blue-300">
                <Button
                  variant="outline"
                  onClick={() => setFreeResponse("")}
                  className="flex-1"
                >
                  Fechar
                </Button>
              </div>
            </div>
          )}

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