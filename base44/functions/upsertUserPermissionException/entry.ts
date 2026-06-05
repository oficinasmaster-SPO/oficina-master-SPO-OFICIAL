import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const { user_id, employee_id, workshop_id, permission_type, permission_key, permission_label, granted, justification, expires_at } = await req.json();

    if (!user_id || !permission_type || !permission_key) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verifica se já existe exceção para esta permissão
    const existing = await base44.entities.UserPermissionException.filter({
      user_id: user_id,
      permission_type: permission_type,
      permission_key: permission_key,
      is_active: true
    });

    if (existing && existing.length > 0) {
      // Atualiza existente
      const exception = existing[0];
      await base44.entities.UserPermissionException.update(exception.id, {
        granted: granted,
        justification: justification || exception.justification,
        expires_at: expires_at || exception.expires_at,
        audit_log: [
          ...(exception.audit_log || []),
          {
            changed_by: user.id,
            changed_by_email: user.email,
            changed_at: new Date().toISOString(),
            action: 'update',
            field_changed: 'granted',
            old_value: exception.granted.toString(),
            new_value: granted.toString(),
            justification: justification
          }
        ]
      });

      return Response.json({ 
        success: true, 
        message: 'Exceção atualizada com sucesso',
        id: exception.id 
      });
    } else {
      // Cria nova
      const newException = await base44.entities.UserPermissionException.create({
        user_id: user_id,
        employee_id: employee_id,
        workshop_id: workshop_id,
        permission_type: permission_type,
        permission_key: permission_key,
        permission_label: permission_label,
        granted: granted,
        justification: justification,
        expires_at: expires_at,
        is_active: true,
        created_by: user.email,
        created_by_name: user.full_name,
        audit_log: [{
          changed_by: user.id,
          changed_by_email: user.email,
          changed_at: new Date().toISOString(),
          action: 'create',
          field_changed: null,
          old_value: null,
          new_value: 'created',
          justification: justification
        }]
      });

      return Response.json({ 
        success: true, 
        message: 'Exceção criada com sucesso',
        id: newException.id 
      });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});