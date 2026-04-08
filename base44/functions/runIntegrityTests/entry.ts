import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // We run for all items, since workshopId wasn't strictly specified in previous runs we just listed all.
        // Let's list all ClientIntelligence.
        const items = await base44.asServiceRole.entities.ClientIntelligence.list();
        
        // --- 4.1 Generate Health Report ---
        const healthStats = {
            total: items.length,
            with_area: items.filter(i => i.area).length,
            with_type: items.filter(i => i.type).length,
            with_gravity: items.filter(i => i.gravity).length,
            with_metadata: items.filter(i => i.metadata).length,
        };
        
        const byType = {
            dor: items.filter(i => i.type === 'dor').length,
            duvida: items.filter(i => i.type === 'duvida').length,
            desejo: items.filter(i => i.type === 'desejo').length,
            risco: items.filter(i => i.type === 'risco').length,
            evolucao: items.filter(i => i.type === 'evolucao').length,
        };
        
        const byGravity = {
            baixa: items.filter(i => i.gravity === 'baixa').length,
            media: items.filter(i => i.gravity === 'media').length,
            alta: items.filter(i => i.gravity === 'alta').length,
            critica: items.filter(i => i.gravity === 'critica').length,
            undefined: items.filter(i => !i.gravity).length,
        };
        
        // --- 4.2 Find Duplicates ---
        const seen = new Map();
        const duplicates = [];
        
        items.forEach(item => {
            // Using workshop_id to distinguish different clients' duplicates
            const key = `${item.workshop_id}|${item.area}|${item.subcategory}|${item.description?.substring(0, 100)}`;
            
            if (seen.has(key)) {
                duplicates.push({
                    original_id: seen.get(key).id,
                    duplicate_id: item.id,
                    area: item.area,
                    subcategory: item.subcategory,
                    description_preview: item.description?.substring(0, 30)
                });
            } else {
                seen.set(key, item);
            }
        });

        return Response.json({
            success: true,
            report: {
                healthStats,
                byType,
                byGravity,
                duplicates_found: duplicates.length,
                duplicates
            }
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});