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
      
      // Usar agente ao invés de integração direta
      const conversation = await base44.agents.createConversation({
        agent_name: "it_assistant",
        metadata: { 
          field: fieldName,
          it_title: itData?.title 
        }
      });
      
      console.log("📦 Conversa criada:", conversation);
      
      // Subscrever para receber atualizações em tempo real
      let finalMessages = [];
      let lastContentLength = 0;
      let stableCount = 0;
      
      await new Promise((resolve, reject) => {
        const unsubscribe = base44.agents.subscribeToConversation(conversation.id, (data) => {
          console.log("📨 Atualização recebida:", {
            messagesCount: data.messages?.length,
            lastMessageRole: data.messages?.[data.messages.length - 1]?.role,
            contentLength: data.messages?.[data.messages.length - 1]?.content?.length
          });
          
          finalMessages = data.messages || [];
          
          const lastMsg = finalMessages[finalMessages.length - 1];
          
          // Verificar se é uma mensagem do assistente
          if (lastMsg && lastMsg.role === 'assistant' && lastMsg.content) {
            const currentLength = lastMsg.content.length;
            
            // Se o tamanho não mudou, incrementar contador
            if (currentLength === lastContentLength && currentLength > 0) {
              stableCount++;
              console.log(`🔄 Conteúdo estável (${stableCount}/3):`, currentLength);
              
              // Após 3 verificações consecutivas sem mudança, considerar completo
              if (stableCount >= 3) {
                console.log("✅ Mensagem completa detectada");
                unsubscribe();
                resolve();
              }
            } else {
              // Tamanho mudou, resetar contador
              stableCount = 0;
              lastContentLength = currentLength;
            }
          }
        });
        
        // Adicionar mensagem do usuário
        base44.agents.addMessage(conversation, {
          role: "user",
          content: prompt
        }).catch(err => {
          unsubscribe();
          reject(err);
        });
        
        // Timeout de segurança aumentado
        setTimeout(() => {
          unsubscribe();
          if (finalMessages.length === 0) {
            reject(new Error("Timeout: sem resposta do agente"));
          } else {
            console.log("⏱️ Timeout atingido, usando última mensagem disponível");
            resolve();
          }
        }, 60000); // 60 segundos
      });
      
      // Pegar a última mensagem do assistente
      const assistantMessages = finalMessages.filter(m => m.role === 'assistant');
      const response = assistantMessages[assistantMessages.length - 1]?.content;
      
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