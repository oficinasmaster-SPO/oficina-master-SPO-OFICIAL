import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { user_id, xp_amount, reason } = await req.json();

    if (!user_id || !xp_amount) {
      return Response.json({ error: 'Missing user_id or xp_amount' }, { status: 400 });
    }

    // 1. Get UserGameProfile
    const profiles = await base44.asServiceRole.entities.UserGameProfile.filter({ user_id });
    let profile = profiles[0];

    if (!profile) {
      // Create profile if not exists
      profile = await base44.asServiceRole.entities.UserGameProfile.create({
        user_id,
        xp: 0,
        level: 1,
        level_name: "Iniciante",
        badges: [],
        total_actions: 0
      });
    }

    // 2. Calculate new XP and Level
    const newXP = (profile.xp || 0) + xp_amount;
    
    // Simple level formula: Level = 1 + floor(XP / 1000)
    // Or a mapping like in the frontend code
    const newLevel = Math.floor(newXP / 1000) + 1;
    
    let levelName = profile.level_name;
    if (newLevel <= 5) levelName = "Iniciante";
    else if (newLevel <= 10) levelName = "Intermediário";
    else if (newLevel <= 20) levelName = "Avançado";
    else levelName = "Mestre";

    // 3. Update Profile
    const updatedProfile = await base44.asServiceRole.entities.UserGameProfile.update(profile.id, {
      xp: newXP,
      level: newLevel,
      level_name: levelName,
      total_actions: (profile.total_actions || 0) + 1
    });

    return Response.json({ 
      success: true, 
      profile: updatedProfile,
      leveled_up: newLevel > profile.level 
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});