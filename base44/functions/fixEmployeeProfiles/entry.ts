import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const JOB_ROLE_TO_PROFILE = {
  'socio': 'Sócio - Acesso Total',
  'diretor': 'Diretor - Gestão Estratégica',
  'gerente': 'Gerente - Gestão Operacional',
  'supervisor_loja': 'Supervisor - Operação e Equipe',
  'lider_tecnico': 'Líder Técnico - Coordenação Técnica',
  'financeiro': 'Financeiro - Gestão Financeira',
  'rh': 'RH - Gestão de Pessoas',
  'tecnico': 'Técnico - Execução e Produção',
  'comercial': 'Comercial - Vendas e Atendimento',
  'consultor_vendas': 'Vendedor - Atendimento ao Cliente',
  'marketing': 'Marketing - Comunicação e Marketing',
  'administrativo': 'Administrativo - Suporte e Administração',
  'acelerador': 'Acelerador',
  'consultor': 'Consultor',
  'mentor': 'Mentor',
  'outros': 'Colaborador Básico',
  'socio_interno': 'Sócio - Interno'
};

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

async function getOrCreateDefaultProfile(base44, jobRole) {
  const profileName = JOB_ROLE_TO_PROFILE[jobRole] || 'Colaborador Básico';
  const type = ['acelerador', 'consultor', 'mentor', 'socio_interno'].includes(jobRole) ? 'interno' : 'externo';
  
  const profiles = await base44.asServiceRole.entities.UserProfile.filter({ name: profileName });
  
  if (profiles && profiles.length > 0) {
    return profiles[0];
  }
  
  const newProfile = await base44.asServiceRole.entities.UserProfile.create({
    name: profileName,
    type: type,
    job_roles: [jobRole],
    status: 'ativo',
    description: `Perfil padrão para ${profileName}`,
    roles: getDefaultRoles(jobRole)
  });
  
  return newProfile;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (user?.role !== 'admin') {
    return Response.json({ error: 'Acesso restrito a administradores' }, { status: 403 });
  }

  try {
    const payload = await req.json().catch(() => ({}));
    const dryRun = payload.dry_run !== false; // Default true

    const [profiles, employees] = await Promise.all([
      base44.asServiceRole.entities.UserProfile.list(null, 1000),
      base44.asServiceRole.entities.Employee.list(null, 5000)
    ]);

    const profileMap = new Map(profiles.map(p => [p.id, p]));
    const report = {
      analyzed: employees.length,
      fixed_missing: 0,
      fixed_mismatched: 0,
      logs: []
    };

    for (const emp of employees) {
      if (!emp.job_role) continue;

      const profile = emp.profile_id ? profileMap.get(emp.profile_id) : null;
      let needsFix = false;
      let reason = '';

      if (!emp.profile_id || !profile) {
        needsFix = true;
        reason = 'missing_profile';
      } else if (profile.job_roles && profile.job_roles.length > 0 && !profile.job_roles.includes(emp.job_role)) {
        needsFix = true;
        reason = 'mismatched_job_role';
      }

      if (needsFix) {
        if (!dryRun) {
          try {
            const correctProfile = await getOrCreateDefaultProfile(base44, emp.job_role);
            
            await base44.asServiceRole.entities.Employee.update(emp.id, {
              profile_id: correctProfile.id
            });
            
            report.logs.push({
              employee_id: emp.id,
              name: emp.full_name,
              job_role: emp.job_role,
              old_profile_id: emp.profile_id,
              new_profile_id: correctProfile.id,
              new_profile_name: correctProfile.name,
              reason,
              status: 'fixed'
            });
            if (reason === 'missing_profile') report.fixed_missing++;
            if (reason === 'mismatched_job_role') report.fixed_mismatched++;
          } catch (e) {
            report.logs.push({ employee_id: emp.id, status: 'error', error: e.message });
          }
        } else {
          report.logs.push({
            employee_id: emp.id,
            name: emp.full_name,
            job_role: emp.job_role,
            current_profile_name: profile?.name || 'Inexistente',
            reason,
            status: 'would_fix'
          });
          if (reason === 'missing_profile') report.fixed_missing++;
          if (reason === 'mismatched_job_role') report.fixed_mismatched++;
        }
      }
    }

    return Response.json({ success: true, dryRun, report });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});