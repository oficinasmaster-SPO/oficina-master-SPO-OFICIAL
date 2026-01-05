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