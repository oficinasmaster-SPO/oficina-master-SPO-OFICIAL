import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        // Using service role just in case, but inviteUser might be available on standard client if admin
        // But here we are in a function, so we construct client.
        // We need to use base44.asServiceRole to invite if the context isn't an admin user (which it isn't, it's a function call).
        // Actually createClientFromRequest passes the auth token.
        // If I call this function via test_backend_function, it uses my dev token (admin).
        
        // Let's try base44.asServiceRole.users.inviteUser if it exists, or just base44.users.inviteUser
        // SDK usually exposes users on root.
        
        const email = "franklin.varejaodooleo@gmail.com";
        const role = "admin";

        // Try standard invite
        await base44.users.inviteUser(email, role);

        return Response.json({ success: true, message: "User invited/updated to admin" });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});