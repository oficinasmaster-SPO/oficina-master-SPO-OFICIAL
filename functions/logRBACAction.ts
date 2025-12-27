import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Calcula diferenças detalhadas entre configurações de permissões
 */
function calculateDetailedDiff(before, after) {
  const diff = {
    added_permissions: [],
    removed_permissions: [],
    modified_job_roles: []
  };

  const beforeObj = before || {};
  const afterObj = after || {};

  // Iterar sobre job_roles
  const allJobRoles = new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]);

  for (const jobRole of allJobRoles) {
    const beforeRole = beforeObj[jobRole] || { resources: {}, modules: {} };
    const afterRole = afterObj[jobRole] || { resources: {}, modules: {} };

    const roleChanges = {
      job_role: jobRole,
      resources_changed: [],
      modules_changed: []
    };

    // Verificar mudanças em recursos
    const allResources = new Set([
      ...Object.keys(beforeRole.resources || {}),
      ...Object.keys(afterRole.resources || {})
    ]);

    for (const resource of allResources) {
      const beforeActions = beforeRole.resources?.[resource]?.actions || [];
      const afterActions = afterRole.resources?.[resource]?.actions || [];

      const added = afterActions.filter(a => !beforeActions.includes(a));
      const removed = beforeActions.filter(a => !afterActions.includes(a));

      if (added.length > 0 || removed.length > 0) {
        roleChanges.resources_changed.push({
          resource,
          added_actions: added,
          removed_actions: removed
        });

        added.forEach(action => {
          diff.added_permissions.push(`${jobRole}.${resource}.${action}`);
        });
        removed.forEach(action => {
          diff.removed_permissions.push(`${jobRole}.${resource}.${action}`);
        });
      }
    }

    // Verificar mudanças em módulos
    const allModules = new Set([
      ...Object.keys(beforeRole.modules || {}),
      ...Object.keys(afterRole.modules || {})
    ]);

    for (const module of allModules) {
      const beforeLevel = beforeRole.modules?.[module] || 'bloqueado';
      const afterLevel = afterRole.modules?.[module] || 'bloqueado';

      if (beforeLevel !== afterLevel) {
        roleChanges.modules_changed.push({
          module,
          before: beforeLevel,
          after: afterLevel
        });
      }
    }

    if (roleChanges.resources_changed.length > 0 || roleChanges.modules_changed.length > 0) {
      diff.modified_job_roles.push(roleChanges);
    }
  }

  return diff;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const {
      action_type,
      target_type,
      target_id,
      target_name,
      changes,
      affected_users_count,
      notes
    } = payload;

    // Capturar IP e User Agent
    const ip_address = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const user_agent = req.headers.get('user-agent') || 'unknown';

    // Processar mudanças detalhadas para granular_permission_updated
    let enhancedChanges = changes;
    if (action_type === 'granular_permission_updated' && changes) {
      enhancedChanges = {
        ...changes,
        detailed_diff: calculateDetailedDiff(changes.before, changes.after)
      };
    }

    // Criar log de auditoria
    const log = await base44.asServiceRole.entities.RBACLog.create({
      action_type,
      performed_by: user.email,
      performed_by_name: user.full_name || user.email,
      target_type,
      target_id: target_id || null,
      target_name: target_name || null,
      changes: enhancedChanges || null,
      affected_users_count: affected_users_count || 0,
      ip_address,
      user_agent,
      notes: notes || null
    });

    return Response.json({ success: true, log_id: log.id });
  } catch (error) {
    console.error('Error logging RBAC action:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});