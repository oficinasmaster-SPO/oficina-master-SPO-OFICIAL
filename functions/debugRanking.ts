import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const workshopId = '695408b3ed74bfeb60d708c0';
        
        // Fetch data
        const workshop = await base44.entities.Workshop.get(workshopId);
        
        // Simulate RankingBrasil logic
        const safeNum = (val) => {
            if (typeof val === 'number') return val;
            if (typeof val === 'string') {
                const parsed = parseFloat(val);
                return isNaN(parsed) ? 0 : parsed;
            }
            return 0;
        };

        const normalize = (data) => ({
            revenue_total: safeNum(data.revenue_total || data.actual_revenue_achieved || data.revenue),
            average_ticket: safeNum(data.average_ticket),
            profit_percentage: safeNum(data.profit_percentage),
            rentability: safeNum(data.rentability_percentage || (typeof data.r70_i30 === 'object' ? data.r70_i30.r70 : 0) || data.rentability),
        });

        const registeredBest = workshop.best_month_history || {};
        const normalized = normalize(registeredBest);
        
        return Response.json({
            workshop_name: workshop.name,
            best_month_history_raw: workshop.best_month_history,
            normalized_data: normalized,
            revenue_check: normalized.revenue_total
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});