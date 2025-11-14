import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

export default function GeneratedPlanText({ diagnostic, workshop, actions, subtasks }) {
  const [generatedPlan, setGeneratedPlan] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (diagnostic && !generatedPlan) {
      generatePlan();
    }
  }, [diagnostic]);

  const generatePlan = async () => {
    setLoading(true);
    try {
      const user = await base44.auth.me();

      // Preparar dados das respostas do diagnóstico
      const answersData = diagnostic.answers.map(a => ({
        questao: a.question_id,
        resposta: a.selected_option
      }));

      // Preparar dados das ações
      const actionsData = actions.map(action => {
        const actionSubtasks = subtasks.filter(s => s.action_id === action.id);
        return {
          titulo: action.title,
          descricao: action.description,
          categoria: getCategoryLabel(action.category),
          prazo_dias: action.deadline_days,
          subtarefas: actionSubtasks.map(s => ({
            titulo: s.title,
            descricao: s.description || "",
            status: getStatusLabel(s.status)
          }))
        };
      });

      // Preparar dados da oficina
      const workshopData = workshop ? {
        nome: workshop.name,
        cidade: workshop.city,
        estado: workshop.state,
        segmento: workshop.segment,
        faturamento: workshop.monthly_revenue,
        colaboradores: workshop.employees_count,
        tempo_mercado: workshop.years_in_business,
        principal_desafio: workshop.main_challenge
      } : null;

      const prompt = `Você é um consultor especializado em gestão de oficinas automotivas. Com base nos dados abaixo, crie um PLANO DE AÇÃO EXTREMAMENTE DETALHADO E PERSONALIZADO.

DADOS DA OFICINA:
${JSON.stringify(workshopData, null, 2)}

FASE IDENTIFICADA: Fase ${diagnostic.phase}
Letra predominante nas respostas: ${diagnostic.dominant_letter}

RESPOSTAS DO DIAGNÓSTICO:
${JSON.stringify(answersData, null, 2)}

AÇÕES JÁ DEFINIDAS:
${JSON.stringify(actionsData, null, 2)}

INSTRUÇÕES PARA O PLANO:

1. **ANÁLISE SITUACIONAL COMPLETA** (mínimo 3 parágrafos):
   - Análise profunda da fase atual da oficina
   - Principais pontos fortes identificados
   - Principais desafios e gargalos
   - Oportunidades de crescimento específicas

2. **OBJETIVOS ESTRATÉGICOS** (pelo menos 5 objetivos claros e mensuráveis):
   - Objetivos de curto prazo (30-60 dias)
   - Objetivos de médio prazo (3-6 meses)
   - Objetivos de longo prazo (6-12 meses)
   - Como medir o sucesso de cada objetivo

3. **PLANO DE AÇÃO DETALHADO POR CATEGORIA**:

   Para cada categoria (Vendas, Prospecção, Precificação, Pessoas):
   
   a) **Situação Atual**: Diagnóstico específico desta área
   
   b) **Ações Prioritárias** (pelo menos 3 ações por categoria):
      - O que fazer EXATAMENTE (passo a passo)
      - Por que fazer (justificativa e benefícios)
      - Como fazer (metodologia detalhada)
      - Quando fazer (cronograma específico)
      - Recursos necessários
      - Indicadores de sucesso
   
   c) **Dicas Práticas e Táticas**:
      - Ferramentas recomendadas (gratuitas quando possível)
      - Scripts, templates ou modelos prontos para usar
      - Erros comuns a evitar
      - Benchmarks do mercado

4. **ESTRATÉGIAS ESPECÍFICAS PARA OS DESAFIOS IDENTIFICADOS**:
   ${workshop?.main_challenge ? `
   Desafio principal informado: "${workshop.main_challenge}"
   
   Forneça:
   - 5 estratégias específicas para resolver este desafio
   - Casos de sucesso de outras oficinas
   - Métricas para acompanhar a evolução
   ` : ''}

5. **QUICK WINS - RESULTADOS RÁPIDOS** (primeiros 30 dias):
   - Lista de 5-7 ações que podem gerar resultados imediatos
   - Estimativa de impacto de cada ação
   - Esforço necessário (baixo/médio/alto)

6. **ROADMAP DE IMPLEMENTAÇÃO**:
   - Semana 1-2: O que fazer
   - Semana 3-4: O que fazer
   - Mês 2: O que fazer
   - Mês 3: O que fazer
   - Meses 4-6: O que fazer
   - Meses 6-12: O que fazer

7. **RECURSOS E FERRAMENTAS RECOMENDADAS**:
   - Softwares e aplicativos úteis
   - Templates e modelos prontos
   - Cursos e materiais educativos
   - Comunidades e grupos de apoio

8. **INDICADORES-CHAVE DE DESEMPENHO (KPIs)**:
   - Quais KPIs monitorar mensalmente
   - Como calcular cada KPI
   - Metas sugeridas para cada KPI
   - Como criar um dashboard simples

9. **CHECKLIST DE IMPLEMENTAÇÃO**:
   - Lista completa de todas as tarefas a fazer
   - Ordem de prioridade
   - Responsável sugerido (proprietário, gerente, equipe)

10. **RECOMENDAÇÕES FINAIS E PRÓXIMOS PASSOS**:
    - Mensagem motivacional personalizada
    - Principais mudanças de mindset necessárias
    - Como manter a consistência na execução
    - Quando revisar o plano

FORMATAÇÃO:
- Use Markdown para estruturar o conteúdo
- Use títulos (##, ###) para organizar as seções
- Use listas numeradas e com marcadores
- Use **negrito** para destacar pontos importantes
- Use > para citações e dicas especiais
- Seja EXTREMAMENTE DETALHADO e PRÁTICO
- Evite generalidades - seja específico para a realidade da oficina
- Use linguagem clara, direta e motivadora
- Inclua números, percentuais e dados concretos sempre que possível

IMPORTANTE: O plano deve ter no mínimo 3000 palavras e ser ULTRA DETALHADO. Cada seção deve ser rica em informações práticas e acionáveis.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: false
      });

      setGeneratedPlan(response);
      toast.success("Plano de ação detalhado gerado com sucesso!");

    } catch (error) {
      console.error("Erro ao gerar plano:", error);
      toast.error("Erro ao gerar plano de ação");
      setGeneratedPlan("Erro ao gerar o plano. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const getCategoryLabel = (category) => {
    const labels = {
      'vendas': 'Vendas',
      'prospeccao': 'Prospecção',
      'precificacao': 'Precificação',
      'pessoas': 'Pessoas e Equipe'
    };
    return labels[category] || category;
  };

  const getStatusLabel = (status) => {
    const labels = {
      'a_fazer': 'A Fazer',
      'em_andamento': 'Em Andamento',
      'concluido': 'Concluído'
    };
    return labels[status] || status;
  };

  return (
    <Card className="shadow-xl border-2 border-purple-200">
      <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b-2 border-purple-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl">Plano de Ação Personalizado com IA</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Análise detalhada e recomendações específicas para sua oficina
              </p>
            </div>
          </div>
          {generatedPlan && !loading && (
            <Button
              onClick={generatePlan}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Gerar Novamente
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-16 h-16 animate-spin text-purple-600 mb-4" />
            <p className="text-lg font-semibold text-gray-900 mb-2">
              Gerando seu plano de ação personalizado...
            </p>
            <p className="text-sm text-gray-600 text-center max-w-md">
              A IA está analisando seu diagnóstico e criando um plano ultra detalhado 
              com estratégias específicas para sua oficina. Isso pode levar alguns segundos.
            </p>
          </div>
        ) : generatedPlan ? (
          <div className="prose prose-lg max-w-none">
            <ReactMarkdown
              components={{
                h1: ({ children }) => (
                  <h1 className="text-3xl font-bold text-gray-900 mt-8 mb-4 pb-3 border-b-2 border-purple-200">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4 flex items-center gap-2">
                    <span className="w-2 h-8 bg-gradient-to-b from-purple-500 to-indigo-600 rounded"></span>
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="text-gray-700 leading-relaxed mb-4">
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside space-y-2 mb-4 ml-4">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="text-gray-700 leading-relaxed">
                    {children}
                  </li>
                ),
                strong: ({ children }) => (
                  <strong className="font-bold text-gray-900">
                    {children}
                  </strong>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-purple-500 bg-purple-50 pl-4 py-3 my-4 italic text-gray-700">
                    {children}
                  </blockquote>
                ),
                code: ({ inline, children }) => 
                  inline ? (
                    <code className="bg-gray-100 px-2 py-1 rounded text-sm text-purple-700">
                      {children}
                    </code>
                  ) : (
                    <code className="block bg-gray-900 text-gray-100 p-4 rounded-lg my-4 overflow-x-auto">
                      {children}
                    </code>
                  )
              }}
            >
              {generatedPlan}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600">Nenhum plano gerado ainda.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}