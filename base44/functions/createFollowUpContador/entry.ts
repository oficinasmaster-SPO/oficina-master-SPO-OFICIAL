import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Cria um novo FollowUpContador ou incrementa o número de sequência
 * Usado por automações de bucket.created / sprint.created e cron semanal
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { 
      workshop_id,
      consultor_id,
      consultor_nome,
      origem_tipo,      // "bucket" | "sprint"
      origem_id,
      origem_nome,
      action = "create" // "create" | "increment_weekly"
    } = await req.json();

    // Validação básica
    if (!workshop_id || !origem_tipo || !origem_id) {
      return Response.json(
        { error: 'Campos obrigatórios: workshop_id, origem_tipo, origem_id' },
        { status: 400 }
      );
    }

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── Lógica 1: CREATE (bucket.created ou sprint.created) ──
    if (action === 'create') {
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay() + 1); // Segunda
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6); // Domingo

      const fu = await base44.entities.FollowUpContador.create({
        workshop_id,
        consultor_id,
        consultor_nome,
        origem_tipo,
        origem_id,
        origem_nome,
        numero_sequencia: 1,
        status: 'ativo',
        ciclo_numero_semana: 1,
        data_ciclo_inicio: weekStart.toISOString().split('T')[0],
        data_ciclo_fim: weekEnd.toISOString().split('T')[0],
        data_criacao: new Date().toISOString(),
        contexto: {},
        historico: [],
        consulting_firm_id: user.data?.consulting_firm_id
      });

      console.log(`✅ FollowUpContador #1 criado para ${origem_tipo}: ${origem_id}`);
      return Response.json({ success: true, fu });
    }

    // ── Lógica 2: INCREMENT_WEEKLY (Cron toda 2ª-feira) ──
    if (action === 'increment_weekly') {
      // Busca o FU ativo mais recente
      const ativos = await base44.entities.FollowUpContador.filter({
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
      const proximoNumero = fuAtual.numero_sequencia + 1;

      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay() + 1);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const novoFu = await base44.entities.FollowUpContador.create({
        workshop_id,
        consultor_id: fuAtual.consultor_id,
        consultor_nome: fuAtual.consultor_nome,
        origem_tipo,
        origem_id,
        origem_nome: fuAtual.origem_nome,
        numero_sequencia: proximoNumero,
        status: 'ativo',
        ciclo_numero_semana: proximoNumero,
        data_ciclo_inicio: weekStart.toISOString().split('T')[0],
        data_ciclo_fim: weekEnd.toISOString().split('T')[0],
        data_criacao: new Date().toISOString(),
        contexto: {},
        historico: fuAtual.historico || [],
        consulting_firm_id: user.data?.consulting_firm_id
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