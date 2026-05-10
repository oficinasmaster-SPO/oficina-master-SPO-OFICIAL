import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { periodo, consultor_id, workshop_id } = body;

    // Calcular intervalo de datas
    const agora = new Date();
    let dataInicio;
    if (periodo === 'semana') {
      dataInicio = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (periodo === 'trimestre') {
      dataInicio = new Date(agora.getTime() - 90 * 24 * 60 * 60 * 1000);
    } else if (periodo === 'ano') {
      dataInicio = new Date(agora.getFullYear(), 0, 1);
    } else {
      // mês (default)
      dataInicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
    }

    const dataInicioStr = dataInicio.toISOString();

    // Filtros base
    const atendimentoFilter = {
      status: { '$in': ['realizado', 'concluido'] },
      data_realizada: { '$gte': dataInicioStr }
    };
    if (consultor_id) atendimentoFilter.consultor_id = consultor_id;
    if (workshop_id) atendimentoFilter.workshop_id = workshop_id;

    const followupFilter = {
      dataContato: { '$gte': dataInicioStr.split('T')[0] }
    };
    if (consultor_id) followupFilter.consultor_id = consultor_id;
    if (workshop_id) followupFilter.workshop_id = workshop_id;

    // Buscar dados em paralelo
    const [atendimentos, followups, workshops] = await Promise.all([
      base44.asServiceRole.entities.ConsultoriaAtendimento.filter(atendimentoFilter, '-data_realizada', 2000),
      base44.asServiceRole.entities.FollowUpConcluido.filter(followupFilter, '-dataContato', 5000),
      base44.asServiceRole.entities.Workshop.list('name', 2000),
    ]);

    const workshopMap = {};
    workshops.forEach(w => { workshopMap[w.id] = w.name; });

    // Agregar por cliente
    const porClienteMap = {};
    atendimentos.forEach(a => {
      const wsId = a.workshop_id;
      if (!wsId) return;
      if (!porClienteMap[wsId]) {
        porClienteMap[wsId] = {
          workshop_id: wsId,
          workshop_name: workshopMap[wsId] || wsId,
          minutos_reuniao: 0,
          minutos_followup: 0,
          total_minutos: 0,
          reunioes_count: 0,
          followups_count: 0,
          ultimo_contato: null,
        };
      }
      const mins = a.duracao_real_minutos || a.duracao_minutos || 0;
      porClienteMap[wsId].minutos_reuniao += mins;
      porClienteMap[wsId].reunioes_count += 1;
      const dataAt = a.data_realizada || a.data_agendada;
      if (dataAt && (!porClienteMap[wsId].ultimo_contato || dataAt > porClienteMap[wsId].ultimo_contato)) {
        porClienteMap[wsId].ultimo_contato = dataAt;
      }
    });

    followups.forEach(f => {
      const wsId = f.workshop_id;
      if (!wsId) return;
      if (!porClienteMap[wsId]) {
        porClienteMap[wsId] = {
          workshop_id: wsId,
          workshop_name: workshopMap[wsId] || wsId,
          minutos_reuniao: 0,
          minutos_followup: 0,
          total_minutos: 0,
          reunioes_count: 0,
          followups_count: 0,
          ultimo_contato: null,
        };
      }
      const mins = f.duracao || 0;
      porClienteMap[wsId].minutos_followup += mins;
      porClienteMap[wsId].followups_count += 1;
      if (f.dataContato && (!porClienteMap[wsId].ultimo_contato || f.dataContato > porClienteMap[wsId].ultimo_contato)) {
        porClienteMap[wsId].ultimo_contato = f.dataContato;
      }
    });

    const por_cliente = Object.values(porClienteMap).map(c => ({
      ...c,
      total_minutos: c.minutos_reuniao + c.minutos_followup
    })).sort((a, b) => b.total_minutos - a.total_minutos);

    // Agregar por consultor
    const porConsultorMap = {};
    atendimentos.forEach(a => {
      const cId = a.consultor_id;
      if (!cId) return;
      if (!porConsultorMap[cId]) {
        porConsultorMap[cId] = {
          consultor_id: cId,
          consultor_nome: a.consultor_nome || cId,
          minutos_reuniao: 0,
          minutos_followup: 0,
          total_minutos: 0,
          clientes: new Set(),
          reunioes_count: 0,
          followups_count: 0,
        };
      }
      const mins = a.duracao_real_minutos || a.duracao_minutos || 0;
      porConsultorMap[cId].minutos_reuniao += mins;
      porConsultorMap[cId].reunioes_count += 1;
      if (a.workshop_id) porConsultorMap[cId].clientes.add(a.workshop_id);
    });

    followups.forEach(f => {
      const cId = f.consultor_id;
      if (!cId) return;
      if (!porConsultorMap[cId]) {
        porConsultorMap[cId] = {
          consultor_id: cId,
          consultor_nome: f.consultor_nome || cId,
          minutos_reuniao: 0,
          minutos_followup: 0,
          total_minutos: 0,
          clientes: new Set(),
          reunioes_count: 0,
          followups_count: 0,
        };
      }
      const mins = f.duracao || 0;
      porConsultorMap[cId].minutos_followup += mins;
      porConsultorMap[cId].followups_count += 1;
      if (f.workshop_id) porConsultorMap[cId].clientes.add(f.workshop_id);
    });

    const por_consultor = Object.values(porConsultorMap).map(c => ({
      consultor_id: c.consultor_id,
      consultor_nome: c.consultor_nome,
      minutos_reuniao: c.minutos_reuniao,
      minutos_followup: c.minutos_followup,
      total_minutos: c.minutos_reuniao + c.minutos_followup,
      clientes_count: c.clientes.size,
      reunioes_count: c.reunioes_count,
      followups_count: c.followups_count,
    })).sort((a, b) => b.total_minutos - a.total_minutos);

    const totais = {
      total_minutos: por_cliente.reduce((s, c) => s + c.total_minutos, 0),
      total_reunioes: por_cliente.reduce((s, c) => s + c.reunioes_count, 0),
      total_followups: por_cliente.reduce((s, c) => s + c.followups_count, 0),
      clientes_atendidos: por_cliente.length,
    };

    return Response.json({ por_cliente, por_consultor, totais });
  } catch (error) {
    console.error('[getTempoAnalytics]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});