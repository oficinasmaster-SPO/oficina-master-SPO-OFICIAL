import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Mock the user
        // wait, I can just create it as ServiceRole to test the schema!
        const recordData = {
            workshop_id: "69837d4958b7be65d7cfde6b",
            entity_type: "workshop",
            reference_date: "2026-04-14",
            month: "2026-04",
            revenue_distribution: {
                vendors: [],
                marketing: [],
                technicians: []
            }
        };
        
        const created = await base44.asServiceRole.entities.MonthlyGoalHistory.create(recordData);
        
        // now delete it
        await base44.asServiceRole.entities.MonthlyGoalHistory.delete(created.id);
        
        return Response.json({ success: true });
    } catch (error) {
        return Response.json({ error: error.message, details: error }, { status: 500 });
    }
});