import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

/**
 * Function: atualizarConsultorCapacity
 *
 * Roda semanalmente (via automação scheduled) para recalcular o
 * fator_produtividade de cada ConsultorCapacity baseado em:
 *
 *   fator_produtividade = followups_concluidos_30d / 30
 *
 * Também recalcula followups_ativos (contagem real de FUs pendentes
 * atribuídos ao consultor) para manter o cache sincronizado.
 *
 * Payload opcional:
 *   { consulting_firm_id?: string }  — se omitido, processa todas as consultorias
 *
 * Esta é uma função admin-only (executada via automação scheduled).
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { consulting_firm_id } = body;

    // Buscar todos os ConsultorCapacity ativos (filtrar por consultoria se fornecido)
    const filter = consulting_firm_id
      ? { consulting_firm_id, ativo: true }
      : { ativo: true };

    const capacities = await base44.asServiceRole.entities.ConsultorCapacity.filter(filter);

    if (!capacities || capacities.length === 0) {
      return Response.json({
        success: true,
        message: 'Nenhum ConsultorCapacity ativo encontrado',
        processados: 0
      });
    }

    // Janela de 30 dias atrás
    const trintaDiasAtras = new Date();
    trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

    const agora = new Date().toISOString();
    const resultados = [];

    for (const cap of capacities) {
      // 1. Contar follow-ups concluídos nos últimos 30 dias para este consultor
      //    (usando consultor_principal_id para refletir a distribuição round-robin)
      const concluidos30d = await base44.asServiceRole.entities.FollowUpReminder.filter({
        consultor_principal_id: cap.user_id,
        is_completed: true,
        completed_at: { $gte: trintaDiasAtras.toISOString() }
      });

      const countConcluidos = concluidos30d.length;

      // 2. Contar follow-ups ativos (não concluídos) atribuídos a este consultor
      const ativos = await base44.asServiceRole.entities.FollowUpReminder.filter({
        consultor_principal_id: cap.user_id,
        is_completed: false
      });

      const countAtivos = ativos.length;

      // 3. Calcular novo fator_produtividade
      //    fator = concluidos_30d / 30
      //    Mínimo de 0.1 para evitar divisão por zero no SCORE do round-robin
      //    Máximo de 3.0 para evitar que um consultor super-produtivo
      //    "absorva" toda a carga e sature
      let novoFator = countConcluidos / 30;
      novoFator = Math.max(0.1, Math.min(3.0, novoFator));
      novoFator = Math.round(novoFator * 100) / 100;

      // 4. Atualizar ConsultorCapacity
      await base44.asServiceRole.entities.ConsultorCapacity.update(cap.id, {
        fator_produtividade: novoFator,
        followups_concluidos_30d: countConcluidos,
        followups_ativos: countAtivos,
        ultima_atualizacao: agora
      });

      resultados.push({
        user_id: cap.user_id,
        consultor_nome: cap.consultor_nome,
        concluidos_30d: countConcluidos,
        ativos_recalculado: countAtivos,
        fator_anterior: cap.fator_produtividade,
        fator_novo: novoFator
      });
    }

    return Response.json({
      success: true,
      processados: capacities.length,
      resultados
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});