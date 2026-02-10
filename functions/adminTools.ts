import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { email, target_role, set_password } = body;

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
    let passwordUpdated = false;
    let logs = [];

    // Update Role via Entity Update
    if (target_role) {
        try {
            await base44.asServiceRole.entities.User.update(user.id, { role: target_role });
            console.log(`Role updated to ${target_role} via entity update`);
            logs.push(`Role updated to ${target_role}`);
            roleUpdated = true;
        } catch (e) {
            console.error("Failed to update role via entity update:", e);
            logs.push(`Failed to update role: ${e.message}`);
        }
    }

    // Set Password via Entity Update (Experimental)
    if (set_password) {
        try {
            await base44.asServiceRole.entities.User.update(user.id, { password: set_password });
            console.log(`Password update attempted via entity update`);
            logs.push(`Password update attempted via entity update`);
            passwordUpdated = true;
        } catch (e) {
             console.error("Failed to update password via entity update:", e);
             logs.push(`Failed to update password: ${e.message}`);
        }
    }

    return Response.json({ 
        success: true, 
        user_id: user.id, 
        email: user.email, 
        roleUpdated,
        passwordUpdated,
        logs
    });

  } catch (error) {
    console.error("Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});