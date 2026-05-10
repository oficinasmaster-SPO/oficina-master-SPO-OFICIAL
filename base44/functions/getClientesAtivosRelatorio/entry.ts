import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Buscar workshops ativos com plano ativo ou trial
    const workshops = await base44.asServiceRole.entities.Workshop.filter(
      { status: 'ativo', planStatus: { '$in': ['active', 'trial'] } },
      'name', 1000
    );

    if (!workshops || workshops.length === 0) {
      return Response.json({ clientes: [], total: 0 });
    }

    const workshopIds = workshops.map(w => w.id);

    // Buscar contratos ativos em paralelo com atendimentos realizados
    const [contratos, atendimentos, userSessions] = await Promise.all([
      base44.asServiceRole.entities.Contract.filter(
        { workshop_id: { '$in': workshopIds }, status: { '$in': ['ativo', 'efetivado', 'pagamento_confirmado', 'assinado'] } },
        '-activated_at', 2000
      ).catch(() => []),
      base44.asServiceRole.entities.ConsultoriaAtendimento.filter(
        { workshop_id: { '$in': workshopIds }, status: { '$in': ['realizado', 'concluido'] } },
        '-data_realizada', 5000
      ).catch(() => []),
      base44.asServiceRole.entities.UserSession.filter(
        { workshop_id: { '$in': workshopIds } },
        '-login_time', 2000
      ).catch(() => [])
    ]);

    // Mapear contratos por workshop (pegar o mais recente ativo)
    const contratosPorWorkshop = {};
    for (const c of contratos) {
      if (!c.workshop_id) continue;
      if (!contratosPorWorkshop[c.workshop_id]) {
        contratosPorWorkshop[c.workshop_id] = c;
      }
    }

    // Mapear atendimentos por workshop
    const atendimentosPorWorkshop = {};
    for (const a of atendimentos) {
      if (!a.workshop_id) continue;
      if (!atendimentosPorWorkshop[a.workshop_id]) {
        atendimentosPorWorkshop[a.workshop_id] = [];
      }
      atendimentosPorWorkshop[a.workshop_id].push(a);
    }

    // Mapear último acesso por workshop
    const ultimoAcessoPorWorkshop = {};
    for (const s of userSessions) {
      const wsId = s.workshop_id;
      if (!wsId) continue;
      const dataSession = s.login_time ? new Date(s.login_time) : null;
      if (!dataSession) continue;
      if (!ultimoAcessoPorWorkshop[wsId] || dataSession > new Date(ultimoAcessoPorWorkshop[wsId])) {
        ultimoAcessoPorWorkshop[wsId] = s.login_time;
      }
    }

    // Montar relatório
    const clientes = workshops.map(ws => {
      const contrato = contratosPorWorkshop[ws.id] || null;
      const atendsDoWorkshop = atendimentosPorWorkshop[ws.id] || [];
      const qtdAtendimentos = atendsDoWorkshop.length;

      // Calcular tempo total de consultoria (soma duracao_real_minutos)
      const totalMinutos = atendsDoWorkshop.reduce((acc, a) => {
        return acc + (a.duracao_real_minutos || a.duracao_minutos || 0);
      }, 0);
      const totalHoras = Math.round(totalMinutos / 60 * 10) / 10;

      // Data início e fim do contrato
      const dataInicio = contrato?.start_date || contrato?.activated_at || null;
      const dataFim = contrato?.end_date || null;

      // Faturamento melhor mês histórico
      const melhorMes = ws.best_month_history?.revenue_total || null;

      return {
        id: ws.id,
        nome_empresa: ws.name || '',
        razao_social: ws.razao_social || '',
        nome_responsavel: ws.owner_id || '', // será resolvido abaixo se possível
        telefone: ws.telefone || '',
        email: ws.email || '',
        cnpj: ws.cnpj || '',
        plano: ws.planoAtual || 'FREE',
        plan_status: ws.planStatus || '',
        cidade: ws.city || '',
        estado: ws.state || '',
        rua: ws.endereco_rua || '',
        numero: ws.endereco_numero || '',
        bairro: ws.endereco_bairro || '',
        endereco_completo: ws.endereco_completo || '',
        faturamento_melhor_mes: melhorMes,
        data_inicio_contrato: dataInicio,
        data_fim_contrato: dataFim,
        consultor_nome: contrato?.consultor_nome || '',
        qtd_atendimentos_realizados: qtdAtendimentos,
        tempo_consultoria_horas: totalHoras,
        ultimo_acesso: ultimoAcessoPorWorkshop[ws.id] || null,
        segment: ws.segment_auto || ws.segment || ''
      };
    }).sort((a, b) => a.nome_empresa.localeCompare(b.nome_empresa));

    return Response.json({ clientes, total: clientes.length });

  } catch (error) {
    console.error('[getClientesAtivosRelatorio] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});