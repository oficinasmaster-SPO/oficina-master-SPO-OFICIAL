import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const now = new Date().toISOString();

    // Buscar convites expirados que ainda estão com status "enviado" ou "acessado"
    const expiredInvites = await base44.asServiceRole.entities.EmployeeInvite.filter({
      status: { $in: ['enviado', 'acessado'] }
    }, '-created_date', 200);

    const toExpire = (expiredInvites || []).filter(invite => 
      invite.expires_at && invite.expires_at < now
    );

    let updated = 0;
    let errors = 0;

    for (const invite of toExpire) {
      try {
        await base44.asServiceRole.entities.EmployeeInvite.update(invite.id, {
          status: 'expirado'
        });
        updated++;
      } catch (e) {
        console.error(`Erro ao expirar convite ${invite.id}:`, e.message);
        errors++;
      }
    }

    console.log(`✅ Convites expirados marcados: ${updated}, erros: ${errors}`);

    return Response.json({
      success: true,
      total_found: toExpire.length,
      updated,
      errors
    });

  } catch (error) {
    console.error('❌ Erro na limpeza de convites:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});