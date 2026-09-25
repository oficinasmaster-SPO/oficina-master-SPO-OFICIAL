import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

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

// ─── Sprint 1 / C1: validação de acesso ao workshop (isolamento multi-tenant) ──
// Libera: admin, usuário interno (consultoria), dono da oficina, membership ativa,
// colaborador vinculado (não inativo) ou vínculo legado em user.workshop_id.
// Qualquer outro caso → 403. Usa service role só para LER dados de vínculo.
async function checkWorkshopAccess(base44, user, workshop_id) {
  if (!workshop_id || typeof workshop_id !== 'string') {
    return { ok: false, status: 400, error: 'workshop_id é obrigatório' };
  }
  const sr = base44.asServiceRole;
  const workshop = await sr.entities.Workshop.get(workshop_id).catch(() => null);
  if (!workshop) return { ok: false, status: 404, error: 'Oficina não encontrada' };

  const isAdmin = user.role === 'admin';
  const isInternal = user.user_type === 'internal' || user.data?.user_type === 'internal';
  if (isAdmin || isInternal) return { ok: true, workshop };

  if (workshop.owner_id === user.id) return { ok: true, workshop };

  const legacyWid = user.workshop_id || user.tenant_workshop_id || user.data?.workshop_id;
  if (legacyWid === workshop_id) return { ok: true, workshop };

  const memberships = await sr.entities.TenantMembership.filter(
    { user_id: user.id, workshop_id, status: 'active' }
  ).catch(() => []);
  if (memberships.length > 0) return { ok: true, workshop };

  const byUserId = await sr.entities.Employee.filter({ workshop_id, user_id: user.id }).catch(() => []);
  const byEmail = user.email
    ? await sr.entities.Employee.filter({ workshop_id, email: user.email }).catch(() => [])
    : [];
  if ([...byUserId, ...byEmail].some((e) => e.status !== 'inativo')) return { ok: true, workshop };

  console.warn(`[submitAppForms] ACESSO NEGADO: user ${user.id} (${user.email}) → workshop ${workshop_id}`);
  return { ok: false, status: 403, error: 'Sem acesso a esta oficina' };
}

// ─── Sprint 1 / C2: cálculo da fase no servidor ──────────────────────────────
// CÓPIA FIEL de src/components/diagnostic/Questions.jsx (campo option.phase) e de
// computePhaseResult em src/components/lib/phaseConstants.jsx.
// Qualquer alteração no mapeamento deve ser espelhada nos dois lugares.
const PHASE_SCORING_VERSION = '2026-09-25';
const PHASE_OPTION_MAP = {
  1: { A: 3, B: 2, C: 4, D: 1 },  2: { A: 2, B: 4, C: 3, D: 1 },
  3: { A: 3, B: 2, C: 1, D: 4 },  4: { A: 4, B: 1, C: 3, D: 2 },
  5: { A: 2, B: 4, C: 3, D: 1 },  6: { A: 2, B: 4, C: 3, D: 1 },
  7: { A: 2, B: 1, C: 3, D: 4 },  8: { A: 4, B: 3, C: 2, D: 1 },
  9: { A: 3, B: 4, C: 2, D: 1 }, 10: { A: 1, B: 2, C: 3, D: 4 },
  11: { A: 2, B: 1, C: 4, D: 3 }, 12: { A: 3, B: 2, C: 1, D: 4 },
};
const PHASE_NUMBER_TO_LETTER = { 1: 'A', 2: 'B', 3: 'C', 4: 'D' };
const TIE_BREAK_PHASE_PRIORITY = [1, 2, 3, 4]; // mais crítico primeiro

function computePhaseServer(answers) {
  if (!Array.isArray(answers)) return { error: 'answers deve ser uma lista' };
  const totalQuestions = Object.keys(PHASE_OPTION_MAP).length;
  const seen = new Set();
  const phaseCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const a of answers) {
    const qid = Number(a?.question_id);
    const letter = a?.selected_option;
    const phase = PHASE_OPTION_MAP[qid]?.[letter];
    if (!phase) return { error: `Resposta inválida (pergunta ${a?.question_id}, opção ${letter})` };
    if (seen.has(qid)) return { error: `Pergunta ${qid} respondida mais de uma vez` };
    seen.add(qid);
    phaseCounts[phase]++;
  }
  if (seen.size !== totalQuestions) {
    return { error: `Diagnóstico incompleto: ${seen.size} de ${totalQuestions} perguntas respondidas` };
  }
  const maxCount = Math.max(...Object.values(phaseCounts));
  const phase = TIE_BREAK_PHASE_PRIORITY.find((p) => phaseCounts[p] === maxCount);
  const letter_distribution = Object.fromEntries(
    Object.entries(phaseCounts).map(([p, c]) => [PHASE_NUMBER_TO_LETTER[p], c])
  );
  return { phase, dominant_letter: PHASE_NUMBER_TO_LETTER[phase], letter_distribution };
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { form_type, workshop_id } = body;

    // ── C1: isolamento — todo workshop_id informado precisa ser acessível ──────
    const phaseForm = form_type === 'workshop_diagnostic' || form_type === 'workshop_phase_diagnostic';
    if (workshop_id || phaseForm) {
      const access = await checkWorkshopAccess(base44, user, workshop_id);
      if (!access.ok) return Response.json({ error: access.error }, { status: access.status });
    }

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
      const { answers } = body;

      // C2: fase calculada SOMENTE no servidor; phase/dominant_letter/letter_distribution
      // enviados pelo navegador são ignorados.
      const scored = computePhaseServer(answers);
      if (scored.error) return Response.json({ error: scored.error }, { status: 400 });
      if (body.phase && Number(body.phase) !== scored.phase) {
        console.warn(`[submitAppForms] fase do cliente (${body.phase}) diverge do servidor (${scored.phase}) — usando servidor. v${PHASE_SCORING_VERSION}`);
      }

      const diagnostic = await base44.asServiceRole.entities.Diagnostic.create({
        user_id: user.id,
        workshop_id,
        answers,
        phase: scored.phase,
        dominant_letter: scored.dominant_letter,
        letter_distribution: scored.letter_distribution,
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