import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

/**
 * Índice leve de FollowUpConcluido (últimos 30 dias, top 100 recentes).
 *
 * Substitui a leitura client-side de 2000 registros COMPLETOS (com
 * pastedImages/observacoes base64 — MBs por registro) por uma projeção
 * mínima server-side:
 *   { id, workshop_id, completedAt, created_date, followup_id, resultado }
 *
 * - Janela de 30 dias: cobre "não respondeu (30d)", "último contato" e
 *   "latest por workshop" dos clientes ativos. Oficinas cujo último
 *   contato foi há >30d já caem em "+7 dias sem contato" — sem precisar
 *   da data exata.
 * - Limit 100: teto seguro de memória do worker (registros completos
 *   com pastedImages não cabem em 200+). Os 100 concluídos mais recentes
 *   cobrem o conjunto ativo; concluídos além do top 100 são tratados pelos
 *   consumidores como "sem contato recente" (degradação graciosa).
 *
 * 1 await, ~3.7s — dentro do budget do worker.
 */
const LIMIT = 100;
const WINDOW_DAYS = 30;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const all = await base44.entities.FollowUpConcluido.filter(
      { completedAt: { $gte: since } },
      '-completedAt',
      LIMIT
    );

    // Projeção mínima: campos de indexação + display do FollowUpConcluidoRow.
    // pastedImages (base64, MBs) e observacoes (texto longo) ficam de fora —
    // não são usados pela listagem, apenas pelo drawer de detalhe (lazy).
    const index = (Array.isArray(all) ? all : []).map((c) => ({
      id: c.id,
      workshop_id: c.workshop_id || null,
      workshop_name: c.workshop_name || null,
      completedAt: c.completedAt || null,
      created_date: c.created_date || null,
      created_by: c.created_by || null,
      followup_id: c.followup_id || null,
      resultado: c.resultado || null,
      canal: c.canal || null,
      humor: c.humor || null,
      dataContato: c.dataContato || null,
      consultor_nome: c.consultor_nome || null,
      proxData: c.proxData || null,
      proxHora: c.proxHora || null,
    }));

    return Response.json({ index, windowDays: WINDOW_DAYS });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}