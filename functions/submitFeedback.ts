import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
        });
    }

    try {
        const base44 = createClientFromRequest(req);
        const body = await req.json();
        
        const { workshop_id, nps_score, sales_service_clarity_score, comment, customer_name, customer_phone, area, employee_id } = body;

        if (!workshop_id || nps_score === undefined) {
            return Response.json({ error: 'Workshop ID and NPS Score are required' }, { status: 400 });
        }

        // Use service role to bypass potential RLS strictness if needed, 
        // though we set create: true in schema, this is safer for validation
        const feedback = await base44.asServiceRole.entities.CustomerFeedback.create({
            workshop_id,
            nps_score: parseInt(nps_score),
            sales_service_clarity_score: sales_service_clarity_score !== undefined ? parseInt(sales_service_clarity_score) : null,
            comment: comment || "",
            customer_name: customer_name || "Anônimo",
            customer_phone: customer_phone || "",
            area: area || "geral",
            employee_id: employee_id || null,
            contacted: false
        });

        return Response.json({ success: true, data: feedback }, {
            headers: { 'Access-Control-Allow-Origin': '*' }
        });

    } catch (error) {
        return Response.json({ error: error.message }, { 
            status: 500,
            headers: { 'Access-Control-Allow-Origin': '*' }
        });
    }
});