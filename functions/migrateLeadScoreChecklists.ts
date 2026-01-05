import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workshop_id } = await req.json();

    if (!workshop_id) {
      return Response.json({ error: 'workshop_id é obrigatório' }, { status: 400 });
    }

    // Buscar formulário Lead Score
    const forms = await base44.entities.InterviewForm.filter({
      workshop_id,
      is_lead_score_form: true
    });

    if (!forms || forms.length === 0) {
      return Response.json({ error: 'Formulário Lead Score não encontrado' }, { status: 404 });
    }

    const form = forms[0];
    const criteria = form.scoring_criteria || [];
    const created = [];

    // Migrar checklists dos critérios técnicos
    for (const criterion of criteria) {
      if (criterion.block === 'tecnico' && criterion.checklist_items && criterion.checklist_items.length > 0) {
        
        // Verificar se já existe
        const existing = await base44.entities.ChecklistTemplate.filter({
          workshop_id,
          template_name: criterion.criteria_name
        });

        if (existing && existing.length > 0) {
          continue; // Já existe, pular
        }

        // Mapear tipo de checklist
        let checklist_type = 'custom';
        if (criterion.criteria_name.toLowerCase().includes('conhecimento')) {
          checklist_type = 'conhecimento_tecnico';
        } else if (criterion.criteria_name.toLowerCase().includes('experiência') || criterion.criteria_name.toLowerCase().includes('pratica')) {
          checklist_type = 'experiencia_pratica';
        } else if (criterion.criteria_name.toLowerCase().includes('diagnóstico') || criterion.criteria_name.toLowerCase().includes('diagnostico')) {
          checklist_type = 'capacidade_diagnostico';
        }

        // Criar template
        const template = await base44.entities.ChecklistTemplate.create({
          workshop_id,
          template_name: criterion.criteria_name,
          job_role: 'tecnico',
          checklist_type,
          items: criterion.checklist_items,
          description: criterion.question || '',
          is_active: true
        });

        created.push(template);
      }
    }

    return Response.json({
      success: true,
      message: `${created.length} checklists migrados com sucesso`,
      templates: created
    });

  } catch (error) {
    console.error('Erro ao migrar checklists:', error);
    return Response.json({ 
      error: error.message || 'Erro interno do servidor' 
    }, { status: 500 });
  }
});