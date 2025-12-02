import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { survey_id, employees, origin } = await req.json();

    if (!survey_id || !employees || employees.length === 0) {
        return Response.json({ error: 'Missing data' }, { status: 400 });
    }

    const survey = await base44.entities.CompanyClimate.filter({ id: survey_id }).then(r => r[0]);
    if (!survey) return Response.json({ error: 'Survey not found' }, { status: 404 });

    const results = [];

    for (const emp of employees) {
        if (emp.email) {
            const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
            
            // Create Invite
            await base44.entities.ClimateSurveyInvite.create({
                workshop_id: survey.workshop_id,
                survey_id: survey.id,
                employee_id: emp.id,
                employee_name: emp.name,
                email: emp.email,
                token: token,
                status: 'enviado',
                sent_at: new Date().toISOString()
            });

            const link = `${origin}/ResponderClima?token=${token}`;

            // Send Email
            try {
                await base44.integrations.Core.SendEmail({
                    to: emp.email,
                    subject: `Pesquisa de Clima Organizacional - Confidencial`,
                    body: `
                        Olá ${emp.name},
                        
                        Sua opinião é muito importante para nós!
                        Por favor, participe da nossa Pesquisa de Clima Organizacional.
                        
                        Suas respostas serão tratadas de forma confidencial.
                        
                        Acesse o link abaixo para responder:
                        ${link}
                        
                        Obrigado!
                    `
                });
                results.push({ email: emp.email, status: 'sent' });
            } catch (e) {
                console.error(`Error sending to ${emp.email}`, e);
                results.push({ email: emp.email, status: 'error', error: e.message });
            }
        }
    }

    return Response.json({ success: true, results });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});