import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Audita e corrige colaboradores de clientes (oficinas) que estão
 * com job_role interno (acelerador, consultor, mentor) ou
 * com perfil UserProfile do tipo 'interno'.
 * 
 * Modo dry_run=true apenas lista, dry_run=false corrige.
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Acesso restrito a administradores' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const dry_run = body.dry_run !== false; // default true (seguro)
  const fix_job_role = body.fix_job_role !== false; // corrigir job_role para 'outros'
  const fix_profile = body.fix_profile !== false;   // corrigir profile_id para null

  const INTERNAL_ROLES = ['acelerador', 'consultor', 'mentor'];

  // Buscar todos os colaboradores com job_role interno
  const allEmployees = await base44.asServiceRole.entities.Employee.list(null, 2000);
  
  // Buscar perfis internos
  const allProfiles = await base44.asServiceRole.entities.UserProfile.list(null, 500);
  const internalProfileIds = new Set(
    allProfiles.filter(p => p.type === 'interno' || p.type === 'sistema').map(p => p.id)
  );

  // Identificar problemas
  const withInternalRole = allEmployees.filter(e => INTERNAL_ROLES.includes(e.job_role));
  const withInternalProfile = allEmployees.filter(e => 
    e.user_profile_id && internalProfileIds.has(e.user_profile_id)
  );

  // Unir únicos
  const problemSet = new Map();
  for (const e of [...withInternalRole, ...withInternalProfile]) {
    if (!problemSet.has(e.id)) problemSet.set(e.id, e);
  }
  const problematic = Array.from(problemSet.values());

  const report = problematic.map(e => {
    const profileName = allProfiles.find(p => p.id === e.user_profile_id)?.name || null;
    return {
      id: e.id,
      full_name: e.full_name,
      workshop_id: e.workshop_id,
      job_role: e.job_role,
      profile_id: e.user_profile_id || null,
      profile_name: profileName,
      issue_job_role: INTERNAL_ROLES.includes(e.job_role),
      issue_profile: e.user_profile_id ? internalProfileIds.has(e.user_profile_id) : false,
    };
  });

  let fixed = 0;
  let errors = [];

  if (!dry_run) {
    for (const e of problematic) {
      const updates = {};
      if (fix_job_role && INTERNAL_ROLES.includes(e.job_role)) {
        updates.job_role = 'outros';
      }
      if (fix_profile && e.user_profile_id && internalProfileIds.has(e.user_profile_id)) {
        updates.user_profile_id = null;
        updates.profile_id = null;
      }
      if (Object.keys(updates).length > 0) {
        try {
          await base44.asServiceRole.entities.Employee.update(e.id, updates);
          fixed++;
        } catch (err) {
          errors.push({ id: e.id, name: e.full_name, error: err.message });
        }
      }
    }
  }

  return Response.json({
    dry_run,
    summary: {
      total_problematic: problematic.length,
      with_internal_role: withInternalRole.length,
      with_internal_profile: withInternalProfile.length,
      fixed: dry_run ? 0 : fixed,
      errors: errors.length,
    },
    internal_roles_checked: INTERNAL_ROLES,
    internal_profile_ids: Array.from(internalProfileIds),
    problematic_employees: report,
    errors,
  });
});