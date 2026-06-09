/* eslint-disable no-undef */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    console.log('🔍 Iniciando auditoria de governança RH...');
    
    // Buscar todos os employees ativos
    const employees = await base44.asServiceRole.entities.Employee.filter({
      user_status: 'ativo'
    });
    
    console.log(`📊 Total de employees ativos: ${employees.length}`);
    
    // Buscar todos os perfis de uma vez para evitar rate limit
    const allProfiles = await base44.asServiceRole.entities.UserProfile.filter({});
    const profileMap = new Map(allProfiles.map(p => [p.id, p]));
    
    console.log(`📋 Total de perfis carregados: ${allProfiles.length}`);
    
    const auditResults = {
      total_employees: employees.length,
      aligned: 0,
      misaligned: 0,
      missing_profile: 0,
      inconsistencies: [],
    };
    
    for (const employee of employees) {
      const issues = [];
      
      // Verificar se tem profile_id
      if (!employee.profile_id) {
        auditResults.missing_profile++;
        issues.push('❌ profile_id ausente');
      } else {
        const profile = profileMap.get(employee.profile_id);
        
        if (!profile) {
          issues.push(`❌ Perfil não encontrado: ${employee.profile_id}`);
        } else {
          // Verificar alinhamento job_role ↔ profile.job_roles
          const jobRole = employee.job_role;
          const profileJobRoles = profile.job_roles || [];
          
          if (!profileJobRoles.includes(jobRole)) {
            issues.push(
              `⚠️ job_role '${jobRole}' não está em profile.job_roles: [${profileJobRoles.join(', ')}]`
            );
          }
          
          // Verificar se o profile.type corresponde ao user_type do employee
          const userTypeExpected = employee.user_type === 'internal' ? 'interno' : 'externo';
          if (profile.type !== userTypeExpected) {
            issues.push(
              `⚠️ user_type '${employee.user_type}' não corresponde ao profile.type '${profile.type}'`
            );
          }
        }
      }
      
      if (issues.length === 0) {
        auditResults.aligned++;
      } else {
        auditResults.misaligned++;
        auditResults.inconsistencies.push({
          employee_id: employee.id,
          full_name: employee.full_name,
          email: employee.email,
          job_role: employee.job_role,
          profile_id: employee.profile_id,
          issues,
        });
      }
    }
    
    console.log(`✅ Auditoria concluída: ${auditResults.aligned} alinhados, ${auditResults.misaligned} inconsistências`);
    
    return Response.json({
      summary: {
        total: auditResults.total_employees,
        aligned: auditResults.aligned,
        misaligned: auditResults.misaligned,
        missing_profile: auditResults.missing_profile,
        alignment_percentage: ((auditResults.aligned / auditResults.total_employees) * 100).toFixed(2) + '%',
      },
      inconsistencies: auditResults.inconsistencies,
    });
    
  } catch (err) {
    console.error('Erro na auditoria:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});