import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Query 2.1: Identificar checklists órfãos
        const checklists = await base44.asServiceRole.entities.ClientIntelligenceChecklist.filter({ status: "ativo" });
        const orphans = checklists.filter(checklist => 
            !checklist.items || 
            !Array.isArray(checklist.items) || 
            checklist.items.length === 0
        );

        // Query 2.2: Encontrar progresso de checklist com dados inconsistentes
        const allProgress = await base44.asServiceRole.entities.ClientIntelligenceChecklistProgress.list();
        const inconsistent = allProgress.filter(progress => {
            if (!progress.checked_items || !Array.isArray(progress.checked_items)) {
                return true;
            }
            const checkedCount = progress.checked_items.filter(i => i.checked).length;
            const calculatedPercentage = progress.checked_items.length > 0 
                ? Math.round((checkedCount / progress.checked_items.length) * 100)
                : 0;
            
            if (progress.completion_percentage !== undefined && Math.abs(progress.completion_percentage - calculatedPercentage) > 1) {
                return true;
            }
            return false;
        });

        // Query 2.3: Encontrar registros sem gravity definida
        const intelligenceItems = await base44.asServiceRole.entities.ClientIntelligence.list();
        const missingGravity = intelligenceItems.filter(item => !item.gravity);

        return Response.json({
            q2_1_orphan_checklists: orphans.length,
            q2_2_inconsistent_progress: inconsistent.length,
            q2_3_missing_gravity: missingGravity.length,
            details: {
                orphanChecklists: orphans.map(c => c.id),
                inconsistentProgress: inconsistent.map(p => p.id),
                missingGravity: missingGravity.map(i => i.id)
            }
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});