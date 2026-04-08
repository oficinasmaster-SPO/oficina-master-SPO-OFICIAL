import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        let fixedDatesCount = 0;
        let fixedGravityCount = 0;
        let fixedProgressCount = 0;

        // Script 3.1: Corrigir datas inválidas
        const allItems = await base44.asServiceRole.entities.ClientIntelligence.list();
        for (const item of allItems) {
            const updates = {};
            if (item.resolution_date) {
                try {
                    new Date(item.resolution_date).toISOString();
                } catch (e) {
                    updates.resolution_date = null;
                }
            }
            if (Object.keys(updates).length > 0) {
                await base44.asServiceRole.entities.ClientIntelligence.update(item.id, updates);
                fixedDatesCount++;
            }
        }

        // Script 3.2: Adicionar gravity padrão onde estiver faltando
        for (const item of allItems) {
            if (!item.gravity) {
                await base44.asServiceRole.entities.ClientIntelligence.update(item.id, {
                    gravity: 'media'
                });
                fixedGravityCount++;
            }
        }

        // Script 3.3: Recalcular percentuais de progresso de checklist
        const allProgress = await base44.asServiceRole.entities.ClientIntelligenceChecklistProgress.list();
        for (const progress of allProgress) {
            if (!progress.checked_items || !Array.isArray(progress.checked_items)) {
                continue;
            }
            
            const checkedCount = progress.checked_items.filter(i => i.checked).length;
            const correctPercentage = progress.checked_items.length > 0
                ? Math.round((checkedCount / progress.checked_items.length) * 100)
                : 0;
            
            if (progress.completion_percentage !== correctPercentage) {
                await base44.asServiceRole.entities.ClientIntelligenceChecklistProgress.update(progress.id, {
                    completion_percentage: correctPercentage
                });
                fixedProgressCount++;
            }
        }

        return Response.json({
            success: true,
            results: {
                fixed_invalid_dates: fixedDatesCount,
                fixed_missing_gravity: fixedGravityCount,
                fixed_checklist_progress: fixedProgressCount
            }
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});