import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Buscar todos os workshops (sem limite para pegar todos)
        // O SDK pode paginar, mas vamos tentar pegar um numero alto suficiente
        const workshops = await base44.asServiceRole.entities.Workshop.list(null, 500);
        
        const parseJSON = (val) => { try { return typeof val === 'string' ? JSON.parse(val) : (val || {}); } catch { return {}; } };
        
        const cleanNum = (val) => {
            if (typeof val === 'number') return val;
            if (!val) return 0;
            // Lógica idêntica ao Dashboard.js
            let s = String(val).replace(/R\$|\s|&nbsp;/gi, '').trim();
            if (s.includes(',') && (!s.includes('.') || s.indexOf(',') > s.indexOf('.'))) {
                s = s.replace(/\./g, '').replace(',', '.');
            } else if (s.includes(',') && s.includes('.')) {
                s = s.replace(/,/g, '');
            }
            return parseFloat(s.replace(/[^0-9.-]/g, '')) || 0;
        };

        const companyList = workshops.map(w => {
            const goals = parseJSON(w.monthly_goals);
            const best = parseJSON(w.best_month_history);
            
            // Lógica "Vencedor" do Dashboard.js
            const revGoals = cleanNum(goals.actual_revenue_achieved) || (cleanNum(goals.revenue_parts) + cleanNum(goals.revenue_services));
            const revBest = cleanNum(best.revenue_total);
            const revenue = Math.max(revGoals, revBest);
            
            const ticketGoals = cleanNum(goals.average_ticket);
            const ticketBest = cleanNum(best.average_ticket);
            const ticket = Math.max(ticketGoals, ticketBest);

            return {
                name: w.name || "Sem Nome",
                revenue: revenue,
                ticket: ticket,
                city: w.city || "-",
                state: w.state || "-"
            };
        })
        .filter(w => w.revenue > 0) // Apenas empresas que contribuem para a média (revenue > 0)
        .sort((a, b) => b.revenue - a.revenue); // Ordenar do maior para o menor

        return Response.json({ 
            count: companyList.length, 
            companies: companyList 
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});