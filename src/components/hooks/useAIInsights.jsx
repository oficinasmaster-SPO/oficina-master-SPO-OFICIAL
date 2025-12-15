import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export const useAIInsights = (context = 'general', workshopId = null) => {
  return useQuery({
    queryKey: ['ai-insights', context, workshopId],
    queryFn: async () => {
      try {
        const response = await base44.functions.invoke('generateAIInsights', {
          context,
          workshop_id: workshopId
        });

        if (!response?.data?.insights) {
          return [];
        }

        return response.data.insights;
      } catch (error) {
        console.error('Error fetching AI insights:', error);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: 1
  });
};