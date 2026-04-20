import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Copy, Edit2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import WheelLoader from '@/components/ui/WheelLoader';
import MissionsTemplateGrid from './MissionsTemplateGrid';
import SprintsTemplateGrid from './SprintsTemplateGrid';

/**
 * TemplateLibraryManager - Matriz Global de Templates Padrão
 * Consolida todas as trilhas, missões e sprints de todos os clientes
 * como templates editáveis e reutilizáveis
 */
export default function TemplateLibraryManager() {
  const [templates, setTemplates] = useState({
    trails: [],
    missions: [],
    sprints: []
  });
  const [expandedTrail, setExpandedTrail] = useState(null);
  const [expandedSprint, setExpandedSprint] = useState(null);

  // Busca todas as trilhas (CronogramaTemplate)
  const { data: allTrails = [], isLoading: loadingTrails } = useQuery({
    queryKey: ['allCronogramaTemplates'],
    queryFn: async () => {
      try {
        const data = await base44.entities.CronogramaTemplate.list('-updated_date', 500);
        return data || [];
      } catch (error) {
        console.error('Erro ao carregar trilhas:', error);
        return [];
      }
    },
    staleTime: 30 * 1000,
  });

  // Busca todos os sprints (ConsultoriaSprint)
  const { data: allSprints = [], isLoading: loadingSprints } = useQuery({
    queryKey: ['allConsultoriaSprints'],
    queryFn: async () => {
      try {
        const data = await base44.entities.ConsultoriaSprint.list('-updated_date', 500);
        return data || [];
      } catch (error) {
        console.error('Erro ao carregar sprints:', error);
        return [];
      }
    },
    staleTime: 30 * 1000,
  });

  // Processa e consolida os dados em um formato de matriz única
  useEffect(() => {
    if (allTrails.length === 0 && allSprints.length === 0) {
      setTemplates({ trails: [], missions: [], sprints: [] });
      return;
    }

    // Deduplica trilhas por missões selecionadas
    const trailsMap = new Map();
    allTrails.forEach(trail => {
      const key = JSON.stringify(trail.missoes_selecionadas?.sort() || []);
      if (!trailsMap.has(key)) {
        trailsMap.set(key, {
          id: trail.id,
          name: trail.nome_fase,
          missions: trail.missoes_selecionadas || [],
          source: `${trail.workshop_id}`,
          createdAt: trail.created_date,
        });
      }
    });

    // Extrai todas as missões únicas
    const missionsSet = new Set();
    allTrails.forEach(trail => {
      trail.missoes_selecionadas?.forEach(m => missionsSet.add(m));
    });
    allSprints.forEach(sprint => {
      if (sprint.mission_id) missionsSet.add(sprint.mission_id);
    });

    // Consolida sprints por missão e cronograma_template_id
    const sprintsMap = new Map();
    allSprints.forEach(sprint => {
      const key = `${sprint.cronograma_template_id}_${sprint.mission_id}`;
      if (!sprintsMap.has(key)) {
        sprintsMap.set(key, {
          id: sprint.id,
          title: sprint.title,
          objective: sprint.objective,
          mission_id: sprint.mission_id,
          sprint_number: sprint.sprint_number,
          phases: sprint.phases || [],
          start_date: sprint.start_date,
          end_date: sprint.end_date,
          progress_percentage: sprint.progress_percentage,
          status: sprint.status,
          total_tasks: countTotalTasks(sprint.phases),
          completed_tasks: countCompletedTasks(sprint.phases),
        });
      }
    });

    setTemplates({
      trails: Array.from(trailsMap.values()),
      missions: Array.from(missionsSet).sort(),
      sprints: Array.from(sprintsMap.values()),
    });
  }, [allTrails, allSprints]);

  const countTotalTasks = (phases) => {
    return phases.reduce((acc, phase) => acc + (phase.tasks?.length || 0), 0);
  };

  const countCompletedTasks = (phases) => {
    return phases.reduce((acc, phase) => 
      acc + (phase.tasks?.filter(t => t.status === 'done').length || 0), 0);
  };

  const handleDuplicateTrail = async (trail) => {
    // TODO: Implementar duplicação de trilha como template padrão
    console.log('Duplicando trilha:', trail);
  };

  const handleDuplicateSprint = async (sprint) => {
    // TODO: Implementar duplicação de sprint como template padrão
    console.log('Duplicando sprint:', sprint);
  };

  if (loadingTrails || loadingSprints) {
    return (
      <div className="flex items-center justify-center h-96">
        <WheelLoader size="lg" text="Carregando matriz de templates..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-blue-900">Matriz de Templates Padrão</h3>
            <p className="text-sm text-blue-700 mt-1">
              Base de trilhas guiadas, missões e sprints padrão para reutilizar e adaptar.
              As trilhas personalizadas dos clientes são montadas individualmente no cronograma de cada consultoria.
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="trails" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="trails">
            Trilhas Guiadas ({templates.trails.length})
          </TabsTrigger>
          <TabsTrigger value="missions">
            Missões ({templates.missions.length})
          </TabsTrigger>
          <TabsTrigger value="sprints">
            Sprints
          </TabsTrigger>
        </TabsList>

        {/* TAB: TRILHAS GUIADAS */}
        <TabsContent value="trails" className="space-y-4">
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="pt-4 text-sm text-amber-700">
              <p className="font-semibold mb-1">ℹ️ Trilhas Guiadas</p>
              <p>Modelos pré-prontos que podem ser usados como base. As trilhas personalizadas dos clientes são criadas individualmente no cronograma de consultoria após o diagnóstico.</p>
            </CardContent>
          </Card>

          {templates.trails.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-gray-500">
                Nenhuma trilha guiada encontrada no sistema.
              </CardContent>
            </Card>
          ) : (
            templates.trails.map((trail) => (
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
                        onClick={() => handleDuplicateTrail(trail)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {expandedTrail === trail.id && (
                  <CardContent className="space-y-3 border-t pt-4">
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
        </TabsContent>

        {/* TAB: MISSÕES */}
        <TabsContent value="missions" className="space-y-4">
          <MissionsTemplateGrid />
        </TabsContent>

        {/* TAB: SPRINTS */}
        <TabsContent value="sprints" className="space-y-4">
          <SprintsTemplateGrid />
        </TabsContent>
      </Tabs>
    </div>
  );
}