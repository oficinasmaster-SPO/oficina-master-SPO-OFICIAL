import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, FolderOpen, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { useProcessHierarchy } from "@/components/processos/useProcessHierarchy";
import AreaCard from "@/components/processos/AreaCard";
import MAPCard from "@/components/processos/MAPCard";
import ITCard from "@/components/processos/ITCard";
import AreaFormDialog from "@/components/processos/AreaFormDialog";
import MAPFormDialog from "@/components/processos/MAPFormDialog";
import ITFormDialog from "@/components/processos/ITFormDialog";
import ShareProcessDialog from "@/components/processes/ShareProcessDialog";

export default function BibliotecaProcessos() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedArea, setSelectedArea] = useState(null);
  const [selectedMAP, setSelectedMAP] = useState(null);
  
  const [areaDialogOpen, setAreaDialogOpen] = useState(false);
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [itDialogOpen, setItDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  
  const [editingArea, setEditingArea] = useState(null);
  const [editingMAP, setEditingMAP] = useState(null);
  const [editingIT, setEditingIT] = useState(null);
  const [shareTarget, setShareTarget] = useState(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      const workshops = await base44.entities.Workshop.filter({ owner_id: currentUser.id });
      setWorkshop(workshops[0]);
    } catch (e) {
      console.error(e);
    }
  };

  const { areas, maps, its, getITsByMap, getMapsByArea, isLoading } = useProcessHierarchy(workshop?.id);

  const areaM = useMutation({
    mutationFn: async (data) => {
      const payload = { ...data, workshop_id: workshop.id };
      return editingArea 
        ? await base44.entities.ProcessArea.update(editingArea.id, payload)
        : await base44.entities.ProcessArea.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['process-areas']);
      toast.success(editingArea ? "Área atualizada!" : "Área criada!");
      setAreaDialogOpen(false);
      setEditingArea(null);
    }
  });

  const mapM = useMutation({
    mutationFn: async (data) => {
      const payload = { ...data, workshop_id: workshop.id };
      return editingMAP
        ? await base44.entities.ProcessMAP.update(editingMAP.id, payload)
        : await base44.entities.ProcessMAP.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['process-maps']);
      toast.success(editingMAP ? "MAP atualizado!" : "MAP criado!");
      setMapDialogOpen(false);
      setEditingMAP(null);
    }
  });

  const itM = useMutation({
    mutationFn: async (data) => {
      const payload = { ...data, map_id: selectedMAP.id };
      return editingIT
        ? await base44.entities.ProcessIT.update(editingIT.id, payload)
        : await base44.entities.ProcessIT.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['process-its']);
      toast.success(editingIT ? "IT atualizada!" : "IT criada!");
      setItDialogOpen(false);
      setEditingIT(null);
    }
  });

  const deleteM = useMutation({
    mutationFn: async ({ type, id }) => {
      const entityMap = {
        area: 'ProcessArea',
        map: 'ProcessMAP',
        it: 'ProcessIT'
      };
      return await base44.entities[entityMap[type]].delete(id);
    },
    onSuccess: (_, { type }) => {
      queryClient.invalidateQueries([`process-${type}s`]);
      toast.success("Removido!");
      if (type === 'map') setSelectedMAP(null);
    }
  });

  const filteredAreas = areas.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentMaps = selectedArea ? getMapsByArea(selectedArea.id) : [];
  const currentITs = selectedMAP ? getITsByMap(selectedMAP.id) : [];

  if (!user || !workshop) return <div className="p-8 text-center">Carregando...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate(createPageUrl('Home'))}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Biblioteca de Processos (MAPs)</h1>
              <p className="text-gray-600">Gestão hierárquica: Áreas → MAPs → ITs → Documentos</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="areas" className="space-y-6">
          <TabsList>
            <TabsTrigger value="areas" onClick={() => { setSelectedArea(null); setSelectedMAP(null); }}>
              Áreas ({areas.length})
            </TabsTrigger>
            {selectedArea && (
              <TabsTrigger value="maps">
                {selectedArea.name} - MAPs ({currentMaps.length})
              </TabsTrigger>
            )}
            {selectedMAP && (
              <TabsTrigger value="its">
                {selectedMAP.code} - ITs ({currentITs.length})
              </TabsTrigger>
            )}
          </TabsList>

          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button onClick={() => {
              if (selectedMAP) { setEditingIT(null); setItDialogOpen(true); }
              else if (selectedArea) { setEditingMAP(null); setMapDialogOpen(true); }
              else { setEditingArea(null); setAreaDialogOpen(true); }
            }}>
              <Plus className="w-4 h-4 mr-2" />
              {selectedMAP ? 'Nova IT' : selectedArea ? 'Novo MAP' : 'Nova Área'}
            </Button>
          </div>

          <TabsContent value="areas">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {filteredAreas.map(area => (
                <AreaCard
                  key={area.id}
                  area={area}
                  mapsCount={getMapsByArea(area.id).length}
                  onSelect={() => { setSelectedArea(area); }}
                  onEdit={() => { setEditingArea(area); setAreaDialogOpen(true); }}
                  onDelete={() => {
                    if (confirm('Remover área?')) deleteM.mutate({ type: 'area', id: area.id });
                  }}
                  canManage={true}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="maps">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentMaps.map(map => (
                <MAPCard
                  key={map.id}
                  map={map}
                  itsCount={getITsByMap(map.id).length}
                  onView={() => navigate(createPageUrl('VisualizarMAP') + `?id=${map.id}`)}
                  onEdit={() => { setEditingMAP(map); setMapDialogOpen(true); }}
                  onDelete={() => {
                    if (confirm('Remover MAP?')) deleteM.mutate({ type: 'map', id: map.id });
                  }}
                  onAddIT={() => { setSelectedMAP(map); setEditingIT(null); setItDialogOpen(true); }}
                  onShare={() => { setShareTarget(map); setShareDialogOpen(true); }}
                  canManage={true}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="its">
            <div className="space-y-3">
              {currentITs.map(it => (
                <ITCard
                  key={it.id}
                  it={it}
                  supportDocsCount={0}
                  onView={() => navigate(createPageUrl('VisualizarIT') + `?id=${it.id}`)}
                  onEdit={() => { setEditingIT(it); setItDialogOpen(true); }}
                  onDelete={() => {
                    if (confirm('Remover IT?')) deleteM.mutate({ type: 'it', id: it.id });
                  }}
                  onAddDoc={() => {}}
                  canManage={true}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <AreaFormDialog
          open={areaDialogOpen}
          onClose={() => { setAreaDialogOpen(false); setEditingArea(null); }}
          onSubmit={(data) => areaM.mutate(data)}
          area={editingArea}
          isLoading={areaM.isPending}
        />

        <MAPFormDialog
          open={mapDialogOpen}
          onClose={() => { setMapDialogOpen(false); setEditingMAP(null); }}
          onSubmit={(data) => mapM.mutate(data)}
          map={editingMAP}
          areaId={selectedArea?.id}
          areas={areas}
          isLoading={mapM.isPending}
        />

        <ITFormDialog
          open={itDialogOpen}
          onClose={() => { setItDialogOpen(false); setEditingIT(null); }}
          onSubmit={(data) => itM.mutate(data)}
          it={editingIT}
          mapCode={selectedMAP?.code}
          isLoading={itM.isPending}
        />

        <ShareProcessDialog
          open={shareDialogOpen}
          onClose={() => { setShareDialogOpen(false); setShareTarget(null); }}
          process={shareTarget}
          workshop={workshop}
        />
      </div>
    </div>
  );
}