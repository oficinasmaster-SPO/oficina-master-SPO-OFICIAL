import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * getWorkshopForOnboarding
 *
 * Retorna dados mínimos do workshop do usuário logado usando asServiceRole,
 * ignorando RLS. Necessário durante o onboarding pois o User pode ainda ter
 * role="user" (janela entre signup e o trigger createEmployeeOnUserCreation
 * propagar role="admin"), o que bloqueia Workshop.get() pelo token normal.
 *
 * Dados retornados: id, name, logo_url, consulting_firm_id
 * Nenhum dado sensível é exposto — apenas o suficiente para renderizar o CompletarPerfil.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Autenticar — garantir que é um usuário logado
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ success: false, error: 'Unauthenticated' }, { status: 401 });
    }

    // Resolver workshop_id: user → employee → fallback
    let workshopId = user.workshop_id || user.data?.workshop_id || null;

    if (!workshopId) {
      // Tentar pelo Employee vinculado
      try {
        const employees = await base44.asServiceRole.entities.Employee.filter({ user_id: user.id });
        if (employees?.length > 0) {
          workshopId = employees[0].workshop_id || null;
        }
      } catch (_) {
        // fallback silencioso
      }
    }

    if (!workshopId) {
      return Response.json({ success: false, error: 'No workshop linked to this user' });
    }

    // Buscar workshop via asServiceRole (ignora RLS)
    const ws = await base44.asServiceRole.entities.Workshop.get(workshopId);
    if (!ws) {
      return Response.json({ success: false, error: 'Workshop not found' });
    }

    return Response.json({
      success: true,
      workshop: {
        id: ws.id,
        name: ws.name,
        logo_url: ws.logo_url || null,
        consulting_firm_id: ws.consulting_firm_id || null,
      },
    });
  } catch (error) {
    console.error('[getWorkshopForOnboarding]', error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});
