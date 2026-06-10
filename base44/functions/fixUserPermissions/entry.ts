/**
 * @deprecated
 * Legacy RBAC Migration Script — corrigia permissões de um usuário específico por email.
 * Não utilizar.
 * Mantido apenas para referência histórica.
 * Data de deprecação: 2026-06-10
 * Motivo: catálogo canônico RBAC consolidado — scripts de migração pontual não são mais necessários.
 *        O fluxo ativo é autoAssignProfile (entry.ts) que usa JOB_ROLE_TO_PROFILE_ID (IDs fixos).
 */

Deno.serve(async () => {
  throw new Error("DEPRECATED_FUNCTION: Esta função foi removida do catálogo RBAC ativo. Ver functions/deprecated/ para referência histórica.");
});

/* CÓDIGO ORIGINAL PRESERVADO ABAIXO */

/*
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { email } = await req.json();

    if (!email) {
      return Response.json({ error: 'Email é obrigatório' }, { status: 400 });
    }

    const me = await base44.auth.me();
    if (!me || me.role !== 'admin') {
      return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const users = await base44.entities.User.filter({ email });
    if (!users || users.length === 0) {
      return Response.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }
    const user = users[0];

    const employees = await base44.entities.Employee.filter({ email });
    if (!employees || employees.length === 0) {
      return Response.json({ error: 'Employee não encontrado' }, { status: 404 });
    }
    const employee = employees[0];

    const profiles = await base44.entities.UserProfile.filter({
      type: 'interno',
      status: 'ativo'
    });

    let techProfile = profiles.find(p =>
      p.job_roles?.includes('tecnico') ||
      p.name?.toLowerCase().includes('técnico') ||
      p.name?.toLowerCase().includes('tecnico')
    );

    if (!techProfile) {
      techProfile = await base44.entities.UserProfile.create({
        name: 'Técnico Operacional',
        type: 'interno',
        status: 'ativo',
        permission_type: 'job_role',
        job_roles: ['tecnico'],
        description: 'Perfil para técnicos de produção',
        roles: [
          'operations.view_qgp',
          'operations.manage_tasks',
          'operations.daily_log',
          'dashboard.view'
        ]
      });
    }

    await base44.entities.Employee.update(employee.id, {
      profile_id: techProfile.id,
      user_status: 'ativo',
      job_role: 'tecnico'
    });

    await base44.entities.User.update(user.id, {
      user_status: 'ativo'
    });

    return Response.json({
      success: true,
      message: 'Permissões corrigidas com sucesso',
      user: {
        email: user.email,
        name: user.full_name,
        status: 'ativo'
      },
      profile: {
        id: techProfile.id,
        name: techProfile.name
      }
    });

  } catch (error) {
    console.error('Erro:', error);
    return Response.json({
      error: error.message,
      details: error.toString()
    }, { status: 500 });
  }
});*/