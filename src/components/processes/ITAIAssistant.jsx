import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ChevronLeft, Sparkles, CheckCircle2, Wrench, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

export default function ITAIAssistant({ itData, mapData, onSuggestion, collapsed, onToggle }) {
  const [mode, setMode] = useState(null); // 'implement', 'improve', 'complete'
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState("");
  const [userQuestion, setUserQuestion] = useState("");

  const buildContext = () => {
    const filledFields = [];
    const emptyFields = [];

    if (itData.title) filledFields.push(`Título: ${itData.title}`);
    else emptyFields.push("Título");

    if (itData.content?.objetivo) filledFields.push(`Objetivo: ${itData.content.objetivo}`);
    else emptyFields.push("Objetivo");

    if (itData.content?.campo_aplicacao) filledFields.push(`Campo de Aplicação: ${itData.content.campo_aplicacao}`);
    else emptyFields.push("Campo de Aplicação");

    if (itData.content?.fluxo_descricao) filledFields.push(`Fluxo: ${itData.content.fluxo_descricao}`);
    else emptyFields.push("Fluxo Operacional");

    if (itData.content?.atividades?.length > 0) {
      filledFields.push(`Atividades: ${itData.content.atividades.length} cadastradas`);
    } else {
      emptyFields.push("Atividades e Responsabilidades");
    }

    if (itData.content?.matriz_riscos?.filter(r => r.risco).length >= 3) {
      filledFields.push(`Riscos: ${itData.content.matriz_riscos.length} cadastrados`);
    } else {
      emptyFields.push("Matriz de Riscos (mínimo 3)");
    }

    if (itData.content?.indicadores?.filter(i => i.nome).length >= 1) {
      filledFields.push(`Indicadores: ${itData.content.indicadores.length} cadastrados`);
    } else {
      emptyFields.push("Indicadores (mínimo 1)");
    }

    if (itData.content?.evidencia_execucao?.tipo_evidencia) {
      filledFields.push(`Evidência: ${itData.content.evidencia_execucao.tipo_evidencia}`);
    } else {
      emptyFields.push("Evidência de Execução");
    }

    return { filledFields, emptyFields };
  };

  const handleImplementSupport = async () => {
    setMode('implement');
    setLoading(true);
    setResponse("");

    try {
      const { filledFields } = buildContext();
      
      const prompt = `Você é um especialista em implementação de processos operacionais.

**Contexto do MAP Pai:**
- Título: ${mapData?.title || "Não informado"}
- Área: ${mapData?.category || "Não informada"}

**Instrução de Trabalho Atual:**
${filledFields.join('\n')}

**Sua tarefa:**
Explique de forma prática e objetiva:
1. Como implementar esta IT no dia a dia
2. Que tipo de treinamento é necessário
3. Quais evidências comprovam execução correta
4. Erros comuns que devem ser evitados
5. Pontos críticos que precisam ser acompanhados

Seja direto, operacional e execute-oriented. Evite teoria.`;

      const result = await base44.integrations.Core.InvokeLLM({ prompt });
      setResponse(result);
    } catch (error) {
      toast.error("Erro ao consultar IA: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImproveIT = async () => {
    setMode('improve');
    setLoading(true);
    setResponse("");

    try {
      const { filledFields, emptyFields } = buildContext();
      
      const prompt = `Você é um especialista em qualidade de processos e documentação técnica.

**Contexto do MAP Pai:**
- Título: ${mapData?.title || "Não informado"}
- Área: ${mapData?.category || "Não informada"}

**IT Atual - Campos Preenchidos:**
${filledFields.join('\n')}

**IT Atual - Campos Vazios:**
${emptyFields.join(', ')}

**Sua tarefa:**
Analise a qualidade e coerência desta IT:
1. Verifique se Objetivo está alinhado com Atividades
2. Identifique inconsistências entre Riscos e Controles
3. Avalie se os Indicadores medem o que importa
4. Aponte campos genéricos ou fracos
5. Sugira melhorias concretas e operacionais

Seja crítico e construtivo. Dê exemplos práticos de melhoria.`;

      const result = await base44.integrations.Core.InvokeLLM({ prompt });
      setResponse(result);
    } catch (error) {
      toast.error("Erro ao consultar IA: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteIT = async () => {
    setMode('complete');
    setLoading(true);
    setResponse("");

    try {
      const { filledFields, emptyFields } = buildContext();

      if (emptyFields.length === 0) {
        toast.info("Todos os campos principais já estão preenchidos!");
        setLoading(false);
        return;
      }
      
      const prompt = `Você é um especialista em construção de Instruções de Trabalho operacionais.

**Contexto do MAP Pai:**
- Título: ${mapData?.title || "Não informado"}
- Área: ${mapData?.category || "Não informada"}

**Campos JÁ Preenchidos:**
${filledFields.join('\n')}

**Campos VAZIOS que preciso preencher:**
${emptyFields.join(', ')}

**Sua tarefa:**
Com base SOMENTE nas informações preenchidas acima, gere sugestões estruturadas e operacionais para os campos vazios.

**IMPORTANTE:**
- Gere um campo por vez, começando pelos mais críticos
- Use linguagem clara, direta e executável
- Não invente informações que não foram fornecidas
- Indique claramente que é uma SUGESTÃO para revisão humana

Formate a resposta assim:
### [Nome do Campo]
**Sugestão:**
[conteúdo sugerido]

**Por que essa sugestão?**
[justificativa breve]`;

      const result = await base44.integrations.Core.InvokeLLM({ prompt });
      setResponse(result);
    } catch (error) {
      toast.error("Erro ao consultar IA: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomQuestion = async () => {
    if (!userQuestion.trim()) {
      toast.error("Digite sua pergunta");
      return;
    }

    setLoading(true);
    setResponse("");

    try {
      const { filledFields } = buildContext();
      
      const prompt = `Você é um especialista em Instruções de Trabalho e implementação de processos.

**Contexto da IT:**
${filledFields.join('\n')}

**MAP Pai:**
- ${mapData?.title || "Não informado"}

**Pergunta do usuário:**
${userQuestion}

Responda de forma prática, clara e operacional.`;

      const result = await base44.integrations.Core.InvokeLLM({ prompt });
      setResponse(result);
      setUserQuestion("");
    } catch (error) {
      toast.error("Erro ao consultar IA: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (collapsed) {
    return null;
  }

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white border-l shadow-2xl z-40 overflow-y-auto">
      <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          <h3 className="font-semibold">Assistente da IT</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onToggle} className="text-white hover:bg-white/20">
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="p-4 space-y-3">
        <Button
          onClick={handleImplementSupport}
          disabled={loading}
          className="w-full justify-start bg-green-50 hover:bg-green-100 text-green-900 border border-green-200"
          variant="outline"
        >
          <Wrench className="w-4 h-4 mr-2" />
          Como implementar esta IT na prática
        </Button>

        <Button
          onClick={handleImproveIT}
          disabled={loading}
          className="w-full justify-start bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200"
          variant="outline"
        >
          <CheckCircle2 className="w-4 h-4 mr-2" />
          Revisar e melhorar qualidade da IT
        </Button>

        <Button
          onClick={handleCompleteIT}
          disabled={loading}
          className="w-full justify-start bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200"
          variant="outline"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Gerar campos faltantes com IA
        </Button>

        <div className="border-t pt-3">
          <p className="text-xs text-gray-600 mb-2">Ou faça uma pergunta específica:</p>
          <div className="flex gap-2">
            <Textarea
              placeholder="Ex: Como treinar a equipe nesta IT?"
              value={userQuestion}
              onChange={(e) => setUserQuestion(e.target.value)}
              rows={2}
              className="text-sm"
            />
          </div>
          <Button
            onClick={handleCustomQuestion}
            disabled={loading || !userQuestion.trim()}
            size="sm"
            className="w-full mt-2"
          >
            Perguntar
          </Button>
        </div>
      </div>

      {loading && (
        <div className="p-4 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-purple-600" />
          <p className="text-sm text-gray-600 mt-2">Consultando IA...</p>
        </div>
      )}

      {response && !loading && (
        <Card className="m-4 border-purple-200">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                Resposta da IA
              </CardTitle>
              <Badge variant="outline" className="text-xs">Rascunho</Badge>
            </div>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <ReactMarkdown>{response}</ReactMarkdown>
          </CardContent>
        </Card>
      )}

      <div className="p-4 border-t bg-yellow-50">
        <p className="text-xs text-gray-700">
          ⚠️ <strong>Importante:</strong> Todo conteúdo gerado é uma sugestão. 
          Você é responsável pela validação e publicação final.
        </p>
      </div>
    </div>
  );
}