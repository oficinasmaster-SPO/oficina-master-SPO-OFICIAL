import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const allClientIntelligences = await base44.asServiceRole.entities.ClientIntelligence.list();
        const allChecklists = await base44.asServiceRole.entities.ClientIntelligenceChecklist.list();
        const allProgress = await base44.asServiceRole.entities.ClientIntelligenceChecklistProgress.list();

        // 1. findInvalidClientIntelligence
        const invalidClientIntelligence = allClientIntelligences.filter(i => !i.area || !i.type || !i.subcategory || !i.description);
        
        // 2. findInvalidDates
        const invalidDates = allClientIntelligences.filter(i => {
            if (!i.resolution_date) return false;
            try {
                new Date(i.resolution_date).toISOString();
                return false;
            } catch (e) {
                return true;
            }
        });
        
        // 3. findCorruptedMetadata
        const corruptedMetadata = allClientIntelligences.filter(i => {
            return i.metadata && typeof i.metadata !== 'object';
        });

        // 4. findOrphanChecklists
        const validItemIds = new Set(allClientIntelligences.map(i => i.id));
        const orphanChecklists = allChecklists.filter(c => !validItemIds.has(c.client_intelligence_id));

        // 5. findInconsistentProgress
        const inconsistentProgress = allProgress.filter(progress => {
            if (!progress.checked_items || !Array.isArray(progress.checked_items)) return false;
            const checkedCount = progress.checked_items.filter(i => i.checked).length;
            const correctPercentage = progress.checked_items.length > 0
                ? Math.round((checkedCount / progress.checked_items.length) * 100)
                : 0;
            return progress.completion_percentage !== correctPercentage;
        });

        // 6. findMissingGravity
        const missingGravity = allClientIntelligences.filter(i => !i.gravity);

        // 7. findDuplicates
        const seen = new Map();
        const duplicates = [];
        allClientIntelligences.forEach(item => {
            const key = `${item.workshop_id}|${item.area}|${item.subcategory}|${item.description?.substring(0, 100)}`;
            if (seen.has(key)) {
                duplicates.push({
                    original_id: seen.get(key).id,
                    duplicate_id: item.id
                });
            } else {
                seen.set(key, item);
            }
        });

        // 8. generateHealthReport
        const healthStats = {
            total: allClientIntelligences.length,
            with_area: allClientIntelligences.filter(i => i.area).length,
            with_type: allClientIntelligences.filter(i => i.type).length,
            with_gravity: allClientIntelligences.filter(i => i.gravity).length,
            with_metadata: allClientIntelligences.filter(i => i.metadata).length,
        };
        const byType = {
            dor: allClientIntelligences.filter(i => i.type === 'dor').length,
            duvida: allClientIntelligences.filter(i => i.type === 'duvida').length,
            desejo: allClientIntelligences.filter(i => i.type === 'desejo').length,
            risco: allClientIntelligences.filter(i => i.type === 'risco').length,
            evolucao: allClientIntelligences.filter(i => i.type === 'evolucao').length,
        };
        const byGravity = {
            baixa: allClientIntelligences.filter(i => i.gravity === 'baixa').length,
            media: allClientIntelligences.filter(i => i.gravity === 'media').length,
            alta: allClientIntelligences.filter(i => i.gravity === 'alta').length,
            critica: allClientIntelligences.filter(i => i.gravity === 'critica').length,
            undefined: allClientIntelligences.filter(i => !i.gravity).length,
        };

        const report = {
            validacao_de_integridade: {
                invalid_fields_count: invalidClientIntelligence.length,
                invalid_dates_count: invalidDates.length,
                corrupted_metadata_count: corruptedMetadata.length
            },
            validacao_de_relacionamentos: {
                orphan_checklists_count: orphanChecklists.length,
                inconsistent_progress_count: inconsistentProgress.length
            },
            validacao_de_campos: {
                missing_gravity_count: missingGravity.length
            },
            analise_de_duplicados: {
                duplicates_count: duplicates.length,
                duplicates: duplicates
            },
            relatorio_de_saude: {
                healthStats,
                byType,
                byGravity
            }
        };

        return Response.json({ success: true, report });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});