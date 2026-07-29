import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Etapa 2 — robustez do data layer: valida workshop_id ANTES de chamar o filter.
// Um ID inválido (ex.: "test-workshop-task1") faria o filter da plataforma lançar 500.
// Aqui retornamos [] controlado em vez de propagar o erro — defesa no próprio backend.
const OBJECTID_RE = /^[0-9a-f]{24}$/;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { workshop_id, filter = {}, sort = '-created_date', limit = 200 } = body;

    // Nunca propaga ID inválido ao data layer — retorna lista vazia controlada.
    if (!workshop_id || !OBJECTID_RE.test(String(workshop_id))) {
      return Response.json({
        documents: [],
        skipped: true,
        reason: 'workshop_id inválido ou ausente',
      });
    }

    const documents = await base44.entities.CompanyDocument.filter(
      { ...filter, workshop_id },
      sort,
      limit
    );

    return Response.json({
      documents: Array.isArray(documents) ? documents : [],
      skipped: false,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}