/**
 * @deprecated
 * Legacy RBAC Migration Script — corrigia roles e type de UserProfile com base em job_role.
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
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function getDefaultRoles(jobRole) {
  switch(jobRole) {
    case 'socio':
    case 'socio_interno':
    case 'diretor':
      return [
        'dashboard.view', 'dashboard.edit', 'dashboard.export',
        'workshop.view', 'workshop.edit', 'workshop.manage_goals',
        'employees.view', 'employees.create', 'employees.edit', 'employees.delete', 'employees.manage_permissions', 'employees.cdc', 'employees.climate', 'employees.feedback',
        'financeiro.view', 'financeiro.edit', 'financeiro.approve', 'financeiro.export',
        'diagnostics.view', 'diagnostics.create', 'diagnostics.ai_access',
        'processes.view', 'processes.create', 'processes.edit', 'processes.checklists', 'documents.view', 'documents.upload',
        'culture.view', 'culture.edit', 'culture.manage_rituals',
        'training.view', 'training.create', 'training.manage', 'training.evaluate',
        'operations.view_qgp', 'operations.manage_tasks', 'operations.daily_log', 'operations.technician_qgp',
        'goals.view', 'goals.create', 'actions.view',
        'analytics.view',
        'clients.view',
        'acceleration.view'
      ];

    case 'gerente':
    case 'supervisor_loja':
      return [
        'dashboard.view', 'dashboard.edit',
        'workshop.view', 'workshop.manage_goals',
        'employees.view', 'employees.create', 'employees.edit', 'employees.cdc', 'employees.climate', 'employees.feedback',
        'processes.view', 'processes.checklists', 'documents.view', 'documents.upload',
        'operations.view_qgp', 'operations.manage_tasks', 'operations.daily_log',
        'goals.view', 'goals.create', 'actions.view',
        'clients.view'
      ];

    case 'lider_tecnico':
      return [
        'dashboard.view',
        'employees.view',
        'operations.view_qgp', 'operations.manage_tasks', 'operations.daily_log',
        'processes.view', 'documents.view'
      ];

    case 'financeiro':
      return [
        'dashboard.view',
        'financeiro.view', 'financeiro.edit', 'financeiro.export',
        'documents.view', 'documents.upload'
      ];

    case 'rh':
      return [
        'dashboard.view',
        'employees.view', 'employees.create', 'employees.edit', 'employees.cdc', 'employees.climate', 'employees.feedback',
        'training.view', 'training.create', 'training.manage', 'training.evaluate',
        'culture.view', 'culture.edit', 'culture.manage_rituals',
        'documents.view', 'documents.upload'
      ];

    default:
      return ['dashboard.view', 'operations.view_qgp', 'operations.daily_log'];
  }
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (user?.role !== 'admin') {
    return Response.json({ error: 'Acesso restrito a administradores' }, { status: 403 });
  }

  try {
    const profiles = await base44.asServiceRole.entities.UserProfile.list(null, 1000);

    let updatedCount = 0;
    const log = [];

    for (const profile of profiles) {
      if (profile.job_roles && profile.job_roles.length > 0) {
        const primaryJobRole = profile.job_roles[0];
        const expectedType = ['acelerador', 'consultor', 'mentor', 'socio_interno'].includes(primaryJobRole) ? 'interno' : 'externo';
        const expectedRoles = getDefaultRoles(primaryJobRole);

        const currentRoles = profile.roles || [];
        const hasLegacyRoles = currentRoles.some(r => r.includes('_') && !r.includes('.'));

        if (hasLegacyRoles || currentRoles.length === 0 || profile.type !== expectedType || currentRoles.length !== expectedRoles.length) {

          await base44.asServiceRole.entities.UserProfile.update(profile.id, {
            roles: expectedRoles,
            type: expectedType
          });

          updatedCount++;
          log.push({
            profile_name: profile.name,
            job_role: primaryJobRole,
            old_type: profile.type,
            new_type: expectedType,
            fixed: true
          });
        }
      }
    }

    return Response.json({
      success: true,
      message: `Foram analisados ${profiles.length} perfis. ${updatedCount} foram atualizados com sucesso.`,
      log
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});*/