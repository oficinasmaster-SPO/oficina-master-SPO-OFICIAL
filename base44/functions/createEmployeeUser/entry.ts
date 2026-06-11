/**
 * createEmployeeUser — thin wrapper sobre createUserDirectly
 *
 * Histórico de problemas eliminados:
 *  - Race condition: Employee criado antes do User → user_id nunca vinculado (timing 800ms)
 *  - profile_id inválido: 'workshopId.01' → 404 silencioso → permissions=[]
 *
 * Solução: delegar 100% para createUserDirectly, que:
 *  1. inviteUser() primeiro → obtém inviteResult.id
 *  2. Cria Employee com user_id já preenchido (sem corrida)
 *  3. Envia email HTML via Resend + fallback Core.SendEmail
 *  4. Resolve profile_id canônico via UserProfile.filter()
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await req.json();
    const { name, email, telefone, position, area, job_role, profile_id, workshop_id, role = "user" } = body;

    if (!name || !email || !workshop_id) {
      return Response.json({ error: 'Nome, email e oficina obrigatórios' }, { status: 400 });
    }

    if (!['user', 'admin'].includes(role)) {
      return Response.json({ error: 'Role deve ser "user" ou "admin"' }, { status: 400 });
    }

    // Delega para createUserDirectly (lógica canônica sem race condition)
    const result = await base44.functions.invoke('createUserDirectly', {
      name,
      email,
      telefone,
      position,
      area,
      job_role,
      profile_id,
      workshop_id,
      role
    });

    const data = result?.data;

    if (!data?.success) {
      const err = data?.error;
      // Mapear códigos de erro do createUserDirectly para o formato legado
      if (err?.code === 'BUSINESS_RULE_VIOLATION') {
        return Response.json({ error: err.message }, { status: 400 });
      }
      if (err?.code === 'FORBIDDEN') {
        return Response.json({ error: err.message }, { status: 403 });
      }
      return Response.json({
        success: false,
        error: err?.message || 'Erro ao criar colaborador'
      }, { status: 500 });
    }

    // Retornar no formato legado esperado pelos callers existentes
    return Response.json({
      success: true,
      message: 'Colaborador criado! Email de convite enviado.',
      email: data.data?.email,
      employee_id: data.data?.employee_id,
      invite_link: data.data?.invite_link,
      email_status: 'enviado'
    });

  } catch (error) {
    console.error("❌ Erro createEmployeeUser:", error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});