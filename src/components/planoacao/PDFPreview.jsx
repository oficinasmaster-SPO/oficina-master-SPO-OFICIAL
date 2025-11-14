import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function PDFPreview({ diagnostic, workshop, actions, subtasks, onClose }) {
  const [generatedContent, setGeneratedContent] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    generatePDFContent();
  }, []);

  const generatePDFContent = async () => {
    setLoading(true);
    try {
      const user = await base44.auth.me();

      // Preparar dados
      const answersData = diagnostic.answers.map(a => ({
        questao: a.question_id,
        resposta: a.selected_option
      }));

      const actionsData = actions.map(action => {
        const actionSubtasks = subtasks.filter(s => s.action_id === action.id);
        return {
          titulo: action.title,
          descricao: action.description,
          categoria: getCategoryLabel(action.category),
          prazo_dias: action.deadline_days,
          data_vencimento: action.due_date,
          status: getStatusLabel(action.status),
          subtarefas: actionSubtasks.map(s => ({
            titulo: s.title,
            descricao: s.description || "",
            status: getStatusLabel(s.status),
            responsavel: s.responsible_user_id,
            prazo: s.due_date
          }))
        };
      });

      const workshopData = workshop ? {
        nome: workshop.name,
        cidade: workshop.city,
        estado: workshop.state,
        segmento: workshop.segment,
        faturamento: workshop.monthly_revenue,
        colaboradores: workshop.employees_count,
        tempo_mercado: workshop.years_in_business,
        principal_desafio: workshop.main_challenge,
        cnpj: workshop.cnpj,
        telefone: workshop.phone,
        whatsapp: workshop.whatsapp
      } : null;

      const prompt = `Você é um consultor especializado em gestão de oficinas automotivas. Crie um RELATÓRIO COMPLETO E PROFISSIONAL em formato de documento para impressão.

DADOS DA OFICINA:
${JSON.stringify(workshopData, null, 2)}

FASE IDENTIFICADA: Fase ${diagnostic.phase}
Letra predominante: ${diagnostic.dominant_letter}

RESPOSTAS DO DIAGNÓSTICO:
${JSON.stringify(answersData, null, 2)}

AÇÕES E SUBTAREFAS DEFINIDAS:
${JSON.stringify(actionsData, null, 2)}

CRIE UM DOCUMENTO PROFISSIONAL COM AS SEGUINTES SEÇÕES:

# PLANO DE AÇÃO - ${workshop?.name || 'Oficina'}

## 1. SUMÁRIO EXECUTIVO
- Visão geral da oficina
- Fase atual identificada
- Principais desafios
- Objetivos do plano

## 2. ANÁLISE SITUACIONAL DETALHADA
- Diagnóstico completo da situação atual
- Pontos fortes identificados
- Áreas de melhoria prioritárias
- Análise de competitividade no mercado

## 3. OBJETIVOS ESTRATÉGICOS
### Objetivos de Curto Prazo (30-60 dias)
- Liste 3-5 objetivos específicos e mensuráveis
- Indicadores de sucesso para cada um

### Objetivos de Médio Prazo (3-6 meses)
- Liste 3-5 objetivos específicos e mensuráveis
- Indicadores de sucesso para cada um

### Objetivos de Longo Prazo (6-12 meses)
- Liste 3-5 objetivos específicos e mensuráveis
- Indicadores de sucesso para cada um

## 4. PLANO DE AÇÃO DETALHADO

Para cada categoria (Vendas, Prospecção, Precificação, Pessoas):

### [CATEGORIA]
**Situação Atual:** Análise detalhada

**Estratégias e Ações:**
1. [Ação específica]
   - Descrição completa
   - Metodologia de implementação
   - Recursos necessários
   - Prazo de execução
   - Indicadores de sucesso
   - Responsável sugerido

[Repetir para cada ação da categoria]

**Métricas de Acompanhamento:**
- KPIs principais
- Frequência de medição
- Metas sugeridas

## 5. CRONOGRAMA DE IMPLEMENTAÇÃO

### Mês 1
- Semana 1-2: [Ações prioritárias]
- Semana 3-4: [Ações prioritárias]

### Mês 2-3
- [Ações programadas]

### Mês 4-6
- [Ações programadas]

### Mês 6-12
- [Ações programadas]

## 6. QUICK WINS - RESULTADOS RÁPIDOS (Primeiros 30 dias)

Liste 5-7 ações que podem gerar resultados imediatos:
1. [Ação] - Impacto esperado / Esforço necessário
[continuar...]

## 7. INVESTIMENTOS E RECURSOS NECESSÁRIOS

### Recursos Humanos
- [Descrição]

### Recursos Tecnológicos
- [Descrição]

### Recursos Financeiros
- Investimento estimado por área
- ROI esperado

### Ferramentas e Softwares Recomendados
- Lista de ferramentas (com opções gratuitas quando possível)

## 8. INDICADORES-CHAVE DE DESEMPENHO (KPIs)

Para cada área estratégica, defina:
- KPI principal
- Como calcular
- Meta para 3 meses
- Meta para 6 meses
- Meta para 12 meses

## 9. GESTÃO DE RISCOS E CONTINGÊNCIAS

- Principais riscos identificados
- Planos de contingência
- Sinais de alerta

## 10. DETALHAMENTO DAS AÇÕES E SUBTAREFAS

[Para cada ação do plano, liste detalhadamente todas as subtarefas]

**Ação:** [Título]
**Categoria:** [Categoria]
**Prazo:** [Prazo]
**Status:** [Status]

**Subtarefas:**
1. [Subtarefa] - Status: [Status]
   - Descrição detalhada
   - Responsável sugerido
   - Prazo

[Repetir para todas as ações]

## 11. CHECKLIST DE IMPLEMENTAÇÃO COMPLETO

- [ ] [Tarefa 1]
- [ ] [Tarefa 2]
[Lista completa de todas as tarefas a executar]

## 12. RECOMENDAÇÕES FINAIS

- Principais mudanças de mindset necessárias
- Como manter a consistência
- Quando revisar o plano
- Mensagem motivacional personalizada

---

**IMPORTANTE:**
- Use formatação Markdown clara e profissional
- Seja EXTREMAMENTE DETALHADO e específico
- Inclua números, datas e prazos concretos
- Organize em seções bem estruturadas para fácil impressão
- O documento deve ter no mínimo 2500 palavras
- Use linguagem profissional mas acessível
- Inclua exemplos práticos e casos de uso`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: false
      });

      setGeneratedContent(response);

    } catch (error) {
      console.error("Erro ao gerar conteúdo do PDF:", error);
      setGeneratedContent("Erro ao gerar o conteúdo. Por favor, tente novamente.");
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

  const getPhaseDescription = (phase) => {
    const phases = {
      1: "Sobrevivência e Geração de Lucro",
      2: "Crescimento e Ampliação de Time",
      3: "Organização, Processos e Liderança",
      4: "Consolidação e Escala"
    };
    return phases[phase] || `Fase ${phase}`;
  };

  if (loading) {
    return (
      <div className="hidden print:block">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="w-16 h-16 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-lg font-semibold">Gerando documento detalhado para impressão...</p>
            <p className="text-sm text-gray-600 mt-2">Aguarde enquanto preparamos seu plano de ação completo</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="hidden print:block">
      <style>{`
        @page {
          size: A4;
          margin: 2cm;
        }
        @media print {
          body {
            background: white;
            font-size: 11pt;
            line-height: 1.6;
          }
          .page-break {
            page-break-before: always;
          }
          .no-break {
            page-break-inside: avoid;
          }
          h1 {
            font-size: 24pt;
            margin-top: 0;
            margin-bottom: 20pt;
            color: #1e40af;
            border-bottom: 3pt solid #1e40af;
            padding-bottom: 10pt;
          }
          h2 {
            font-size: 18pt;
            margin-top: 20pt;
            margin-bottom: 12pt;
            color: #1e40af;
            page-break-after: avoid;
          }
          h3 {
            font-size: 14pt;
            margin-top: 16pt;
            margin-bottom: 8pt;
            color: #1f2937;
            page-break-after: avoid;
          }
          h4 {
            font-size: 12pt;
            margin-top: 12pt;
            margin-bottom: 6pt;
            color: #374151;
          }
          p {
            margin-bottom: 8pt;
            text-align: justify;
          }
          ul, ol {
            margin-bottom: 12pt;
            padding-left: 20pt;
          }
          li {
            margin-bottom: 4pt;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12pt;
          }
          th, td {
            border: 1pt solid #d1d5db;
            padding: 8pt;
            text-align: left;
          }
          th {
            background-color: #f3f4f6;
            font-weight: bold;
          }
          .header-info {
            margin-bottom: 20pt;
            padding: 10pt;
            background-color: #eff6ff;
            border-left: 4pt solid #1e40af;
          }
          .footer-note {
            margin-top: 20pt;
            padding-top: 10pt;
            border-top: 1pt solid #d1d5db;
            font-size: 9pt;
            color: #6b7280;
          }
          blockquote {
            border-left: 3pt solid #8b5cf6;
            padding-left: 10pt;
            margin: 12pt 0;
            font-style: italic;
            background-color: #faf5ff;
            padding: 10pt;
          }
          strong {
            color: #1f2937;
          }
        }
      `}</style>

      <div className="max-w-4xl mx-auto p-8">
        {/* Header */}
        <div className="header-info no-break">
          <h1 style={{ marginTop: 0 }}>PLANO DE AÇÃO ESTRATÉGICO</h1>
          {workshop && (
            <div style={{ marginTop: '10pt' }}>
              <p style={{ margin: 0, fontSize: '12pt', fontWeight: 'bold' }}>{workshop.name}</p>
              <p style={{ margin: 0, fontSize: '10pt' }}>{workshop.city}, {workshop.state}</p>
              {workshop.cnpj && <p style={{ margin: 0, fontSize: '10pt' }}>CNPJ: {workshop.cnpj}</p>}
              <p style={{ margin: '8pt 0 0 0', fontSize: '10pt' }}>
                <strong>Fase Identificada:</strong> Fase {diagnostic.phase} - {getPhaseDescription(diagnostic.phase)}
              </p>
              <p style={{ margin: 0, fontSize: '10pt' }}>
                <strong>Data do Diagnóstico:</strong> {new Date(diagnostic.created_date).toLocaleDateString('pt-BR')}
              </p>
            </div>
          )}
        </div>

        {/* Conteúdo Gerado pela IA */}
        <div className="generated-content">
          <ReactMarkdown
            components={{
              h1: ({ children }) => <h1 className="page-break">{children}</h1>,
              h2: ({ children }) => <h2 className="no-break">{children}</h2>,
              h3: ({ children }) => <h3 className="no-break">{children}</h3>,
              h4: ({ children }) => <h4>{children}</h4>,
              p: ({ children }) => <p>{children}</p>,
              ul: ({ children }) => <ul>{children}</ul>,
              ol: ({ children }) => <ol>{children}</ol>,
              li: ({ children }) => <li>{children}</li>,
              strong: ({ children }) => <strong>{children}</strong>,
              blockquote: ({ children }) => <blockquote>{children}</blockquote>,
              table: ({ children }) => <table>{children}</table>,
              thead: ({ children }) => <thead>{children}</thead>,
              tbody: ({ children }) => <tbody>{children}</tbody>,
              tr: ({ children }) => <tr>{children}</tr>,
              th: ({ children }) => <th>{children}</th>,
              td: ({ children }) => <td>{children}</td>
            }}
          >
            {generatedContent}
          </ReactMarkdown>
        </div>

        {/* Footer */}
        <div className="footer-note">
          <p style={{ margin: 0 }}>
            <strong>Documento gerado em:</strong> {new Date().toLocaleDateString('pt-BR', { 
              day: '2-digit', 
              month: 'long', 
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
          <p style={{ margin: '4pt 0 0 0' }}>
            Este plano de ação foi gerado com base no diagnóstico realizado e deve ser revisado periodicamente.
            Recomenda-se uma avaliação trimestral do progresso e ajustes conforme necessário.
          </p>
          <p style={{ margin: '4pt 0 0 0', fontSize: '8pt' }}>
            © Oficinas Master - Sistema de Diagnóstico e Plano de Ação para Oficinas Automotivas
          </p>
        </div>
      </div>
    </div>
  );
}