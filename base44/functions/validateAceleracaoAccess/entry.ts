import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Backend RBAC para /controleaceleracao.
 * - Valida autenticação e permissões do usuário
 * - Retorna mapa de permissões granulares
 * - Registra log de acesso para auditoria
 *
 * Roles aceitos: admin, acelerador, consultor, mentor
 * Cada role tem um conjunto de permissões pré-definido.
 */

const ROLE_PERMISSIONS = {
  admin: {
    "aceleracao.view":          true,
    "aceleracao.atendimentos":  true,
    "aceleracao.create":        true,
    "aceleracao.edit":          true,
    "aceleracao.delete":        true,
    "aceleracao.mass_register": true,
    "aceleracao.cronograma":    true,
    "aceleracao.pedidos":       true,
    "aceleracao.agenda":        true,
    "aceleracao.sprints":       true,
    "aceleracao.filtros_todos":  true,
    "aceleracao.audit":         true,
  },
  acelerador: {
    "aceleracao.view":          true,
    "aceleracao.atendimentos":  true,
    "aceleracao.create":        true,
    "aceleracao.edit":          true,
    "aceleracao.delete":        false,
    "aceleracao.mass_register": true,
    "aceleracao.cronograma":    true,
    "aceleracao.pedidos":       true,
    "aceleracao.agenda":        true,
    "aceleracao.sprints":       true,
    "aceleracao.filtros_todos":  false,
    "aceleracao.audit":         false,
  },
  consultor: {
    "aceleracao.view":          true,
    "aceleracao.atendimentos":  true,
    "aceleracao.create":        true,
    "aceleracao.edit":          true,
    "aceleracao.delete":        false,
    "aceleracao.mass_register": false,
    "aceleracao.cronograma":    true,
    "aceleracao.pedidos":       false,
    "aceleracao.agenda":        true,
    "aceleracao.sprints":       false,
    "aceleracao.filtros_todos":  false,
    "aceleracao.audit":         false,
  },
  mentor: {
    "aceleracao.view":          true,
    "aceleracao.atendimentos":  true,
    "aceleracao.create":        false,
    "aceleracao.edit":          false,
    "aceleracao.delete":        false,
    "aceleracao.mass_register": false,
    "aceleracao.cronograma":    true,
    "aceleracao.pedidos":       false,
    "aceleracao.agenda":        true,
    "aceleracao.sprints":       true,
    "aceleracao.filtros_todos":  false,
    "aceleracao.audit":         false,
  },
};

function resolveEffectiveRole(user, employee) {
  // Admin override
  if (user.role === "admin") return "admin";

  // Employee-based role
  const jobRole = employee?.job_role;
  if (jobRole === "acelerador") return "acelerador";
  if (jobRole === "consultor") return "consultor";
  if (jobRole === "mentor") return "mentor";

  // Tipo vínculo interno pode ser consultor
  if (employee?.tipo_vinculo === "interno" && employee?.is_internal) return "consultor";

  return null; // no access
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch employee record for role resolution
    let employee = null;
    try {
      const employees = await base44.asServiceRole.entities.Employee.filter(
        { user_id: user.id },
        "-created_date",
        1
      );
      employee = employees?.[0] || null;
    } catch (_) {
      // No employee record — will rely on user.role
    }

    const effectiveRole = resolveEffectiveRole(user, employee);

    if (!effectiveRole) {
      // Log denied access
      try {
        await base44.asServiceRole.entities.SecurityLog.create({
          user_id: user.id,
          action: "aceleracao_access_denied",
          resource: "controle_aceleracao",
          details: JSON.stringify({
            user_role: user.role,
            job_role: employee?.job_role || "none",
            reason: "no_matching_role",
          }),
          ip_address: req.headers.get("x-forwarded-for") || "unknown",
          timestamp: new Date().toISOString(),
        });
      } catch (_) { /* best effort */ }

      return Response.json({
        authorized: false,
        permissions: {},
        effectiveRole: null,
        reason: "Acesso negado. Role insuficiente.",
      }, { status: 403 });
    }

    const permissions = ROLE_PERMISSIONS[effectiveRole] || {};

    // Log successful access
    try {
      await base44.asServiceRole.entities.SecurityLog.create({
        user_id: user.id,
        action: "aceleracao_access_granted",
        resource: "controle_aceleracao",
        details: JSON.stringify({
          effective_role: effectiveRole,
          user_role: user.role,
          job_role: employee?.job_role || "none",
          consulting_firm_id: employee?.consulting_firm_id || null,
        }),
        ip_address: req.headers.get("x-forwarded-for") || "unknown",
        timestamp: new Date().toISOString(),
      });
    } catch (_) { /* best effort */ }

    return Response.json({
      authorized: true,
      permissions,
      effectiveRole,
      userId: user.id,
      consultingFirmId: employee?.consulting_firm_id || null,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});