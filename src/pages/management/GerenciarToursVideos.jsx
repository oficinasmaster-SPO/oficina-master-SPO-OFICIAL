import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Video, Map, Plus, Edit2, Trash2, Save } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function GerenciarToursVideos() {
  const queryClient = useQueryClient();
  const [editingItem, setEditingItem] = useState(null);
  const [showDialog, setShowDialog] = useState(false);

  // Queries
  const { data: tours = [], isLoading: loadingTours } = useQuery({
    queryKey: ['help-tours'],
    queryFn: async () => {
      try {
        return await base44.entities.HelpTour.list();
      } catch {
        return [];
      }
    }
  });

  const { data: videos = [], isLoading: loadingVideos } = useQuery({
    queryKey: ['help-videos'],
    queryFn: async () => {
      try {
        return await base44.entities.HelpVideo.list();
      } catch {
        return [];
      }
    }
  });

  // Mutations
  const saveTourMutation = useMutation({
    mutationFn: (data) => {
      if (data.id) {
        return base44.entities.HelpTour.update(data.id, data);
      }
      return base44.entities.HelpTour.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['help-tours']);
      setShowDialog(false);
      setEditingItem(null);
      toast.success("Tour salvo!");
    },
    onError: () => toast.error("Erro ao salvar tour")
  });

  const saveVideoMutation = useMutation({
    mutationFn: (data) => {
      if (data.id) {
        return base44.entities.HelpVideo.update(data.id, data);
      }
      return base44.entities.HelpVideo.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['help-videos']);
      setShowDialog(false);
      setEditingItem(null);
      toast.success("Vídeo salvo!");
    },
    onError: () => toast.error("Erro ao salvar vídeo")
  });

  const deleteTourMutation = useMutation({
    mutationFn: (id) => base44.entities.HelpTour.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['help-tours']);
      toast.success("Tour excluído!");
    }
  });

  const deleteVideoMutation = useMutation({
    mutationFn: (id) => base44.entities.HelpVideo.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['help-videos']);
      toast.success("Vídeo excluído!");
    }
  });

  const handleEditTour = (tour) => {
    setEditingItem({ ...tour, type: 'tour' });
    setShowDialog(true);
  };

  const handleEditVideo = (video) => {
    setEditingItem({ ...video, type: 'video' });
    setShowDialog(true);
  };

  const handleNewTour = () => {
    setEditingItem({
      type: 'tour',
      tour_id: '',
      page_name: '',
      steps: [],
      enabled: true
    });
    setShowDialog(true);
  };

  const handleNewVideo = () => {
    setEditingItem({
      type: 'video',
      page_name: '',
      title: '',
      description: '',
      video_url: '',
      faqs: [],
      enabled: true
    });
    setShowDialog(true);
  };

  if (loadingTours || loadingVideos) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Gerenciar Tours e Vídeos de Ajuda
          </h1>
          <p className="text-gray-600">
            Configure tours guiados e vídeos explicativos para cada módulo da plataforma
          </p>
        </div>

        <Tabs defaultValue="tours" className="space-y-6">
          <TabsList>
            <TabsTrigger value="tours">Tours Guiados</TabsTrigger>
            <TabsTrigger value="videos">Vídeos de Ajuda</TabsTrigger>
          </TabsList>

          {/* Tours */}
          <TabsContent value="tours">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Map className="w-5 h-5" />
                    Tours Guiados
                  </CardTitle>
                  <Button onClick={handleNewTour} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Tour
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tours.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">Nenhum tour cadastrado</p>
                  ) : (
                    tours.map((tour) => (
                      <div key={tour.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-semibold text-gray-900">{tour.page_name}</h3>
                            <Badge variant={tour.enabled ? "default" : "secondary"}>
                              {tour.enabled ? "Ativo" : "Inativo"}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">
                            ID: {tour.tour_id} • {tour.steps?.length || 0} etapas
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEditTour(tour)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => confirm("Excluir tour?") && deleteTourMutation.mutate(tour.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Vídeos */}
          <TabsContent value="videos">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Video className="w-5 h-5" />
                    Vídeos de Ajuda
                  </CardTitle>
                  <Button onClick={handleNewVideo} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Vídeo
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {videos.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">Nenhum vídeo cadastrado</p>
                  ) : (
                    videos.map((video) => (
                      <div key={video.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-semibold text-gray-900">{video.title}</h3>
                            <Badge variant={video.enabled ? "default" : "secondary"}>
                              {video.enabled ? "Ativo" : "Inativo"}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">
                            {video.page_name} • {video.faqs?.length || 0} FAQs
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEditVideo(video)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => confirm("Excluir vídeo?") && deleteVideoMutation.mutate(video.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialog de Edição */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingItem?.id ? 'Editar' : 'Novo'} {editingItem?.type === 'tour' ? 'Tour' : 'Vídeo'}
              </DialogTitle>
            </DialogHeader>
            
            {editingItem?.type === 'tour' ? (
              <TourForm 
                data={editingItem} 
                onSave={(data) => saveTourMutation.mutate(data)}
                onCancel={() => setShowDialog(false)}
              />
            ) : (
              <VideoForm 
                data={editingItem} 
                onSave={(data) => saveVideoMutation.mutate(data)}
                onCancel={() => setShowDialog(false)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function TourForm({ data, onSave, onCancel }) {
  const [formData, setFormData] = useState(data);

  return (
    <div className="space-y-4">
      <div>
        <Label>ID do Tour</Label>
        <Input
          value={formData.tour_id}
          onChange={(e) => setFormData({ ...formData, tour_id: e.target.value })}
          placeholder="ex: dashboard_tour"
        />
      </div>
      <div>
        <Label>Nome da Página</Label>
        <Input
          value={formData.page_name}
          onChange={(e) => setFormData({ ...formData, page_name: e.target.value })}
          placeholder="ex: Dashboard"
        />
      </div>
      <div className="flex items-center justify-between">
        <Label>Ativo</Label>
        <Switch
          checked={formData.enabled}
          onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
        />
      </div>
      <div className="flex gap-2 pt-4">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
        <Button onClick={() => onSave(formData)} className="flex-1 bg-blue-600">
          <Save className="w-4 h-4 mr-2" />
          Salvar
        </Button>
      </div>
    </div>
  );
}

function VideoForm({ data, onSave, onCancel }) {
  const [formData, setFormData] = useState(data);

  return (
    <div className="space-y-4">
      <div>
        <Label>Nome da Página</Label>
        <Input
          value={formData.page_name}
          onChange={(e) => setFormData({ ...formData, page_name: e.target.value })}
          placeholder="ex: Dashboard"
        />
      </div>
      <div>
        <Label>Título</Label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Como usar o Dashboard"
        />
      </div>
      <div>
        <Label>Descrição</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
        />
      </div>
      <div>
        <Label>URL do Vídeo (embed)</Label>
        <Input
          value={formData.video_url}
          onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
          placeholder="https://www.youtube.com/embed/..."
        />
      </div>
      <div className="flex items-center justify-between">
        <Label>Ativo</Label>
        <Switch
          checked={formData.enabled}
          onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
        />
      </div>
      <div className="flex gap-2 pt-4">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
        <Button onClick={() => onSave(formData)} className="flex-1 bg-blue-600">
          <Save className="w-4 h-4 mr-2" />
          Salvar
        </Button>
      </div>
    </div>
  );
}
