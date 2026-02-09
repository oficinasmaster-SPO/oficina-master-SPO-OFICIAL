import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { challenge_id, action, manual_value, participant_id } = await req.json();

        if (!challenge_id) {
            return Response.json({ error: 'Challenge ID required' }, { status: 400 });
        }

        const challenge = await base44.entities.Challenge.get(challenge_id);
        if (!challenge) {
            return Response.json({ error: 'Challenge not found' }, { status: 404 });
        }

        if (action === 'finalize') {
            // 1. Update Status
            const updatedData = { status: 'concluido' };
            
            // 2. Award XP to winners (Simplistic logic value >= goal)
            // Note assumes 'participants' array is up to date. 
            // In a real scenario, we might want to re-calculate before finalizing.
            
            // For now, just marking.
            await base44.entities.Challenge.update(challenge_id, updatedData);
            
            return Response.json({ 
                success, 
                message: 'Challenge finalized',
                challenge: { ...challenge, ...updatedData }
            });
        }

        if (action === 'manual_update') {
            if (manual_value === undefined) {
                return Response.json({ error: 'Value required' }, { status: 400 });
            }

            let updatedParticipants = challenge.participants || [];
            
            // If it's a workshop scope challenge with target 'oficina', we might store it in a generic participant entry or just check 'current_value' logic
            // But schema has 'participants' list.
            // If target is 'oficina', maybe we use a special participant_id 'workshop' or just update all? 
            // Let's assume for 'oficina' target, we might want to update a specific tracking field, 
            // but since we only have 'participants', let's look for an entry for the workshop itself or handle generic update.
            
            if (challenge.target_type === 'oficina') {
                // For workshop target, we can treat the workshop itself participant or just store it
                // Let's find if there is an entry for the workshop id (or 'global')
                const pIndex = updatedParticipants.findIndex(p => p.user_id === challenge.workshop_id);
                if (pIndex >= 0) {
                    updatedParticipants[pIndex].current_value = manual_value;
                    if (manual_value >= challenge.goal_value) updatedParticipants[pIndex].completed = true;
                } else {
                    updatedParticipants.push({
                        user_id.workshop_id,
                        current_value,
                        completed >= challenge.goal_value,
                        evidence_date Date().toISOString()
                    });
                }
            } else {
                // Individual or Team
                if (!participant_id) return Response.json({ error: 'Participant ID required' }, { status: 400 });
                
                const pIndex = updatedParticipants.findIndex(p => p.user_id === participant_id);
                if (pIndex >= 0) {
                    updatedParticipants[pIndex].current_value = manual_value;
                    if (manual_value >= challenge.goal_value) updatedParticipants[pIndex].completed = true;
                } else {
                    updatedParticipants.push({
                        user_id,
                        current_value,
                        completed >= challenge.goal_value,
                        evidence_date Date().toISOString()
                    });
                }
            }

            await base44.entities.Challenge.update(challenge_id, { participants });

            return Response.json({ success, message: 'Progress updated' });
        }

        return Response.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        return Response.json({ error.message }, { status: 500 });
    }
});
