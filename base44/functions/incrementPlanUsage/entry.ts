import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Validar autenticação
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Não autenticado' } }, { status: 401 });
    }

    const body = await req.json();
    const { tenantId, resource, amount = 1 } = body;

    if (!tenantId || !resource) {
      return Response.json({ success: false, error: { code: 'MISSING_FIELDS', message: 'tenantId e resource são obrigatórios' } }, { status: 400 });
    }

    const usages = await base44.asServiceRole.entities.TenantUsage.filter({ tenant_id: tenantId, resource });
    
    let usage;
    let newCount = amount;
    if (usages && usages.length > 0) {
        usage = usages[0];
        newCount = usage.count + amount;
        await base44.asServiceRole.entities.TenantUsage.update(usage.id, {
            count: newCount
        });
    } else {
        usage = await base44.asServiceRole.entities.TenantUsage.create({
            tenant_id: tenantId,
            resource,
            count: newCount
        });
    }

    return Response.json({ success: true, data: { count: newCount } });
  } catch (error) {
    console.error("Erro ao incrementar uso do plano:", error);
    return Response.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Erro interno no servidor' } }, { status: 500 });
  }
});