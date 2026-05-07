import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Plus, Pencil, Copy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import WheelLoader from '@/components/ui/WheelLoader';
import TrailEditModal from './modals/TrailEditModal';
import TrailCreateModal from './modals/TrailCreateModal';

export default function TrailsTab({ workshopId, onAudit }) {
  const [trails, setTrails] = useState([]);
  const [expandedTrail, setExpandedTrail] = useState(null);
  const [editingTrail, setEditingTrail] = useState(null);
  const [showNewTrail, setShowNewTrail] = useState(false);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  // P0-A02: Busca trilhas filtradas por workshop
  const { data: allTrails = [], isLoading, error } = useQuery({
    queryKey: ['allCronogramaTemplates', workshopId],
    queryFn: async () => {
      try {
        const data = workshopId 
          ? await base44.entities.CronogramaTemplate.filter({ workshop_id: workshopId }, '-updated_date', 100)
          : await base44.entities.CronogramaTemplate.list('-updated_date', 100);
        return data || [];
      } catch (error) {
        console.error('Erro ao carregar trilhas:', error);
        toast.error('Erro ao carregar trilhas');
        return [];
      }
    },
    staleTime: 5 * 1000,
    enabled: !!workshopId,
  });

  // Consolidar trilhas
  React.useEffect(() => {
    const trailsMap = new Map();
    allTrails.forEach(trail => {
      if (!trailsMap.has(trail.id)) {
        trailsMap.set(trail.id, {
          id: trail.id,
          name: trail.nome_fase,
          objetivo_geral: trail.objetivo_geral || '',
          missions: trail.missoes_selecionadas || [],
          source: `${trail.workshop_id}`,
          createdAt: trail.created_date,
        });
      }
    });
    setTrails(Array.from(trailsMap.values()));
  }, [allTrails]);

  const handleDuplicateTrail = async (trail) => {
    setCreating(true);
    try {
      const newTrail = {
        nome_fase: `${trail.name} (cópia)`,
        objetivo_geral: trail.objetivo_geral,
        missoes_selecionadas: trail.missions,
        fase_oficina: 1,
        ativo: true,
      };
      await base44.entities.CronogramaTemplate.create(newTrail);
      queryClient.invalidateQueries({ queryKey: ['allCronogramaTemplates'] });
      onAudit?.('duplicate_trail', { trail_id: trail.id, trail_name: trail.name });
      toast.success('Trilha duplicada com sucesso!');
    } catch (error) {
      console.error('Erro ao duplicar trilha:', error);
      toast.error('Erro ao duplicar trilha');
    } finally {
      setCreating(false);
    }
  };

  const handleSaveTrail = async (data) => {
    setSaving(true);
    try {
      await base44.entities.CronogramaTemplate.update(editingTrail.id, {
        nome_fase: data.nome_fase,
        objetivo_geral: data.objetivo_geral,
        missoes_selecionadas: data.missoes_selecionadas || [],
      });
      queryClient.invalidateQueries({ queryKey: ['allCronogramaTemplates'] });
      onAudit?.('update_trail', { trail_id: editingTrail.id, trail_name: data.nome_fase });
      toast.success('Trilha atualizada!');
      setEditingTrail(null);
    } catch (error) {
      console.error('Erro ao salvar trilha:', error);
      toast.error('Erro ao salvar trilha');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTrail = async (data) => {
    setCreating(true);
    try {
      await base44.entities.CronogramaTemplate.create({
        nome_fase: data.nome_fase,
        objetivo_geral: data.objetivo_geral,
        missoes_selecionadas: data.missoes_selecionadas,
        fase_oficina: 1,
        ativo: true,
      });
      queryClient.invalidateQueries({ queryKey: ['allCronogramaTemplates'] });
      onAudit?.('create_trail', { trail_name: data.nome_fase });
      toast.success('Trilha criada!');
      setShowNewTrail(false);
    } catch (error) {
      console.error('Erro ao criar trilha:', error);
      toast.error('Erro ao criar trilha');
    } finally {
      setCreating(false);
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-red-600 font-semibold">Erro ao carregar trilhas</p>
          <p className="text-gray-600 text-sm mt-1">Tente recarregar a página</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <WheelLoader size="lg" text="Carregando trilhas..." />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Card className="bg-amber-50 border-amber-200 flex-1">
          <CardContent className="pt-4 text-sm text-amber-700">
            <p className="font-semibold mb-1">ℹ️ Trilhas Guiadas</p>
            <p>Modelos pré-prontos que podem ser usados como base para novos clientes.</p>
          </CardContent>
        </Card>
        <Button className="ml-4 shrink-0" onClick={() => setShowNewTrail(true)}>
          <Plus className="w-4 h-4 mr-2" /> Nova Trilha
        </Button>
      </div>

      {trails.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-gray-500">
            Nenhuma trilha guiada encontrada no sistema.
          </CardContent>
        </Card>
      ) : (
        trails.map((trail) => (
          <Card key={trail.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle>{trail.name}</CardTitle>
                  <CardDescription>
                    {trail.missions.length} missão(ões) • Fonte: {trail.source}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setExpandedTrail(expandedTrail === trail.id ? null : trail.id)}
                  >
                    {expandedTrail === trail.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingTrail(trail)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDuplicateTrail(trail)}
                    disabled={creating}
                  >
                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </CardHeader>

            {expandedTrail === trail.id && (
              <CardContent className="space-y-3 border-t pt-4">
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Objetivo:</p>
                  <p className="text-sm text-gray-600">{trail.objetivo_geral || '—'}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Missões incluídas:</p>
                  <div className="flex flex-wrap gap-2">
                    {trail.missions.map((mission) => (
                      <Badge key={mission} variant="secondary">
                        {mission}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="pt-2 border-t text-xs text-gray-500">
                  Criada em: {new Date(trail.createdAt).toLocaleDateString('pt-BR')}
                </div>
              </CardContent>
            )}
          </Card>
        ))
      )}

      <TrailEditModal
        trail={editingTrail}
        open={!!editingTrail}
        onClose={() => setEditingTrail(null)}
        onSave={handleSaveTrail}
        saving={saving}
      />

      <TrailCreateModal
        open={showNewTrail}
        onClose={() => setShowNewTrail(false)}
        onCreate={handleCreateTrail}
        creating={creating}
      />
    </div>
  );
}