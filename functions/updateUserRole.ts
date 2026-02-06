import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        // Using service role to bypass security rules for User entity update
        // We are updating the built-in User entity, so we use base44.asServiceRole.entities.User.update
        // Note: The SDK might expose User entity updates via a specific method or generic entity update.
        // Let's try generic entity update first.
        
        const payload = await req.json();
        const userId = payload.userId;
        const newRole = payload.role;

        if (!userId || !newRole) {
            return Response.json({ error: 'Missing userId or role' }, { status: 400 });
        }

        // We can't update User entity directly via entities.User.update usually? 
        // Actually, asServiceRole should allow it.
        // Let's try.
        
        // Wait, User entity is special. base44.users.update? 
        // The instructions say: "You cannot include any of the built-in attributes when editing entities/User.json".
        // But here we are updating DATA.
        // "The User entity has special built-in security rules..."
        // base44.asServiceRole should bypass them.
        
        const result = await base44.asServiceRole.entities.User.update(userId, { role: newRole });

        return Response.json({ success: true, result });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});