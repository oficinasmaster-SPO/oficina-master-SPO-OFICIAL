import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ─── Helper: busca dados do workshop e valida frequência ─────────────────────
async function getWorkshopData(base44, workshop_id) {
  if (!workshop_id) return null;
  const list = await base44.entities.Workshop.filter({ id: workshop_id });
  return list.length > 0 ? list[0] : null;
}

async function validateFrequency(base44, workshop_id, diagnostic_type, plan_id) {
  const frequencies = await base44.entities.DiagnosticFrequency.filter({
    plan_id,
    diagnostic_type,
    is_active: true
  }).catch(() => []);

  if (frequencies.length === 0) return { allowed: true }; // Sem regra = permitido

  const freq = frequencies[0];
  if (freq.frequency_type === 'unlimited' || freq.min_days_between_attempts === 0) {
    return { allowed: true };
  }

  // Buscar último diagnóstico deste tipo para este workshop
  const entityMap = {
    entrepreneur_diagnostic: 'EntrepreneurDiagnostic',
    management_diagnostic: 'ManagementDiagnostic',
    workload_diagnostic: 'WorkloadDiagnostic',
    disc_behavioral_diagnostic: 'DISCDiagnostic',
    debt_analysis_diagnostic: 'DebtAnalysisDiagnostic',
    gerencial_diagnostic: 'ManagementDiagnostic',
    commercial_diagnostic: 'CommercialDiagnostic'
  };

  const entityName = entityMap[diagnostic_type];
  if (!entityName) return { allowed: true };

  const last = await base44.entities[entityName].filter(
    { workshop_id },
    '-completed_at',
    1
  ).catch(() => []);

  if (last.length > 0 && last[0].completed_at) {
    const lastDate = new Date(last[0].completed_at);
    const today = new Date();
    const daysSinceLast = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));

    if (daysSinceLast < freq.min_days_between_attempts) {
      const nextDate = new Date(lastDate.getTime() + (freq.min_days_between_attempts * 24 * 60 * 60 * 1000));
      const daysRemaining = freq.min_days_between_attempts - daysSinceLast;
      return {
        allowed: false,
        daysRemaining,
        nextAvailableDate: nextDate.toISOString(),
        message: `Você poderá refazer este diagnóstico em ${daysRemaining} dias (${nextDate.toLocaleDateString('pt-BR')})`
      };
    }
  }

  return { allowed: true };
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { form_type, workshop_id } = body;

    // ── Buscar dados do workshop para cache ───────────────────────────────────
    let workshopData = null;
    if (workshop_id) {
      workshopData = await getWorkshopData(base44, workshop_id);
    }

    const planId = workshopData?.planoAtual || 'FREE';
    const clientName = workshopData?.name || null;
    const companyName = workshopData?.razao_social || workshopData?.name || null;
    const userName = user.full_name || user.email || null;
    const completedAt = new Date().toISOString();

    // ── Validação de frequência genérica (diagnósticos que têm regra) ─────────
    const diagnosticsWithFrequency = [
      'entrepreneur_diagnostic',
      'management_diagnostic',
      'workload_diagnostic',
      'disc_behavioral_diagnostic',
      'debt_analysis_diagnostic',
      'gerencial_diagnostic',
      'commercial_diagnostic'
    ];

    if (diagnosticsWithFrequency.includes(form_type) && workshop_id) {
      const freqCheck = await validateFrequency(base44, workshop_id, form_type, planId);
      if (!freqCheck.allowed) {
        return Response.json({
          success: false,
          error: {
            code: 'FREQUENCY_LIMIT',
            message: freqCheck.message,
            daysRemaining: freqCheck.daysRemaining,
            nextAvailableDate: freqCheck.nextAvailableDate
          }
        }, { status: 429 });
      }
    }

    // ── DIAGNÓSTICO DO EMPREENDEDOR ───────────────────────────────────────────
    if (form_type === 'entrepreneur_diagnostic') {
      const { answers, dominant_profile, profile_scores } = body;
      
      // Proteção contra duplicação: verificar se já existe diagnóstico idêntico
      // nos últimos 5 segundos (janela de proteção contra clique duplo)
      const recentDiags = await base44.asServiceRole.entities.EntrepreneurDiagnostic.filter({
        user_id: user.id,
        workshop_id: workshop_id || null
      }, '-created_date', 1).catch(() => []);
      
      if (recentDiags.length > 0) {
        const lastDiag = recentDiags[0];
        const createdTime = new Date(lastDiag.created_date).getTime();
        const nowTime = new Date().getTime();
        const secondsSinceLast = (nowTime - createdTime) / 1000;
        
        // Se menos de 5 segundos E respostas idênticas = duplicação detectada
        if (secondsSinceLast < 5) {
          const answersMatch = 
            JSON.stringify(lastDiag.answers) === JSON.stringify(answers) &&
            lastDiag.dominant_profile === dominant_profile;
          
          if (answersMatch) {
            // Retornar o diagnóstico anterior em vez de criar duplicata
            return Response.json({ 
              success: true, 
              id: lastDiag.id, 
              diagnostic: lastDiag,
              isDuplicate: true,
              message: 'Diagnóstico duplicado detectado - retornando resposta anterior'
            });
          }
        }
      }
      
      const diagnostic = await base44.asServiceRole.entities.EntrepreneurDiagnostic.create({
        user_id: user.id,
        user_name: userName,
        workshop_id: workshop_id || null,
        client_name: clientName,
        company_name: companyName,
        diagnostic_type: 'entrepreneur_diagnostic',
        answers,
        dominant_profile,
        profile_scores,
        completed: true,
        completed_at: completedAt
      });
      
      if (workshop_id) {
        base44.functions.invoke('incrementPlanUsage', { tenantId: workshop_id, resource: 'reports', amount: 1 })
          .catch(err => console.warn('[incrementPlanUsage] falhou (não crítico):', err?.message));
      }
      
      return Response.json({ success: true, id: diagnostic.id, diagnostic });
    }

    // ── DIAGNÓSTICO DE FASE DA OFICINA ────────────────────────────────────────
    if (form_type === 'workshop_diagnostic' || form_type === 'workshop_phase_diagnostic') {
      const { answers, phase, dominant_letter, letter_distribution } = body;
      
      const diagnostic = await base44.asServiceRole.entities.Diagnostic.create({
        user_id: user.id,
        workshop_id: workshop_id || null,
        answers,
        phase,
        dominant_letter,
        letter_distribution: letter_distribution || { A: 0, B: 0, C: 0, D: 0 },
        completed: true
      });

      if (workshop_id) {
        base44.functions.invoke('incrementPlanUsage', { tenantId: workshop_id, resource: 'reports', amount: 1 })
          .catch(err => console.warn('[incrementPlanUsage] falhou (não crítico):', err?.message));
      }
      
      // Update user progress checklist
      try {
        const progressList = await base44.asServiceRole.entities.UserProgress.filter({ user_id: user.id });
        if (progressList.length > 0) {
          const p = progressList[0];
          const checklist = p.checklist_items || {};
          checklist.fez_primeiro_diagnostico = true;
          await base44.asServiceRole.entities.UserProgress.update(p.id, { checklist_items: checklist });
        }
      } catch(e) { console.log("Progress update error", e); }

      return Response.json({ success: true, id: diagnostic.id, diagnostic });
    }

    // ── DIAGNÓSTICO DE CARGA DE TRABALHO ─────────────────────────────────────
    if (form_type === 'workload_diagnostic') {
      const { answers, overall_health, average_score, workload_data } = body;

      const default_workload = [
        { position_title: "Mecânico", weekly_hours_worked: 45, ideal_weekly_hours: 44 },
        { position_title: "Gerente", weekly_hours_worked: 50, ideal_weekly_hours: 40 }
      ];

      const diagnostic = await base44.asServiceRole.entities.WorkloadDiagnostic.create({
        workshop_id: workshop_id || null,
        user_id: user.id,
        user_name: userName,
        client_name: clientName,
        company_name: companyName,
        diagnostic_type: 'workload_diagnostic',
        period_start: new Date().toISOString(),
        period_end: new Date().toISOString(),
        overall_health,
        average_score,
        workload_data: workload_data || default_workload,
        analysis_results: {
          overloaded_employees: [],
          underutilized_employees: [],
          redistribution_suggestions: []
        },
        completed: true,
        completed_at: completedAt
      });

      if (workshop_id) {
        base44.functions.invoke('incrementPlanUsage', { tenantId: workshop_id, resource: 'reports', amount: 1 })
          .catch(err => console.warn('[incrementPlanUsage] falhou (não crítico):', err?.message));
      }
      
      return Response.json({ success: true, id: diagnostic.id, diagnostic });
    }

    // ── DIAGNÓSTICO DISC ──────────────────────────────────────────────────────
    if (form_type === 'manager_disc_diagnostic') {
      const { employee_id, is_leader, team_name, answers, profile_scores, dominant_profile, recommended_roles } = body;
      
      const diagnostic = await base44.asServiceRole.entities.DISCDiagnostic.create({
        employee_id,
        evaluator_id: user.id,
        workshop_id: workshop_id || null,
        user_name: userName,
        client_name: clientName,
        company_name: companyName,
        diagnostic_type: 'disc_behavioral_diagnostic',
        is_leader,
        team_name,
        answers,
        profile_scores,
        dominant_profile,
        recommended_roles,
        evaluation_type: 'manager',
        completed: true,
        completed_at: completedAt
      });

      if (workshop_id) {
        base44.functions.invoke('incrementPlanUsage', { tenantId: workshop_id, resource: 'reports', amount: 1 })
          .catch(err => console.warn('[incrementPlanUsage] falhou (não crítico):', err?.message));
      }

      return Response.json({ success: true, id: diagnostic.id, diagnostic });
    }

    return Response.json({ error: 'Invalid form type' }, { status: 400 });

  } catch (error) {
    console.error("SubmitAppForms Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});