import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { form_type } = body;

    if (form_type === 'entrepreneur_diagnostic') {
        const { workshop_id, answers, dominant_profile, profile_scores } = body;
        
        const diagnostic = await base44.asServiceRole.entities.EntrepreneurDiagnostic.create({
            user_id: user.id,
            workshop_id,
            answers,
            dominant_profile,
            profile_scores,
            completed: true
        });
        return Response.json({ success: true, id: diagnostic.id, diagnostic });
    }

    if (form_type === 'workshop_diagnostic') {
        const { workshop_id, answers, phase, dominant_letter } = body;
        
        const diagnostic = await base44.asServiceRole.entities.Diagnostic.create({
            user_id: user.id,
            workshop_id,
            answers,
            phase,
            dominant_letter,
            completed: true
        });
        
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

    if (form_type === 'workload_diagnostic') {
        const { workshop_id, answers, overall_health, average_score } = body;

        const workload_data = [
             { position_title: "Mecânico", weekly_hours_worked: 45, ideal_weekly_hours: 44 },
             { position_title: "Gerente", weekly_hours_worked: 50, ideal_weekly_hours: 40 }
        ];

        const diagnostic = await base44.asServiceRole.entities.WorkloadDiagnostic.create({
            workshop_id,
            period_start: new Date().toISOString(),
            period_end: new Date().toISOString(),
            overall_health,
            average_score,
            workload_data,
            analysis_results: {
                overloaded_employees: [],
                underutilized_employees: [],
                redistribution_suggestions: []
            },
            completed: true
        });
        return Response.json({ success: true, id: diagnostic.id, diagnostic });
    }

    if (form_type === 'manager_disc_diagnostic') {
        const { employee_id, workshop_id, is_leader, team_name, answers, profile_scores, dominant_profile, recommended_roles } = body;
        
        const diagnostic = await base44.asServiceRole.entities.DISCDiagnostic.create({
            employee_id,
            evaluator_id: user.id,
            workshop_id,
            is_leader,
            team_name,
            answers,
            profile_scores,
            dominant_profile,
            recommended_roles,
            evaluation_type: 'manager',
            completed: true
        });
        return Response.json({ success: true, id: diagnostic.id, diagnostic });
    }

    return Response.json({ error: 'Invalid form type' }, { status: 400 });

  } catch (error) {
    console.error("SubmitAppForms Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});