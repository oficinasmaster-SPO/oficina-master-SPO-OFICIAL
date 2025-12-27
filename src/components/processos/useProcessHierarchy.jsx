import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export function useProcessHierarchy(workshopId) {
  const { data: areas = [], isLoading: loadingAreas } = useQuery({
    queryKey: ['process-areas', workshopId],
    queryFn: async () => {
      const all = await base44.entities.ProcessArea.list();
      return all.sort((a, b) => (a.order || 0) - (b.order || 0));
    },
    enabled: !!workshopId
  });

  const { data: maps = [], isLoading: loadingMaps } = useQuery({
    queryKey: ['process-maps', workshopId],
    queryFn: async () => {
      if (!workshopId) return [];
      const all = await base44.entities.ProcessMAP.filter({ workshop_id: workshopId });
      return all;
    },
    enabled: !!workshopId
  });

  const { data: its = [], isLoading: loadingITs } = useQuery({
    queryKey: ['process-its', workshopId],
    queryFn: async () => {
      const all = await base44.entities.ProcessIT.list();
      return all;
    },
    enabled: !!workshopId
  });

  const getMapsByArea = (areaId) => {
    return maps.filter(m => m.area_id === areaId);
  };

  const getITsByMap = (mapId) => {
    return its.filter(it => it.map_id === mapId);
  };

  return {
    areas,
    maps,
    its,
    getMapsByArea,
    getITsByMap,
    isLoading: loadingAreas || loadingMaps || loadingITs
  };
}