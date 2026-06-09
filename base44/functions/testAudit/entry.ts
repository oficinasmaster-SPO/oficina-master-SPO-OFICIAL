import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const workshopId = "697b986d267e4326dc3f5bf5";
        const userEmail = "administrativo@molashoracerta.com.br";
        const consultingFirmId = "69bab264d7c3fe5d367c3959";

        const [
            dreAll, dfcAll, budgetMetaAll, budgetGroupAll, contaPagarAll,
            contaReceberAll, goalAll, taskAll, cronogramaAll, sprintAll,
            proximoAll, discAll, subcatAll, dreMonthlyAll,
            goalByEmail, taskByEmail, cronByEmail, dreByEmail,
            sprintByFirm, proximoByFirm, discByFirm
        ] = await Promise.all([
            base44.asServiceRole.entities.DRELancamento.filter({ workshop_id: workshopId }),
            base44.asServiceRole.entities.DFCLancamento.filter({ workshop_id: workshopId }),
            base44.asServiceRole.entities.BudgetMeta.filter({ workshop_id: workshopId }),
            base44.asServiceRole.entities.BudgetGroup.filter({ workshop_id: workshopId }),
            base44.asServiceRole.entities.ContaPagar.filter({ workshop_id: workshopId }),
            base44.asServiceRole.entities.ContaReceber.filter({ workshop_id: workshopId }),
            base44.asServiceRole.entities.Goal.filter({ workshop_id: workshopId }),
            base44.asServiceRole.entities.Task.filter({ workshop_id: workshopId }),
            base44.asServiceRole.entities.CronogramaImplementacao.filter({ workshop_id: workshopId }),
            base44.asServiceRole.entities.ConsultoriaSprint.filter({ workshop_id: workshopId }),
            base44.asServiceRole.entities.ConsultoriaProximoPasso.filter({ workshop_id: workshopId }),
            base44.asServiceRole.entities.DISCDiagnostic.filter({ workshop_id: workshopId }),
            base44.asServiceRole.entities.SubcategoriaDRE.filter({ workshop_id: workshopId }),
            base44.asServiceRole.entities.DREMonthly.filter({ workshop_id: workshopId }),
            // Fallbacks via created_by
            base44.asServiceRole.entities.Goal.filter({ created_by: userEmail }),
            base44.asServiceRole.entities.Task.filter({ created_by: userEmail }),
            base44.asServiceRole.entities.CronogramaImplementacao.filter({ created_by: userEmail }),
            base44.asServiceRole.entities.DRELancamento.filter({ created_by: userEmail }),
            // Fallbacks via consulting_firm_id
            base44.asServiceRole.entities.ConsultoriaSprint.filter({ consulting_firm_id: consultingFirmId }),
            base44.asServiceRole.entities.ConsultoriaProximoPasso.filter({ consulting_firm_id: consultingFirmId }),
            base44.asServiceRole.entities.DISCDiagnostic.filter({ consulting_firm_id: consultingFirmId }),
        ]);

        // RLS simulation:
        // user.data.workshop_id = null → only created_by / firm fallbacks work
        const report = [
            { entity: "DRELancamento",          db: dreAll.length,         old_rls: dreByEmail.length,   new_rls: dreAll.length,         broken: dreAll.length > dreByEmail.length,    note: "1269 total, 1245 by created_by — 24 unreachable by old RLS" },
            { entity: "DFCLancamento",           db: dfcAll.length,         old_rls: 0,                  new_rls: dfcAll.length,          broken: dfcAll.length > 0,                    note: "No records yet — not broken in practice" },
            { entity: "BudgetMeta",              db: budgetMetaAll.length,  old_rls: 0,                  new_rls: budgetMetaAll.length,   broken: budgetMetaAll.length > 0,             note: "3 records hidden" },
            { entity: "BudgetGroup",             db: budgetGroupAll.length, old_rls: 0,                  new_rls: budgetGroupAll.length,  broken: budgetGroupAll.length > 0,            note: "No records — not broken in practice" },
            { entity: "ContaPagar",              db: contaPagarAll.length,  old_rls: 0,                  new_rls: contaPagarAll.length,   broken: contaPagarAll.length > 0,             note: "23 records hidden" },
            { entity: "ContaReceber",            db: contaReceberAll.length,old_rls: 0,                  new_rls: contaReceberAll.length, broken: contaReceberAll.length > 0,           note: "10 records hidden" },
            { entity: "DREMonthly",              db: dreMonthlyAll.length,  old_rls: dreByEmail.length,  new_rls: dreMonthlyAll.length,   broken: dreMonthlyAll.length > 0,             note: "1 record hidden (created_by fallback misleading from DRE count)" },
            { entity: "Goal",                    db: goalAll.length,        old_rls: goalByEmail.length, new_rls: goalAll.length,         broken: goalAll.length > goalByEmail.length,  note: "0 records in DB — not broken in practice" },
            { entity: "Task",                    db: taskAll.length,        old_rls: taskByEmail.length, new_rls: taskAll.length,         broken: taskAll.length > taskByEmail.length,  note: "0 records in DB — not broken in practice" },
            { entity: "CronogramaImplementacao", db: cronogramaAll.length,  old_rls: cronByEmail.length, new_rls: cronogramaAll.length,   broken: cronogramaAll.length > cronByEmail.length, note: "36 total, checking created_by gap" },
            { entity: "ConsultoriaSprint",       db: sprintAll.length,      old_rls: sprintByFirm.length,new_rls: sprintAll.length,       broken: sprintAll.length !== sprintByFirm.length, note: "Firm fallback coverage check" },
            { entity: "ConsultoriaProximoPasso", db: proximoAll.length,     old_rls: proximoByFirm.length,new_rls: proximoAll.length,     broken: proximoAll.length !== proximoByFirm.length, note: "Firm fallback coverage check" },
            { entity: "DISCDiagnostic",          db: discAll.length,        old_rls: discByFirm.length,  new_rls: discAll.length,         broken: discAll.length !== discByFirm.length, note: "Firm fallback coverage check" },
            { entity: "SubcategoriaDRE",         db: subcatAll.length,      old_rls: 0,                  new_rls: subcatAll.length,       broken: subcatAll.length > 0,                 note: "create/update only — read is true" },
        ];

        return Response.json({ 
            report: report.map(r => ({
                entity: r.entity,
                total_in_db: r.db,
                via_old_rls: r.old_rls,
                via_new_rls: r.new_rls,
                delta_hidden: r.db - r.old_rls,
                broken_in_runtime: r.broken && r.db > 0,
                note: r.note
            }))
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});