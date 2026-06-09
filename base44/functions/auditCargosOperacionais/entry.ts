/* eslint-disable no-undef */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    console.log('🔍 Auditoria de Cargos Operacionais - Fase 2');
    
    // Cargos operacionais para auditar
    const operationalRoles = [
      'tecnico',
      'funilaria_pintura',
      'estoque',
      'administrativo',
      'motoboy',
      'lavador',
      'acelerador',
      'consultor',
      'mentor',
      'outros'
    ];
    
    // Buscar todos os employees com esses job_roles
    const employees = await base44.asServiceRole.entities.Employee.filter({
      job_role: { $in: operationalRoles },
      user_status: 'ativo'
    });
    
    console.log(`📊 Total de employees operacionais: ${employees.length}`);
    
    // Buscar todos os perfis para mapeamento
    const allProfiles = await base44.asServiceRole.entities.UserProfile.filter({});
    const profileMap = new Map(allProfiles.map(p => [p.id, p]));
    
    // Buscar oficinas para contexto
    const workshopIds = [...new Set(employees.map(e => e.workshop_id))];
    const workshops = await base44.asServiceRole.entities.Workshop.filter({
      id: { $in: workshopIds }
    });
    const workshopMap = new Map(workshops.map(w => [w.id, w]));
    
    // Agrupar por job_role
    const roleGroups = new Map();
    
    for (const employee of employees) {
      const jobRole = employee.job_role;
      
      if (!roleGroups.has(jobRole)) {
        roleGroups.set(jobRole, {
          job_role: jobRole,
          total_count: 0,
          profiles_used: new Map(),
          workshops: new Set(),
          employees: []
        });
      }
      
      const group = roleGroups.get(jobRole);
      const profile = profileMap.get(employee.profile_id);
      const profileName = profile?.name || 'N/A';
      
      // Contar perfis usados
      if (!group.profiles_used.has(profileName)) {
        group.profiles_used.set(profileName, 0);
      }
      group.profiles_used.set(profileName, group.profiles_used.get(profileName) + 1);
      
      group.total_count++;
      group.workshops.add(employee.workshop_id);
      
      group.employees.push({
        employee_name: employee.full_name,
        email: employee.email,
        workshop_name: workshopMap.get(employee.workshop_id)?.name || 'N/A',
        profile_name: profileName,
        profile_id: employee.profile_id,
        job_role: employee.job_role
      });
    }
    
    // Analisar inconsistências
    const inconsistencies = [];
    const roleProfileMapping = new Map();
    
    for (const [jobRole, group] of roleGroups.entries()) {
      const profileCounts = Array.from(group.profiles_used.entries());
      
      // Se usa múltiplos perfis diferentes, é uma inconsistência
      if (profileCounts.length > 1) {
        inconsistencies.push({
          job_role: jobRole,
          issue: 'Múltiplos perfis utilizados',
          profiles: profileCounts.map(([profile, count]) => ({
            profile_name: profile,
            count
          })),
          recommendation: `Definir perfil canônico único para ${jobRole}`
        });
      }
      
      // Detectar perfil mais comum
      const mostCommonProfile = profileCounts.sort((a, b) => b[1] - a[1])[0];
      roleProfileMapping.set(jobRole, {
        profile_name: mostCommonProfile[0],
        count: mostCommonProfile[1],
        total: group.total_count,
        percentage: ((mostCommonProfile[1] / group.total_count) * 100).toFixed(1)
      });
      
      // WARNING: Técnicos com perfil de liderança
      if (jobRole === 'tecnico') {
        const leadershipProfiles = profileCounts.filter(([profile]) => 
          profile.includes('Líder') || profile.includes('Lider') || profile.includes('Coordenação')
        );
        
        if (leadershipProfiles.length > 0) {
          inconsistencies.push({
            job_role: 'tecnico',
            issue: 'Técnicos com perfil de liderança',
            profiles: leadershipProfiles.map(([profile, count]) => ({
              profile_name: profile,
              count
            })),
            recommendation: 'Técnicos devem usar "Técnico - Execução e Produção", não perfil de liderança'
          });
        }
      }
    }
    
    // Converter para serialização
    const auditResults = Array.from(roleGroups.entries()).map(([jobRole, group]) => ({
      job_role: jobRole,
      total_employees: group.total_count,
      total_workshops: group.workshops.size,
      profiles_distribution: Array.from(group.profiles_used.entries()).map(([profile, count]) => ({
        profile_name: profile,
        count,
        percentage: ((count / group.total_count) * 100).toFixed(1) + '%'
      })),
      most_common_profile: roleProfileMapping.get(jobRole),
      sample_employees: group.employees.slice(0, 5) // Primeiros 5 como amostra
    }));
    
    console.log(`📋 Cargos auditados: ${roleGroups.size}`);
    console.log(`⚠️  Inconsistências encontradas: ${inconsistencies.length}`);
    
    return Response.json({
      summary: {
        total_operational_employees: employees.length,
        total_job_roles: roleGroups.size,
        inconsistencies_found: inconsistencies.length,
      },
      audit_results: auditResults,
      inconsistencies: inconsistencies,
      recommendations: {
        immediate_action: inconsistencies.map(i => i.recommendation),
        next_steps: [
          'Definir perfil canônico para cada cargo operacional',
          'Criar perfil "Técnico - Execução e Produção" se não existir',
          'Executar backfill após definição da tabela canônica',
          'Implementar autoAssignProfile com validações'
        ]
      }
    });
    
  } catch (err) {
    console.error('Erro na auditoria:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});