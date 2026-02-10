import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { email, target_role } = body;

    if (!email) return Response.json({ error: 'Email required' }, { status: 400 });

    console.log(`Searching for user with email: ${email}`);

    // List users to find the one with the email
    const users = await base44.asServiceRole.entities.User.filter({ email: email });
    
    if (!users || users.length === 0) {
      console.log("User not found in User entity");
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const user = users[0];
    console.log(`User found: ${user.id} (${user.email}), current role: ${user.role}`);

    let roleUpdated = false;
    let logs = [];

    // 1. Update Role via inviteUser
    if (target_role) {
        try {
            console.log(`Attempting to promote user to ${target_role} via inviteUser...`);
            await base44.asServiceRole.users.inviteUser(email, target_role);
            logs.push(`Role update command sent via inviteUser`);
            roleUpdated = true;
        } catch (e) {
            console.error("Failed to update role via inviteUser:", e);
            logs.push(`Failed to update role: ${e.message}`);
        }
    }

    return Response.json({ 
        success: true, 
        user_id: user.id, 
        email: user.email, 
        roleUpdated,
        logs
    });

  } catch (error) {
    console.error("Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});