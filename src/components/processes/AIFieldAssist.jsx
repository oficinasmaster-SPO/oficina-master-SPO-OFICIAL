import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sparkles, Loader2, CheckCircle2, X } from "lucide-react";
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

  const handleSuggestion = async (suggestionType) => {
    setLoading(true);
    setResult("");

    try {
      const prompt = buildPrompt(suggestionType);
      const response = await base44.integrations.Core.InvokeLLM({ prompt });
      setResult(response);
    } catch (error) {
      toast.error("Erro ao gerar sugestão: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const buildPrompt = (type) => {
    const context = `
**MAP Pai:**
- Título: ${mapData?.title || "Não informado"}
- Área: ${mapData?.category || "Não informada"}

**IT Atual:**
- Título: ${itData.title || "Não informado"}
- Objetivo: ${itData.content?.objetivo || "Não informado"}
- Fluxo: ${itData.content?.fluxo_descricao ? "Preenchido" : "Vazio"}
`;

    const prompts = {
      // Objetivo
      'objetivo_gerar': `${context}
Com base no título da IT, gere um objetivo claro, mensurável e operacional.
Formato: "Garantir que [ação] seja executada corretamente para [resultado esperado]"`,
      
      'objetivo_melhorar': `${context}
Objetivo atual: ${fieldValue || "Vazio"}

Melhore a clareza e precisão deste objetivo. Torne-o mais específico e mensurável.`,

      'objetivo_auditoria': `${context}
Objetivo atual: ${fieldValue || "Vazio"}

Ajuste este objetivo para ser facilmente auditável e verificável.`,

      // Campo de Aplicação
      'aplicacao_quem': `${context}
Defina claramente QUEM deve executar esta IT (cargos/funções específicas).`,

      'aplicacao_quando': `${context}
Defina claramente QUANDO esta IT deve ser aplicada (gatilhos, frequência).`,

      'aplicacao_excecoes': `${context}
Liste as exceções ou situações onde esta IT NÃO se aplica.`,

      // Fluxo
      'fluxo_gerar': `${context}
Gere um fluxo passo a passo numerado e sequencial para executar esta IT.
Use verbos de ação e seja específico.`,

      // Riscos
      'riscos_gerar': `${context}
Liste 3-5 riscos operacionais críticos relacionados a esta IT.
Formato: Risco | Causa | Impacto | Controle`,

      // Indicadores
      'indicadores_gerar': `${context}
Sugira 1-2 indicadores-chave (KPIs) para medir a eficácia desta IT.
Formato: Nome | Fórmula | Meta | Frequência`,

      // Genérico
      'default': `${context}
Campo: ${fieldName}
Valor atual: ${fieldValue || "Vazio"}

Gere uma sugestão contextualizada e operacional para este campo.`
    };

    return prompts[type] || prompts.default;
  };

  const handleApply = () => {
    if (result) {
      onApply(result);
      setResult("");
      setOpen(false);
      toast.success("Sugestão aplicada! Revise antes de salvar.");
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "absolute right-2 top-2 h-7 w-7 p-0 hover:bg-purple-50",
            fieldValue && "text-purple-600"
          )}
          title="Assistência IA"
        >
          <Sparkles className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96" align="end">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              Assistência IA
            </h4>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {!result && !loading && (
            <div className="space-y-2">
              {suggestions.map((sug, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => handleSuggestion(sug.type)}
                >
                  {sug.icon && <sug.icon className="w-3 h-3 mr-2" />}
                  {sug.label}
                </Button>
              ))}
            </div>
          )}

          {loading && (
            <div className="text-center py-4">
              <Loader2 className="w-5 h-5 animate-spin mx-auto text-purple-600" />
              <p className="text-xs text-gray-600 mt-2">Gerando sugestão...</p>
            </div>
          )}

          {result && !loading && (
            <div className="space-y-3">
              <div className="max-h-64 overflow-y-auto bg-gray-50 rounded p-3 text-xs prose prose-sm">
                <ReactMarkdown>{result}</ReactMarkdown>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleApply} className="flex-1 bg-purple-600 hover:bg-purple-700">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Aplicar Sugestão
                </Button>
                <Button size="sm" variant="outline" onClick={() => setResult("")}>
                  Descartar
                </Button>
              </div>
              <p className="text-xs text-yellow-700 bg-yellow-50 p-2 rounded">
                ⚠️ Revise antes de salvar. Conteúdo gerado por IA.
              </p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}