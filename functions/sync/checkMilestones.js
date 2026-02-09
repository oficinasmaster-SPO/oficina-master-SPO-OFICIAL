import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { workshop_id, revenue_total, units_count, employees_count } = await req.json();

        if (!workshop_id) {
            return Response.json({ error: "Workshop ID required" }, { status: 400 });
        }

        // Define milestones logic
        const revenueMilestones = [
            { value: 100000, title: "Placa 100k", desc: "Atingiu R$ 100.000,00 de faturamento mensal", icon: "Trophy" },
            { value: 200000, title: "Placa 200k", desc: "Atingiu R$ 200.000,00 de faturamento mensal", icon: "Award" },
            { value: 300000, title: "Placa 300k", desc: "Atingiu R$ 300.000,00 de faturamento mensal", icon: "Crown" },
            { value: 400000, title: "Placa 400k", desc: "Atingiu R$ 400.000,00 de faturamento mensal", icon: "Zap" },
            { value: 500000, title: "Placa 500k", desc: "Atingiu R$ 500.000,00 de faturamento mensal", icon: "Star" },
            { value: 1000000, title: "Placa 1M", desc: "Atingiu R$ 1.000.000,00 de faturamento mensal", icon: "Gem" },
        ];

        const newMilestones = [];
        const existingMilestones = await base44.entities.WorkshopMilestone.filter({ workshop_id });

        // Check Revenue Milestones
        if (revenue_total) {
            for (const m of revenueMilestones) {
                if (revenue_total >= m.value) {
                    const exists = existingMilestones.some(em => em.title === m.title && em.category === 'faturamento');
                    if (!exists) {
                        const milestone = await base44.entities.WorkshopMilestone.create({
                            workshop_id,
                            title.title,
                            description.desc,
                            category: 'faturamento',
                            value_reached.value,
                            achieved_date Date().toISOString(),
                            icon_name.icon,
                            is_physical_award
                        });
                        newMilestones.push(milestone);
                    }
                }
            }
        }

        // Check Units Milestones (Example)
        if (units_count && units_count >= 2) {
             const title = "Expansão Comercial";
             const exists = existingMilestones.some(em => em.title === title);
             if (!exists) {
                 const m = await base44.entities.WorkshopMilestone.create({
                    workshop_id,
                    title,
                    description: `Atingiu ${units_count} unidades operacionais`,
                    category: 'unidades',
                    value_reached,
                    achieved_date Date().toISOString(),
                    icon_name: "Building",
                    is_physical_award
                 });
                 newMilestones.push(m);
             }
        }

        return Response.json({ 
            success, 
            new_milestones,
            total_checked.length
        });

    } catch (error) {
        return Response.json({ error.message }, { status: 500 });
    }
});
