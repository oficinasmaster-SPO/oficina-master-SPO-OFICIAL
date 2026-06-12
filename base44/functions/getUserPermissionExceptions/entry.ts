import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const { user_id, workshop_id } = await req.json();

    if (!user_id) {
      return Response.json({ error: 'user_id is required' }, { status: 400 });
    }

    // W-NEW-2 FIX (2026-06-12): workshop_id obrigatório para garantir isolamento de tenant.
    // Sem workshop_id, a query retornaria exceções de todos os tenants do user_id — inaceitável.
    // Admins globais ainda precisam passar o workshop_id explicitamente para escopar a query.
    if (!workshop_id) {
      return Response.json({ error: 'workshop_id is required for tenant isolation' }, { status: 400 });
    }

    const exceptions = await base44.entities.UserPermissionException.filter({
      user_id,
      workshop_id,
      is_active: true
    });

    return Response.json({ exceptions: exceptions || [] });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});