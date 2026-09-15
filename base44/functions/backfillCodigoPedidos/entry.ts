/**
 * backfillCodigoPedidos — Atribui código sequencial PED-xxxx aos pedidos
 * internos que ficaram sem código (o guard de workshop abortava a geração).
 *
 * One-shot de manutenção: calcula o max atual, avança sequencialmente com
 * verificação de colisão e grava via bulkUpdate (uma chamada, sem side
 * effects de workflow por registro).
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const pedidos = await base44.asServiceRole.entities.PedidoInterno.list('created_date', 5000);

    let maxNum = 0;
    const existentes = new Set();
    for (const p of pedidos || []) {
      if (p.codigo) {
        const m = p.codigo.match(/PED-(\d+)/);
        if (m) {
          const n = parseInt(m[1], 10);
          if (n > maxNum) maxNum = n;
        }
        existentes.add(p.codigo);
      }
    }

    const semCodigo = (pedidos || []).filter((p) => !p.codigo);
    const updates = [];
    let next = maxNum;
    for (const p of semCodigo) {
      let codigo = '';
      do {
        next += 1;
        codigo = `PED-${String(next).padStart(4, '0')}`;
      } while (existentes.has(codigo));
      existentes.add(codigo);
      updates.push({ id: p.id, codigo });
    }

    if (updates.length > 0) {
      await base44.asServiceRole.entities.PedidoInterno.bulkUpdate(updates);
    }

    return Response.json({
      ok: true,
      sem_codigo: semCodigo.length,
      atribuidos: updates.length,
      ultimo_codigo: updates.length > 0 ? updates[updates.length - 1].codigo : null,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}