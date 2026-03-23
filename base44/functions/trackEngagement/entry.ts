import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Verificar autenticação
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Ler dados da requisição
        const { activityType, details, workshopId } = await req.json();

        if (!activityType) {
            return Response.json({ error: 'Activity type is required' }, { status: 400 });
        }

        // Configuração de XP por atividade
        const xpMap = {
            'login': 5,
            'form_submission': 50, // Ex: completar CDC, COEX
            'daily_log_submission': 20, // Registro diário
            'challenge_completion': 100, // Completar desafio
            'training_completion': 150, // Completar curso
            'feature_usage': 10 // Usar uma feature importante pela primeira vez
        };

        const xpEarned = xpMap[activityType] || 0;
        const targetWorkshopId = workshopId || user.workshop_id;

        // 1. Registrar Log de Atividade
        await base44.entities.UserActivityLog.create({
            user_id: user.id,
            workshop_id: targetWorkshopId,
            activity_type: activityType,
            xp_earned: xpEarned,
            details: JSON.stringify(details || {})
        });

        // 2. Atualizar Perfil de Jogo do Usuário (UserGameProfile)
        const userProfiles = await base44.entities.UserGameProfile.filter({ user_id: user.id });
        let userProfile = userProfiles[0];

        if (userProfile) {
            const newXp = (userProfile.xp || 0) + xpEarned;
            // Lógica de Nível: Nível = 1 + raiz quadrada de (XP / 100) - progressão não linear simples ou linear a cada 1000
            // Vamos usar linear a cada 1000 XP para simplificar visualização
            const newLevel = Math.floor(newXp / 1000) + 1;
            
            const levelNames = ["Iniciante", "Bronze", "Prata", "Ouro", "Diamante", "Elite Master"];
            const levelNameIndex = Math.min(newLevel - 1, levelNames.length - 1);
            
            await base44.entities.UserGameProfile.update(userProfile.id, {
                xp: newXp,
                level: newLevel,
                level_name: levelNames[levelNameIndex],
                total_actions: (userProfile.total_actions || 0) + 1
            });
        } else {
            // Criar perfil se não existir
             await base44.entities.UserGameProfile.create({
                user_id: user.id,
                xp: xpEarned,
                level: 1,
                level_name: "Iniciante",
                total_actions: 1,
                workshop_id: targetWorkshopId
            });
        }

        // 3. Atualizar Perfil da Oficina (Gamificação em Equipe)
        if (targetWorkshopId) {
            const workshopProfiles = await base44.entities.WorkshopGameProfile.filter({ workshop_id: targetWorkshopId });
            const workshopProfile = workshopProfiles[0];

            if (workshopProfile) {
                const newWorkshopXp = (workshopProfile.xp || 0) + xpEarned;
                const newWorkshopLevel = Math.floor(newWorkshopXp / 5000) + 1; // Oficina sobe mais devagar
                
                const currentEngagement = workshopProfile.total_engagement_hours || 0;
                // Adiciona um pouco de tempo estimado baseado na ação (ex: 5 min por ação padrão)
                const timeAdded = 5 / 60; 

                await base44.entities.WorkshopGameProfile.update(workshopProfile.id, {
                    xp: newWorkshopXp,
                    level: newWorkshopLevel,
                    total_engagement_hours: currentEngagement + timeAdded
                });
            }
        }
        
        // 4. Atualizar Employee Engagement Score
        // Tenta encontrar o colaborador pelo email do usuário logado
        if (user.email) {
             const employees = await base44.entities.Employee.filter({ email: user.email });
             if (employees.length > 0) {
                 const emp = employees[0];
                 // Score de engajamento (0-100)
                 // Incremento pequeno para ser contínuo
                 let currentScore = emp.engagement_score || 0;
                 let increment = 0;
                 
                 if (activityType === 'login') increment = 0.5;
                 if (activityType === 'daily_log_submission') increment = 1;
                 if (activityType === 'form_submission') increment = 5;
                 if (activityType === 'challenge_completion') increment = 10;
                 
                 let newScore = Math.min(currentScore + increment, 100);
                 
                 if (increment > 0) {
                    await base44.entities.Employee.update(emp.id, {
                        engagement_score: Number(newScore.toFixed(2))
                    });
                 }
             }
        }

        return Response.json({ 
            success: true, 
            xpEarned, 
            message: `Activity tracked: ${activityType}` 
        });

    } catch (error) {
        console.error("Track Engagement Error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});