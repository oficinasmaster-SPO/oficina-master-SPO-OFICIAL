import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export function useProcessHierarchy(workshopId) {
  const { data: areas = [], isLoading: loadingAreas } = useQuery({
    queryKey: ['process-areas', workshopId],
    queryFn: async () => {
      const allAreas = await base44.entities.ProcessArea.list();
      return allAreas.filter(a => !a.workshop_id || a.workshop_id === workshopId);
    },
    enabled: !!workshopId
  });

  const { data: maps = [], isLoading: loadingMaps } = useQuery({
    queryKey: ['process-maps', workshopId],
    queryFn: async () => {
      return await base44.entities.ProcessMAP.filter({ workshop_id: workshopId });
    },
    enabled: !!workshopId
  });

  const { data: its = [], isLoading: loadingITs } = useQuery({
    queryKey: ['process-its', workshopId],
    queryFn: async () => {
      return await base44.entities.ProcessIT.list();
    },
    enabled: !!workshopId
  });

  const { data: supportDocs = [], isLoading: loadingDocs } = useQuery({
    queryKey: ['process-support-docs', workshopId],
    queryFn: async () => {
      return await base44.entities.ProcessSupportDoc.list();
    },
    enabled: !!workshopId
  });

  const getITsByMap = (mapId) => {
    return its.filter(it => it.map_id === mapId);
  };

  const getSupportDocsByParent = (parentType, parentId) => {
    return supportDocs.filter(doc => 
      doc.parent_type === parentType && doc.parent_id === parentId
    );
  };

  const getMapsByArea = (areaId) => {
    return maps.filter(map => map.area_id === areaId);
  };

  return {
    areas,
    maps,
    its,
    supportDocs,
    isLoading: loadingAreas || loadingMaps || loadingITs || loadingDocs,
    getITsByMap,
    getSupportDocsByParent,
    getMapsByArea
  };
}