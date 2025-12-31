import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sparkles, Loader2, CheckCircle2, X, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

export default function AIFieldAssist({ 
  fieldName, 
  fieldValue, 
  itData, 
  mapData, 
  onApply,
  suggestions = []
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    console.log("🔧 AIFieldAssist montado:", {
      fieldName,
      hasFieldValue: !!fieldValue,
      hasItData: !!itData,
      hasMapData: !!mapData,
      suggestionsCount: suggestions.length
    });
  }, []);

  const handleSuggestion = async (suggestionType) => {
    console.log("🚀 INÍCIO handleSuggestion:", suggestionType);
    
    setLoading(true);
    setResult("");
    setError("");

    try {
      const prompt = buildPrompt(suggestionType);
      console.log("📝 Prompt construído:", {
        type: suggestionType,
        promptLength: prompt.length,
        preview: prompt.substring(0, 200) + "..."
      });
      
      toast.info("Gerando sugestão com IA...", { duration: 2000 });
      
      // Usar função backend ilimitada
      const { result: response } = await base44.functions.invoke('invokeLLMUnlimited', { prompt });
      
      if (!response) {
        throw new Error("Agente não retornou resposta");
      }
      
      console.log("✅ Resposta recebida da IA:", {
        type: typeof response,
        isString: typeof response === 'string',
        hasResponse: !!response?.response,
        preview: typeof response === 'string' ? response.substring(0, 100) : JSON.stringify(response).substring(0, 100)
      });
      
      // Tratamento robusto da resposta
      let finalResult = "";
      
      if (typeof response === 'string' && response.trim()) {
        finalResult = response.trim();
      } else if (response?.response && typeof response.response === 'string') {
        finalResult = response.response.trim();
      } else if (response?.output && typeof response.output === 'string') {
        finalResult = response.output.trim();
      } else if (response?.content && typeof response.content === 'string') {
        finalResult = response.content.trim();
      } else if (response) {
        finalResult = JSON.stringify(response, null, 2);
      }
      
      if (!finalResult) {
        throw new Error("Resposta vazia da IA");
      }
      
      console.log("✨ Resultado final processado:", {
        length: finalResult.length,
        preview: finalResult.substring(0, 100)
      });
      
      setResult(finalResult);
      toast.success("Sugestão gerada! Revise antes de aplicar.");
      
    } catch (error) {
      console.error("❌ ERRO completo na IA:", {
        message: error.message,
        stack: error.stack,
        error
      });
      
      const errorMsg = error.message || "Erro desconhecido ao gerar sugestão";
      setError(errorMsg);
      toast.error("Erro: " + errorMsg);
    } finally {
      setLoading(false);
      console.log("🏁 handleSuggestion finalizado");
    }
  };

  const analyzeDocumentContext = () => {
    // Análise dinâmica do contexto do documento
    const category = mapData?.category || itData?.category || "Geral";
    const isRitual = category === "Ritual";
    const isTechnical = ["Pátio", "Estoque"].includes(category);
    const isCommercial = ["Vendas", "Comercial"].includes(category);
    const isAdministrative = ["Financeiro", "RH", "Qualidade"].includes(category);

    return {
      category,
      isRitual,
      isTechnical,
      isCommercial,
      isAdministrative,
      title: itData?.title || mapData?.title || "",
      objective: itData?.content?.objetivo || mapData?.description || "",
      hasFlow: !!(itData?.content?.fluxo_descricao || mapData?.content_json?.fluxo_processo)
    };
  };

  const buildPrompt = (type) => {
    const docContext = analyzeDocumentContext();
    
    const context = `
**Contexto do Documento:**
- Categoria: ${docContext.category}
- Título: ${docContext.title}
- Objetivo atual: ${docContext.objective || "Não definido"}
- Tipo: ${docContext.isRitual ? "Ritual Cultural" : docContext.isTechnical ? "Técnico Operacional" : docContext.isCommercial ? "Comercial/Vendas" : "Administrativo"}

**Instruções:**
Analise o contexto acima e gere sugestões específicas e contextualizadas para este documento.
${docContext.isRitual ? "Como é um ritual, foque em aspectos culturais, comportamentais e de engajamento da equipe." : ""}
${docContext.isTechnical ? "Como é técnico, seja específico quanto a procedimentos, ferramentas e segurança." : ""}
${docContext.isCommercial ? "Como é comercial, foque em processos de vendas, atendimento e relacionamento com cliente." : ""}
`;

    const prompts = {
      // Objetivo - Contextualizado
      'objetivo_gerar': `${context}

**Campo a preencher:** Objetivo
**Título do documento:** ${docContext.title}

Analise o título e contexto acima e gere um objetivo específico que:
1. Seja claro e mensurável
2. Reflita a natureza do documento (${docContext.category})
3. Indique o resultado esperado
4. Seja verificável na prática

Retorne apenas o texto do objetivo, sem formatação adicional.`,
      
      'objetivo_melhorar': `${context}

**Objetivo atual:** ${fieldValue || "Não definido"}

Analise este objetivo considerando:
- O contexto do documento (${docContext.category})
- As especificidades da área
- A mensurabilidade e clareza

Melhore o objetivo tornando-o mais preciso e operacional. Retorne apenas o texto melhorado.`,

      'objetivo_auditoria': `${context}

**Objetivo atual:** ${fieldValue || "Não definido"}

Transforme este objetivo em algo facilmente auditável, considerando:
- O tipo de documento (${docContext.category})
- Como será verificado na prática
- Quais evidências podem comprovar seu cumprimento

Retorne apenas o objetivo ajustado.`,

      // Campo de Aplicação
      'aplicacao_quem': `${context}
Defina claramente QUEM deve executar esta IT (cargos/funções específicas).`,

      'aplicacao_quando': `${context}
Defina claramente QUANDO esta IT deve ser aplicada (gatilhos, frequência).`,

      'aplicacao_excecoes': `${context}
Liste as exceções ou situações onde esta IT NÃO se aplica.`,

      // Fluxo - Contextualizado
      'fluxo_gerar': `${context}

**Campo a preencher:** Fluxo do Processo

Para "${docContext.title}" (${docContext.category}), crie um fluxo sequencial:

1. Análise o tipo de processo e sua complexidade
2. Defina etapas lógicas e sequenciais
3. Use verbos de ação no imperativo
4. Seja específico e prático

${docContext.isRitual ? "Para rituais culturais, inclua: preparação, execução, reflexão e registro." : ""}
${docContext.isTechnical ? "Para processos técnicos, seja detalhado em cada etapa operacional." : ""}
${docContext.isCommercial ? "Para processos comerciais, siga o funil: prospecção, qualificação, proposta, fechamento." : ""}

Retorne um texto estruturado com passos numerados e claros.`,

      // Atividades - Contextualizadas
      'atividades_gerar': `${context}

**Campo a preencher:** Lista de Atividades

Baseado no contexto do documento "${docContext.title}" na categoria ${docContext.category}:

1. Identifique 3-5 atividades operacionais específicas
2. Para cada atividade, defina:
   - Descrição clara da tarefa
   - Responsável (cargo específico do contexto)
   - Frequência realista
   - Observações práticas

${docContext.isRitual ? "Como é um ritual cultural, inclua atividades de engajamento, comunicação e reforço de valores." : ""}
${docContext.isTechnical ? "Como é técnico, seja específico quanto a procedimentos, ferramentas e verificações." : ""}
${docContext.isCommercial ? "Como é comercial, foque em etapas do processo de vendas/atendimento." : ""}

IMPORTANTE: Retorne APENAS um JSON array puro, sem \`\`\`json ou markdown:
[{"atividade": "...", "responsavel": "...", "frequencia": "...", "observacao": "..."}]`,

      'atividades_completa': `${context}

Gere atividades DETALHADAS e CONTEXTUALIZADAS para ${docContext.title}.
Retorne JSON array puro com estrutura completa.`,

      // Inter-relações
      'interrelacoes_gerar': `${context}
Liste 2-4 áreas que interagem com esta IT em formato JSON.
IMPORTANTE: Retorne apenas o JSON array puro, sem markdown.
Formato: [{"area": "nome da área", "interacao": "como interagem"}]`,

      'interrelacoes_areas': `${context}
Mapeie todas as áreas envolvidas na execução desta IT em JSON puro.`,

      // Riscos - Contextualizados
      'riscos_gerar': `${context}

**Campo a preencher:** Matriz de Riscos

Para o documento "${docContext.title}" (${docContext.category}), identifique 3-5 riscos ESPECÍFICOS:

${docContext.isRitual ? "- Riscos culturais: baixo engajamento, perda de sentido, execução mecânica" : ""}
${docContext.isTechnical ? "- Riscos operacionais: falhas técnicas, retrabalho, segurança" : ""}
${docContext.isCommercial ? "- Riscos comerciais: perda de clientes, baixa conversão, insatisfação" : ""}
${docContext.isAdministrative ? "- Riscos administrativos: não conformidade, erros, atrasos" : ""}

Para cada risco, defina:
- Descrição do risco
- Categoria (operacional, qualidade, segurança, financeiro, etc)
- Causa raiz
- Impacto no processo
- Controle preventivo específico

RETORNE APENAS JSON array puro:
[{"risco": "...", "categoria": "...", "causa": "...", "impacto": "...", "controle": "..."}]`,

      'riscos_criticos': `${context}

Identifique os riscos MAIS CRÍTICOS para ${docContext.title} considerando o contexto ${docContext.category}.
Retorne JSON puro.`,

      // Indicadores
      'indicadores_gerar': `${context}
Sugira 1-2 indicadores KPIs mensuráveis em formato JSON.
IMPORTANTE: Retorne apenas o JSON array puro, sem markdown.
Formato: [{"nome": "nome do KPI", "formula": "como calcular", "meta": "objetivo", "frequencia": "periodicidade"}]`,

      'indicadores_kpi': `${context}
Defina KPIs específicos e mensuráveis para esta IT em JSON puro.`,

      // Evidência
      'evidencia_tipo': `${context}
Sugira o tipo de evidência mais adequado para comprovar a execução desta IT.
Exemplos: OS preenchida, Checklist assinado, Foto digital, Relatório técnico, Formulário carimbado.`,

      'evidencia_auditavel': `${context}
Defina uma evidência clara e auditável para esta IT.`,

      'evidencia_descricao': `${context}
Descreva detalhadamente O QUE deve ser registrado, ONDE deve constar, e COMO deve ser preenchido para comprovar a execução correta desta IT.`,

      'evidencia_detalhada': `${context}
Gere descrição operacional detalhada da evidência.`,

      // Retenção de Registros
      'retencao_sugerir': `${context}
Com base na natureza desta IT (${itData?.type}), sugira um período adequado de retenção da evidência.
Considere: requisitos legais, necessidade de auditoria, complexidade do serviço.
Responda APENAS com o período: "1 ano", "2 anos", "3 anos", "5 anos", "10 anos", "permanente" ou "conforme legislação".`,

      'retencao_legal': `${context}
Baseado em requisitos legais e normativos do setor automotivo, qual o período mínimo de retenção desta evidência?`,

      'justificativa_retencao': `${context}
Período de retenção: ${fieldValue}
Justifique este período de retenção baseando-se em: requisitos legais, normas do setor automotivo, necessidades de auditoria e rastreabilidade.`,

      // Genérico
      'default': `${context}
Campo: ${fieldName}
Valor atual: ${fieldValue || "Vazio"}

Gere uma sugestão contextualizada e operacional para este campo.`
    };

    return prompts[type] || prompts.default;
  };

  const handleApply = () => {
    console.log("✅ APLICANDO sugestão:", {
      hasResult: !!result,
      resultLength: result?.length,
      hasOnApply: typeof onApply === 'function'
    });
    
    if (!result) {
      toast.error("Nenhuma sugestão para aplicar");
      return;
    }
    
    if (typeof onApply !== 'function') {
      console.error("❌ onApply não é uma função!", typeof onApply);
      toast.error("Erro: função de aplicação não encontrada");
      return;
    }
    
    try {
      onApply(result);
      console.log("✅ Sugestão aplicada com sucesso");
      toast.success("Sugestão aplicada! Revise antes de salvar.");
      setResult("");
      setError("");
      setOpen(false);
    } catch (error) {
      console.error("❌ Erro ao aplicar sugestão:", error);
      toast.error("Erro ao aplicar: " + error.message);
    }
  };

  return (
    <Popover open={open} onOpenChange={(newOpen) => {
      console.log("🔄 Popover mudou estado:", newOpen);
      setOpen(newOpen);
      if (!newOpen) {
        setResult("");
        setError("");
      }
    }}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "absolute right-2 top-2 h-7 w-7 p-0 hover:bg-purple-50 transition-colors",
            fieldValue && "text-purple-600"
          )}
          title="Assistência IA"
          onClick={() => console.log("✨ Botão IA clicado")}
        >
          <Sparkles className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96" align="end" side="left">
        <div className="space-y-3">
          <div className="flex justify-between items-center border-b pb-2">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              Assistência IA - {fieldName}
            </h4>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                console.log("❌ Fechar popover");
                setOpen(false);
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-red-800">Erro ao gerar</p>
                <p className="text-xs text-red-700">{error}</p>
              </div>
            </div>
          )}

          {!result && !loading && !error && (
            <div className="space-y-2">
              {suggestions.length === 0 && (
                <p className="text-xs text-gray-500 text-center py-4">
                  Nenhuma sugestão disponível
                </p>
              )}
              {suggestions.map((sug, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs hover:bg-purple-50"
                  onClick={() => {
                    console.log("🎯 Sugestão clicada:", sug.type);
                    handleSuggestion(sug.type);
                  }}
                >
                  {sug.icon && <sug.icon className="w-3 h-3 mr-2" />}
                  {sug.label}
                </Button>
              ))}
            </div>
          )}

          {loading && (
            <div className="text-center py-8">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-purple-600" />
              <p className="text-xs text-gray-600 mt-3 font-medium">Gerando sugestão...</p>
              <p className="text-xs text-gray-500 mt-1">Isso pode levar alguns segundos</p>
            </div>
          )}

          {result && !loading && (
            <div className="space-y-3">
              <div className="max-h-64 overflow-y-auto bg-gray-50 border rounded p-3 text-xs prose prose-sm">
                <ReactMarkdown>{result}</ReactMarkdown>
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={() => {
                    console.log("🎯 Aplicar clicado");
                    handleApply();
                  }}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Aplicar Sugestão
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    console.log("🗑️ Descartar clicado");
                    setResult("");
                    setError("");
                  }}
                >
                  Descartar
                </Button>
              </div>
              <p className="text-xs text-yellow-700 bg-yellow-50 p-2 rounded border border-yellow-200">
                ⚠️ Revise antes de salvar. Conteúdo gerado por IA.
              </p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}