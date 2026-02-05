import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const email = "xingumatriz@gmail.com";
        const newPlan = "MILLIONS";

        // 1. Try to find workshop by email directly
        let workshops = await base44.asServiceRole.entities.Workshop.filter({
            email: email
        });

        // 2. If not found, try to find user by email, then their workshop
        if (workshops.length === 0) {
            const users = await base44.asServiceRole.entities.User.filter({
                email: email
            });

            if (users.length > 0) {
                const userId = users[0].id;
                workshops = await base44.asServiceRole.entities.Workshop.filter({
                    owner_id: userId
                });
            }
        }

        if (workshops.length === 0) {
            return Response.json({ error: "Workshop not found for this email" });
        }

        const workshop = workshops[0];
        
        // Update the plan
        const result = await base44.asServiceRole.entities.Workshop.update(
            workshop.id,
            { 
                planoAtual: newPlan,
                // Optionally update status if needed, but keeping it simple as requested
            }
        );

        return Response.json({ 
            success: true, 
            message: `Updated workshop '${workshop.name}' (ID: ${workshop.id}) plan to ${newPlan}`,
            result 
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});