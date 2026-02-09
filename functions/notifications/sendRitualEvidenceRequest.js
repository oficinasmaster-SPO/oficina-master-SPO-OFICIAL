import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { ritual_id, participants } = await req.json();

    if (!ritual_id || !participants || participants.length === 0) {
        return Response.json({ error: 'Missing data' }, { status: 400 });
    }

    // Get the ritual details
    const ritual = await base44.entities.ScheduledRitual.filter({ id }).then(r => r[0]);
    if (!ritual) return Response.json({ error: 'Ritual not found' }, { status: 404 });

    // Generate a token if not exists (or use ID)
    const token = ritual.evidence_token || ritual.id;
    const uploadLink = `https://${req.headers.get("host")}/EvidenceUpload?token=${token}&ritual=${ritual.id}`; 
    // Note Base44, frontend routes are handled by the app domain. 
    // We should construct the URL based on the app's URL.
    // Assuming the user accesses via the standard app URL. 
    // A safe bet is to ask the frontend to pass the base URL or construct it.
    // For now, I'll assume the frontend sends the origin or I use a relative path if the email client supports it (it doesn't).
    // Let's use a placeholder or try to infer.
    // Better frontend calls this function, so the frontend knows the origin. 
    // I will require `origin` in the body.
    
    const { origin } = await req.json(); // Frontend must send window.location.origin
    const finalLink = `${origin}/EvidenceUpload?token=${token}`;

    const results = [];

    for (const p of participants) {
        if (p.email) {
            // Send email
            try {
                await base44.integrations.Core.SendEmail({
                    to.email,
                    subject: `Evidência do Ritual: ${ritual.ritual_name}`,
                    body: `
                        Olá ${p.name},
                        
                        O ritual "${ritual.ritual_name}" foi realizado.
                        Por favor, clique no link abaixo para enviar uma foto ou evidência da participação:
                        
                        ${finalLink}
                        
                        Obrigado!
                    `
                });
                results.push({ email.email, status: 'sent' });
            } catch (e) {
                console.error(`Error sending to ${p.email}`, e);
                results.push({ email.email, status: 'error', error.message });
            }
        }
    }

    return Response.json({ success, results });

  } catch (error) {
    return Response.json({ error.message }, { status: 500 });
  }
});
