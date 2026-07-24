import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

/**
 * Function: distribuirFollowUpRoundRobin
 *
 * Distribui um FollowUpReminder para o consultor com menor SCORE,
 * onde SCORE = followups_ativos / (capacidade_base * fator_produtividade).
 *
 * Payload esperado:
 *   { followup_id: string, consulting_firm_id: string }
 *
 * Fluxo:
 *   1. Busca o FollowUpReminder pelo followup_id
 *   2. Se já tem consultor_principal_id → retorna (não redistribui)
 *   3. Busca todos os ConsultorCapacity ativos da mesma consulting_firm_id
 *   4. Calcula SCORE para cada consultor
 *   5. Atribui ao menor SCORE
 *   6. Atualiza FollowUpReminder (consultor_principal_*, atribuicao_automatica, peso_atribuicao)
 *   7. Incrementa followups_ativos no ConsultorCapacity do consultor escolhido
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { followup_id, consulting_firm_id } = body;

    if (!followup_id || !consulting_firm_id) {
      return Response.json({
        error: 'followup_id e consulting_firm_id são obrigatórios'
      }, { status: 400 });
    }

    // 1. Buscar o FollowUpReminder
    const reminder = await base44.asServiceRole.entities.FollowUpReminder.get(followup_id);
    if (!reminder) {
      return Response.json({ error: 'FollowUpReminder não encontrado' }, { status: 404 });
    }

    // 2. Se já tem consultor principal atribuído, não redistribui
    if (reminder.consultor_principal_id) {
      return Response.json({
        success: true,
        already_assigned: true,
        consultor_id: reminder.consultor_principal_id,
        consultor_nome: reminder.consultor_principal_nome,
        message: 'Follow-up já possui consultor principal atribuído'
      });
    }

    // 3. Buscar todos os ConsultorCapacity ativos da mesma consultoria
    const capacities = await base44.asServiceRole.entities.ConsultorCapacity.filter({
      consulting_firm_id: consulting_firm_id,
      ativo: true
    });

    if (!capacities || capacities.length === 0) {
      // Fallback: usar o consultor_id já presente no reminder (quem criou)
      const fallbackNome = reminder.consultor_nome || 'Consultor';
      await base44.asServiceRole.entities.FollowUpReminder.update(followup_id, {
        consultor_principal_id: reminder.consultor_id,
        consultor_principal_nome: fallbackNome,
        atribuicao_automatica: false,
        peso_atribuicao: 0
      });
      return Response.json({
        success: true,
        fallback: true,
        consultor_id: reminder.consultor_id,
        consultor_nome: fallbackNome,
        message: 'Nenhum ConsultorCapacity configurado — usado consultor_id do reminder'
      });
    }

    // 4. Calcular SCORE para cada consultor
    // SCORE = followups_ativos / (capacidade_base * fator_produtividade)
    let melhor = null;
    let menorScore = Infinity;
    const scores = [];

    for (const cap of capacities) {
      const capacidadeBase = cap.capacidade_base || 50;
      const fator = cap.fator_produtividade || 1.0;
      const ativos = cap.followups_ativos || 0;
      const capacidadeAjustada = capacidadeBase * fator;
      const score = ativos / capacidadeAjustada;

      scores.push({
        user_id: cap.user_id,
        consultor_nome: cap.consultor_nome,
        ativos,
        capacidade_base: capacidadeBase,
        fator_produtividade: fator,
        capacidade_ajustada: capacidadeAjustada,
        score: Math.round(score * 1000) / 1000
      });

      if (score < menorScore) {
        menorScore = score;
        melhor = cap;
      }
    }

    if (!melhor) {
      return Response.json({ error: 'Falha ao calcular melhor consultor' }, { status: 500 });
    }

    // 5. Atualizar o FollowUpReminder com o consultor escolhido
    const pesoArredondado = Math.round(menorScore * 1000) / 1000;
    await base44.asServiceRole.entities.FollowUpReminder.update(followup_id, {
      consultor_principal_id: melhor.user_id,
      consultor_principal_nome: melhor.consultor_nome || 'Consultor',
      atribuicao_automatica: true,
      peso_atribuicao: pesoArredondado
    });

    // 6. Incrementar followups_ativos no ConsultorCapacity
    await base44.asServiceRole.entities.ConsultorCapacity.update(melhor.id, {
      followups_ativos: (melhor.followups_ativos || 0) + 1
    });

    return Response.json({
      success: true,
      assigned: true,
      consultor_id: melhor.user_id,
      consultor_nome: melhor.consultor_nome,
      score: pesoArredondado,
      scores_avaliados: scores.sort((a, b) => a.score - b.score)
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});