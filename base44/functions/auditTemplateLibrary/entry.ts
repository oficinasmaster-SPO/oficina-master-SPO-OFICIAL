import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * auditTemplateLibrary - Backend audit logging para operações de templates
 * Registra create, update, duplicate de trilhas e sprints
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { actionType, details } = await req.json();

    if (!actionType || !details) {
      return Response.json(
        { error: 'actionType e details são obrigatórios' },
        { status: 400 }
      );
    }

    // Registrar log de auditoria
    const auditRecord = {
      action: actionType,
      performed_by: user.email,
      user_id: user.id,
      timestamp: new Date().toISOString(),
      details: JSON.stringify(details),
      module: 'TemplateLibrary',
    };

    // Salvar em entidade de auditoria (criar se não existir)
    try {
      await base44.asServiceRole.entities.AuditLog.create(auditRecord);
    } catch (error) {
      // Se entidade não existir, fazer log em console
      console.log('Audit log:', JSON.stringify(auditRecord));
    }

    return Response.json({
      success: true,
      message: `Auditoria registrada: ${actionType}`,
    });
  } catch (error) {
    console.error('Erro ao registrar auditoria:', error);
    return Response.json(
      { error: error.message || 'Erro ao registrar auditoria' },
      { status: 500 }
    );
  }
});