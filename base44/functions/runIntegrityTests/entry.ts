import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const allItems = await base44.asServiceRole.entities.ClientIntelligence.list();
        
        // Query 1.1: Campos obrigatórios
        const problematic = allItems.filter(item => 
            !item.id || 
            !item.area || 
            !item.type || 
            !item.subcategory
        );
        
        // Query 1.2: Datas inválidas
        const invalidDates = allItems.filter(item => {
            if (item.resolution_date) {
                try {
                    new Date(item.resolution_date).toISOString();
                } catch (e) {
                    return true;
                }
            }
            if (item.created_date) {
                try {
                    new Date(item.created_date).toISOString();
                } catch (e) {
                    return true;
                }
            }
            return false;
        });

        // Query 1.3: Metadata corrompida
        const corruptedMetadata = allItems.filter(item => {
            if (item.metadata && typeof item.metadata !== 'object') {
                return true;
            }
            if (item.metadata?.evolution) {
                const evolution = item.metadata.evolution;
                if (!evolution.impactBefore && !evolution.impactAfter && !evolution.learnings) {
                    return true;
                }
            }
            return false;
        });

        return Response.json({
            total_records: allItems.length,
            q1_problematic: problematic.length,
            q2_invalid_dates: invalidDates.length,
            q3_corrupted_metadata: corruptedMetadata.length,
            details: {
                problematic: problematic.map(p => p.id),
                invalidDates: invalidDates.map(d => d.id),
                corruptedMetadata: corruptedMetadata.map(c => c.id)
            }
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});