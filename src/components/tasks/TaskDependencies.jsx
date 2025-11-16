import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link2, X, Plus, CheckCircle2, AlertCircle } from "lucide-react";

export default function TaskDependencies({ dependencies = [], allTasks, currentTaskId, onChange }) {
  const [selectedTask, setSelectedTask] = React.useState("");

  // Filtrar tarefas disponíveis (excluir a tarefa atual e dependências já adicionadas)
  const availableTasks = allTasks.filter(task => 
    task.id !== currentTaskId && !dependencies.includes(task.id)
  );

  const addDependency = () => {
    if (selectedTask && !dependencies.includes(selectedTask)) {
      onChange([...dependencies, selectedTask]);
      setSelectedTask("");
    }
  };

  const removeDependency = (taskId) => {
    onChange(dependencies.filter(id => id !== taskId));
  };

  const getDependencyTask = (taskId) => {
    return allTasks.find(t => t.id === taskId);
  };

  return (
    <Card className="border-2 border-purple-200 bg-purple-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Link2 className="w-5 h-5 text-purple-600" />
          Dependências
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">
          Tarefas que precisam ser concluídas antes desta começar
        </p>

        {/* Lista de Dependências */}
        {dependencies.length > 0 && (
          <div className="space-y-2">
            {dependencies.map(depId => {
              const task = getDependencyTask(depId);
              if (!task) return null;

              const isCompleted = task.status === 'concluida';

              return (
                <div
                  key={depId}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border"
                >
                  <div className="flex items-center gap-3 flex-1">
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-orange-600" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-sm">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant={isCompleted ? "default" : "secondary"}
                          className={isCompleted ? "bg-green-100 text-green-700" : ""}
                        >
                          {task.status.replace('_', ' ')}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {task.priority}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDependency(depId)}
                  >
                    <X className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* Adicionar Nova Dependência */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Select value={selectedTask} onValueChange={setSelectedTask}>
              <SelectTrigger className="flex-1 bg-white">
                <SelectValue placeholder="Selecione uma tarefa" />
              </SelectTrigger>
              <SelectContent>
                {availableTasks.length === 0 ? (
                  <div className="p-2 text-sm text-gray-500 text-center">
                    Nenhuma tarefa disponível
                  </div>
                ) : (
                  availableTasks.map(task => (
                    <SelectItem key={task.id} value={task.id}>
                      <div className="flex items-center gap-2">
                        <span>{task.title}</span>
                        <Badge variant="outline" className="text-xs">
                          {task.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Button
              type="button"
              onClick={addDependency}
              disabled={!selectedTask}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="w-4 h-4 mr-1" />
              Adicionar
            </Button>
          </div>

          <p className="text-xs text-gray-600">
            ⚠️ Esta tarefa só poderá ser concluída após todas as dependências estarem completas
          </p>
        </div>
      </CardContent>
    </Card>
  );
}