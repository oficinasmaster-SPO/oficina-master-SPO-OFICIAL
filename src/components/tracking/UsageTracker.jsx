import { useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";

export default function UsageTracker({ user }) {
  const sessionStartRef = useRef(Date.now());
  const lastUpdateRef = useRef(Date.now());
  const isActiveRef = useRef(true);

  useEffect(() => {
    if (!user) return;

    // Detectar atividade do usuário
    const trackUserActivity = () => {
      isActiveRef.current = true;
      lastUpdateRef.current = Date.now();
    };

    // Eventos que indicam atividade
    window.addEventListener('mousemove', trackUserActivity);
    window.addEventListener('keydown', trackUserActivity);
    window.addEventListener('click', trackUserActivity);
    window.addEventListener('scroll', trackUserActivity);

    // Detectar inatividade (5 minutos sem interação)
    const inactivityCheck = setInterval(() => {
      const timeSinceLastActivity = Date.now() - lastUpdateRef.current;
      if (timeSinceLastActivity > 5 * 60 * 1000) {
        isActiveRef.current = false;
      }
    }, 60000); // Check a cada minuto

    // Atualizar tempo de uso a cada 5 minutos
    const updateUsage = async () => {
      if (!isActiveRef.current) return;

      const sessionTime = (Date.now() - sessionStartRef.current) / (1000 * 60 * 60); // em horas
      
      try {
        // Buscar ou criar UserGameProfile
        const profiles = await base44.entities.UserGameProfile.list();
        let userProfile = profiles.find(p => p.user_id === user.id);

        if (userProfile) {
          const newUsageHours = (userProfile.platform_usage_hours || 0) + (sessionTime / 12); // Incremento proporcional
          await base44.entities.UserGameProfile.update(userProfile.id, {
            platform_usage_hours: newUsageHours,
            total_actions: (userProfile.total_actions || 0) + 1
          });
        } else {
          await base44.entities.UserGameProfile.create({
            user_id: user.id,
            platform_usage_hours: sessionTime / 12,
            total_actions: 1,
            level: 1,
            level_name: "Iniciante",
            xp: 0
          });
        }

        // Atualizar WorkshopGameProfile se usuário tiver oficina
        if (user.workshop_id) {
          const workshopProfiles = await base44.entities.WorkshopGameProfile.list();
          let workshopProfile = workshopProfiles.find(p => p.workshop_id === user.workshop_id);

          if (workshopProfile) {
            const newEngagementHours = (workshopProfile.total_engagement_hours || 0) + (sessionTime / 12);
            await base44.entities.WorkshopGameProfile.update(workshopProfile.id, {
              total_engagement_hours: newEngagementHours
            });
          }
        }

        sessionStartRef.current = Date.now(); // Reset para próximo ciclo
      } catch (error) {
        console.error("Erro ao atualizar tempo de uso:", error);
      }
    };

    // Atualizar a cada 5 minutos
    const updateInterval = setInterval(updateUsage, 5 * 60 * 1000);

    // Atualizar ao sair da página
    const handleBeforeUnload = () => {
      updateUsage();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('mousemove', trackUserActivity);
      window.removeEventListener('keydown', trackUserActivity);
      window.removeEventListener('click', trackUserActivity);
      window.removeEventListener('scroll', trackUserActivity);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearInterval(inactivityCheck);
      clearInterval(updateInterval);
      updateUsage(); // Última atualização ao desmontar
    };
  }, [user]);

  return null; // Componente invisível
}