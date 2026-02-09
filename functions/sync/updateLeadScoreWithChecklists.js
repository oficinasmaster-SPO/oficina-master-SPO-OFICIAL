import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { form_id } = await req.json();

    if (!form_id) {
      return Response.json({ error: 'form_id é obrigatório' }, { status: 400 });
    }

    // Buscar formulário
    const form = await base44.entities.InterviewForm.get(form_id);
    
    if (!form || !form.is_lead_score_form) {
      return Response.json({ error: 'Formulário não encontrado ou não é Lead Score' }, { status: 404 });
    }

    // Atualizar critérios técnicos com checklists
    const updatedCriteria = form.scoring_criteria.map((criteria, index) => {
      // Critério 1 Técnico
      if (criteria.block === 'tecnico' && index === 0) {
        return {
          ...criteria,
          criteria_name: "Conhecimento Técnico",
          max_points: 15,
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
        };
      }
      
      // Critério 2 Prática
      if (criteria.block === 'tecnico' && index === 1) {
        return {
          ...criteria,
          criteria_name: "Experiência Prática",
          max_points: 15,
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
        };
      }
      
      // Critério 3 de Diagnóstico
      if (criteria.block === 'tecnico' && index === 2) {
        return {
          ...criteria,
          criteria_name: "Capacidade de Diagnóstico",
          max_points: 10,
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
        };
      }
      
      return criteria;
    });

    const updated = await base44.entities.InterviewForm.update(form_id, {
      scoring_criteria
    });

    return Response.json({
      success,
      message: 'Formulário atualizado com checklists',
      form
    });

  } catch (error) {
    console.error('Erro ao atualizar formulário:', error);
    return Response.json({ 
      error.message || 'Erro interno do servidor' 
    }, { status: 500 });
  }
});
