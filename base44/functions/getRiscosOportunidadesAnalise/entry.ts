import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { workshop_id, consultor_id } = body;

    if (!workshop_id) {
      return Response.json({ error: 'workshop_id é obrigatório' }, { status: 400 });
    }

    const hoje = new Date();
    const hojeDate = hoje.toISOString().split('T')[0];
    const sete_dias_atras = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);
    const dois_dias_atras = new Date(hoje.getTime() - 2 * 24 * 60 * 60 * 1000);
    const dois_dias_atrasDate = dois_dias_atras.toISOString().split('T')[0];

    console.log('[getRiscosOportunidadesAnalise] Iniciando análise para workshop:', workshop_id);
    console.log('[getRiscosOportunidadesAnalise] Data de referência:', hojeDate);

    // 1. FollowUps Atrasados - CORRIGIDO: Comparar DATE, não DATETIME
    // FASE 2 FIX: reminder_date é DATE (YYYY-MM-DD), não DATETIME
    const followupsAtrasados = await base44.asServiceRole.entities.FollowUpReminder.filter({
     workshop_id,
     is_completed: false,
     reminder_date: { '$lt': hojeDate }  // hojeDate = YYYY-MM-DD format ✅
    }, '-reminder_date', 100);

    // 2. Contratos recém ativados sem ATA - CORRIGIDO: Usar DATE correto
    const contratos_recentes = await base44.asServiceRole.entities.Contract.filter({
      workshop_id,
      activated_at: { '$gte': dois_dias_atrasDate }
    }, '-activated_at', 100);

    const atas_por_workshop = await base44.asServiceRole.entities.MeetingMinutes.filter({
      workshop_id
    }, '-meeting_date', 500);

    // FASE 2 FIX BUG #2: Join correto com filter em vez de some()
    // Filtra ATAs do workshop, não por atendimento_id
    const contratos_sem_ata = contratos_recentes.filter(c => {
      const atas_do_contrato = atas_por_workshop.filter(a => 
        a.workshop_id === workshop_id &&
        new Date(a.meeting_date) >= new Date(c.activated_at)
      );
      return atas_do_contrato.length === 0;  // sem ATA vinculada ✅
    });
    
    console.log('[getRiscosOportunidadesAnalise] Contratos recentes:', contratos_recentes.length, 'Sem ATA:', contratos_sem_ata.length);

    // 3. Sem contatos 7+ dias
    const notificacoes_antigas = await base44.asServiceRole.entities.Notification.filter({
      workshop_id,
      created_date: { '$lte': sete_dias_atras.toISOString() }
    }, '-created_date', 100);

    // 4. Atendimentos Atrasados
    const atendimentos_atrasados = await base44.asServiceRole.entities.ConsultoriaAtendimento.filter({
      workshop_id,
      status: { '$in': ['atrasado', 'faltou'] }
    }, '-data_realizada', 100);

    // 5. Próximos Passos Atrasados - CORRIGIDO: Verificar entidade
    let proximos_atrasados = [];
    try {
      proximos_atrasados = await base44.asServiceRole.entities.ConsultoriaProximoPasso.filter({
        workshop_id,
        status: 'atrasado'
      }, '-prazo', 100);
      console.log('[getRiscosOportunidadesAnalise] Próximos passos atrasados:', proximos_atrasados.length);
    } catch (error) {
      console.warn('[getRiscosOportunidadesAnalise] Entidade ConsultoriaProximoPasso pode não existir:', error.message);
    }

    // 6. Cronograma Implementação Atrasado - CORRIGIDO: Usar DATE
    const cronograma_atrasado = await base44.asServiceRole.entities.CronogramaImplementacao.filter({
      workshop_id,
      status: { '$ne': 'concluido' },
      data_termino_previsto: { '$lt': hojeDate }
    }, '-data_termino_previsto', 100);

    // 7. Cronograma não iniciado - CORRIGIDO: Usar DATE
    const cronograma_nao_iniciado = await base44.asServiceRole.entities.CronogramaImplementacao.filter({
      workshop_id,
      status: 'a_fazer',
      data_termino_previsto: { '$lt': hojeDate }
    }, '-data_termino_previsto', 100);

    // 8. Sem colaboradores
    const employees = await base44.asServiceRole.entities.Employee.filter({
      workshop_id
    }, '-created_date', 1000);
    const tem_colaboradores = employees.length > 0;

    // CORRIGIDO BUG #3 e #4: Buscar nomes dos workshops de forma eficiente
    const workshopsMap = {};
    try {
      const wsResult = await base44.asServiceRole.entities.Workshop.filter(
        { id: workshop_id },
        '',
        1
      );
      if (wsResult && wsResult.length > 0) {
        workshopsMap[workshop_id] = wsResult[0].name || 'Workshop';
      } else {
        workshopsMap[workshop_id] = 'Workshop';
      }
      console.log('[getRiscosOportunidadesAnalise] Workshop name loaded:', workshopsMap[workshop_id]);
    } catch (error) {
      console.warn('[getRiscosOportunidadesAnalise] Erro ao carregar workshop:', error.message);
      workshopsMap[workshop_id] = 'Workshop';
    }

    const riscos = [
      {
        id: 'followup_atrasado',
        categoria: 'followup_atrasado',
        titulo: 'FollowUps Atrasados',
        descricao: 'Followups atrasados e urgentes da fila CRM',
        severidade: 'critico',
        total: followupsAtrasados.length,
        clientes: followupsAtrasados.map(f => ({
          id: f.workshop_id,
          name: workshopsMap[workshop_id] || 'Workshop',
          dias_atrasado: Math.floor((hoje - new Date(f.reminder_date)) / (1000 * 60 * 60 * 24)),
          detalhes: f.message
        }))
      },
      {
        id: 'onboarding_risco',
        categoria: 'onboarding_risco',
        titulo: 'Recém Cadastrados sem Reunião',
        descricao: 'Contratos ativados há menos de 2 dias sem ATA/reunião',
        severidade: 'critico',
        total: contratos_sem_ata.length,
        clientes: contratos_sem_ata.map(c => ({
          id: c.workshop_id,
          name: workshopsMap[workshop_id] || 'Workshop',
          dias_restantes: 2 - Math.floor((hoje - new Date(c.activated_at)) / (1000 * 60 * 60 * 24)),
          contrato_id: c.id
        }))
      },
      {
        id: 'atendimentos_atrasados',
        categoria: 'atendimentos_atrasados',
        titulo: 'Atendimentos Atrasados',
        descricao: 'Atendimentos que não foram realizados no prazo',
        severidade: 'alto',
        total: atendimentos_atrasados.length,
        clientes: atendimentos_atrasados.map(a => ({
          id: a.workshop_id,
          name: workshopsMap[workshop_id] || 'Workshop',
          tipo: a.tipo_atendimento,
          status: a.status,
          data_agendada: a.data_agendada
        }))
      },
      {
        id: 'proximos_passos_atrasados',
        categoria: 'proximos_passos_atrasados',
        titulo: 'Próximos Passos Atrasados',
        descricao: 'Tarefas de ação com prazo vencido',
        severidade: 'alto',
        total: proximos_atrasados.length,
        clientes: proximos_atrasados.map(p => ({
          id: p.workshop_id,
          name: workshopsMap[workshop_id] || 'Workshop',
          titulo: p.titulo,
          prazo: p.prazo,
          responsavel: p.responsavel_nome
        }))
      },
      {
        id: 'cronograma_atrasado',
        categoria: 'cronograma_atrasado',
        titulo: 'Cronograma Atrasado',
        descricao: 'Itens do cronograma com prazo vencido',
        severidade: 'alto',
        total: cronograma_atrasado.length,
        clientes: cronograma_atrasado.map(c => ({
          id: c.workshop_id,
          name: workshopsMap[workshop_id] || 'Workshop',
          item: c.item_nome,
          dias_atrasado: Math.floor((hoje - new Date(c.data_termino_previsto)) / (1000 * 60 * 60 * 24)),
          status: c.status
        }))
      },
      {
        id: 'cronograma_nao_iniciado',
        categoria: 'cronograma_nao_iniciado',
        titulo: 'Cronograma não Iniciado',
        descricao: 'Itens que não foram iniciados e estão atrasados',
        severidade: 'alto',
        total: cronograma_nao_iniciado.length,
        clientes: cronograma_nao_iniciado.map(c => ({
          id: c.workshop_id,
          name: workshopsMap[workshop_id] || 'Workshop',
          item: c.item_nome,
          dias_atrasado: Math.floor((hoje - new Date(c.data_termino_previsto)) / (1000 * 60 * 60 * 24)),
          tipo: c.item_tipo
        }))
      }
    ].filter(r => r.total > 0);

    const oportunidades = [
      {
        id: 'sem_colaboradores',
        categoria: 'sem_colaboradores',
        titulo: 'Cadastro de Colaboradores',
        descricao: 'Workshop sem colaboradores cadastrados - oportunidade de onboarding RH',
        total: tem_colaboradores ? 0 : 1,
        acao: 'Iniciar processo de cadastro de colaboradores'
      }
    ].filter(o => o.total > 0);

    const totalRiscos = riscos.reduce((sum, r) => sum + r.total, 0);
    const totalOportunidades = oportunidades.reduce((sum, o) => sum + o.total, 0);

    // FASE 4: VALIDAÇÃO - Garantir dados seguros antes do retorno
    console.log('[getRiscosOportunidadesAnalise] Riscos encontrados:', riscos.length);
    riscos.forEach((r, idx) => {
      console.log(`  [${idx}] ${r.titulo}: ${r.clientes?.length || 0} clientes`);
    });

    // Validar que riscos com dados realmente têm clientes
    const riscosValidos = riscos.filter(r => r.clientes && r.clientes.length > 0);
    const oportunidadesValidas = oportunidades.filter(o => o.total > 0);

    // Contar clientes ativos com planos (Contratos ativos)
    const clientesAtivosPlanos = await base44.asServiceRole.entities.Contract.filter({
      workshop_id,
      status: 'ativo'
    }, '', 1000);
    const totalClientesAtivos = clientesAtivosPlanos.length;

    // Calcular taxa de risco: (clientes_em_risco + oportunidades) / clientes_ativos = %
    const clientesEmRisco = riscosValidos.reduce((sum, r) => sum + (r.clientes?.length || 0), 0);
    const clientesComIssues = clientesEmRisco + oportunidadesValidas.length;
    const taxaRisco = totalClientesAtivos > 0 
      ? Math.round((clientesComIssues / totalClientesAtivos) * 100)
      : 0;

    console.log('[getRiscosOportunidadesAnalise] Validação final:', {
      riscos_totais: riscos.length,
      riscos_validos: riscosValidos.length,
      clientes_ativos: totalClientesAtivos,
      clientes_em_risco: clientesEmRisco,
      oportunidades: oportunidadesValidas.length,
      taxa_risco_pct: taxaRisco,
      status: 'success'
    });

    return Response.json({
      riscos: riscosValidos,
      oportunidades: oportunidadesValidas,
      estatisticas: {
        clientes_ativos_planos: totalClientesAtivos,
        clientes_em_risco: clientesEmRisco,
        total_oportunidades: oportunidadesValidas.length,
        taxa_risco_percentual: taxaRisco
      }
    });

  } catch (error) {
    console.error('Erro ao buscar riscos e oportunidades:', error);
    return Response.json({ 
      error: error.message,
      riscos: [],
      oportunidades: [],
      estatisticas: { total_riscos: 0, clientes_em_risco: 0, total_oportunidades: 0, taxa_risco: 'baixo' }
    }, { status: 500 });
  }
});