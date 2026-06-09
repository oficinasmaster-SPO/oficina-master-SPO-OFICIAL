/* eslint-disable no-undef */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Catálogo oficial de perfis RBAC
const OFFICIAL_PROFILES = [
  'Sócio - Acesso Total',
  'Diretor - Gestão Estratégica',
  'Gerente - Gestão Operacional',
  'Supervisor - Operação e Equipe',
  'Líder Técnico - Coordenação Técnica',
  'Técnico - Execução e Produção',
  'Financeiro - Controle Financeiro',
  'RH - Gestão de Pessoas',
  'Comercial - Vendas e Atendimento',
  'Vendedor - Atendimento ao Cliente',
  'Marketing - Comunicação e Marketing',
];

// Cargos operacionais que NÃO deveriam ter perfis de liderança
const OPERATIONAL_ROLES = [
  'tecnico',
  'eletricista',
  'funilaria_pintura',
  'lavador',
  'acelerador',
];

// Perfis de liderança (acesso a gestão, indicadores, financeiro)
const LEADERSHIP_PROFILES = [
  'Líder Técnico - Coordenação Técnica',
  'Supervisor - Operação e Equipe',
  'Gerente - Gestão Operacional',
  'Diretor - Gestão Estratégica',
  'Sócio - Acesso Total',
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    console.log('🔍 Auditoria de Mapeamento Cargo (RH) → Perfil (RBAC)');
    
    // Buscar todos os employees ativos
    const employees = await base44.asServiceRole.entities.Employee.filter({
      user_status: 'ativo'
    });
    
    console.log(`📊 Total de employees ativos: ${employees.length}`);
    
    // Buscar todos os perfis
    const allProfiles = await base44.asServiceRole.entities.UserProfile.filter({});
    const profileMap = new Map(allProfiles.map(p => [p.id, p]));
    
    // Estruturas de análise
    const mappingMap = new Map();
    const leadershipMismatches = [];
    const missingProfileMappings = [];
    
    // Analisar cada employee
    for (const employee of employees) {
      if (!employee.profile_id) {
        missingProfileMappings.push({
          employee_name: employee.full_name,
          email: employee.email,
          job_role: employee.job_role,
          workshop_id: employee.workshop_id,
        });
        continue;
      }
      
      const profile = profileMap.get(employee.profile_id);
      if (!profile) continue;
      
      const key = `${employee.job_role}|${profile.name}`;
      
      if (!mappingMap.has(key)) {
        mappingMap.set(key, {
          job_role: employee.job_role,
          profile_name: profile.name,
          count: 0,
          employees: [],
          workshops: new Set(),
        });
      }
      
      const mapping = mappingMap.get(key);
      mapping.count++;
      mapping.employees.push({
        employee_name: employee.full_name,
        email: employee.email,
        workshop_id: employee.workshop_id,
      });
      mapping.workshops.add(employee.workshop_id);
      
      // Detectar inconsistências: operacional com perfil de liderança
      if (OPERATIONAL_ROLES.includes(employee.job_role) && 
          LEADERSHIP_PROFILES.includes(profile.name)) {
        leadershipMismatches.push({
          employee_name: employee.full_name,
          email: employee.email,
          job_role: employee.job_role,
          profile_name: profile.name,
          workshop_id: employee.workshop_id,
          issue: 'Cargo operacional com perfil de liderança',
        });
      }
    }
    
    // Agrupar e ordenar
    const mappings = Array.from(mappingMap.values())
      .sort((a, b) => b.count - a.count);
    
    // Estatísticas por cargo
    const jobRoleStats = new Map();
    for (const mapping of mappings) {
      if (!jobRoleStats.has(mapping.job_role)) {
        jobRoleStats.set(mapping.job_role, {
          job_role: mapping.job_role,
          total: 0,
          profiles: [],
        });
      }
      const stat = jobRoleStats.get(mapping.job_role);
      stat.total += mapping.count;
      stat.profiles.push({
        profile_name: mapping.profile_name,
        count: mapping.count,
        percentage: ((mapping.count / employees.length) * 100).toFixed(1),
      });
    }
    
    // Estatísticas por perfil
    const profileStats = new Map();
    for (const mapping of mappings) {
      if (!profileStats.has(mapping.profile_name)) {
        profileStats.set(mapping.profile_name, {
          profile_name: mapping.profile_name,
          total: 0,
          job_roles: [],
        });
      }
      const stat = profileStats.get(mapping.profile_name);
      stat.total += mapping.count;
      stat.job_roles.push({
        job_role: mapping.job_role,
        count: mapping.count,
      });
    }
    
    console.log(`📋 Total de combinações únicas: ${mappings.length}`);
    console.log(`⚠️  Inconsistências detectadas: ${leadershipMismatches.length}`);
    console.log(`❌ Employees sem perfil: ${missingProfileMappings.length}`);
    
    return Response.json({
      summary: {
        total_employees: employees.length,
        unique_mappings: mappings.length,
        leadership_mismatches: leadershipMismatches.length,
        missing_profiles: missingProfileMappings.length,
      },
      mappings: mappings.map(m => ({
        job_role: m.job_role,
        profile_name: m.profile_name,
        count: m.count,
        workshops_count: m.workshops.size,
        sample_employees: m.employees.slice(0, 5),
      })),
      job_role_breakdown: Array.from(jobRoleStats.values())
        .sort((a, b) => b.total - a.total),
      profile_breakdown: Array.from(profileStats.values())
        .sort((a, b) => b.total - a.total),
      leadership_mismatches: leadershipMismatches.slice(0, 50),
      missing_profiles: missingProfileMappings.slice(0, 50),
      recommendations: {
        operational_with_leadership_access: leadershipMismatches.length,
        percentage_mismatched: ((leadershipMismatches.length / employees.length) * 100).toFixed(2),
      },
    });
    
  } catch (err) {
    console.error('Erro na auditoria:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});