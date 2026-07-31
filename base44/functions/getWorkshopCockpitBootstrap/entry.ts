import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

/**
 * Bootstrap único do Cockpit do cliente.
 *
 * Substitui as 3 queries paralelas do CockpitPanelInner
 * (workshop-atas, workshop-concluidos, workshop-followups) por uma
 * única chamada HTTP. O servidor faz as leituras em paralelo
 * (Promise.all) e devolve um payload leve:
 *
 *   { workshop, followUps, atas, concluidos }
 *
 * - atas: resumo (ata_ia / ai_summary / pauta removidos) — ATA completa
 *   continua lazy (carregada sob demanda pelo VisualizarAtaModal).
 * - concluidos: pastedImages removidos — histórico completo continua lazy.
 * - followUps: FollowUpReminder do workshop (limit 100, -reminder_date).
 *
 * Isso corta o tráfego de seleção de ~3 reads HTTP para 1, mitigando a
 * cascata de 429 ao clicar em vários follow-ups na Central.
 */
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let workshopId = null;
    try {
      const body = await req.json();
      workshopId = body?.workshop_id || null;
    } catch (_) {}
    if (!workshopId || typeof workshopId !== 'string') {
      return Response.json({ error: 'workshop_id é obrigatório' }, { status: 400 });
    }

    // Leituras paralelas server-side (fail-open: erro isolado não derruba o bootstrap).
    const [workshopList, followUps, atas, concluidos] = await Promise.all([
      base44.entities.Workshop.filter({ id: workshopId }, undefined, 1).catch(() => []),
      base44.entities.FollowUpReminder.filter({ workshop_id: workshopId }, '-reminder_date', 100).catch(() => []),
      base44.entities.MeetingMinutes.filter({ workshop_id: workshopId }, '-meeting_date', 10).catch(() => []),
      base44.entities.FollowUpConcluido.filter({ workshop_id: workshopId }, '-completedAt', 20).catch(() => []),
    ]);

    const w = Array.isArray(workshopList) && workshopList[0] ? workshopList[0] : null;
    const workshop = w
      ? {
          id: w.id,
          name: w.name,
          planoAtual: w.planoAtual || null,
          segment: w.segment || null,
          segment_auto: w.segment_auto || null,
          status: w.status || null,
          consultor_principal_nome: w.consultor_principal_nome || null,
        }
      : null;

    // ATA resumo — remove campos pesados (ATA completa é lazy).
    const atasLight = (Array.isArray(atas) ? atas : []).map((a) => {
      if (!a) return a;
      const { ata_ia, ai_summary, pauta, topicos_discutidos, decisoes_tomadas, acoes_geradas, checklist_respostas, ...rest } = a;
      return rest;
    });

    // Concluídos — remove pastedImages (histórico completo é lazy).
    const concluidosLight = (Array.isArray(concluidos) ? concluidos : []).map((c) => {
      if (!c) return c;
      if (!c.pastedImages) return c;
      const { pastedImages, ...rest } = c;
      return rest;
    });

    return Response.json({
      workshop,
      followUps: Array.isArray(followUps) ? followUps : [],
      atas: atasLight,
      concluidos: concluidosLight,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}