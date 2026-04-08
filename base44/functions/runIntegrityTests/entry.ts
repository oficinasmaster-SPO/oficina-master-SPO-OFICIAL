import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const allItems = await base44.asServiceRole.entities.ClientIntelligence.list();
        let fixed = 0;
        
        for (const item of allItems) {
            let needsUpdate = false;
            let newMetadata = { ...(item.metadata || {}) };
            
            // Garantir que metadata é um objeto válido
            if (typeof item.metadata !== 'object' || item.metadata === null) {
                newMetadata = {};
                needsUpdate = true;
            }
            
            // Garantir estrutura mínima
            if (!newMetadata.version) {
                newMetadata.version = 1;
                needsUpdate = true;
            }
            
            if (needsUpdate) {
                await base44.asServiceRole.entities.ClientIntelligence.update(item.id, {
                    metadata: newMetadata
                });
                fixed++;
            }
        }
        
        return Response.json({ success: true, fixed_metadata: fixed });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});