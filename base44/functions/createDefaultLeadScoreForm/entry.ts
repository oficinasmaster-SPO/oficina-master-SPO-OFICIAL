import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workshop_id } = await req.json();

    if (!workshop_id) {
      return Response.json({ error: 'workshop_id é obrigatório' }, { status: 400 });
    }

    // Verificar se já existe formulário padrão
    const existing = await base44.entities.InterviewForm.filter({
      workshop_id,
      is_default_template: true
    });

    if (existing && existing.length > 0) {
      return Response.json({
        message: 'Formulário padrão já existe',
        form: existing[0]
      });
    }

    // Criar formulário padrão de Lead Score
    const defaultForm = {
      workshop_id,
      form_name: "Lead Score - Qualificação de Candidato",
      form_type: "lead_score",
      description: "Formulário padrão para qualificação objetiva de candidatos usando Lead Score (0-100 pontos)",
      is_lead_score_form: true,
      is_default_template: true,
      is_active: true,
      scoring_criteria: [
        // BLOCO TÉCNICO (40 pontos) - COM CHECKLISTS PADRÃO MECÂNICO
        {
          block: "tecnico",
          criteria_name: "Conhecimento Técnico",
          max_points: 15,
          weight: 1,
          question: "Você possui conhecimento técnico sobre os itens abaixo?",
          scoring_guide: "Pontuação calculada automaticamente pelo checklist",
          checklist_items: [
            { category: "Mecânica", text: "Funcionamento do sistema de freios", points: 1 },
            { category: "Mecânica", text: "Funcionamento de suspensão e direção", points: 1 },
            { category: "Mecânica", text: "Funcionamento de embreagem", points: 1 },
            { category: "Mecânica", text: "Funcionamento do sistema de arrefecimento", points: 1 },
            { category: "Mecânica", text: "Funcionamento de correias e sincronismo", points: 1 },
            { category: "Mecânica", text: "Funcionamento de motor e periféricos", points: 1 },
            { category: "Elétrica/Eletrônica", text: "Leitura de diagramas elétricos", points: 1 },
            { category: "Elétrica/Eletrônica", text: "Funcionamento de sensores e atuadores", points: 1 },
            { category: "Elétrica/Eletrônica", text: "Princípios de elétrica automotiva", points: 1 },
            { category: "Elétrica/Eletrônica", text: "Comunicação CAN", points: 1 },
            { category: "Elétrica/Eletrônica", text: "Funcionamento básico de módulos eletrônicos", points: 1 },
            { category: "Diagnóstico (conceitual)", text: "Conceito de causa raiz", points: 1 },
            { category: "Diagnóstico (conceitual)", text: "Diferença entre defeito e sintoma", points: 1 },
            { category: "Diagnóstico (conceitual)", text: "Sequência lógica de diagnóstico", points: 1 },
            { category: "Diagnóstico (conceitual)", text: "Importância de testes antes da troca", points: 1 },
            { category: "Diagnóstico (conceitual)", text: "Validação pós-reparo", points: 1 },
            { category: "Processo", text: "Fluxo da ordem de serviço", points: 1 },
            { category: "Processo", text: "Importância do apontamento de tempo", points: 1 },
            { category: "Processo", text: "Relação entre produtividade e lucro", points: 1 },
            { category: "Processo", text: "Comunicação técnica com consultor", points: 1 }
          ]
        },
        {
          block: "tecnico",
          criteria_name: "Experiência Prática",
          max_points: 15,
          weight: 1,
          question: "Você já executou essas atividades na prática, com autonomia?",
          scoring_guide: "Pontuação calculada automaticamente pelo checklist",
          checklist_items: [
            { category: "Mecânica", text: "Troca de freios (pastilhas/discos)", points: 1 },
            { category: "Mecânica", text: "Substituição de suspensão", points: 1 },
            { category: "Mecânica", text: "Troca de correias", points: 1 },
            { category: "Mecânica", text: "Troca de embreagem", points: 1 },
            { category: "Mecânica", text: "Serviços de arrefecimento", points: 1 },
            { category: "Mecânica", text: "Montagem e desmontagem mecânica", points: 1 },
            { category: "Elétrica/Eletrônica", text: "Uso de scanner automotivo", points: 1 },
            { category: "Elétrica/Eletrônica", text: "Teste de sensores e atuadores", points: 1 },
            { category: "Elétrica/Eletrônica", text: "Diagnóstico elétrico básico", points: 1 },
            { category: "Elétrica/Eletrônica", text: "Reset e parametrizações simples", points: 1 },
            { category: "Elétrica/Eletrônica", text: "Correção de falhas elétricas comuns", points: 1 },
            { category: "Diagnóstico (prático)", text: "Realização de pré-diagnóstico", points: 1 },
            { category: "Diagnóstico (prático)", text: "Execução de testes práticos", points: 1 },
            { category: "Diagnóstico (prático)", text: "Identificação de causa raiz", points: 1 },
            { category: "Diagnóstico (prático)", text: "Confirmação do reparo realizado", points: 1 },
            { category: "Processo", text: "Preenchimento correto da OS", points: 1 },
            { category: "Processo", text: "Apontamento de tempo", points: 1 },
            { category: "Processo", text: "Registro de oportunidades de venda", points: 1 },
            { category: "Processo", text: "Cumprimento de prazos", points: 1 }
          ]
        },
        {
          block: "tecnico",
          criteria_name: "Capacidade de Diagnóstico",
          max_points: 10,
          weight: 1,
          question: "Você se sente capaz de analisar, decidir e orientar nesses cenários?",
          scoring_guide: "Pontuação calculada automaticamente pelo checklist",
          checklist_items: [
            { category: "Análise Técnica", text: "Identificar falha sem trocar peça", points: 1 },
            { category: "Análise Técnica", text: "Priorizar testes corretos", points: 1 },
            { category: "Análise Técnica", text: "Evitar retrabalho", points: 1 },
            { category: "Análise Técnica", text: "Avaliar riscos técnicos do serviço", points: 1 },
            { category: "Diagnóstico Integrado", text: "Cruzar sintomas mecânicos e eletrônicos", points: 1 },
            { category: "Diagnóstico Integrado", text: "Interpretar dados do scanner", points: 1 },
            { category: "Diagnóstico Integrado", text: "Validar falha com teste físico", points: 1 },
            { category: "Diagnóstico Integrado", text: "Confirmar solução antes da entrega", points: 1 },
            { category: "Tomada de Decisão", text: "Sugerir solução técnica adequada", points: 1 },
            { category: "Tomada de Decisão", text: "Apontar oportunidade de serviço preventivo", points: 1 },
            { category: "Tomada de Decisão", text: "Explicar tecnicamente o problema ao consultor", points: 1 },
            { category: "Tomada de Decisão", text: "Ajustar estratégia quando o diagnóstico não se confirma", points: 1 },
            { category: "Visão de Negócio", text: "Entender impacto do erro técnico no lucro", points: 1 },
            { category: "Visão de Negócio", text: "Respeitar tempo padrão", points: 1 },
            { category: "Visão de Negócio", text: "Contribuir para produtividade do pátio", points: 1 }
          ]
        },
        {
          block: "tecnico",
          criteria_name: "Histórico de erros técnicos",
          max_points: 5,
          weight: 1,
          question: "Qual o histórico de erros/retrabalhos do candidato?",
          scoring_guide: "0-1: Histórico de muitos erros | 2-3: Erros ocasionais | 4: Poucos erros | 5: Histórico limpo"
        },
        {
          block: "tecnico",
          criteria_name: "Autonomia técnica",
          max_points: 5,
          weight: 1,
          question: "Avalie o nível de autonomia técnica do candidato",
          scoring_guide: "0-1: Muito dependente | 2-3: Precisa de orientação | 4: Autônomo | 5: Totalmente independente"
        },
        
        // BLOCO COMPORTAMENTAL (30 pontos)
        {
          block: "comportamental",
          criteria_name: "Responsabilidade",
          max_points: 5,
          weight: 1,
          question: "O candidato demonstra responsabilidade e comprometimento com resultados?",
          scoring_guide: "0-1: Pouca | 2-3: Média | 4: Alta | 5: Exemplar"
        },
        {
          block: "comportamental",
          criteria_name: "Disciplina / rotina",
          max_points: 5,
          weight: 1,
          question: "Como é a disciplina e capacidade de seguir rotinas do candidato?",
          scoring_guide: "0-1: Desorganizado | 2-3: Segue rotina básica | 4: Disciplinado | 5: Extremamente organizado"
        },
        {
          block: "comportamental",
          criteria_name: "Comunicação",
          max_points: 5,
          weight: 1,
          question: "Avalie a capacidade de comunicação do candidato",
          scoring_guide: "0-1: Muito difícil | 2-3: Básica | 4: Clara | 5: Excelente comunicador"
        },
        {
          block: "comportamental",
          criteria_name: "Reação a feedback",
          max_points: 5,
          weight: 1,
          question: "Como o candidato reage a críticas e feedback?",
          scoring_guide: "0-1: Defensivo | 2-3: Aceita com resistência | 4: Receptivo | 5: Busca ativamente"
        },
        {
          block: "comportamental",
          criteria_name: "Comprometimento",
          max_points: 5,
          weight: 1,
          question: "Avalie o nível de comprometimento demonstrado pelo candidato",
          scoring_guide: "0-1: Baixo | 2-3: Moderado | 4: Alto | 5: Total dedicação"
        },
        {
          block: "comportamental",
          criteria_name: "Trabalho em equipe",
          max_points: 5,
          weight: 1,
          question: "Como o candidato trabalha em equipe?",
          scoring_guide: "0-1: Individualista | 2-3: Colabora quando necessário | 4: Boa colaboração | 5: Líder natural"
        },

        // BLOCO CULTURAL (15 pontos)
        {
          block: "cultural",
          criteria_name: "Alinhamento com valores",
          max_points: 5,
          weight: 1,
          question: "Os valores do candidato estão alinhados com os da empresa?",
          scoring_guide: "0-1: Conflitante | 2-3: Parcialmente alinhado | 4: Alinhado | 5: Totalmente alinhado"
        },
        {
          block: "cultural",
          criteria_name: "Visão de crescimento",
          max_points: 5,
          weight: 1,
          question: "O candidato demonstra visão de crescimento profissional?",
          scoring_guide: "0-1: Sem perspectiva | 2-3: Busca estabilidade | 4: Quer crescer | 5: Ambição saudável"
        },
        {
          block: "cultural",
          criteria_name: "Postura profissional",
          max_points: 5,
          weight: 1,
          question: "Avalie a postura profissional do candidato",
          scoring_guide: "0-1: Inadequada | 2-3: Básica | 4: Profissional | 5: Exemplar"
        },

        // BLOCO HISTÓRICO/RISCO (15 pontos)
        {
          block: "historico",
          criteria_name: "Tempo médio nas empresas",
          max_points: 5,
          weight: 1,
          question: "Qual o tempo médio do candidato em empregos anteriores?",
          scoring_guide: "0-1: <6 meses | 2: 6-12 meses | 3: 1-2 anos | 4: 2-3 anos | 5: >3 anos"
        },
        {
          block: "historico",
          criteria_name: "Motivo de saída",
          max_points: 5,
          weight: 1,
          question: "Os motivos de saída das empresas anteriores são coerentes?",
          scoring_guide: "0-1: Conflitos graves | 2: Motivos questionáveis | 3: Neutro | 4: Crescimento | 5: Excelentes motivos"
        },
        {
          block: "historico",
          criteria_name: "Histórico de advertências",
          max_points: 5,
          weight: 1,
          question: "O candidato possui histórico de advertências ou problemas disciplinares?",
          scoring_guide: "0-1: Múltiplas advertências | 2-3: Algum problema | 4: Histórico limpo | 5: Sempre elogiado"
        }
      ]
    };

    const form = await base44.entities.InterviewForm.create(defaultForm);

    return Response.json({
      success: true,
      message: 'Formulário padrão de Lead Score criado com sucesso',
      form
    });

  } catch (error) {
    console.error('Erro ao criar formulário padrão:', error);
    return Response.json({ 
      error: error.message || 'Erro interno do servidor' 
    }, { status: 500 });
  }
});