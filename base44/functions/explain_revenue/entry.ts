import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
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

        let totalSum = 0;
        const companies = workshops.map(w => {
            const goals = parseJSON(w.monthly_goals);
            const best = parseJSON(w.best_month_history);
            
            const revGoals = cleanNum(goals.actual_revenue_achieved) || (cleanNum(goals.revenue_parts) + cleanNum(goals.revenue_services));
            const revBest = cleanNum(best.revenue_total);
            const revenue = Math.max(revGoals, revBest);
            
            return {
                name: w.name || "Sem Nome",
                revenue: revenue,
                revenue_formatted: revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                sources: {
                    goals_actual: revGoals,
                    best_history: revBest
                }
            };
        });

        // The dashboard filters by state/segment, but defaults to 'all'. 
        // If the user sees 73, it likely matches the total count of workshops or a specific filter.
        // We will return all (or top contributors if too many) and the total count.
        
        // Calculate total exactly like dashboard
        totalSum = companies.reduce((sum, c) => sum + c.revenue, 0);

        // Sort by revenue
        const sortedCompanies = companies.filter(c => c.revenue > 0).sort((a, b) => b.revenue - a.revenue);
        const zeroRevenueCompanies = companies.filter(c => c.revenue === 0);

        return Response.json({
            total_workshops: workshops.length,
            total_revenue_raw: totalSum,
            total_revenue_formatted_k: (totalSum / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + 'k',
            companies_with_revenue: sortedCompanies,
            companies_zero_revenue_count: zeroRevenueCompanies.length
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});