import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, PlayCircle, PauseCircle, RotateCw, ChevronDown, ChevronRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const SPRINT_PHASES = ["Planejamento", "Implementação", "Acompanhamento", "Revisão", "Melhoria"];

const MOCK_TASKS = [
  { id: 1, name: "Levantar Requisitos", phase: 0, duration: 3 },
  { id: 2, name: "Definir Roadmap", phase: 0, duration: 2 },
  { id: 3, name: "Configurar Ambiente", phase: 1, duration: 2 },
  { id: 4, name: "Desenvolvimento Core", phase: 1, duration: 5 },
  { id: 5, name: "Testes Funcionais", phase: 1, duration: 3 },
  { id: 6, name: "Acompanhar Métricas", phase: 2, duration: 2 },
  { id: 7, name: "Reunião de Revisão", phase: 3, duration: 1 },
  { id: 8, name: "Implementar Feedback", phase: 4, duration: 3 },
];

export default function SprintSimulatorDemo() {
  const [isRunning, setIsRunning] = useState(false);
  const [currentDay, setCurrentDay] = useState(0);
  const [sprintProgress, setSprintProgress] = useState(0);
  const [taskStatuses, setTaskStatuses] = useState(
    MOCK_TASKS.reduce((acc, task) => ({ ...acc, [task.id]: "pending" }), {})
  );
  const [expandedPhase, setExpandedPhase] = useState(0);
  const totalDays = 15;

  // Simular progresso
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setCurrentDay((prev) => {
        if (prev >= totalDays) {
          setIsRunning(false);
          return totalDays;
        }
        return prev + 1;
      });
    }, 800);

    return () => clearInterval(interval);
  }, [isRunning]);

  // Atualizar status das tarefas conforme dias passam
  useEffect(() => {
    const newStatuses = { ...taskStatuses };
    let completedCount = 0;

    MOCK_TASKS.forEach((task) => {
      const taskStartDay = MOCK_TASKS.slice(0, task.id - 1).reduce((sum, t) => sum + t.duration, 0);
      const taskEndDay = taskStartDay + task.duration;

      if (currentDay >= taskEndDay) {
        newStatuses[task.id] = "completed";
        completedCount++;
      } else if (currentDay > taskStartDay) {
        newStatuses[task.id] = "in-progress";
      } else {
        newStatuses[task.id] = "pending";
      }
    });

    setTaskStatuses(newStatuses);
    setSprintProgress(Math.round((completedCount / MOCK_TASKS.length) * 100));
  }, [currentDay]);

  const handleReset = () => {
    setCurrentDay(0);
    setSprintProgress(0);
    setIsRunning(false);
    setTaskStatuses(MOCK_TASKS.reduce((acc, task) => ({ ...acc, [task.id]: "pending" }), {}));
  };

  const getTaskStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "bg-green-100 border-green-300";
      case "in-progress":
        return "bg-blue-100 border-blue-300";
      default:
        return "bg-gray-100 border-gray-300";
    }
  };

  const getTaskStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "in-progress":
        return <Clock className="w-4 h-4 text-blue-600 animate-spin" />;
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-gray-300" />;
    }
  };

  const tasksByPhase = SPRINT_PHASES.map((phase, idx) =>
    MOCK_TASKS.filter((task) => task.phase === idx)
  );

  const daysRemaining = Math.max(0, totalDays - currentDay);

  return (
    <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-purple-900">
              🚀 Simulador de Sprint em Tempo Real
            </CardTitle>
            <p className="text-sm text-gray-600 mt-2">
              Visualize como uma sprint de aceleração progride ao longo de {totalDays} dias
            </p>
          </div>
          <Badge className="bg-purple-600 text-white text-lg px-3 py-1">
            Dia {currentDay + 1}/{totalDays}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Timeline e Controles */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setIsRunning(!isRunning)}
              size="sm"
              className={isRunning ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
            >
              {isRunning ? (
                <>
                  <PauseCircle className="w-4 h-4 mr-2" />
                  Pausar
                </>
              ) : (
                <>
                  <PlayCircle className="w-4 h-4 mr-2" />
                  Iniciar
                </>
              )}
            </Button>
            <Button onClick={handleReset} variant="outline" size="sm">
              <RotateCw className="w-4 h-4 mr-2" />
              Reiniciar
            </Button>
            <div className="flex-1 text-right">
              <span className="text-sm font-medium text-purple-900">
                {daysRemaining} dias restantes
              </span>
            </div>
          </div>

          {/* Barra de Progresso da Sprint */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Progresso Geral da Sprint</span>
              <span className="text-lg font-bold text-purple-600">{sprintProgress}%</span>
            </div>
            <Progress value={sprintProgress} className="h-3 bg-purple-100" />
          </div>

          {/* Timeline Visual */}
          <div className="bg-white rounded-lg p-3 border border-purple-200">
            <div className="flex gap-1">
              {Array.from({ length: totalDays }).map((_, day) => (
                <div
                  key={day}
                  className={`flex-1 h-8 rounded text-xs flex items-center justify-center font-bold cursor-pointer transition-all ${
                    day < currentDay
                      ? "bg-green-500 text-white"
                      : day === currentDay
                      ? "bg-blue-500 text-white ring-2 ring-offset-2 ring-blue-300"
                      : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                  }`}
                  title={`Dia ${day + 1}`}
                >
                  {day + 1}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Fases e Tarefas */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Estrutura da Sprint</h3>

          {SPRINT_PHASES.map((phase, phaseIdx) => (
            <div key={phaseIdx} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Header da Fase */}
              <button
                onClick={() => setExpandedPhase(expandedPhase === phaseIdx ? -1 : phaseIdx)}
                className={`w-full px-4 py-3 flex items-center justify-between transition-colors ${
                  phaseIdx === 0 ? "bg-red-50 hover:bg-red-100" :
                  phaseIdx === 1 ? "bg-blue-50 hover:bg-blue-100" :
                  phaseIdx === 2 ? "bg-green-50 hover:bg-green-100" :
                  phaseIdx === 3 ? "bg-yellow-50 hover:bg-yellow-100" :
                  "bg-purple-50 hover:bg-purple-100"
                }`}
              >
                <div className="flex items-center gap-3 flex-1 text-left">
                  {expandedPhase === phaseIdx ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                  <span className="font-semibold text-gray-900">{phase}</span>
                  <Badge variant="outline" className="ml-auto">
                    {tasksByPhase[phaseIdx].filter((t) => taskStatuses[t.id] === "completed").length}/
                    {tasksByPhase[phaseIdx].length}
                  </Badge>
                </div>
              </button>

              {/* Tarefas da Fase */}
              {expandedPhase === phaseIdx && (
                <div className="px-4 py-3 bg-gray-50 border-t space-y-2">
                  {tasksByPhase[phaseIdx].length === 0 ? (
                    <p className="text-sm text-gray-500 italic">Nenhuma tarefa nesta fase</p>
                  ) : (
                    tasksByPhase[phaseIdx].map((task) => {
                      const handleTaskClick = () => {
                        const currentStatus = taskStatuses[task.id];
                        const newStatus = 
                          currentStatus === "pending" ? "in-progress" :
                          currentStatus === "in-progress" ? "completed" :
                          "pending";
                        
                        setTaskStatuses(prev => ({ ...prev, [task.id]: newStatus }));
                        
                        // Atualizar progresso
                        const updatedStatuses = { ...taskStatuses, [task.id]: newStatus };
                        const completedCount = Object.values(updatedStatuses).filter(s => s === "completed").length;
                        setSprintProgress(Math.round((completedCount / MOCK_TASKS.length) * 100));
                      };

                      return (
                        <button
                          key={task.id}
                          onClick={handleTaskClick}
                          className={`w-full flex items-center gap-3 p-3 rounded border-2 transition-all cursor-pointer hover:shadow-md ${getTaskStatusColor(
                            taskStatuses[task.id]
                          )}`}
                        >
                          {getTaskStatusIcon(taskStatuses[task.id])}
                          <div className="flex-1 text-left">
                            <p className="text-sm font-medium text-gray-900">{task.name}</p>
                            <p className="text-xs text-gray-600">Duração: {task.duration} dias</p>
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              taskStatuses[task.id] === "completed"
                                ? "bg-green-100 text-green-700 border-green-300"
                                : taskStatuses[task.id] === "in-progress"
                                ? "bg-blue-100 text-blue-700 border-blue-300"
                                : "bg-gray-100 text-gray-700 border-gray-300"
                            }`}
                          >
                            {taskStatuses[task.id] === "completed"
                              ? "✓ Concluída"
                              : taskStatuses[task.id] === "in-progress"
                              ? "⏱ Andamento"
                              : "○ Clique para iniciar"}
                          </Badge>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-3 gap-3 bg-white rounded-lg p-4 border border-gray-200">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {Object.values(taskStatuses).filter((s) => s === "completed").length}
            </p>
            <p className="text-xs text-gray-600 mt-1">Concluídas</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">
              {Object.values(taskStatuses).filter((s) => s === "in-progress").length}
            </p>
            <p className="text-xs text-gray-600 mt-1">Em Andamento</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-600">
              {Object.values(taskStatuses).filter((s) => s === "pending").length}
            </p>
            <p className="text-xs text-gray-600 mt-1">Pendentes</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}