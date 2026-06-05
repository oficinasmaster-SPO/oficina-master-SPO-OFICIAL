import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const { exception_id } = await req.json();

    if (!exception_id) {
      return Response.json({ error: 'exception_id is required' }, { status: 400 });
    }

    const exceptions = await base44.entities.UserPermissionException.filter({ id: exception_id });
    
    if (!exceptions || exceptions.length === 0) {
      return Response.json({ error: 'Exception not found' }, { status: 404 });
    }

    const exception = exceptions[0];

    // Soft delete: desativa em vez de excluir
    await base44.entities.UserPermissionException.update(exception_id, {
      is_active: false,
      audit_log: [
        ...(exception.audit_log || []),
        {
          changed_by: user.id,
          changed_by_email: user.email,
          changed_at: new Date().toISOString(),
          action: 'delete',
          field_changed: 'is_active',
          old_value: 'true',
          new_value: 'false',
          justification: 'Exceção removida por admin'
        }
      ]
    });

    return Response.json({ 
      success: true, 
      message: 'Exceção removida com sucesso' 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});