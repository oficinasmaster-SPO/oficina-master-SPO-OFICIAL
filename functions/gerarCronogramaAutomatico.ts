import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Templates de cronograma por fase
const CRONOGRAMAS_POR_FASE = {
  1: {
    nome_fase: "Sobrevivência e Geração de Caixa",
    objetivo_geral: "Estabilizar o fluxo de caixa e implementar controles básicos",
    modulos: [
      {
        ordem: 1,
        codigo: "DIAG",
        nome: "Diagnóstico de Fase da Oficina",
        descricao: "Responder questionário de 12 perguntas para identificar fase",
        tipo: "diagnostico",
        duracao_estimada_dias: 1,
        atividades_previstas: 1,
        tarefas_previstas: 1,
        ferramentas_vinculadas: ["Diagnóstico"],
        modulos_plataforma: ["Questionário", "Resultado", "Plano de Ação"],
        link_acesso: "/Questionario"
      },
      {
        ordem: 2,
        codigo: "EMPR",
        nome: "Diagnóstico do Empresário",
        descricao: "Identificar perfil: Aventureiro, Empreendedor ou Gestor",
        tipo: "diagnostico",
        duracao_estimada_dias: 1,
        atividades_previstas: 1,
        tarefas_previstas: 1,
        ferramentas_vinculadas: ["Perfil Empresário"],
        modulos_plataforma: ["Perfil do Empresário", "Resultado Empresário"],
        link_acesso: "/DiagnosticoEmpresario"
      },
      {
        ordem: 3,
        codigo: "RD",
        nome: "Reunião de Diagnóstico Completo",
        descricao: "Análise dos resultados e definição de prioridades",
        tipo: "reuniao",
        duracao_estimada_dias: 1,
        atividades_previstas: 1,
        tarefas_previstas: 5,
        ferramentas_vinculadas: ["Consultoria"],
        modulos_plataforma: ["Cronograma de Consultoria"]
      },
      {
        ordem: 4,
        codigo: "CADAS",
        nome: "Cadastro Completo da Oficina",
        descricao: "Preencher dados, serviços, equipamentos e cultura",
        tipo: "implementacao",
        duracao_estimada_dias: 2,
        atividades_previstas: 1,
        tarefas_previstas: 10,
        ferramentas_vinculadas: ["Gestão Oficina"],
        modulos_plataforma: ["Gestão da Oficina"],
        link_acesso: "/GestaoOficina"
      },
      {
        ordem: 5,
        codigo: "DRE",
        nome: "Preencher DRE Mensal",
        descricao: "Inserir dados financeiros para cálculo do TCMP²",
        tipo: "implementacao",
        duracao_estimada_dias: 1,
        atividades_previstas: 1,
        tarefas_previstas: 5,
        ferramentas_vinculadas: ["DRE"],
        modulos_plataforma: ["DRE & TCMP²"],
        link_acesso: "/DRETCMP2"
      },
      {
        ordem: 6,
        codigo: "TCMP2",
        nome: "Treinamento TCMP² - Precificação",
        descricao: "Aplicar metodologia TCMP² nas Ordens de Serviço",
        tipo: "treinamento",
        duracao_estimada_dias: 3,
        atividades_previstas: 2,
        tarefas_previstas: 5,
        ferramentas_vinculadas: ["DRE", "Diagnóstico OS"],
        modulos_plataforma: ["DRE & TCMP²", "OS - R70/I30"],
        link_acesso: "/DiagnosticoOS"
      },
      {
        ordem: 7,
        codigo: "R70I30",
        nome: "Implementar R70/I30 nas OS",
        descricao: "Garantir 70% Renda e 30% Investimento em cada OS",
        tipo: "implementacao",
        duracao_estimada_dias: 7,
        atividades_previstas: 5,
        tarefas_previstas: 15,
        ferramentas_vinculadas: ["Diagnóstico OS"],
        modulos_plataforma: ["OS - R70/I30"],
        link_acesso: "/DiagnosticoOS"
      },
      {
        ordem: 8,
        codigo: "METAS",
        nome: "Definir Metas Mensais",
        descricao: "Estabelecer metas de faturamento e crescimento",
        tipo: "implementacao",
        duracao_estimada_dias: 2,
        atividades_previstas: 1,
        tarefas_previstas: 5,
        ferramentas_vinculadas: ["Gestão Oficina"],
        modulos_plataforma: ["Gestão da Oficina", "Histórico de Metas"],
        link_acesso: "/GestaoOficina"
      },
      {
        ordem: 9,
        codigo: "TAREFAS",
        nome: "Organizar Tarefas Operacionais",
        descricao: "Usar sistema de tarefas para organizar demandas",
        tipo: "implementacao",
        duracao_estimada_dias: 3,
        atividades_previstas: 2,
        tarefas_previstas: 10,
        ferramentas_vinculadas: ["Tarefas"],
        modulos_plataforma: ["Tarefas Operacionais"],
        link_acesso: "/Tarefas"
      },
      {
        ordem: 10,
        codigo: "RA1",
        nome: "Reunião de Alavancagem 1",
        descricao: "Revisão dos primeiros resultados",
        tipo: "acompanhamento",
        duracao_estimada_dias: 1,
        atividades_previstas: 1,
        tarefas_previstas: 3,
        ferramentas_vinculadas: ["Dashboard"],
        modulos_plataforma: ["Dashboard", "Cronograma de Consultoria"],
        link_acesso: "/CronogramaConsultoria"
      }
    ]
  },
  2: {
    nome_fase: "Crescimento com Equipe em Formação",
    objetivo_geral: "Estruturar pessoas e processos para escalar o negócio",
    modulos: [
      {
        ordem: 1,
        codigo: "COLAB",
        nome: "Cadastrar Colaboradores",
        descricao: "Registrar todos os colaboradores na plataforma",
        tipo: "implementacao",
        duracao_estimada_dias: 2,
        atividades_previstas: 5,
        tarefas_previstas: 5,
        ferramentas_vinculadas: ["Colaboradores"],
        modulos_plataforma: ["Colaboradores", "Convidar Colaborador"],
        link_acesso: "/Colaboradores"
      },
      {
        ordem: 2,
        codigo: "CDC",
        nome: "CDC - Conexão do Colaborador",
        descricao: "Aplicar CDC com cada colaborador cadastrado",
        tipo: "implementacao",
        duracao_estimada_dias: 7,
        atividades_previstas: 5,
        tarefas_previstas: 10,
        ferramentas_vinculadas: ["CDC"],
        modulos_plataforma: ["CDC - Conexão do Colaborador"],
        link_acesso: "/CDCList"
      },
      {
        ordem: 3,
        codigo: "COEX",
        nome: "COEX - Contrato de Expectativas",
        descricao: "Criar COEX com cada colaborador",
        tipo: "implementacao",
        duracao_estimada_dias: 5,
        atividades_previstas: 5,
        tarefas_previstas: 10,
        ferramentas_vinculadas: ["COEX"],
        modulos_plataforma: ["COEX - Contrato Expectativa"],
        link_acesso: "/COEXList"
      },
      {
        ordem: 4,
        codigo: "MAT",
        nome: "Diagnóstico de Maturidade dos Colaboradores",
        descricao: "Avaliar maturidade profissional da equipe",
        tipo: "diagnostico",
        duracao_estimada_dias: 3,
        atividades_previstas: 5,
        tarefas_previstas: 5,
        ferramentas_vinculadas: ["Maturidade"],
        modulos_plataforma: ["Maturidade do Colaborador"],
        link_acesso: "/DiagnosticoMaturidade"
      },
      {
        ordem: 5,
        codigo: "DESM",
        nome: "Desdobramento de Metas por Colaborador",
        descricao: "Distribuir metas individuais baseadas no melhor mês",
        tipo: "implementacao",
        duracao_estimada_dias: 3,
        atividades_previstas: 3,
        tarefas_previstas: 10,
        ferramentas_vinculadas: ["Desdobramento"],
        modulos_plataforma: ["Desdobramento de Metas"],
        link_acesso: "/DesdobramentoMeta"
      },
      {
        ordem: 6,
        codigo: "PROD",
        nome: "Diagnóstico Produção vs Salário",
        descricao: "Avaliar se colaboradores são produtivos",
        tipo: "diagnostico",
        duracao_estimada_dias: 2,
        atividades_previstas: 5,
        tarefas_previstas: 5,
        ferramentas_vinculadas: ["Produtividade"],
        modulos_plataforma: ["Produção vs Salário"],
        link_acesso: "/DiagnosticoProducao"
      },
      {
        ordem: 7,
        codigo: "REGDIA",
        nome: "Registro Diário de Produção",
        descricao: "Colaboradores registram métricas diariamente",
        tipo: "implementacao",
        duracao_estimada_dias: 30,
        atividades_previstas: 30,
        tarefas_previstas: 30,
        ferramentas_vinculadas: ["Diário"],
        modulos_plataforma: ["Diário de Produção"],
        link_acesso: "/RegistroDiario"
      },
      {
        ordem: 8,
        codigo: "AUTOAV",
        nome: "Autoavaliações de Vendas/Comercial",
        descricao: "Equipe comercial faz autoavaliação",
        tipo: "diagnostico",
        duracao_estimada_dias: 2,
        atividades_previstas: 3,
        tarefas_previstas: 3,
        ferramentas_vinculadas: ["Autoavaliações"],
        modulos_plataforma: ["Mapas de Autoavaliação"],
        link_acesso: "/Autoavaliacoes"
      },
      {
        ordem: 9,
        codigo: "RA2",
        nome: "Reunião de Alavancagem 2",
        descricao: "Revisão de metas e ajustes de rota",
        tipo: "acompanhamento",
        duracao_estimada_dias: 1,
        atividades_previstas: 1,
        tarefas_previstas: 3,
        ferramentas_vinculadas: ["Consultoria"],
        modulos_plataforma: ["Cronograma de Consultoria"],
        link_acesso: "/CronogramaConsultoria"
      }
    ]
  },
  3: {
    nome_fase: "Organização, Liderança e Processos",
    objetivo_geral: "Padronizar operações e desenvolver liderança",
    modulos: [
      {
        ordem: 1,
        codigo: "DISC",
        nome: "Teste DISC - Perfil Comportamental",
        descricao: "Aplicar DISC no proprietário e líderes",
        tipo: "diagnostico",
        duracao_estimada_dias: 2,
        atividades_previstas: 3,
        tarefas_previstas: 3,
        ferramentas_vinculadas: ["DISC"],
        modulos_plataforma: ["Teste DISC"],
        link_acesso: "/DiagnosticoDISC"
      },
      {
        ordem: 2,
        codigo: "MVV",
        nome: "Missão, Visão e Valores",
        descricao: "Definir cultura organizacional da oficina",
        tipo: "implementacao",
        duracao_estimada_dias: 3,
        atividades_previstas: 2,
        tarefas_previstas: 8,
        ferramentas_vinculadas: ["MVV"],
        modulos_plataforma: ["Missão, Visão e Valores"],
        link_acesso: "/MissaoVisaoValores"
      },
      {
        ordem: 3,
        codigo: "CULT",
        nome: "Manual da Cultura Organizacional",
        descricao: "Criar manual com pilares e expectativas",
        tipo: "implementacao",
        duracao_estimada_dias: 5,
        atividades_previstas: 3,
        tarefas_previstas: 12,
        ferramentas_vinculadas: ["Cultura"],
        modulos_plataforma: ["Manual da Cultura"],
        link_acesso: "/CulturaOrganizacional"
      },
      {
        ordem: 4,
        codigo: "MAPS",
        nome: "Mapeamento de Processos (MAPs)",
        descricao: "Documentar processos operacionais críticos",
        tipo: "implementacao",
        duracao_estimada_dias: 10,
        atividades_previstas: 8,
        tarefas_previstas: 20,
        ferramentas_vinculadas: ["Processos"],
        modulos_plataforma: ["Meus Processos (MAPs)"],
        link_acesso: "/MeusProcessos"
      },
      {
        ordem: 5,
        codigo: "RITUAL",
        nome: "Rituais de Aculturamento",
        descricao: "Implementar 34 rituais para fortalecer cultura",
        tipo: "implementacao",
        duracao_estimada_dias: 7,
        atividades_previstas: 5,
        tarefas_previstas: 15,
        ferramentas_vinculadas: ["Rituais"],
        modulos_plataforma: ["Rituais de Aculturamento"],
        link_acesso: "/RituaisAculturamento"
      },
      {
        ordem: 6,
        codigo: "TREN",
        nome: "Estruturar Treinamentos",
        descricao: "Criar módulos e aulas de capacitação",
        tipo: "implementacao",
        duracao_estimada_dias: 10,
        atividades_previstas: 5,
        tarefas_previstas: 15,
        ferramentas_vinculadas: ["Treinamentos"],
        modulos_plataforma: ["Gestão de Treinamentos"],
        link_acesso: "/GerenciarTreinamentos"
      },
      {
        ordem: 7,
        codigo: "DESEMP",
        nome: "Matriz de Desempenho",
        descricao: "Avaliar competências técnicas e emocionais",
        tipo: "diagnostico",
        duracao_estimada_dias: 3,
        atividades_previstas: 5,
        tarefas_previstas: 5,
        ferramentas_vinculadas: ["Desempenho"],
        modulos_plataforma: ["Matriz de Desempenho"],
        link_acesso: "/DiagnosticoDesempenho"
      },
      {
        ordem: 8,
        codigo: "CLIMA",
        nome: "Pesquisa de Clima Organizacional",
        descricao: "Medir satisfação e engajamento da equipe",
        tipo: "diagnostico",
        duracao_estimada_dias: 5,
        atividades_previstas: 2,
        tarefas_previstas: 8,
        ferramentas_vinculadas: ["Clima"],
        modulos_plataforma: ["Pesquisa de Clima"],
        link_acesso: "/PesquisaClima"
      },
      {
        ordem: 9,
        codigo: "RA3",
        nome: "Reunião de Alavancagem 3",
        descricao: "Balanço da fase e preparação para escala",
        tipo: "acompanhamento",
        duracao_estimada_dias: 1,
        atividades_previstas: 1,
        tarefas_previstas: 3,
        ferramentas_vinculadas: ["Consultoria"],
        modulos_plataforma: ["Cronograma de Consultoria"],
        link_acesso: "/CronogramaConsultoria"
      }
    ]
  },
  3: {
    nome_fase: "Organização, Liderança e Processos",
    objetivo_geral: "Padronizar operações e desenvolver liderança",
    modulos: [
      {
        ordem: 1,
        codigo: "DIGER",
        nome: "Diagnóstico Gerencial",
        descricao: "Avaliar maturidade de todas as áreas da empresa",
        tipo: "diagnostico",
        duracao_estimada_dias: 2,
        atividades_previstas: 1,
        tarefas_previstas: 5,
        ferramentas_vinculadas: ["Diagnóstico Gerencial"],
        modulos_plataforma: ["Diagnóstico Gerencial"],
        link_acesso: "/DiagnosticoGerencial"
      },
      {
        ordem: 2,
        codigo: "ORGANO",
        nome: "Criar Organograma",
        descricao: "Estruturar hierarquia e responsabilidades",
        tipo: "implementacao",
        duracao_estimada_dias: 3,
        atividades_previstas: 2,
        tarefas_previstas: 8,
        ferramentas_vinculadas: ["Organograma"],
        modulos_plataforma: ["Organograma"],
        link_acesso: "/Organograma"
      },
      {
        ordem: 3,
        codigo: "MAPS",
        nome: "Documentar Processos (MAPs)",
        descricao: "Mapear e documentar processos operacionais",
        tipo: "implementacao",
        duracao_estimada_dias: 15,
        atividades_previstas: 10,
        tarefas_previstas: 25,
        ferramentas_vinculadas: ["Processos"],
        modulos_plataforma: ["Meus Processos (MAPs)"],
        link_acesso: "/MeusProcessos"
      },
      {
        ordem: 4,
        codigo: "RITUAL",
        nome: "Implementar Rituais",
        descricao: "Ativar rituais de aculturamento na equipe",
        tipo: "implementacao",
        duracao_estimada_dias: 10,
        atividades_previstas: 6,
        tarefas_previstas: 20,
        ferramentas_vinculadas: ["Rituais"],
        modulos_plataforma: ["Rituais de Aculturamento", "Cronograma de Aculturação"],
        link_acesso: "/RituaisAculturamento"
      },
      {
        ordem: 5,
        codigo: "GAMIF",
        nome: "Ativar Gamificação",
        descricao: "Criar desafios e recompensas para a equipe",
        tipo: "implementacao",
        duracao_estimada_dias: 7,
        atividades_previstas: 4,
        tarefas_previstas: 12,
        ferramentas_vinculadas: ["Gamificação"],
        modulos_plataforma: ["Desafios & Conquistas", "Gestão Desafios"],
        link_acesso: "/Gamificacao"
      },
      {
        ordem: 6,
        codigo: "ENDIV",
        nome: "Análise de Endividamento",
        descricao: "Diagnóstico da curva de endividamento 12 meses",
        tipo: "diagnostico",
        duracao_estimada_dias: 2,
        atividades_previstas: 1,
        tarefas_previstas: 5,
        ferramentas_vinculadas: ["Endividamento"],
        modulos_plataforma: ["Curva de Endividamento"],
        link_acesso: "/DiagnosticoEndividamento"
      },
      {
        ordem: 7,
        codigo: "IA",
        nome: "IA Analytics - Previsões",
        descricao: "Usar IA para gargalos e recomendações",
        tipo: "implementacao",
        duracao_estimada_dias: 5,
        atividades_previstas: 3,
        tarefas_previstas: 10,
        ferramentas_vinculadas: ["IA"],
        modulos_plataforma: ["IA Analytics"],
        link_acesso: "/IAAnalytics"
      },
      {
        ordem: 8,
        codigo: "RA3",
        nome: "Reunião de Alavancagem 3",
        descricao: "Revisão geral e plano de consolidação",
        tipo: "acompanhamento",
        duracao_estimada_dias: 1,
        atividades_previstas: 1,
        tarefas_previstas: 3,
        ferramentas_vinculadas: ["Consultoria"],
        modulos_plataforma: ["Cronograma de Consultoria"],
        link_acesso: "/CronogramaConsultoria"
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

    // VALIDAR SE JÁ FEZ DIAGNÓSTICO DE FASE
    const diagnosticosFase = await base44.asServiceRole.entities.Diagnostic.filter({ 
      workshop_id: workshop_id 
    }, '-created_date', 1);

    if (!diagnosticosFase || diagnosticosFase.length === 0) {
      return Response.json({ 
        error: 'Cliente precisa fazer o Diagnóstico de Fase primeiro',
        action_required: 'diagnostic'
      }, { status: 400 });
    }

    const diagnosticoAtual = diagnosticosFase[0];
    console.log(`✅ Diagnóstico encontrado - Fase ${diagnosticoAtual.phase}`);

    // Buscar diagnóstico empresarial
    const diagEmpresarial = await base44.asServiceRole.entities.EntrepreneurDiagnostic.filter({ 
      workshop_id: workshop_id 
    }, '-created_date', 1);

    const perfilEmpresarial = diagEmpresarial[0]?.dominant_profile || null;
    console.log(`👔 Perfil empresarial: ${perfilEmpresarial || 'não definido'}`);

    const template = CRONOGRAMAS_POR_FASE[diagnosticoAtual.phase || fase_oficina];
    if (!template) {
      return Response.json({ error: 'Fase inválida' }, { status: 400 });
    }

    // Personalizar cronograma baseado no perfil empresarial
    let modulosPersonalizados = [...template.modulos];
    
    if (perfilEmpresarial === 'aventureiro') {
      // Aventureiro precisa focar em organização e processos
      console.log("🎯 Personalizando para perfil AVENTUREIRO");
    } else if (perfilEmpresarial === 'empreendedor') {
      // Empreendedor precisa focar em gestão de pessoas
      console.log("🎯 Personalizando para perfil EMPREENDEDOR");
    } else if (perfilEmpresarial === 'gestor') {
      // Gestor precisa focar em resultados e inovação
      console.log("🎯 Personalizando para perfil GESTOR");
    }

    // Calcular datas
    const dataInicio = data_inicio ? new Date(data_inicio) : new Date();
    let dataAtual = new Date(dataInicio);

    const progressos = [];

    for (const modulo of modulosPersonalizados) {
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