import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Normaliza qualquer string de data para Date UTC.
 * Legado sem timezone ("2026-05-22T11:00:00") → assume BRT (UTC-3)
 */
function normalizeDateUTC(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (s.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(s)) return new Date(s);
  // Legado: sem TZ → assume BRT
  return new Date(s + '-03:00');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const dryRun = body.dry_run !== false; // default: dry_run = true (seguro)

    // Busca todos os atendimentos com status 'atrasado'
    const atrasados = await base44.asServiceRole.entities.ConsultoriaAtendimento.filter(
      { status: 'atrasado' },
      '-data_agendada',
      500
    );

    const agora = new Date();
    const fantasmas = [];
    const legítimos = [];

    for (const a of atrasados) {
      const raw = a.data_agendada;
      if (!raw) continue;

      const s = String(raw).trim();
      const temTZ = s.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(s);

      // Só interessa os legados (sem TZ)
      if (temTZ) {
        legítimos.push({ id: a.id, data_agendada: raw, motivo: 'tem_tz' });
        continue;
      }

      const dataUTC = normalizeDateUTC(raw);
      if (!dataUTC) continue;

      // Se a data corrigida (BRT) ainda é no futuro → é fantasma
      if (dataUTC > agora) {
        fantasmas.push({
          id: a.id,
          workshop_id: a.workshop_id,
          consultor_id: a.consultor_id,
          data_agendada: raw,
          data_agendada_corrigida_brt: dataUTC.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
          status_anterior: a.status,
          status_novo: a.status === 'atrasado' ? 'agendado' : a.status
        });
      } else {
        legítimos.push({ id: a.id, data_agendada: raw, motivo: 'realmente_atrasado' });
      }
    }

    let corrigidos = 0;
    const erros = [];

    if (!dryRun) {
      for (const f of fantasmas) {
        try {
          await base44.asServiceRole.entities.ConsultoriaAtendimento.update(f.id, {
            status: 'agendado'
          });
          corrigidos++;
        } catch (err) {
          erros.push({ id: f.id, erro: err.message });
        }
      }
    }

    return Response.json({
      dry_run: dryRun,
      total_atrasados_analisados: atrasados.length,
      fantasmas_encontrados: fantasmas.length,
      legitimamente_atrasados: legítimos.length,
      corrigidos: dryRun ? 0 : corrigidos,
      erros,
      detalhes_fantasmas: fantasmas,
      mensagem: dryRun
        ? `DRY RUN: ${fantasmas.length} atrasados fantasmas encontrados. Passe dry_run: false para aplicar a correção.`
        : `CORREÇÃO APLICADA: ${corrigidos} registros revertidos para 'agendado'.`
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});