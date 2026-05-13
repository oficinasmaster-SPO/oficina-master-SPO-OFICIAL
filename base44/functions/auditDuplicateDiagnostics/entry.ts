import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const duplicates = {
      entrepreneur_diagnostic: [],
      workshop_diagnostic: [],
      total_duplicate_sets: 0,
      total_duplicate_records: 0
    };

    // ── Auditar EntrepreneurDiagnostic ─────────────────────────────────────
    const allEntDiags = await base44.asServiceRole.entities.EntrepreneurDiagnostic.list('-completed_at');
    const groupedEnt = {};

    for (const diag of allEntDiags) {
      const day = diag.completed_at 
        ? new Date(diag.completed_at).toISOString().split('T')[0]
        : new Date(diag.created_date).toISOString().split('T')[0];
      
      const key = `${diag.workshop_id || 'null'}|${diag.user_id}|${diag.dominant_profile}|${day}`;
      
      if (!groupedEnt[key]) groupedEnt[key] = [];
      groupedEnt[key].push(diag);
    }

    // Encontrar duplicatas
    for (const key in groupedEnt) {
      const diags = groupedEnt[key];
      
      if (diags.length > 1) {
        const firstAnswers = JSON.stringify(diags[0].answers);
        const allSame = diags.every(d => JSON.stringify(d.answers) === firstAnswers);
        
        if (allSame) {
          duplicates.entrepreneur_diagnostic.push({
            group_key: key,
            client_name: diags[0].client_name,
            user_name: diags[0].user_name,
            profile: diags[0].dominant_profile,
            date: diags[0].completed_at || diags[0].created_date,
            count: diags.length,
            records: diags.map(d => ({
              id: d.id,
              created_at: d.created_date,
              completed_at: d.completed_at
            }))
          });
          
          duplicates.total_duplicate_sets++;
          duplicates.total_duplicate_records += (diags.length - 1); // -1 porque mantém 1
        }
      }
    }

    // ── Auditar Diagnostic (fase da oficina) ─────────────────────────────────
    const allDiags = await base44.asServiceRole.entities.Diagnostic.list('-created_date');
    const groupedDiag = {};

    for (const diag of allDiags) {
      const day = new Date(diag.created_date).toISOString().split('T')[0];
      const key = `${diag.workshop_id || 'null'}|${diag.user_id}|${diag.dominant_letter}|${day}`;
      
      if (!groupedDiag[key]) groupedDiag[key] = [];
      groupedDiag[key].push(diag);
    }

    // Encontrar duplicatas
    for (const key in groupedDiag) {
      const diags = groupedDiag[key];
      
      if (diags.length > 1) {
        const firstAnswers = JSON.stringify(diags[0].answers);
        const allSame = diags.every(d => JSON.stringify(d.answers) === firstAnswers);
        
        if (allSame) {
          duplicates.workshop_diagnostic.push({
            group_key: key,
            phase: diags[0].phase,
            letter: diags[0].dominant_letter,
            date: diags[0].created_date,
            count: diags.length,
            records: diags.map(d => ({
              id: d.id,
              created_at: d.created_date
            }))
          });
          
          duplicates.total_duplicate_sets++;
          duplicates.total_duplicate_records += (diags.length - 1);
        }
      }
    }

    return Response.json({
      success: true,
      ...duplicates,
      cleanup_instruction: 'Use cleanupDuplicateDiagnostics para remover duplicatas'
    });

  } catch (error) {
    console.error("Audit Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});