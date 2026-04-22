import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const STORAGE_KEY = 'sprint_templates_v1';

/**
 * Retorna os templates de sprint salvos na Consultoria Global.
 * Usado pelo SprintCreateForm para preencher as tarefas ao criar novos sprints.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await base44.asServiceRole.entities.SystemSetting.filter({ key: STORAGE_KEY });
    if (!settings || settings.length === 0 || !settings[0].value) {
      return Response.json({ templates: null });
    }

    const templates = JSON.parse(settings[0].value);
    return Response.json({ templates });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});