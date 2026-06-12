import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Since we don't have user auth in test, let's fake the auth or look at the source code of createUserDirectly
    const email = "test_invite_555@gmail.com";
    
    // Actually, I can just check if I can filter the User entity
    const users = await base44.asServiceRole.entities.User.filter({ email: "vitoralbuquerque22+333@gmail.com" });
    
    return Response.json({ users });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});