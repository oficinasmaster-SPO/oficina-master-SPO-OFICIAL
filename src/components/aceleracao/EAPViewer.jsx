import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Target, Zap, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// Mapeamento dos nomes reais das fases (conforme salvo no banco)
const PHASE_LABELS = {
  Planning: { label: "Planejamento", color: "bg-blue-50 border-blue-200" },
  Execution: { label: "Execução", color: "bg-purple-50 border-purple-200" },
  Monitoring: { label: "Monitoramento", color: "bg-green-50 border-green-200" },
  Review: { label: "Revisão", color: "bg-yellow-50 border-yellow-200" },
  Retrospective: { label: "Retrospectiva", color: "bg-orange-50 border-orange-200" },
};

export default function EAPViewer({ trilhas = [], sprints = [], tarefas = [], workshop = null, isLoading = false }) {
  const [expandedMissoes, setExpandedMissoes] = useState({});
  const [expandedSprints, setExpandedSprints] = useState({});
  const [expandedFases, setExpandedFases] = useState({});

  // Buscar nomes dos templates para exibição
  const { data: templates = [] } = useQuery({
    queryKey: ['cronograma-templates-eap'],
    queryFn: () => base44.entities.CronogramaTemplate.filter({ ativo: true }),
    staleTime: 10 * 60 * 1000,
  });
  const templateMap = useMemo(() => Object.fromEntries(templates.map(t => [t.id, t])), [templates]);

  // Garantir que os arrays são válidos
  const sprintsArray = Array.isArray(sprints) ? sprints : [];
  const tarefasArray = Array.isArray(tarefas) ? tarefas : [];

  // Montar trilhas agrupando sprints por cronograma_template_id
  const trilhasArray = useMemo(() => {
    const groupMap = {};
    sprintsArray.forEach(s => {
      const key = s.cronograma_template_id || "sem_trilha";
      if (!groupMap[key]) {
        groupMap[key] = {
          id: key,
          name: key === "sem_trilha" ? "Sprints Customizados" : key,
          _virtual: true,
        };
      }
    });
    return Object.values(groupMap);
  }, [sprintsArray]);

  // Estrutura: Missão (Trilha) → Sprints → Fases → Tarefas
  const eapStructure = useMemo(() => {
    return trilhasArray.map((trilha) => { // eslint-disable-line
      // Sprints da trilha
      const trilhaSprints = sprintsArray.filter(s => {
        const key = s.cronograma_template_id || "sem_trilha";
        return key === trilha.id || s.trilha_id === trilha.id || s.mission_id === trilha.id;
      });

      // Se não houver sprints, criar mocks
      const sprintsToShow =
        trilhaSprints.length > 0
          ? trilhaSprints
          : [
              {
                id: `mock-sprint-${trilha.id}-1`,
                title: "Sprint 1",
                trilha_id: trilha.id,
                status: "planejamento"
              }
            ];

      return {
        trilha,
        sprints: sprintsToShow.map((sprint) => {
          // Usar as fases REAIS da sprint vindas do banco (sprint.phases[])
          const realPhases = Array.isArray(sprint.phases) ? sprint.phases : [];

          return {
            sprint,
            realPhases
          };
        })
      };
    });
  }, [trilhasArray, sprintsArray, tarefasArray]);

  // Toggle functions
  const toggleMissao = (trilhaId) => {
    setExpandedMissoes((prev) => ({
      ...prev,
      [trilhaId]: !prev[trilhaId]
    }));
  };

  const toggleSprint = (sprintId) => {
    setExpandedSprints((prev) => ({
      ...prev,
      [sprintId]: !prev[sprintId]
    }));
  };

  const toggleFase = (faseId) => {
    setExpandedFases((prev) => ({
      ...prev,
      [faseId]: !prev[faseId]
    }));
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "concluida":
      case "concluido":
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case "em_andamento":
        return <Zap className="w-4 h-4 text-blue-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      concluida: "Concluída",
      concluido: "Concluído",
      em_andamento: "Em Andamento",
      a_fazer: "A Fazer"
    };
    return labels[status] || status;
  };

  if (isLoading || (!workshop?.id && sprintsArray.length === 0)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            Estrutura Analítica do Projeto (EAP)
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Carregando estrutura do projeto...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (sprintsArray.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            Estrutura Analítica do Projeto (EAP)
            {workshop && <Badge className="ml-auto">{workshop.name}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8">
          <div className="text-center">
            <Target className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-600 font-medium">Nenhum sprint cadastrado ainda</p>
            <p className="text-sm text-gray-400 mt-1">A estrutura do projeto aparecerá aqui quando os sprints forem criados.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4" role="region" aria-label="Estrutura Analítica do Projeto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            Estrutura Analítica do Projeto (EAP)
            {workshop && <Badge className="ml-auto">{workshop.name}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {/* NÍVEL 1: MISSÕES (Trilhas) */}
            {eapStructure.map(({ trilha, sprints }) => (
              <div key={trilha.id} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Missão Header */}
                <button
                  onClick={() => toggleMissao(trilha.id)}
                  className="w-full flex items-center gap-3 p-4 bg-red-50 hover:bg-red-100 transition-colors"
                  aria-expanded={expandedMissoes[trilha.id]}
                  aria-label={`Missão: ${trilha.name || trilha.titulo}`}
                >
                  {expandedMissoes[trilha.id] ? (
                    <ChevronDown className="w-5 h-5 text-red-600 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-red-600 flex-shrink-0" />
                  )}
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-red-600 text-white">Nível 1</Badge>
                      <h3 className="font-bold text-gray-900">
                        MISSÃO: {templateMap[trilha.id]?.nome_fase || trilha.name || trilha.titulo || "Sprints"}
                      </h3>
                    </div>
                    {trilha.descricao && (
                      <p className="text-xs text-gray-600 mt-1">{trilha.descricao}</p>
                    )}
                  </div>
                </button>

                {/* Missão Content - Sprints */}
                {expandedMissoes[trilha.id] && (
                  <div className="bg-white border-t border-gray-200 p-4 space-y-3">
                    {sprints.map(({ sprint, realPhases }) => (
                      <div
                        key={sprint.id}
                        className="border border-yellow-200 rounded-lg overflow-hidden bg-yellow-50/50"
                      >
                        {/* NÍVEL 2: SPRINT */}
                        <button
                          onClick={() => toggleSprint(sprint.id)}
                          className="w-full flex items-center gap-3 p-3 bg-yellow-100 hover:bg-yellow-200 transition-colors"
                          aria-expanded={expandedSprints[sprint.id]}
                          aria-label={`Sprint: ${sprint.title || sprint.nome}`}
                        >
                          {expandedSprints[sprint.id] ? (
                            <ChevronDown className="w-4 h-4 text-yellow-700 flex-shrink-0" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-yellow-700 flex-shrink-0" />
                          )}
                          <div className="flex-1 text-left">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="border-yellow-600 text-yellow-700">
                                Nível 2
                              </Badge>
                              <h4 className="font-semibold text-yellow-900">
                                {sprint.title || sprint.nome || "Sprint"}
                              </h4>
                            </div>
                          </div>
                          <Badge variant="outline">{sprint.status || "ativo"}</Badge>
                        </button>

                        {/* Sprint Content - Fases REAIS */}
                        {expandedSprints[sprint.id] && (
                          <div className="bg-white border-t border-yellow-200 p-3 space-y-2">
                            {realPhases.length === 0 ? (
                              <p className="text-xs text-gray-400 italic p-2">Nenhuma fase configurada neste sprint.</p>
                            ) : realPhases.map((phase, phaseIdx) => {
                              const phaseConfig = PHASE_LABELS[phase.name] || { label: phase.name, color: "bg-gray-50 border-gray-200" };
                              const faseKey = `${sprint.id}-${phaseIdx}`;
                              const tasks = Array.isArray(phase.tasks) ? phase.tasks : [];
                              return (
                                <div
                                  key={faseKey}
                                  className={`border rounded-lg overflow-hidden ${phaseConfig.color}`}
                                >
                                  {/* NÍVEL 3: FASE */}
                                  <button
                                    onClick={() => toggleFase(faseKey)}
                                    className="w-full flex items-center gap-3 p-3 hover:opacity-80 transition-opacity"
                                    aria-expanded={expandedFases[faseKey]}
                                    aria-label={`Fase: ${phaseConfig.label}`}
                                  >
                                    {expandedFases[faseKey] ? (
                                      <ChevronDown className="w-4 h-4 flex-shrink-0" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4 flex-shrink-0" />
                                    )}
                                    <div className="flex-1 text-left">
                                      <Badge variant="outline" className="text-xs mb-1">Nível 3</Badge>
                                      <h5 className="font-semibold text-gray-900">{phaseConfig.label}</h5>
                                    </div>
                                    <Badge className="text-xs">{tasks.length} tarefas</Badge>
                                  </button>

                                  {/* Fase Content - Tarefas REAIS */}
                                  {expandedFases[faseKey] && (
                                    <div className="border-t p-3 space-y-2 bg-white">
                                      {tasks.length === 0 ? (
                                        <p className="text-xs text-gray-400 italic p-2">Sem tarefas nesta fase.</p>
                                      ) : tasks.map((tarefa, tIdx) => (
                                        <div
                                          key={tIdx}
                                          className="flex items-start gap-3 p-2 rounded bg-gray-50 border border-gray-200"
                                        >
                                          {getStatusIcon(tarefa.status === "done" ? "concluido" : tarefa.status)}
                                          <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm text-gray-900 line-clamp-2">
                                              {tarefa.description || tarefa.title}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                              {tarefa.status === "done" ? "Concluída" : "A fazer"}
                                            </p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Legenda */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Badge className="bg-red-600">Nível 1</Badge>
              <span className="text-gray-700">Missão (Trilha)</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-yellow-600">
                Nível 2
              </Badge>
              <span className="text-gray-700">Sprint</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-gray-700">Concluído</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-600" />
              <span className="text-gray-700">Em Andamento</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}