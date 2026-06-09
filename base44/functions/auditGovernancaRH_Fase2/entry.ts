/* eslint-disable no-undef */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Mapeamento de job_roles esperadas para cada perfil canônico
const EXPECTED_MAPPINGS = {
  'socio': ['Sócio', 'Sócio - Acesso Total'],
  'socio_interno': ['Sócio Interno', 'Sócio - Acesso Total'],
  'diretor': ['Diretor', 'Diretor - Gestão Estratégica'],
  'gerente': ['Gerente', 'Gerente - Gestão Operacional'],
  'supervisor_loja': ['Supervisor', 'Supervisor - Operação e Equipe'],
  'lider_tecnico': ['Líder Técnico', 'Líder Técnico - Coordenação Técnica'],
  'financeiro': ['Financeiro', 'Financeiro - Controle Financeiro'],
  'rh': ['RH', 'RH - Gestão de Pessoas'],
  'marketing': ['Marketing', 'Marketing - Comunicação e Marketing'],
  'comercial': ['Comercial', 'Comercial - Vendas e Atendimento'],
  'consultor_vendas': ['Comercial', 'Vendedor', 'Consultor de Vendas'],
  'tecnico': ['Técnico', 'Líder Técnico', 'Técnico - Operação'],
  'funilaria_pintura': ['Técnico', 'Líder Técnico'],
  'estoque': ['Estoquista', 'Auxiliar'],
  'motoboy': ['Motoboy', 'Auxiliar'],
  'lavador': ['Lavador', 'Auxiliar'],
  'administrativo': ['Administrativo', 'Auxiliar Administrativo'],
  'eletricista': ['Técnico', 'Líder Técnico', 'Eletricista'],
  'acelerador': ['Acelerador', 'Consultor'],
  'consultor': ['Consultor', 'Acelerador'],
};

// Job roles de liderança que não deveriam ter operadores
const LEADERSHIP_ROLES = ['socio', 'socio_interno', 'diretor', 'gerente', 'supervisor_loja', 'lider_tecnico', 'financeiro', 'rh', 'marketing'];

// Job roles operacionais
const OPERATIONAL_ROLES = ['tecnico', 'eletricista', 'funilaria_pintura', 'estoque', 'motoboy', 'lavador', 'administrativo', 'acelerador', 'consultor', 'consultor_vendas'];

// Perfis de liderança
const LEADERSHIP_PROFILES = ['Sócio', 'Diretor', 'Gerente', 'Supervisor', 'Líder Técnico'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    console.log('🔍 Iniciando Auditoria de Governança RH - Fase 2...');
    
    // Buscar todos os employees ativos
    const employees = await base44.asServiceRole.entities.Employee.filter({
      user_status: 'ativo'
    });
    
    console.log(`📊 Total de employees ativos: ${employees.length}`);
    
    // Buscar todos os perfis
    const allProfiles = await base44.asServiceRole.entities.UserProfile.filter({});
    const profileMap = new Map(allProfiles.map(p => [p.id, p]));
    
    const auditData = [];
    const combinationMap = new Map();
    
    // ETAPA 1: Coletar dados de cada employee
    for (const employee of employees) {
      if (!employee.profile_id) continue;
      
      const profile = profileMap.get(employee.profile_id);
      if (!profile) continue;
      
      const record = {
        employee_name: employee.full_name,
        employee_id: employee.id,
        email: employee.email,
        job_role: employee.job_role,
        profile_id: employee.profile_id,
        profile_name: profile.name,
        profile_job_roles: profile.job_roles || [],
        workshop_id: employee.workshop_id,
      };
      
      auditData.push(record);
      
      // ETAPA 2: Agrupar por combinação job_role + profile_name
      const key = `${employee.job_role}|${profile.name}`;
      if (!combinationMap.has(key)) {
        combinationMap.set(key, {
          job_role: employee.job_role,
          profile_name: profile.name,
          employees: [],
          count: 0,
        });
      }
      const combo = combinationMap.get(key);
      combo.employees.push(record);
      combo.count++;
    }
    
    // ETAPA 3: Ordenar combinações por count DESC
    const combinations = Array.from(combinationMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 50);
    
    console.log(`📋 Total de combinações únicas: ${combinationMap.size}`);
    console.log(`📊 Top 50 combinações analisadas`);
    
    // ETAPA 4, 5, 6: Classificar cada combinação
    const classification = {
      safe: [],
      review: [],
      critical: [],
    };
    
    for (const combo of combinations) {
      const jobRole = combo.job_role;
      const profileName = combo.profile_name;
      
      let status = 'safe';
      let reason = '';
      
      // ETAPA 6: CRITICAL - cargos de liderança com perfil errado
      if (jobRole === 'socio' && !profileName.includes('Sócio')) {
        status = 'critical';
        reason = 'Sócio deve ter perfil de Sócio';
      } else if (jobRole === 'diretor' && !profileName.includes('Diretor')) {
        status = 'critical';
        reason = 'Diretor deve ter perfil de Diretor';
      } else if (jobRole === 'gerente' && !profileName.includes('Gerente')) {
        status = 'critical';
        reason = 'Gerente deve ter perfil de Gerente';
      } else if (jobRole === 'supervisor_loja' && !profileName.includes('Supervisor')) {
        status = 'critical';
        reason = 'Supervisor deve ter perfil de Supervisor';
      } else if (jobRole === 'financeiro' && !profileName.includes('Financeiro')) {
        status = 'critical';
        reason = 'Financeiro deve ter perfil de Financeiro';
      } else if (jobRole === 'rh' && !profileName.includes('RH')) {
        status = 'critical';
        reason = 'RH deve ter perfil de RH';
      } 
      // ETAPA 5: REVIEW - operacionais com perfis de liderança
      else if (OPERATIONAL_ROLES.includes(jobRole) && LEADERSHIP_PROFILES.some(lp => profileName.includes(lp))) {
        status = 'review';
        reason = `Operacional (${jobRole}) com perfil de liderança (${profileName}) - validar se é intencional`;
      }
      // ETAPA 4: SAFE - mapeamentos esperados
      else {
        const expectedProfiles = EXPECTED_MAPPINGS[jobRole];
        if (expectedProfiles && expectedProfiles.some(ep => profileName.includes(ep))) {
          status = 'safe';
          reason = 'Mapeamento esperado';
        } else {
          status = 'safe';
          reason = 'Sem conflito evidente';
        }
      }
      
      combo.status = status;
      combo.reason = reason;
      
      classification[status].push(combo);
    }
    
    // ETAPA 7: Resumo
    const summary = {
      safe: classification.safe.reduce((acc, c) => acc + c.count, 0),
      review: classification.review.reduce((acc, c) => acc + c.count, 0),
      critical: classification.critical.reduce((acc, c) => acc + c.count, 0),
      total: auditData.length,
    };
    
    // ETAPA 8: Lista de CRITICAL
    const criticalList = classification.critical.flatMap(combo => 
      combo.employees.map(emp => ({
        employee_name: emp.employee_name,
        employee_id: emp.employee_id,
        email: emp.email,
        job_role: emp.job_role,
        profile_name: emp.profile_name,
        reason: combo.reason,
      }))
    );
    
    console.log(`✅ Auditoria concluída:`);
    console.log(`   SAFE: ${summary.safe}`);
    console.log(`   REVIEW: ${summary.review}`);
    console.log(`   CRITICAL: ${summary.critical}`);
    
    return Response.json({
      summary,
      top_combinations: combinations.map(c => ({
        job_role: c.job_role,
        profile_name: c.profile_name,
        employees_count: c.count,
        status: c.status,
        reason: c.reason,
      })),
      critical_cases: criticalList,
      classification_details: {
        safe_count: classification.safe.length,
        review_count: classification.review.length,
        critical_count: classification.critical.length,
      },
    });
    
  } catch (err) {
    console.error('Erro na auditoria:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});