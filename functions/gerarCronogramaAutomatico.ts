import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Templates de cronograma por fase
const CRONOGRAMAS_POR_FASE = {
  1: {
    nome_fase: "Sobrevivência e Geração de Caixa",
    objetivo_geral: "Estabilizar o fluxo de caixa e implementar controles básicos",
    modulos: [
      {
        ordem: 1,
        codigo: "RD",
        nome: "Reunião de Diagnóstico",
        descricao: "Análise completa da situação atual da oficina",
        tipo: "diagnostico",
        duracao_estimada_dias: 1,
        atividades_previstas: 1,
        tarefas_previstas: 5,
        ferramentas_vinculadas: ["Diagnóstico de Fase", "Dashboard"],
        modulos_plataforma: ["Diagnósticos", "Dashboard"]
      },
      {
        ordem: 2,
        codigo: "RBI",
        nome: "Reunião Briefing Individual",
        descricao: "Alinhamento de expectativas e objetivos",
        tipo: "reuniao",
        duracao_estimada_dias: 1,
        atividades_previstas: 1,
        tarefas_previstas: 3,
        ferramentas_vinculadas: ["COEX"],
        modulos_plataforma: ["COEX", "Cadastros"]
      },
      {
        ordem: 3,
        codigo: "RPI",
        nome: "Reunião Planejamento Individual",
        descricao: "Definição do plano de ação personalizado",
        tipo: "reuniao",
        duracao_estimada_dias: 2,
        atividades_previstas: 1,
        tarefas_previstas: 8,
        ferramentas_vinculadas: ["Plano de Ação"],
        modulos_plataforma: ["Tarefas", "Plano de Ação"]
      },
      {
        ordem: 4,
        codigo: "R70I30",
        nome: "R70/I30 - Geração de Caixa e Lucro",
        descricao: "Implementação da regra 70% Renda / 30% Investimento",
        tipo: "implementacao",
        duracao_estimada_dias: 7,
        atividades_previstas: 3,
        tarefas_previstas: 10,
        ferramentas_vinculadas: ["Diagnóstico OS"],
        modulos_plataforma: ["OS - R70/I30", "Resultados"]
      },
      {
        ordem: 5,
        codigo: "TCMP2",
        nome: "TCMP² - Precificação da Mão de Obra",
        descricao: "Cálculo correto do valor hora com base nos custos",
        tipo: "implementacao",
        duracao_estimada_dias: 5,
        atividades_previstas: 2,
        tarefas_previstas: 7,
        ferramentas_vinculadas: ["DRE & TCMP²"],
        modulos_plataforma: ["DRE & TCMP²", "Resultados"]
      },
      {
        ordem: 6,
        codigo: "SFV",
        nome: "Sistema de Foto e Vídeo",
        descricao: "Implementação de registro visual dos serviços",
        tipo: "implementacao",
        duracao_estimada_dias: 3,
        atividades_previstas: 2,
        tarefas_previstas: 5,
        ferramentas_vinculadas: ["Documentos"],
        modulos_plataforma: ["Repositório de Documentos", "Processos"]
      },
      {
        ordem: 7,
        codigo: "QGP",
        nome: "Quadro de Gestão de Pátio",
        descricao: "Controle visual do fluxo operacional",
        tipo: "implementacao",
        duracao_estimada_dias: 5,
        atividades_previstas: 3,
        tarefas_previstas: 8,
        ferramentas_vinculadas: ["QGP Board", "Tarefas"],
        modulos_plataforma: ["Quadro Geral (TV)", "Minha Fila", "Pátio"]
      },
      {
        ordem: 8,
        codigo: "RA1",
        nome: "Reunião de Alavancagem 1",
        descricao: "Revisão dos resultados e ajustes necessários",
        tipo: "acompanhamento",
        duracao_estimada_dias: 1,
        atividades_previstas: 1,
        tarefas_previstas: 5,
        ferramentas_vinculadas: ["Dashboard", "Metas"],
        modulos_plataforma: ["Dashboard", "Histórico de Metas"]
      }
    ]
  },
  2: {
    nome_fase: "Crescimento com Equipe em Formação",
    objetivo_geral: "Estruturar pessoas e processos para escalar o negócio",
    modulos: [
      {
        ordem: 1,
        codigo: "AGL",
        nome: "Análise Gerencial de Liderança",
        descricao: "Desenvolvimento das habilidades de liderança",
        tipo: "diagnostico",
        duracao_estimada_dias: 2,
        atividades_previstas: 2,
        tarefas_previstas: 6,
        ferramentas_vinculadas: ["Teste DISC", "Matriz Desempenho"],
        modulos_plataforma: ["Teste DISC", "Matriz de Desempenho"]
      },
      {
        ordem: 2,
        codigo: "CDC",
        nome: "CDC - Conexão do Colaborador",
        descricao: "Conhecer profundamente cada colaborador",
        tipo: "implementacao",
        duracao_estimada_dias: 5,
        atividades_previstas: 5,
        tarefas_previstas: 10,
        ferramentas_vinculadas: ["CDC"],
        modulos_plataforma: ["CDC - Conexão do Colaborador"]
      },
      {
        ordem: 3,
        codigo: "COEX",
        nome: "COEX - Contrato de Expectativas",
        descricao: "Alinhamento de metas e comportamentos",
        tipo: "implementacao",
        duracao_estimada_dias: 3,
        atividades_previstas: 3,
        tarefas_previstas: 8,
        ferramentas_vinculadas: ["COEX"],
        modulos_plataforma: ["COEX - Contrato Expectativa"]
      },
      {
        ordem: 4,
        codigo: "MAT",
        nome: "Diagnóstico de Maturidade",
        descricao: "Avaliar nível de maturidade de cada colaborador",
        tipo: "diagnostico",
        duracao_estimada_dias: 2,
        atividades_previstas: 5,
        tarefas_previstas: 5,
        ferramentas_vinculadas: ["Maturidade"],
        modulos_plataforma: ["Maturidade do Colaborador"]
      },
      {
        ordem: 5,
        codigo: "DESM",
        nome: "Desdobramento de Metas",
        descricao: "Distribuir metas por colaborador e área",
        tipo: "implementacao",
        duracao_estimada_dias: 3,
        atividades_previstas: 2,
        tarefas_previstas: 7,
        ferramentas_vinculadas: ["Desdobramento Metas"],
        modulos_plataforma: ["Desdobramento de Metas"]
      },
      {
        ordem: 6,
        codigo: "GPS",
        nome: "GPS de Vendas - Método",
        descricao: "Processo estruturado de vendas",
        tipo: "treinamento",
        duracao_estimada_dias: 5,
        atividades_previstas: 4,
        tarefas_previstas: 10,
        ferramentas_vinculadas: ["Treinamento Vendas"],
        modulos_plataforma: ["Treinamento de Vendas", "Autoavaliações"]
      },
      {
        ordem: 7,
        codigo: "PAVE",
        nome: "Método PAVE - Prospecção de Clientes",
        descricao: "Sistema estruturado de captação de clientes",
        tipo: "implementacao",
        duracao_estimada_dias: 7,
        atividades_previstas: 3,
        tarefas_previstas: 12,
        ferramentas_vinculadas: ["Diagnóstico Comercial"],
        modulos_plataforma: ["Diagnóstico Comercial", "Clientes"]
      },
      {
        ordem: 8,
        codigo: "OOO",
        nome: "One on One",
        descricao: "Reuniões individuais de desenvolvimento",
        tipo: "acompanhamento",
        duracao_estimada_dias: 15,
        atividades_previstas: 5,
        tarefas_previstas: 10,
        ferramentas_vinculadas: ["Feedbacks"],
        modulos_plataforma: ["Colaboradores", "Feedbacks"]
      },
      {
        ordem: 9,
        codigo: "RA2",
        nome: "Reunião de Alavancagem 2",
        descricao: "Avaliação de crescimento e próximos passos",
        tipo: "acompanhamento",
        duracao_estimada_dias: 1,
        atividades_previstas: 1,
        tarefas_previstas: 5,
        ferramentas_vinculadas: ["Dashboard"],
        modulos_plataforma: ["Dashboard", "IA Analytics"]
      }
    ]
  },
  3: {
    nome_fase: "Organização, Liderança e Processos",
    objetivo_geral: "Padronizar operações e desenvolver liderança",
    modulos: [
      {
        ordem: 1,
        codigo: "MVV",
        nome: "Missão, Visão e Valores",
        descricao: "Definição da cultura organizacional",
        tipo: "implementacao",
        duracao_estimada_dias: 3,
        atividades_previstas: 2,
        tarefas_previstas: 6,
        ferramentas_vinculadas: ["Cultura"],
        modulos_plataforma: ["Missão, Visão e Valores", "Cultura"]
      },
      {
        ordem: 2,
        codigo: "MAPS",
        nome: "MAPs - Mapeamento de Processos",
        descricao: "Documentação de todos os processos críticos",
        tipo: "implementacao",
        duracao_estimada_dias: 10,
        atividades_previstas: 8,
        tarefas_previstas: 20,
        ferramentas_vinculadas: ["Processos"],
        modulos_plataforma: ["Meus Processos (MAPs)", "Processos"]
      },
      {
        ordem: 3,
        codigo: "CULT",
        nome: "Manual da Cultura",
        descricao: "Criar manual completo da cultura da empresa",
        tipo: "implementacao",
        duracao_estimada_dias: 5,
        atividades_previstas: 3,
        tarefas_previstas: 10,
        ferramentas_vinculadas: ["Cultura Manual"],
        modulos_plataforma: ["Manual da Cultura", "Cultura"]
      },
      {
        ordem: 4,
        codigo: "ACULT",
        nome: "Cronograma de Aculturamento",
        descricao: "Atividades programadas para fortalecer a cultura",
        tipo: "implementacao",
        duracao_estimada_dias: 7,
        atividades_previstas: 4,
        tarefas_previstas: 15,
        ferramentas_vinculadas: ["Aculturamento"],
        modulos_plataforma: ["Cronograma de Aculturação", "Rituais"]
      },
      {
        ordem: 5,
        codigo: "TREN",
        nome: "Gestão de Treinamentos",
        descricao: "Estruturar programa de capacitação contínua",
        tipo: "implementacao",
        duracao_estimada_dias: 10,
        atividades_previstas: 5,
        tarefas_previstas: 12,
        ferramentas_vinculadas: ["Treinamentos"],
        modulos_plataforma: ["Gestão de Treinamentos", "Meus Treinamentos"]
      },
      {
        ordem: 6,
        codigo: "RL",
        nome: "Reunião de Liderança",
        descricao: "Alinhamento estratégico com líderes",
        tipo: "acompanhamento",
        duracao_estimada_dias: 1,
        atividades_previstas: 1,
        tarefas_previstas: 5,
        ferramentas_vinculadas: ["Colaboradores"],
        modulos_plataforma: ["Colaboradores", "Organograma"]
      },
      {
        ordem: 7,
        codigo: "CLIMA",
        nome: "Pesquisa de Clima",
        descricao: "Avaliar satisfação e engajamento da equipe",
        tipo: "diagnostico",
        duracao_estimada_dias: 5,
        atividades_previstas: 2,
        tarefas_previstas: 8,
        ferramentas_vinculadas: ["Clima"],
        modulos_plataforma: ["Pesquisa de Clima"]
      },
      {
        ordem: 8,
        codigo: "RA3",
        nome: "Reunião de Alavancagem 3",
        descricao: "Consolidação dos processos implementados",
        tipo: "acompanhamento",
        duracao_estimada_dias: 1,
        atividades_previstas: 1,
        tarefas_previstas: 5,
        ferramentas_vinculadas: ["Dashboard"],
        modulos_plataforma: ["Dashboard", "IA Analytics"]
      }
    ]
  },
  4: {
    nome_fase: "Consolidação e Escala",
    objetivo_geral: "Escalar operações e preparar para expansão",
    modulos: [
      {
        ordem: 1,
        codigo: "PLAN",
        nome: "Planejamento Estratégico",
        descricao: "Plano de 3-5 anos com metas ambiciosas",
        tipo: "implementacao",
        duracao_estimada_dias: 5,
        atividades_previstas: 3,
        tarefas_previstas: 10,
        ferramentas_vinculadas: ["Metas", "Dashboard"],
        modulos_plataforma: ["Histórico de Metas", "Dashboard"]
      },
      {
        ordem: 2,
        codigo: "GAMIF",
        nome: "Gamificação e Engajamento",
        descricao: "Sistema de desafios e recompensas",
        tipo: "implementacao",
        duracao_estimada_dias: 7,
        atividades_previstas: 4,
        tarefas_previstas: 12,
        ferramentas_vinculadas: ["Gamificação"],
        modulos_plataforma: ["Desafios & Conquistas", "Gestão Desafios"]
      },
      {
        ordem: 3,
        codigo: "IA",
        nome: "IA Analytics - Inteligência de Negócio",
        descricao: "Previsões e recomendações baseadas em IA",
        tipo: "implementacao",
        duracao_estimada_dias: 5,
        atividades_previstas: 2,
        tarefas_previstas: 8,
        ferramentas_vinculadas: ["IA Analytics"],
        modulos_plataforma: ["IA Analytics"]
      },
      {
        ordem: 4,
        codigo: "AUDIT",
        nome: "Auditoria Completa",
        descricao: "Verificação de conformidade e qualidade",
        tipo: "diagnostico",
        duracao_estimada_dias: 3,
        atividades_previstas: 5,
        tarefas_previstas: 15,
        ferramentas_vinculadas: ["Todos os módulos"],
        modulos_plataforma: ["Dashboard", "Todos"]
      },
      {
        ordem: 5,
        codigo: "EXPAN",
        nome: "Plano de Expansão",
        descricao: "Estratégia para crescimento e novas unidades",
        tipo: "implementacao",
        duracao_estimada_dias: 10,
        atividades_previstas: 4,
        tarefas_previstas: 20,
        ferramentas_vinculadas: ["Gestão Oficina"],
        modulos_plataforma: ["Gestão da Oficina", "Dashboard"]
      },
      {
        ordem: 6,
        codigo: "KICK",
        nome: "Reunião de Kickoff - Nova Fase",
        descricao: "Lançamento oficial da nova etapa",
        tipo: "reuniao",
        duracao_estimada_dias: 1,
        atividades_previstas: 1,
        tarefas_previstas: 3,
        ferramentas_vinculadas: ["Dashboard"],
        modulos_plataforma: ["Dashboard"]
      },
      {
        ordem: 7,
        codigo: "SUP",
        nome: "Suporte Contínuo",
        descricao: "Acompanhamento e suporte permanente",
        tipo: "acompanhamento",
        duracao_estimada_dias: 30,
        atividades_previstas: 10,
        tarefas_previstas: 20,
        ferramentas_vinculadas: ["Todos"],
        modulos_plataforma: ["Todos os módulos"]
      },
      {
        ordem: 8,
        codigo: "RA4",
        nome: "Reunião de Alavancagem 4",
        descricao: "Celebração de resultados e próximos desafios",
        tipo: "acompanhamento",
        duracao_estimada_dias: 1,
        atividades_previstas: 1,
        tarefas_previstas: 5,
        ferramentas_vinculadas: ["Dashboard"],
        modulos_plataforma: ["Dashboard", "IA Analytics"]
      }
    ]
  }
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { workshop_id, fase_oficina, data_inicio } = await req.json();

    if (!workshop_id || !fase_oficina) {
      return Response.json({ error: 'workshop_id e fase_oficina são obrigatórios' }, { status: 400 });
    }

    console.log(`📋 Gerando cronograma para Fase ${fase_oficina}...`);

    const template = CRONOGRAMAS_POR_FASE[fase_oficina];
    if (!template) {
      return Response.json({ error: 'Fase inválida' }, { status: 400 });
    }

    // Calcular datas
    const dataInicio = data_inicio ? new Date(data_inicio) : new Date();
    let dataAtual = new Date(dataInicio);

    const progressos = [];

    for (const modulo of template.modulos) {
      const dataConclusaoPrevisto = new Date(dataAtual);
      dataConclusaoPrevisto.setDate(dataConclusaoPrevisto.getDate() + modulo.duracao_estimada_dias);

      const progresso = await base44.asServiceRole.entities.CronogramaProgresso.create({
        workshop_id,
        fase_oficina,
        modulo_codigo: modulo.codigo,
        modulo_nome: modulo.nome,
        ordem: modulo.ordem,
        data_inicio_previsto: dataAtual.toISOString().split('T')[0],
        data_conclusao_previsto: dataConclusaoPrevisto.toISOString().split('T')[0],
        situacao: 'nao_iniciado',
        atividades_previstas: modulo.atividades_previstas,
        atividades_realizadas: 0,
        tarefas_solicitadas: modulo.tarefas_previstas,
        tarefas_entregues: 0
      });

      progressos.push(progresso);

      // Próximo módulo começa após conclusão do anterior
      dataAtual = new Date(dataConclusaoPrevisto);
      dataAtual.setDate(dataAtual.getDate() + 1);
    }

    console.log(`✅ Cronograma gerado com ${progressos.length} módulos!`);

    return Response.json({ 
      success: true,
      fase: fase_oficina,
      nome_fase: template.nome_fase,
      total_modulos: progressos.length,
      progressos: progressos
    });

  } catch (error) {
    console.error('❌ Erro ao gerar cronograma:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});