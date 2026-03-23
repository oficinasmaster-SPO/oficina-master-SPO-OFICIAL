import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get parameters
        const { workshop_id, period } = await req.json();
        
        if (!workshop_id) {
            return Response.json({ error: 'Workshop ID required' }, { status: 400 });
        }

        const currentPeriod = period || new Date().toISOString().slice(0, 7); // YYYY-MM

        // 1. Get all employees for the workshop
        const employees = await base44.entities.Employee.filter({ workshop_id });
        
        if (!employees.length) {
            return Response.json({ message: 'No employees found' });
        }

        // 2. Get logs for the period
        // Filter logic usually needs date range, here assuming we filter by string match or date range if supported
        // For simplicity fetching logs and filtering in memory if specific date filter isn't perfect
        const allLogs = await base44.entities.DailyProductivityLog.filter({ 
            workshop_id,
            // Simple optimization: fetch mostly recent logs. Ideally DB supports date range.
        });
        
        const periodLogs = allLogs.filter(log => log.date.startsWith(currentPeriod));

        // 3. Calculate scores for each employee
        const rankings = [];

        for (const emp of employees) {
            const empLogs = periodLogs.filter(l => l.employee_id === emp.id);
            const logsCount = empLogs.length;
            
            // Calculate productivity score from logs (sum of values, weighted)
            // This is a simplified logic. Real logic would depend on metric types.
            let prodScore = 0;
            empLogs.forEach(log => {
                if (log.entries) {
                    log.entries.forEach(entry => {
                        // Attempt to parse value if number
                        const val = parseFloat(entry.value);
                        if (!isNaN(val)) {
                            prodScore += val; // Simple sum
                        }
                    });
                }
            });

            // Engagement Score: Based on logs count + generic platform usage (mocked from Employee score)
            const engagementScore = (logsCount * 10) + (emp.engagement_score || 0);

            // Training Score
            const trainingsCompleted = emp.courses_completed ? emp.courses_completed.length : 0;
            const trainingScore = trainingsCompleted * 50;
            // Mocking average grade as it's not in Employee entity
            const avgGrade = 8.5; 

            const totalScore = prodScore + engagementScore + trainingScore;

            rankings.push({
                workshop_id,
                employee_id: emp.id,
                period: currentPeriod,
                area: emp.area || 'Outros',
                job_role: emp.job_role || 'Outros',
                productivity_score: prodScore,
                engagement_score: engagementScore,
                training_score: trainingScore,
                total_score: totalScore,
                daily_logs_count: logsCount,
                trainings_completed: trainingsCompleted,
                average_training_grade: avgGrade
            });
        }

        // 4. Sort and Assign Ranks (Global)
        rankings.sort((a, b) => b.total_score - a.total_score);
        
        // 5. Save/Update Rankings in DB
        // First, get existing rankings for this period to update them instead of creating dupes
        const existingRankings = await base44.entities.ProductivityRanking.filter({ 
            workshop_id, 
            period: currentPeriod 
        });

        const updates = [];
        const creations = [];

        for (const rank of rankings) {
            const existing = existingRankings.find(r => r.employee_id === rank.employee_id);
            if (existing) {
                await base44.entities.ProductivityRanking.update(existing.id, rank);
            } else {
                creations.push(rank);
            }
        }

        if (creations.length > 0) {
            await base44.entities.ProductivityRanking.bulkCreate(creations);
        }

        return Response.json({ 
            success: true, 
            processed: employees.length,
            rankings: rankings 
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});