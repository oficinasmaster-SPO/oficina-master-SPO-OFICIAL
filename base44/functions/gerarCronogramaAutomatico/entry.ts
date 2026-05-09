import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * @deprecated ENGINE A — CONGELADO. NÃO MODIFICAR.
 *
 * Status: MANUTENÇÃO CRÍTICA APENAS.
 *
 * Este arquivo é o Engine A legado. Ele escreve diretamente em CronogramaProgresso
 * (read model legado). A source of truth operacional é CronogramaImplementacao.
 *
 * PROIBIDO adicionar:
 *   - novos módulos ou fases
 *   - novas regras de SLA ou jornada
 *   - novos templates hardcoded
 *   - novas automações
 *   - novos campos de progresso
 *
 * Para qualquer nova implementação, use:
 *   → CronogramaTemplateItem  (templates dinâmicos)
 *   → generateFullCronograma  (engine de criação)
 *   → CronogramaImplementacao (write model / source of truth)
 *   → syncImplementacaoToProgresso (projeção para read model)
 *
 * Plano de remoção: quando nenhuma tela consumir CronogramaProgresso diretamente
 * e todas as migrações granulares estiverem concluídas.
 *
 * Ver: docs/LEGACY_ENGINE_A.md
 */

// Templates de cronograma por fase — CONGELADOS, NÃO MODIFICAR
const CRONOGRAMAS_POR_FASE = {
  1: {
    nome_fase: "Sobrevivência e Geração de Caixa",
    objetivo_geral: "Estabilizar o fluxo de caixa e implementar controles básicos",
    modulos: [
      { ordem: 1, codigo: "DIAG", nome: "Diagnóstico de Fase da Oficina", descricao: "Responder questionário de 12 perguntas para identificar fase", tipo: "diagnostico", duracao_estimada_dias: 1, atividades_previstas: 1, tarefas_previstas: 1, link_acesso: "/Questionario" },
      { ordem: 2, codigo: "EMPR", nome: "Diagnóstico do Empresário", descricao: "Identificar perfil: Aventureiro, Empreendedor ou Gestor", tipo: "diagnostico", duracao_estimada_dias: 1, atividades_previstas: 1, tarefas_previstas: 1, link_acesso: "/DiagnosticoEmpresario" },
      { ordem: 3, codigo: "RD", nome: "Reunião de Diagnóstico Completo", descricao: "Análise dos resultados e definição de prioridades", tipo: "reuniao", duracao_estimada_dias: 1, atividades_previstas: 1, tarefas_previstas: 5, link_acesso: "/CronogramaConsultoria" },
      { ordem: 4, codigo: "CADAS", nome: "Cadastro Completo da Oficina", descricao: "Preencher dados, serviços, equipamentos e cultura", tipo: "implementacao", duracao_estimada_dias: 2, atividades_previstas: 1, tarefas_previstas: 10, link_acesso: "/GestaoOficina" },
      { ordem: 5, codigo: "DRE", nome: "Preencher DRE Mensal", descricao: "Inserir dados financeiros para cálculo do TCMP²", tipo: "implementacao", duracao_estimada_dias: 1, atividades_previstas: 1, tarefas_previstas: 5, link_acesso: "/DRETCMP2" },
      { ordem: 6, codigo: "TCMP2", nome: "Treinamento TCMP² - Precificação", descricao: "Aplicar metodologia TCMP² nas Ordens de Serviço", tipo: "treinamento", duracao_estimada_dias: 3, atividades_previstas: 2, tarefas_previstas: 5, link_acesso: "/DiagnosticoOS" },
      { ordem: 7, codigo: "R70I30", nome: "Implementar R70/I30 nas OS", descricao: "Garantir 70% Renda e 30% Investimento em cada OS", tipo: "implementacao", duracao_estimada_dias: 7, atividades_previstas: 5, tarefas_previstas: 15, link_acesso: "/DiagnosticoOS" },
      { ordem: 8, codigo: "METAS", nome: "Definir Metas Mensais", descricao: "Estabelecer metas de faturamento e crescimento", tipo: "implementacao", duracao_estimada_dias: 2, atividades_previstas: 1, tarefas_previstas: 5, link_acesso: "/GestaoOficina" },
      { ordem: 9, codigo: "TAREFAS", nome: "Organizar Tarefas Operacionais", descricao: "Usar sistema de tarefas para organizar demandas", tipo: "implementacao", duracao_estimada_dias: 3, atividades_previstas: 2, tarefas_previstas: 10, link_acesso: "/Tarefas" },
      { ordem: 10, codigo: "RA1", nome: "Reunião de Alavancagem 1", descricao: "Revisão dos primeiros resultados", tipo: "acompanhamento", duracao_estimada_dias: 1, atividades_previstas: 1, tarefas_previstas: 3, link_acesso: "/CronogramaConsultoria" }
    ]
  },
  2: {
    nome_fase: "Crescimento com Equipe em Formação",
    objetivo_geral: "Estruturar pessoas e processos para escalar o negócio",
    modulos: [
      { ordem: 1, codigo: "COLAB", nome: "Cadastrar Colaboradores", descricao: "Registrar todos os colaboradores na plataforma", tipo: "implementacao", duracao_estimada_dias: 2, atividades_previstas: 5, tarefas_previstas: 5, link_acesso: "/Colaboradores" },
      { ordem: 2, codigo: "CDC", nome: "CDC - Conexão do Colaborador", descricao: "Aplicar CDC com cada colaborador cadastrado", tipo: "implementacao", duracao_estimada_dias: 7, atividades_previstas: 5, tarefas_previstas: 10, link_acesso: "/CDCList" },
      { ordem: 3, codigo: "COEX", nome: "COEX - Contrato de Expectativas", descricao: "Criar COEX com cada colaborador", tipo: "implementacao", duracao_estimada_dias: 5, atividades_previstas: 5, tarefas_previstas: 10, link_acesso: "/COEXList" },
      { ordem: 4, codigo: "MAT", nome: "Diagnóstico de Maturidade dos Colaboradores", descricao: "Avaliar maturidade profissional da equipe", tipo: "diagnostico", duracao_estimada_dias: 3, atividades_previstas: 5, tarefas_previstas: 5, link_acesso: "/DiagnosticoMaturidade" },
      { ordem: 5, codigo: "DESM", nome: "Desdobramento de Metas por Colaborador", descricao: "Distribuir metas individuais baseadas no melhor mês", tipo: "implementacao", duracao_estimada_dias: 3, atividades_previstas: 3, tarefas_previstas: 10, link_acesso: "/DesdobramentoMeta" },
      { ordem: 6, codigo: "PROD", nome: "Diagnóstico Produção vs Salário", descricao: "Avaliar se colaboradores são produtivos", tipo: "diagnostico", duracao_estimada_dias: 2, atividades_previstas: 5, tarefas_previstas: 5, link_acesso: "/DiagnosticoProducao" },
      { ordem: 7, codigo: "REGDIA", nome: "Registro Diário de Produção", descricao: "Colaboradores registram métricas diariamente", tipo: "implementacao", duracao_estimada_dias: 30, atividades_previstas: 30, tarefas_previstas: 30, link_acesso: "/RegistroDiario" },
      { ordem: 8, codigo: "AUTOAV", nome: "Autoavaliações de Vendas/Comercial", descricao: "Equipe comercial faz autoavaliação", tipo: "diagnostico", duracao_estimada_dias: 2, atividades_previstas: 3, tarefas_previstas: 3, link_acesso: "/Autoavaliacoes" },
      { ordem: 9, codigo: "RA2", nome: "Reunião de Alavancagem 2", descricao: "Revisão de metas e ajustes de rota", tipo: "acompanhamento", duracao_estimada_dias: 1, atividades_previstas: 1, tarefas_previstas: 3, link_acesso: "/CronogramaConsultoria" }
    ]
  },
  3: {
    nome_fase: "Organização, Liderança e Processos",
    objetivo_geral: "Padronizar operações e desenvolver liderança",
    modulos: [
      { ordem: 1, codigo: "DISC", nome: "Teste DISC - Perfil Comportamental", descricao: "Aplicar DISC no proprietário e líderes", tipo: "diagnostico", duracao_estimada_dias: 2, atividades_previstas: 3, tarefas_previstas: 3, link_acesso: "/DiagnosticoDISC" },
      { ordem: 2, codigo: "MVV", nome: "Missão, Visão e Valores", descricao: "Definir cultura organizacional da oficina", tipo: "implementacao", duracao_estimada_dias: 3, atividades_previstas: 2, tarefas_previstas: 8, link_acesso: "/MissaoVisaoValores" },
      { ordem: 3, codigo: "CULT", nome: "Manual da Cultura Organizacional", descricao: "Criar manual com pilares e expectativas", tipo: "implementacao", duracao_estimada_dias: 5, atividades_previstas: 3, tarefas_previstas: 12, link_acesso: "/CulturaOrganizacional" },
      { ordem: 4, codigo: "MAPS", nome: "Mapeamento de Processos (MAPs)", descricao: "Documentar processos operacionais críticos", tipo: "implementacao", duracao_estimada_dias: 10, atividades_previstas: 8, tarefas_previstas: 20, link_acesso: "/MeusProcessos" },
      { ordem: 5, codigo: "RITUAL", nome: "Rituais de Aculturamento", descricao: "Implementar 34 rituais para fortalecer cultura", tipo: "implementacao", duracao_estimada_dias: 7, atividades_previstas: 5, tarefas_previstas: 15, link_acesso: "/RituaisAculturamento" },
      { ordem: 6, codigo: "TREN", nome: "Estruturar Treinamentos", descricao: "Criar módulos e aulas de capacitação", tipo: "implementacao", duracao_estimada_dias: 10, atividades_previstas: 5, tarefas_previstas: 15, link_acesso: "/GerenciarTreinamentos" },
      { ordem: 7, codigo: "DESEMP", nome: "Matriz de Desempenho", descricao: "Avaliar competências técnicas e emocionais", tipo: "diagnostico", duracao_estimada_dias: 3, atividades_previstas: 5, tarefas_previstas: 5, link_acesso: "/DiagnosticoDesempenho" },
      { ordem: 8, codigo: "CLIMA", nome: "Pesquisa de Clima Organizacional", descricao: "Medir satisfação e engajamento da equipe", tipo: "diagnostico", duracao_estimada_dias: 5, atividades_previstas: 2, tarefas_previstas: 8, link_acesso: "/PesquisaClima" },
      { ordem: 9, codigo: "RA3", nome: "Reunião de Alavancagem 3", descricao: "Balanço da fase e preparação para escala", tipo: "acompanhamento", duracao_estimada_dias: 1, atividades_previstas: 1, tarefas_previstas: 3, link_acesso: "/CronogramaConsultoria" }
    ]
  },
  4: {
    nome_fase: "Consolidação e Escala",
    objetivo_geral: "Preparar para expansão e novos mercados",
    modulos: [
      { ordem: 1, codigo: "RANKING", nome: "Análise de Rankings Nacional", descricao: "Comparar desempenho com outras oficinas", tipo: "diagnostico", duracao_estimada_dias: 1, atividades_previstas: 1, tarefas_previstas: 3, link_acesso: "/Dashboard" },
      { ordem: 2, codigo: "DASHOV", nome: "Análise de Dashboard Overview", descricao: "Revisar todos os indicadores principais", tipo: "diagnostico", duracao_estimada_dias: 1, atividades_previstas: 1, tarefas_previstas: 5, link_acesso: "/DashboardOverview" },
      { ordem: 3, codigo: "EXPAN", nome: "Planejamento de Expansão", descricao: "Estratégia para novas unidades ou franquias", tipo: "implementacao", duracao_estimada_dias: 10, atividades_previstas: 5, tarefas_previstas: 25, link_acesso: "/GestaoOficina" },
      { ordem: 4, codigo: "AUTOM", nome: "Automação e Eficiência", descricao: "Implementar automações e otimizar processos", tipo: "implementacao", duracao_estimada_dias: 15, atividades_previstas: 8, tarefas_previstas: 30, link_acesso: "/IAAnalytics" },
      { ordem: 5, codigo: "HMETRIC", nome: "Histórico de Metas - Análise Completa", descricao: "Revisão de evolução e conquistas", tipo: "diagnostico", duracao_estimada_dias: 2, atividades_previstas: 1, tarefas_previstas: 5, link_acesso: "/HistoricoMetas" },
      { ordem: 6, codigo: "CERT", nome: "Certificações e Conquistas", descricao: "Validar conquistas e obter certificações", tipo: "implementacao", duracao_estimada_dias: 5, atividades_previstas: 3, tarefas_previstas: 10, link_acesso: "/Gamificacao" },
      { ordem: 7, codigo: "RA4", nome: "Reunião de Alavancagem 4 - Celebração", descricao: "Celebração de resultados e planejamento futuro", tipo: "acompanhamento", duracao_estimada_dias: 1, atividades_previstas: 1, tarefas_previstas: 3, link_acesso: "/CronogramaConsultoria" }
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

    console.log(`[gerarCronogramaAutomatico][LEGACY] Fase ${fase_oficina} para ${workshop_id}`);

    const diagnosticosFase = await base44.asServiceRole.entities.Diagnostic.filter(
      { workshop_id },
      '-created_date',
      1
    );

    if (!diagnosticosFase || diagnosticosFase.length === 0) {
      return Response.json({
        error: 'Cliente precisa fazer o Diagnóstico de Fase primeiro',
        action_required: 'diagnostic'
      }, { status: 400 });
    }

    const diagnosticoAtual = diagnosticosFase[0];

    const diagEmpresarial = await base44.asServiceRole.entities.EntrepreneurDiagnostic.filter(
      { workshop_id },
      '-created_date',
      1
    );
    const perfilEmpresarial = diagEmpresarial[0]?.dominant_profile || null;

    const template = CRONOGRAMAS_POR_FASE[diagnosticoAtual.phase || fase_oficina];
    if (!template) {
      return Response.json({ error: 'Fase inválida' }, { status: 400 });
    }

    const dataInicio = data_inicio ? new Date(data_inicio) : new Date();
    let dataAtual = new Date(dataInicio);
    const progressos = [];

    for (const modulo of template.modulos) {
      const dataConclusaoPrevisto = new Date(dataAtual);
      dataConclusaoPrevisto.setDate(dataConclusaoPrevisto.getDate() + modulo.duracao_estimada_dias);

      const progresso = await base44.asServiceRole.entities.CronogramaProgresso.create({
        workshop_id,
        fase_oficina: diagnosticoAtual.phase,
        modulo_codigo: modulo.codigo,
        modulo_nome: modulo.nome,
        ordem: modulo.ordem,
        data_inicio_previsto: dataAtual.toISOString().split('T')[0],
        data_conclusao_previsto: dataConclusaoPrevisto.toISOString().split('T')[0],
        situacao: 'nao_iniciado',
        atividades_previstas: modulo.atividades_previstas,
        atividades_realizadas: 0,
        tarefas_solicitadas: modulo.tarefas_previstas,
        tarefas_entregues: 0,
        // Metadados de rastreabilidade do read model
        read_model_version: 'legacy_direct',
        source_engine: 'legacy_v0'
      });

      progressos.push(progresso);
      dataAtual = new Date(dataConclusaoPrevisto);
      dataAtual.setDate(dataAtual.getDate() + 1);
    }

    console.log(`[gerarCronogramaAutomatico][LEGACY] ${progressos.length} módulos criados`);

    return Response.json({
      success: true,
      _legacy_warning: 'Este endpoint é deprecated. Use generateFullCronograma + CronogramaImplementacao.',
      fase: diagnosticoAtual.phase,
      nome_fase: template.nome_fase,
      perfil_empresarial: perfilEmpresarial,
      total_modulos: progressos.length,
      progressos
    });

  } catch (error) {
    console.error('[gerarCronogramaAutomatico] Erro:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});