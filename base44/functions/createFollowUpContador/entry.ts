import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Cria um novo FollowUpContador ou incrementa o número de sequência.
 * 
 * Modos:
 * 1. Automação entity ConsultoriaSprint.create → recebe payload {event, data}
 *    e cria o FU #1 automaticamente para o sprint/bucket recém criado.
 * 2. Chamada manual com action="create" → cria FU #1 para um origem específico.
 * 3. action="increment_weekly" → chamado pelo cron semanal para criar FU #N+1.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // ── Detectar se veio de automação de entity ──
    const isEntityAutomation = body.event && body.data;

    if (isEntityAutomation) {
      // Recebeu payload de entity automation (ConsultoriaSprint.create)
      const sprint = body.data;

      if (!sprint || !sprint.id) {
        return Response.json({ info: 'Payload sem dados de sprint' }, { status: 200 });
      }

      // Impede duplicata: verifica se já existe FU para este sprint
      const existentes = await base44.asServiceRole.entities.FollowUpContador.filter({
        origem_id: sprint.id,
        status: 'ativo'
      });

      if (existentes.length > 0) {
        console.log(`ℹ️ FU já existe para sprint ${sprint.id}`);
        return Response.json({ info: 'FU já existe', existente: existentes[0].id }, { status: 200 });
      }

      const today = new Date();
      // Calcula início da semana (segunda-feira)
      const weekStart = new Date(today);
      const dayOfWeek = today.getDay();
      const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      weekStart.setDate(today.getDate() + daysToMonday);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      // Determina origem_tipo baseado no mission_id (bucket usa mission_id="bucket")
      const origem_tipo = sprint.mission_id === 'bucket' ? 'bucket' : 'sprint';

      const fu = await base44.asServiceRole.entities.FollowUpContador.create({
        workshop_id: sprint.workshop_id,
        consultor_id: sprint.consultor_id,
        consultor_nome: null, // Será preenchido posteriormente se necessário
        origem_tipo,
        origem_id: sprint.id,
        origem_nome: sprint.title || sprint.mission_id || 'Sem título',
        numero_sequencia: 1,
        status: 'ativo',
        ciclo_numero_semana: 1,
        data_ciclo_inicio: weekStart.toISOString().split('T')[0],
        data_ciclo_fim: weekEnd.toISOString().split('T')[0],
        data_criacao: new Date().toISOString(),
        contexto: {},
        historico: [],
        consulting_firm_id: sprint.consulting_firm_id || null
      });

      console.log(`✅ FollowUpContador #1 criado (automação) para ${origem_tipo}: ${sprint.id}`);
      return Response.json({ success: true, fu_id: fu.id });
    }

    // ── Modo manual ──
    const {
      workshop_id,
      consultor_id,
      consultor_nome,
      origem_tipo,
      origem_id,
      origem_nome,
      action = 'create',
      consulting_firm_id
    } = body;

    // Validação básica
    if (!workshop_id || !origem_tipo || !origem_id) {
      return Response.json(
        { error: 'Campos obrigatórios: workshop_id, origem_tipo, origem_id' },
        { status: 400 }
      );
    }

    // Calcula semana atual (segunda → domingo)
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() + daysToMonday);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const weekStartStr = weekStart.toISOString().split('T')[0];

    // ── Lógica 1: CREATE (criar FU #1) ──
    if (action === 'create') {
      // Impede duplicata
      const existentes = await base44.asServiceRole.entities.FollowUpContador.filter({
        origem_id,
        status: 'ativo'
      });

      if (existentes.length > 0) {
        return Response.json({ info: 'FU já existe', existente: existentes[0].id }, { status: 200 });
      }

      const fu = await base44.asServiceRole.entities.FollowUpContador.create({
        workshop_id,
        consultor_id,
        consultor_nome,
        origem_tipo,
        origem_id,
        origem_nome,
        numero_sequencia: 1,
        status: 'ativo',
        ciclo_numero_semana: 1,
        data_ciclo_inicio: weekStartStr,
        data_ciclo_fim: weekEnd.toISOString().split('T')[0],
        data_criacao: new Date().toISOString(),
        contexto: {},
        historico: [],
        consulting_firm_id: consulting_firm_id || null
      });

      console.log(`✅ FollowUpContador #1 criado manualmente para ${origem_tipo}: ${origem_id}`);
      return Response.json({ success: true, fu });
    }

    // ── Lógica 2: INCREMENT_WEEKLY (Cron toda 2ª-feira) ──
    if (action === 'increment_weekly') {
      const ativos = await base44.asServiceRole.entities.FollowUpContador.filter({
        workshop_id,
        origem_id,
        status: 'ativo'
      }, '-data_criacao', 1);

      if (ativos.length === 0) {
        return Response.json(
          { error: 'Nenhum FollowUpContador ativo encontrado' },
          { status: 404 }
        );
      }

      const fuAtual = ativos[0];

      // Idempotência: se já tem FU desta semana, não cria outro
      if (fuAtual.data_ciclo_inicio === weekStartStr) {
        return Response.json({ info: 'FU desta semana já existe', fu_id: fuAtual.id }, { status: 200 });
      }

      const proximoNumero = fuAtual.numero_sequencia + 1;

      const novoFu = await base44.asServiceRole.entities.FollowUpContador.create({
        workshop_id,
        consultor_id: fuAtual.consultor_id,
        consultor_nome: fuAtual.consultor_nome,
        origem_tipo,
        origem_id,
        origem_nome: fuAtual.origem_nome,
        numero_sequencia: proximoNumero,
        status: 'ativo',
        ciclo_numero_semana: proximoNumero,
        data_ciclo_inicio: weekStartStr,
        data_ciclo_fim: weekEnd.toISOString().split('T')[0],
        data_criacao: new Date().toISOString(),
        contexto: {},
        historico: fuAtual.historico || [],
        consulting_firm_id: fuAtual.consulting_firm_id || null
      });

      console.log(`✅ FollowUpContador #${proximoNumero} criado (semanal) para ${origem_tipo}: ${origem_id}`);
      return Response.json({ success: true, fu: novoFu });
    }

    return Response.json({ error: 'Action inválida' }, { status: 400 });

  } catch (error) {
    console.error('❌ Erro em createFollowUpContador:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});