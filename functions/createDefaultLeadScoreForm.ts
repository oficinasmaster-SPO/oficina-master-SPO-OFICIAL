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
        // BLOCO TÉCNICO (40 pontos)
        {
          block: "tecnico",
          criteria_name: "Conhecimento técnico do cargo",
          max_points: 10,
          weight: 1,
          question: "Avalie o conhecimento técnico do candidato para o cargo pretendido",
          scoring_guide: "0-3: Insuficiente | 4-6: Básico | 7-8: Bom | 9-10: Excelente"
        },
        {
          block: "tecnico",
          criteria_name: "Experiência prática real",
          max_points: 10,
          weight: 1,
          question: "Descreva e avalie a experiência prática do candidato na área",
          scoring_guide: "0-3: Pouca/nenhuma | 4-6: Intermediária | 7-8: Sólida | 9-10: Extensa"
        },
        {
          block: "tecnico",
          criteria_name: "Capacidade de diagnóstico / execução",
          max_points: 10,
          weight: 1,
          question: "O candidato demonstra capacidade de diagnosticar problemas e executar soluções?",
          scoring_guide: "0-3: Depende muito de outros | 4-6: Executa com supervisão | 7-8: Autônomo | 9-10: Referência técnica"
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