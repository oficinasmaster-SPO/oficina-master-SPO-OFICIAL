import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        // Autenticação básica (opcional se for chamado via ferramenta de teste interno, mas boa prática)
        // const user = await base44.auth.me(); 
        
        // Listar todos os workshops com paginação para garantir (embora list traga tudo por padrão no sdk se não paginado explicitamente, vamos garantir)
        // O SDK .list() traz padrão 50. Precisamos de todos.
        // Vamos fazer um loop simples ou aumentar o limit se possível, mas o sdk .list aceita (sort, limit).
        // Vamos pegar 1000 para garantir.
        const workshops = await base44.asServiceRole.entities.Workshop.list(null, 1000);
        
        const parseJSON = (val) => { try { return typeof val === 'string' ? JSON.parse(val) : (val || {}); } catch { return {}; } };
        const cleanNum = (val) => {
            if (typeof val === 'number') return val;
            if (!val) return 0;
            let s = String(val).replace(/R\$|\s|&nbsp;/gi, '').trim();
            if (s.includes(',') && (!s.includes('.') || s.indexOf(',') > s.indexOf('.'))) s = s.replace(/\./g, '').replace(',', '.');
            else if (s.includes(',') && s.includes('.')) s = s.replace(/,/g, '');
            return parseFloat(s.replace(/[^0-9.-]/g, '')) || 0;
        };

        const ranking = workshops.map(w => {
            const goals = parseJSON(w.monthly_goals);
            const best = parseJSON(w.best_month_history);
            
            // Lógica "Vencedor" do Dashboard.js
            const revGoals = cleanNum(goals.actual_revenue_achieved) || (cleanNum(goals.revenue_parts) + cleanNum(goals.revenue_services));
            const revBest = cleanNum(best.revenue_total);
            const revenue = Math.max(revGoals, revBest);
            
            return {
                id: w.id,
                name: w.name,
                revenue: revenue,
                revenue_formatted: revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
            };
        })
        .filter(w => w.revenue > 0)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 50); // Top 50

        return Response.json({ count: ranking.length, top_contributors: ranking });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});