import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { candidate_data } = await req.json();

    if (!candidate_data) {
      return Response.json({ error: 'candidate_data é obrigatório' }, { status: 400 });
    }

    let score = 0;

    // 1. Histórico Profissional (20 pontos)
    const workHistory = candidate_data.work_history || [];
    if (workHistory.length > 0) {
      // Média de permanência
      const avgDuration = workHistory.reduce((sum, w) => sum + (w.duration_months || 0), 0) / workHistory.length;
      if (avgDuration >= 24) score += 10; // 2+ anos
      else if (avgDuration >= 12) score += 7; // 1+ ano
      else if (avgDuration >= 6) score += 4; // 6+ meses
      
      // Qualidade das informações
      const hasLeaderNames = workHistory.filter(w => w.direct_leader).length;
      score += Math.min(hasLeaderNames * 2, 10);
    }

    // 2. Experiência (20 pontos)
    const expYears = candidate_data.experience_years || 0;
    if (expYears >= 5) score += 15;
    else if (expYears >= 3) score += 10;
    else if (expYears >= 1) score += 5;

    const autonomousActivities = candidate_data.autonomous_activities || [];
    score += Math.min(autonomousActivities.length, 5);

    // 3. Formação (15 pontos)
    const courses = candidate_data.courses || [];
    if (courses.length >= 3) score += 10;
    else if (courses.length >= 1) score += 5;

    const recentCourses = courses.filter(c => c.year >= new Date().getFullYear() - 2);
    score += Math.min(recentCourses.length * 2, 5);

    // 4. Autopercepção (15 pontos)
    const selfRating = candidate_data.self_technical_rating || 0;
    score += Math.min(selfRating * 1.5, 15);

    // 5. Comportamento (20 pontos)
    if (candidate_data.reason_for_change && candidate_data.reason_for_change.length > 20) score += 7;
    if (candidate_data.company_expectations && candidate_data.company_expectations.length > 20) score += 7;
    if (candidate_data.best_leader_experience && candidate_data.best_leader_experience.length > 20) score += 6;

    // 6. Disponibilidade e Alinhamento (10 pontos)
    if (candidate_data.availability) {
      if (candidate_data.availability.toLowerCase().includes('imediato')) score += 5;
      else score += 3;
    }
    if (candidate_data.salary_expectation > 0) score += 5;

    // Normalizar para 0-100
    score = Math.min(Math.round(score), 100);

    return Response.json({ 
      success: true, 
      score,
      breakdown: {
        historico: Math.min(workHistory.length * 5, 20),
        experiencia: Math.min(expYears * 3, 20),
        formacao: Math.min(courses.length * 5, 15),
        autopercepção: Math.min(selfRating * 1.5, 15),
        comportamento: 20,
        disponibilidade: 10
      }
    });

  } catch (error) {
    console.error("Erro ao calcular Lead Score inicial:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});