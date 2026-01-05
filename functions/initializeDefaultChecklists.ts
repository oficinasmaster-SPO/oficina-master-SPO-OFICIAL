import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { workshop_id } = await req.json();

    // Verificar se já existem checklists para esta oficina
    const existing = await base44.asServiceRole.entities.TechnicalChecklist.filter({
      workshop_id: workshop_id,
      is_system_default: true
    });

    if (existing && existing.length > 0) {
      return Response.json({ 
        success: false, 
        message: "Checklists padrão já existem para esta oficina" 
      });
    }

    const defaultChecklists = [
      // === MECÂNICO ===
      {
        workshop_id,
        checklist_name: "Conhecimento Técnico - Mecânico",
        checklist_type: "conhecimento_tecnico",
        position: "Mecânico",
        question_text: "Você possui conhecimento técnico sobre os itens abaixo?",
        scoring_impact: 10,
        is_system_default: true,
        is_active: true,
        associated_criteria: ["Conhecimento Técnico", "Conhecimento"],
        categories: [
          {
            name: "Mecânica",
            weight: 1,
            items: [
              "Funcionamento do sistema de freios",
              "Funcionamento de suspensão e direção",
              "Funcionamento de embreagem",
              "Funcionamento do sistema de arrefecimento",
              "Funcionamento de correias e sincronismo",
              "Funcionamento de motor e periféricos"
            ]
          },
          {
            name: "Elétrica / Eletrônica",
            weight: 1,
            items: [
              "Leitura de diagramas elétricos",
              "Funcionamento de sensores e atuadores",
              "Princípios de elétrica automotiva",
              "Comunicação CAN",
              "Funcionamento básico de módulos eletrônicos"
            ]
          },
          {
            name: "Diagnóstico (conceitual)",
            weight: 1,
            items: [
              "Conceito de causa raiz",
              "Diferença entre defeito e sintoma",
              "Sequência lógica de diagnóstico",
              "Importância de testes antes da troca",
              "Validação pós-reparo"
            ]
          },
          {
            name: "Processo",
            weight: 1,
            items: [
              "Fluxo da ordem de serviço",
              "Importância do apontamento de tempo",
              "Relação entre produtividade e lucro",
              "Comunicação técnica com consultor"
            ]
          }
        ]
      },
      {
        workshop_id,
        checklist_name: "Experiência Prática - Mecânico",
        checklist_type: "experiencia_pratica",
        position: "Mecânico",
        question_text: "Você já executou essas atividades na prática, com autonomia?",
        scoring_impact: 15,
        is_system_default: true,
        is_active: true,
        associated_criteria: ["Experiência", "Prática", "Experiências Práticas"],
        categories: [
          {
            name: "Mecânica",
            weight: 1.5,
            items: [
              "Troca de freios (pastilhas/discos)",
              "Substituição de suspensão",
              "Troca de correias",
              "Troca de embreagem",
              "Serviços de arrefecimento",
              "Montagem e desmontagem mecânica"
            ]
          },
          {
            name: "Elétrica / Eletrônica",
            weight: 1.2,
            items: [
              "Uso de scanner automotivo",
              "Teste de sensores e atuadores",
              "Diagnóstico elétrico básico",
              "Reset e parametrizações simples",
              "Correção de falhas elétricas comuns"
            ]
          },
          {
            name: "Diagnóstico (prático)",
            weight: 1.3,
            items: [
              "Realização de pré-diagnóstico",
              "Execução de testes práticos",
              "Identificação de causa raiz",
              "Confirmação do reparo realizado"
            ]
          },
          {
            name: "Processo",
            weight: 1,
            items: [
              "Preenchimento correto da OS",
              "Apontamento de tempo",
              "Registro de oportunidades de venda",
              "Cumprimento de prazos"
            ]
          }
        ]
      },
      {
        workshop_id,
        checklist_name: "Capacidade de Diagnóstico - Mecânico",
        checklist_type: "capacidade_diagnostico",
        position: "Mecânico",
        question_text: "Você se sente capaz de analisar, decidir e orientar nesses cenários?",
        scoring_impact: 15,
        is_system_default: true,
        is_active: true,
        associated_criteria: ["Diagnóstico", "Capacidade", "Capacidade Diagnóstica"],
        categories: [
          {
            name: "Análise Técnica",
            weight: 1.5,
            items: [
              "Identificar falha sem trocar peça",
              "Priorizar testes corretos",
              "Evitar retrabalho",
              "Avaliar riscos técnicos do serviço"
            ]
          },
          {
            name: "Diagnóstico Integrado",
            weight: 1.5,
            items: [
              "Cruzar sintomas mecânicos e eletrônicos",
              "Interpretar dados do scanner",
              "Validar falha com teste físico",
              "Confirmar solução antes da entrega"
            ]
          },
          {
            name: "Tomada de Decisão",
            weight: 1.3,
            items: [
              "Sugerir solução técnica adequada",
              "Apontar oportunidade de serviço preventivo",
              "Explicar tecnicamente o problema ao consultor",
              "Ajustar estratégia quando o diagnóstico não se confirma"
            ]
          },
          {
            name: "Visão de Negócio",
            weight: 1.2,
            items: [
              "Entender impacto do erro técnico no lucro",
              "Respeitar tempo padrão",
              "Contribuir para produtividade do pátio"
            ]
          }
        ]
      },
      
      // === VENDAS ===
      {
        workshop_id,
        checklist_name: "Conhecimento Técnico - Vendas",
        checklist_type: "conhecimento_tecnico",
        position: "Vendas",
        question_text: "Você possui conhecimento técnico sobre os itens abaixo?",
        scoring_impact: 10,
        is_system_default: true,
        is_active: true,
        associated_criteria: ["Conhecimento Técnico", "Conhecimento"],
        categories: [
          {
            name: "Atendimento e Relacionamento",
            weight: 1.2,
            items: [
              "Conceitos de atendimento consultivo",
              "Jornada do cliente na oficina",
              "Diferença entre vender serviço e vender solução",
              "Comunicação clara e empática",
              "Gestão de expectativa do cliente"
            ]
          },
          {
            name: "Precificação e Orçamento",
            weight: 1.3,
            items: [
              "Conceito de hora homem",
              "Estrutura de custos da oficina",
              "Formação de preço com margem",
              "Diferença entre preço, valor e percepção",
              "Importância da transparência no orçamento"
            ]
          },
          {
            name: "Processo de Vendas",
            weight: 1.5,
            items: [
              "Funil de vendas automotivo",
              "Etapas do atendimento (pré, durante e pós)",
              "GPS de Vendas (conceito)",
              "PPV – Perguntas Poderosas de Venda",
              "Processo de fechamento estruturado"
            ]
          },
          {
            name: "Negociação e Objeções",
            weight: 1.3,
            items: [
              "Tipos de objeções mais comuns",
              "Técnicas de negociação ética",
              "Conceito de concessão vs. desconto",
              "Importância do silêncio estratégico"
            ]
          },
          {
            name: "Transparência",
            weight: 1,
            items: [
              "Importância do SFV (foto e vídeo)",
              "Comunicação técnica para leigos",
              "Construção de confiança"
            ]
          }
        ]
      },
      {
        workshop_id,
        checklist_name: "Experiência Prática - Vendas",
        checklist_type: "experiencia_pratica",
        position: "Vendas",
        question_text: "Você já executou essas atividades na prática, com autonomia?",
        scoring_impact: 15,
        is_system_default: true,
        is_active: true,
        associated_criteria: ["Experiência", "Prática", "Experiências Práticas"],
        categories: [
          {
            name: "Atendimento",
            weight: 1.3,
            items: [
              "Atendimento presencial e remoto",
              "Abertura de ordem de serviço completa",
              "Identificação de dores e necessidades",
              "Gestão de relacionamento com cliente",
              "Comunicação durante a execução do serviço"
            ]
          },
          {
            name: "Orçamento e Precificação",
            weight: 1.5,
            items: [
              "Montagem de orçamento detalhado",
              "Aplicação de hora homem",
              "Inclusão de peças e serviços adicionais",
              "Apresentação clara do orçamento",
              "Ajuste de proposta sem desvalorizar"
            ]
          },
          {
            name: "Venda e Fechamento",
            weight: 1.5,
            items: [
              "Aplicação prática do GPS de Vendas",
              "Uso de PPVs durante a venda",
              "Fechamento consultivo",
              "Solicitação de autorizações",
              "Upsell e cross-sell ético"
            ]
          },
          {
            name: "Negociação",
            weight: 1.3,
            items: [
              "Contorno de objeções de preço",
              "Contorno de objeções de prazo",
              "Contorno de objeções de confiança",
              "Negociação sem concessão indevida"
            ]
          },
          {
            name: "Transparência",
            weight: 1,
            items: [
              "Envio de fotos e vídeos do serviço",
              "Explicação técnica acessível",
              "Registro de interações com o cliente"
            ]
          }
        ]
      },
      {
        workshop_id,
        checklist_name: "Capacidade de Diagnóstico - Vendas",
        checklist_type: "capacidade_diagnostico",
        position: "Vendas",
        question_text: "Você se sente capaz de analisar, decidir e agir nessas situações?",
        scoring_impact: 15,
        is_system_default: true,
        is_active: true,
        associated_criteria: ["Diagnóstico", "Capacidade", "Capacidade Diagnóstica"],
        categories: [
          {
            name: "Leitura do Cliente",
            weight: 1.5,
            items: [
              "Identificar perfil do cliente rapidamente",
              "Entender objeções ocultas",
              "Perceber sinais de compra",
              "Ajustar discurso conforme o perfil"
            ]
          },
          {
            name: "Estratégia de Venda",
            weight: 1.5,
            items: [
              "Definir melhor estratégia de fechamento",
              "Priorizar oportunidades de maior valor",
              "Decidir quando insistir ou recuar",
              "Criar senso de urgência legítimo"
            ]
          },
          {
            name: "Gestão de Resultados",
            weight: 1.3,
            items: [
              "Acompanhar taxa de conversão",
              "Analisar ticket médio",
              "Identificar gargalos no processo",
              "Ajustar abordagem para melhorar resultado"
            ]
          },
          {
            name: "Integração com Operação",
            weight: 1.2,
            items: [
              "Alinhar prazos com o pátio",
              "Antecipar riscos de atraso",
              "Comunicar ajustes ao cliente",
              "Proteger margem da empresa"
            ]
          }
        ]
      },

      // === COMERCIAL / TELEMARKETING ===
      {
        workshop_id,
        checklist_name: "Conhecimento Técnico - Comercial/Telemarketing",
        checklist_type: "conhecimento_tecnico",
        position: "Comercial",
        question_text: "Você possui conhecimento técnico sobre os itens abaixo?",
        scoring_impact: 10,
        is_system_default: true,
        is_active: true,
        associated_criteria: ["Conhecimento Técnico", "Conhecimento"],
        categories: [
          {
            name: "Prospecção e Comunicação",
            weight: 1.3,
            items: [
              "Diferença entre ligação fria, morna e quente",
              "Estrutura de uma ligação profissional",
              "Linguagem clara e objetiva",
              "Tom de voz e ritmo de fala",
              "Rapport e conexão rápida"
            ]
          },
          {
            name: "Processo de Agendamento",
            weight: 1.5,
            items: [
              "Objetivo da ligação (agendar, não vender)",
              "Importância do próximo passo claro",
              "Critérios de qualificação do lead",
              "Confirmação de agenda",
              "Follow-up estruturado"
            ]
          },
          {
            name: "Metodologia de Vendas",
            weight: 1.3,
            items: [
              "Conceito de funil de prospecção",
              "PPVs – Perguntas Poderosas de Venda",
              "Perguntas de situação, problema e implicação",
              "Senso de urgência legítimo"
            ]
          },
          {
            name: "Objeções",
            weight: 1.2,
            items: [
              "Tipos comuns de objeção (tempo, preço, confiança)",
              "Diferença entre objeção real e desculpa",
              "Técnicas de contorno sem confronto"
            ]
          },
          {
            name: "Indicadores",
            weight: 1,
            items: [
              "Taxa de contato",
              "Taxa de agendamento",
              "Taxa de comparecimento",
              "Meta diária e semanal"
            ]
          }
        ]
      },
      {
        workshop_id,
        checklist_name: "Experiência Prática - Comercial/Telemarketing",
        checklist_type: "experiencia_pratica",
        position: "Comercial",
        question_text: "Você já executou essas atividades na prática, com autonomia?",
        scoring_impact: 15,
        is_system_default: true,
        is_active: true,
        associated_criteria: ["Experiência", "Prática", "Experiências Práticas"],
        categories: [
          {
            name: "Prospecção Ativa",
            weight: 1.5,
            items: [
              "Realização de ligações diárias",
              "Abordagem inicial clara",
              "Identificação do decisor",
              "Controle emocional em rejeição",
              "Registro das interações"
            ]
          },
          {
            name: "Agendamento",
            weight: 1.5,
            items: [
              "Agendamento de visita / atendimento",
              "Confirmação de data e horário",
              "Reagendamento quando necessário",
              "Envio de confirmação (WhatsApp / mensagem)"
            ]
          },
          {
            name: "Objeções (na prática)",
            weight: 1.3,
            items: [
              "Contorno de 'não tenho tempo'",
              "Contorno de 'vou pensar'",
              "Contorno de 'já tenho fornecedor'",
              "Contorno de 'me chama depois'"
            ]
          },
          {
            name: "Follow-up",
            weight: 1.2,
            items: [
              "Follow-up estruturado",
              "Reativação de leads perdidos",
              "Persistência profissional (sem insistência chata)"
            ]
          },
          {
            name: "Gestão de Metas",
            weight: 1.3,
            items: [
              "Acompanhamento de meta diária",
              "Acompanhamento de taxa de conversão",
              "Ajuste de abordagem para melhorar resultado"
            ]
          }
        ]
      },
      {
        workshop_id,
        checklist_name: "Capacidade de Diagnóstico - Comercial/Telemarketing",
        checklist_type: "capacidade_diagnostico",
        position: "Comercial",
        question_text: "Você se sente capaz de analisar, decidir e ajustar nessas situações?",
        scoring_impact: 15,
        is_system_default: true,
        is_active: true,
        associated_criteria: ["Diagnóstico", "Capacidade", "Capacidade Diagnóstica"],
        categories: [
          {
            name: "Leitura do Lead",
            weight: 1.5,
            items: [
              "Identificar interesse real rapidamente",
              "Perceber sinais de abertura",
              "Identificar objeções ocultas",
              "Decidir continuar ou encerrar a ligação"
            ]
          },
          {
            name: "Estratégia de Abordagem",
            weight: 1.5,
            items: [
              "Ajustar script conforme resposta do lead",
              "Mudar abordagem quando não funciona",
              "Definir melhor horário de contato",
              "Escolher melhor canal de follow-up"
            ]
          },
          {
            name: "Análise de Resultado",
            weight: 1.3,
            items: [
              "Analisar taxa de agendamento",
              "Identificar gargalos no script",
              "Propor melhorias no discurso",
              "Aprender com ligações perdidas"
            ]
          },
          {
            name: "Integração com Vendas",
            weight: 1.2,
            items: [
              "Entregar lead qualificado ao consultor",
              "Registrar informações relevantes",
              "Alinhar expectativa do cliente",
              "Proteger a agenda da equipe"
            ]
          }
        ]
      }
    ];

    await base44.asServiceRole.entities.TechnicalChecklist.bulkCreate(defaultChecklists);

    return Response.json({ 
      success: true, 
      message: "Checklists padrão criados com sucesso!",
      count: defaultChecklists.length
    });

  } catch (error) {
    console.error("Erro ao inicializar checklists:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});