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

    // 1. Update Role via inviteUser (standard way to update role)
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

    // 2. Set Password via API (using pattern from createUserOnFirstAccess)
    if (set_password) {
        try {
             const apiUrl = `https://base44.app/api/apps/${Deno.env.get('BASE44_APP_ID')}/users/${user.id}/password`;
             const authResponse = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-base44-key': Deno.env.get('BASE44_SERVICE_ROLE_KEY') // Assuming this env var exists as seen in other functions
                },
                body: JSON.stringify({ password: set_password })
              });
              
              if (!authResponse.ok) {
                const errorText = await authResponse.text();
                throw new Error(`API Error ${authResponse.status}: ${errorText}`);
              }

              console.log(`Password set to ${set_password}`);
              logs.push(`Password successfully updated`);
              passwordUpdated = true;
        } catch (e) {
             console.error("Failed to update password via API:", e);
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