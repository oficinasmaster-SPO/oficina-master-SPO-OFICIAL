import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

/**
 * auditarIntegridadeReferencial — Auditoria diária de integridade referencial
 * do domínio de follow-up (Sprint 3 — P3). Report-only: NÃO deleta nada.
 *
 * Foco: entidades que já causaram 404/500 por workshop_id inválido:
 *   FollowUpReminder, TarefaBacklog, PedidoInterno, FollowUpConcluido, BacklogChecklistItem
 *
 * Verifica:
 *   1. workshop_id inexistente (formato inválido ou não presente no set de Workshop)
 *   2. refs cross-entity pendentes: origem_pedido_id→PedidoInterno, origem_tarefa_id→TarefaBacklog,
 *      BacklogChecklistItem.task_id→TarefaBacklog
 *
 * Ação: grava SystemEventLog (event_type=INTEGRITY_AUDIT) + envia e-mail digest aos admins.
 * Roda via automação agendada (service-role, sem auth.me — padrão das funções scheduled do app).
 */

// Volume bornado: 1 página por entidade (~6 reads leves) para não estourar o
// teto de tráfego de leitura da plataforma. Auditoria diária incremental —
// órfãos antigos já tratados por backfills pontuais (Sprint 2B).
const MAX_PER_ENTITY = 500;
const PAGE_SIZE = 500;

// Paginação determinística por deslocamento (dedupe por id protege contra
// registros que compartilham o mesmo created_date).
async function listAll(sr, entityName, limit = MAX_PER_ENTITY) {
  const byId = new Map();
  let skip = 0;
  while (byId.size < limit) {
    const batch = await sr.entities[entityName].filter({}, 'created_date', PAGE_SIZE, skip);
    if (!batch || batch.length === 0) break;
    let novos = 0;
    for (const rec of batch) {
      if (rec && !byId.has(rec.id)) { byId.set(rec.id, rec); novos++; }
    }
    if (batch.length < PAGE_SIZE || novos === 0) break;
    skip += batch.length;
  }
  return [...byId.values()];
}

const DETAIL_CAP = 50;

function sliceDetails(arr, mapFn) {
  return arr.slice(0, DETAIL_CAP).map(mapFn);
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;

    // 1. Conjuntos de IDs válidos (Workshop + entidades de origem)
    const [workshops, tarefas, pedidos] = await Promise.all([
      listAll(sr, 'Workshop'),
      listAll(sr, 'TarefaBacklog'),
      listAll(sr, 'PedidoInterno'),
    ]);
    const workshopIds = new Set(workshops.map(w => w.id));
    const tarefaIds = new Set(tarefas.map(t => t.id));
    const pedidoIds = new Set(pedidos.map(p => p.id));

    // workshop_id órfão: ausente OU não existe no set de Workshops válidos
    const isOrphanWorkshop = (wid) => !wid || !workshopIds.has(wid);

    const resumo = {};
    const detalhes = {};

    // 2. FollowUpReminder
    const reminders = await listAll(sr, 'FollowUpReminder');
    {
      const orfWs = reminders.filter(r => isOrphanWorkshop(r.workshop_id));
      const refPedido = reminders.filter(r => r.origem_pedido_id && !pedidoIds.has(r.origem_pedido_id));
      const refTarefa = reminders.filter(r => r.origem_tarefa_id && !tarefaIds.has(r.origem_tarefa_id));
      resumo['FollowUpReminder'] = {
        total: reminders.length,
        orfaos_workshop: orfWs.length,
        ref_pedido_pendente: refPedido.length,
        ref_tarefa_pendente: refTarefa.length,
      };
      detalhes['FollowUpReminder'] = {
        orfaos_workshop: sliceDetails(orfWs, r => ({ id: r.id, workshop_id: r.workshop_id, workshop_name: r.workshop_name, origin_type: r.origin_type })),
        ref_pedido_pendente: sliceDetails(refPedido, r => ({ id: r.id, origem_pedido_id: r.origem_pedido_id })),
        ref_tarefa_pendente: sliceDetails(refTarefa, r => ({ id: r.id, origem_tarefa_id: r.origem_tarefa_id })),
      };
    }

    // 3. TarefaBacklog (já carregada — usada como set + auditada)
    {
      const orfWs = tarefas.filter(t => isOrphanWorkshop(t.workshop_id));
      resumo['TarefaBacklog'] = { total: tarefas.length, orfaos_workshop: orfWs.length };
      detalhes['TarefaBacklog'] = {
        orfaos_workshop: sliceDetails(orfWs, t => ({ id: t.id, workshop_id: t.workshop_id, titulo: t.titulo })),
      };
    }

    // 4. PedidoInterno (já carregado — set + auditado)
    {
      const orfWs = pedidos.filter(p => isOrphanWorkshop(p.workshop_id));
      resumo['PedidoInterno'] = { total: pedidos.length, orfaos_workshop: orfWs.length };
      detalhes['PedidoInterno'] = {
        orfaos_workshop: sliceDetails(orfWs, p => ({ id: p.id, workshop_id: p.workshop_id, titulo: p.titulo, codigo: p.codigo })),
      };
    }

    // 5. FollowUpConcluido
    const concluidos = await listAll(sr, 'FollowUpConcluido');
    {
      const orfWs = concluidos.filter(c => isOrphanWorkshop(c.workshop_id));
      resumo['FollowUpConcluido'] = { total: concluidos.length, orfaos_workshop: orfWs.length };
      detalhes['FollowUpConcluido'] = {
        orfaos_workshop: sliceDetails(orfWs, c => ({ id: c.id, workshop_id: c.workshop_id })),
      };
    }

    // 6. BacklogChecklistItem
    const checklist = await listAll(sr, 'BacklogChecklistItem');
    {
      const orfWs = checklist.filter(c => isOrphanWorkshop(c.workshop_id));
      const refTarefa = checklist.filter(c => c.task_id && !tarefaIds.has(c.task_id));
      resumo['BacklogChecklistItem'] = {
        total: checklist.length,
        orfaos_workshop: orfWs.length,
        ref_tarefa_pendente: refTarefa.length,
      };
      detalhes['BacklogChecklistItem'] = {
        orfaos_workshop: sliceDetails(orfWs, c => ({ id: c.id, workshop_id: c.workshop_id, task_id: c.task_id })),
        ref_tarefa_pendente: sliceDetails(refTarefa, c => ({ id: c.id, task_id: c.task_id })),
      };
    }

    const totalOrfaos = Object.values(resumo).reduce((s, e) =>
      s + (e.orfaos_workshop || 0) + (e.ref_pedido_pendente || 0) + (e.ref_tarefa_pendente || 0), 0);
    const executado_em = new Date().toISOString();

    // 7. SystemEventLog (auditoria)
    try {
      await sr.entities.SystemEventLog.create({
        event_type: 'INTEGRITY_AUDIT',
        entity_type: 'IntegrityAudit',
        triggered_by: 'scheduled',
        status: totalOrfaos === 0 ? 'success' : 'warning',
        timestamp: executado_em,
        details: { resumo, total_orfaos: totalOrfaos },
      });
    } catch (_) {}

    // 8. E-mail digest diário aos admins (usuários registrados)
    let emails_enviados = 0;
    try {
      const admins = await sr.entities.User.filter({ role: 'admin' }, null, 100);
      const linhas = Object.entries(resumo).map(([ent, r]) => {
        let linha = `${ent}: ${r.total} registros | ${r.orfaos_workshop || 0} órfão(s) de workshop`;
        if (r.ref_pedido_pendente) linha += ` | ${r.ref_pedido_pendente} ref. pedido pendente`;
        if (r.ref_tarefa_pendente) linha += ` | ${r.ref_tarefa_pendente} ref. tarefa pendente`;
        return linha;
      }).join('\n');
      const body =
        `Auditoria de Integridade Referencial — ${executado_em}\n\n` +
        `Total de inconsistências detectadas: ${totalOrfaos}\n\n` +
        `Resumo por entidade:\n${linhas}\n\n` +
        `Detalhes (até ${DETAIL_CAP} por entidade) registrados no SystemEventLog (event_type=INTEGRITY_AUDIT).\n\n` +
        `Política atual: REPORT-ONLY (nenhum registro foi deletado).\n` +
        `— Auditoria automática diária da Central de Follow-up`;
      const subject = `[Oficinas Master] Auditoria de Integridade — ${totalOrfaos} inconsistência(s)`;
      for (const a of admins) {
        if (!a.email) continue;
        try {
          await sr.integrations.Core.SendEmail({ to: a.email, subject, body });
          emails_enviados++;
        } catch (_) {}
      }
    } catch (_) {}

    return Response.json({
      executado_em,
      total_orfaos: totalOrfaos,
      resumo,
      detalhes,
      emails_enviados,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}