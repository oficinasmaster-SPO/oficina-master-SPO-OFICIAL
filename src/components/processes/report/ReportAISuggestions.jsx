import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, Wand2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export function AIConclusion({ formData, onApply }) {
  const [loading, setLoading] = useState(false);

  const generateConclusion = async () => {
    if (!formData.pontos_conformes && formData.nao_conformidades.length === 0) {
      toast.error("Preencha o diagnóstico antes de gerar a conclusão");
      return;
    }

    setLoading(true);
    try {
      const prompt = `
Você é um consultor especialista em gestão de oficinas automotivas.

Com base nos dados abaixo, gere uma CONCLUSÃO PROFISSIONAL para o relatório de implementação:

EMPRESA: ${formData.empresa}
ÁREA: ${formData.unidade_area}
OBJETIVO: ${formData.objetivo_consultoria}

PONTOS CONFORMES:
${formData.pontos_conformes || "Não informado"}

NÃO CONFORMIDADES (${formData.nao_conformidades.length}):
${formData.nao_conformidades.map(nc => `- ${nc.descricao} (${nc.requisito_om})`).join("\n") || "Nenhuma"}

OPORTUNIDADES DE MELHORIA:
${formData.oportunidades_melhoria || "Não informado"}

NÍVEL DE MATURIDADE ATUAL: ${formData.nivel_maturidade}/5

Gere uma conclusão de 3-4 parágrafos que:
1. Resuma os principais achados
2. Destaque pontos positivos
3. Enfatize áreas críticas que precisam de atenção
4. Forneça uma perspectiva geral do estado atual

Seja objetivo e profissional. Máximo 300 palavras.`;

      const response = await base44.integrations.Core.InvokeLLM({ prompt });
      onApply(response);
      toast.success("Conclusão gerada com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar conclusão:", error);
      toast.error("Erro ao gerar conclusão");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      type="button" 
      variant="outline" 
      size="sm" 
      onClick={generateConclusion}
      disabled={loading}
      className="gap-2"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Sparkles className="w-4 h-4 text-purple-600" />
      )}
      Sugerir com IA
    </Button>
  );
}

export function AIActionSuggestions({ formData, onApply }) {
  const [loading, setLoading] = useState(false);

  const generateActions = async () => {
    if (formData.nao_conformidades.length === 0) {
      toast.error("Adicione não conformidades primeiro");
      return;
    }

    setLoading(true);
    try {
      const prompt = `
Você é um consultor especialista em gestão de oficinas automotivas.

Com base nas NÃO CONFORMIDADES abaixo, sugira ações corretivas:

NÃO CONFORMIDADES:
${formData.nao_conformidades.map((nc, i) => `${i+1}. ${nc.descricao} - Requisito: ${nc.requisito_om}`).join("\n")}

Para cada não conformidade, sugira UMA ação corretiva no formato JSON:
{
  "acoes": [
    {"acao": "descrição da ação", "responsavel": "sugestão de responsável", "prazo_dias": 15}
  ]
}

Seja específico e prático. Sugira prazos realistas (7, 15, 30 ou 60 dias).`;

      const response = await base44.integrations.Core.InvokeLLM({ 
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            acoes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  acao: { type: "string" },
                  responsavel: { type: "string" },
                  prazo_dias: { type: "number" }
                }
              }
            }
          }
        }
      });

      if (response?.acoes) {
        const newActions = response.acoes.map((a, idx) => ({
          numero: formData.plano_acao.length + idx + 1,
          acao: a.acao,
          responsavel: a.responsavel,
          prazo: new Date(Date.now() + a.prazo_dias * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: "Pendente"
        }));
        onApply(newActions);
        toast.success(`${newActions.length} ações sugeridas!`);
      }
    } catch (error) {
      console.error("Erro ao gerar ações:", error);
      toast.error("Erro ao gerar sugestões");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      type="button" 
      variant="outline" 
      size="sm" 
      onClick={generateActions}
      disabled={loading}
      className="gap-2"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Wand2 className="w-4 h-4 text-purple-600" />
      )}
      Gerar Ações com IA
    </Button>
  );
}

export function AINextSteps({ formData, onApply }) {
  const [loading, setLoading] = useState(false);

  const generateNextSteps = async () => {
    setLoading(true);
    try {
      const prompt = `
Baseado no nível de maturidade ${formData.nivel_maturidade}/5 e nas seguintes informações:
- Empresa: ${formData.empresa}
- Área: ${formData.unidade_area}
- Não conformidades: ${formData.nao_conformidades.length}
- Ações no plano: ${formData.plano_acao.length}

Sugira o OBJETIVO da próxima etapa de consultoria (máximo 2 frases) e uma DATA sugerida (entre 15 e 45 dias).

Responda em JSON:
{
  "objetivo": "descrição do objetivo",
  "dias_ate_proxima": 30
}`;

      const response = await base44.integrations.Core.InvokeLLM({ 
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            objetivo: { type: "string" },
            dias_ate_proxima: { type: "number" }
          }
        }
      });

      if (response) {
        const proximaData = new Date(Date.now() + response.dias_ate_proxima * 24 * 60 * 60 * 1000);
        onApply({
          proxima_etapa_objetivo: response.objetivo,
          proxima_etapa_data: proximaData.toISOString().split('T')[0]
        });
        toast.success("Próximos passos sugeridos!");
      }
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao gerar sugestões");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      type="button" 
      variant="outline" 
      size="sm" 
      onClick={generateNextSteps}
      disabled={loading}
      className="gap-2"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Sparkles className="w-4 h-4 text-purple-600" />
      )}
      Sugerir Próxima Etapa
    </Button>
  );
}