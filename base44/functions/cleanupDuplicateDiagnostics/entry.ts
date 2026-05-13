import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const body = await req.json();
    const { workshop_id, diagnostic_type } = body;

    let cleanedCount = 0;
    const cleanupReport = [];

    // ── Limpar EntrepreneurDiagnostic ─────────────────────────────────────────
    if (!diagnostic_type || diagnostic_type === 'entrepreneur_diagnostic') {
      const allDiags = await base44.asServiceRole.entities.EntrepreneurDiagnostic.filter({
        ...(workshop_id && { workshop_id })
      }, '-completed_at');

      // Agrupar por (workshop_id, user_id, dominant_profile, dia)
      const grouped = {};
      for (const diag of allDiags) {
        const day = diag.completed_at 
          ? new Date(diag.completed_at).toISOString().split('T')[0]
          : new Date(diag.created_date).toISOString().split('T')[0];
        
        const key = `${diag.workshop_id || 'null'}|${diag.user_id}|${diag.dominant_profile}|${day}`;
        
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(diag);
      }

      // Deletar duplicatas (manter primeira, deletar resto)
      for (const key in grouped) {
        const diags = grouped[key];
        
        if (diags.length > 1) {
          // Verificar se respostas são idênticas
          const firstAnswers = JSON.stringify(diags[0].answers);
          const allSame = diags.every(d => JSON.stringify(d.answers) === firstAnswers);
          
          if (allSame) {
            // Manter o primeiro, deletar os outros
            for (let i = 1; i < diags.length; i++) {
              await base44.asServiceRole.entities.EntrepreneurDiagnostic.delete(diags[i].id);
              cleanedCount++;
              
              cleanupReport.push({
                type: 'EntrepreneurDiagnostic',
                deleted_id: diags[i].id,
                kept_id: diags[0].id,
                workshop_name: diags[0].client_name,
                user_name: diags[0].user_name,
                profile: diags[0].dominant_profile,
                date: diags[0].completed_at || diags[0].created_date,
                reason: `Duplicada mantendo ${diags[0].id}`
              });
            }
          }
        }
      }
    }

    // ── Limpar Diagnostic (fase da oficina) ──────────────────────────────────
    if (!diagnostic_type || diagnostic_type === 'workshop_diagnostic') {
      const allDiags = await base44.asServiceRole.entities.Diagnostic.filter({
        ...(workshop_id && { workshop_id })
      }, '-created_date');

      // Agrupar por (workshop_id, user_id, dominant_letter, dia)
      const grouped = {};
      for (const diag of allDiags) {
        const day = new Date(diag.created_date).toISOString().split('T')[0];
        const key = `${diag.workshop_id || 'null'}|${diag.user_id}|${diag.dominant_letter}|${day}`;
        
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(diag);
      }

      // Deletar duplicatas
      for (const key in grouped) {
        const diags = grouped[key];
        
        if (diags.length > 1) {
          // Verificar se answers são idênticas
          const firstAnswers = JSON.stringify(diags[0].answers);
          const allSame = diags.every(d => JSON.stringify(d.answers) === firstAnswers);
          
          if (allSame) {
            // Manter o primeiro, deletar os outros
            for (let i = 1; i < diags.length; i++) {
              await base44.asServiceRole.entities.Diagnostic.delete(diags[i].id);
              cleanedCount++;
              
              cleanupReport.push({
                type: 'Diagnostic (Fase)',
                deleted_id: diags[i].id,
                kept_id: diags[0].id,
                phase: diags[0].phase,
                letter: diags[0].dominant_letter,
                date: diags[0].created_date,
                reason: `Duplicada mantendo ${diags[0].id}`
              });
            }
          }
        }
      }
    }

    return Response.json({
      success: true,
      cleaned_count: cleanedCount,
      report: cleanupReport,
      message: `${cleanedCount} diagnósticos duplicados removidos com sucesso`
    });

  } catch (error) {
    console.error("Cleanup Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});