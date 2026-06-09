/* eslint-disable no-undef */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    console.log('🔍 Auditoria dos Sócios - Validação de Qualidade de Dados');
    
    // ETAPA 1: Buscar todos os Employees ativos com job_role = socio
    const socios = await base44.asServiceRole.entities.Employee.filter({
      job_role: 'socio',
      user_status: 'ativo'
    });
    
    console.log(`📊 Total de sócios encontrados: ${socios.length}`);
    
    // Buscar dados das oficinas e perfis
    const workshopIds = [...new Set(socios.map(s => s.workshop_id))];
    const workshops = await base44.asServiceRole.entities.Workshop.filter({
      id: { $in: workshopIds }
    });
    const workshopMap = new Map(workshops.map(w => [w.id, w]));
    
    const allProfiles = await base44.asServiceRole.entities.UserProfile.filter({});
    const profileMap = new Map(allProfiles.map(p => [p.id, p]));
    
    // Coletar dados detalhados
    const sociosData = socios.map(s => ({
      employee_name: s.full_name,
      email: s.email,
      workshop_id: s.workshop_id,
      workshop_name: workshopMap.get(s.workshop_id)?.name || 'N/A',
      job_role: s.job_role,
      profile_id: s.profile_id,
      profile_name: profileMap.get(s.profile_id)?.name || 'N/A',
      hire_date: s.hire_date,
      created_date: s.created_date,
    }));
    
    // ETAPA 2: Agrupar por oficina
    const workshopGroups = new Map();
    for (const socio of socios) {
      const workshop = workshopMap.get(socio.workshop_id);
      if (!workshop) continue;
      
      if (!workshopGroups.has(socio.workshop_id)) {
        workshopGroups.set(socio.workshop_id, {
          workshop_id: socio.workshop_id,
          workshop_name: workshop.name,
          city: workshop.city,
          state: workshop.state,
          socios: [],
          count: 0,
        });
      }
      
      const group = workshopGroups.get(socio.workshop_id);
      group.socios.push({
        employee_name: socio.full_name,
        email: socio.email,
        profile_name: profileMap.get(socio.profile_id)?.name || 'N/A',
        hire_date: socio.hire_date,
      });
      group.count++;
    }
    
    // ETAPA 3: Ordenar por count DESC
    const workshopRanking = Array.from(workshopGroups.values())
      .sort((a, b) => b.count - a.count);
    
    // ETAPA 4: Estatísticas
    const stats = {
      total_socios: socios.length,
      total_workshops: workshopGroups.size,
      workshops_with_more_than_3: workshopRanking.filter(w => w.count > 3).length,
      workshops_with_more_than_5: workshopRanking.filter(w => w.count > 5).length,
      workshops_with_more_than_10: workshopRanking.filter(w => w.count > 10).length,
      max_socios_in_single_workshop: workshopRanking.length > 0 ? workshopRanking[0].count : 0,
    };
    
    // Identificar possíveis problemas
    const potentialIssues = [];
    
    // Oficinas com muitos sócios
    for (const workshop of workshopRanking) {
      if (workshop.count > 5) {
        potentialIssues.push({
          workshop_name: workshop.workshop_name,
          socios_count: workshop.count,
          issue: 'Número elevado de sócios',
          socios_list: workshop.socios.map(s => s.employee_name).join(', '),
        });
      }
    }
    
    // Análise de padrões temporais
    const createdDates = socios.map(s => new Date(s.created_date).toISOString().split('T')[0]);
    const dateCounts = {};
    createdDates.forEach(date => {
      dateCounts[date] = (dateCounts[date] || 0) + 1;
    });
    
    const bulkRegistrations = Object.entries(dateCounts)
      .filter(([_, count]) => count > 5)
      .sort((a, b) => b[1] - a[1]);
    
    console.log(`📋 Total de oficinas com sócios: ${workshopGroups.size}`);
    console.log(`⚠️  Oficinas com >3 sócios: ${stats.workshops_with_more_than_3}`);
    console.log(`⚠️  Oficinas com >5 sócios: ${stats.workshops_with_more_than_5}`);
    console.log(`🔴 Oficinas com >10 sócios: ${stats.workshops_with_more_than_10}`);
    
    return Response.json({
      summary: stats,
      workshop_ranking: workshopRanking.map(w => ({
        workshop_name: w.workshop_name,
        city: w.city,
        state: w.state,
        socios_count: w.count,
        socios: w.socios,
      })),
      potential_issues: potentialIssues,
      bulk_registrations: bulkRegistrations.map(([date, count]) => ({
        date,
        count,
        note: 'Possível migração em massa ou cadastro em lote',
      })),
      data_quality_assessment: {
        legitimate_count: workshopRanking.filter(w => w.count <= 3).length,
        suspicious_count: workshopRanking.filter(w => w.count > 5).length,
        recommendation: stats.workshops_with_more_than_5 > 0 
          ? 'Investigar oficinas com >5 sócios - possível inconsistência de dados'
          : 'Dados parecem consistentes',
      },
    });
    
  } catch (err) {
    console.error('Erro na auditoria:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});