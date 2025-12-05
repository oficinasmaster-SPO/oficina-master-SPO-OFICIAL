import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, ArrowUp, AlertCircle, Calendar } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function AIPrioritizationAssistant({ tasks, onApplyChanges }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(null);

  const analyzePriorities = async () => {
    setLoading(true);
    try {
      // Filter only relevant tasks (active)
      const activeTasks = tasks.filter(t => t.status !== 'concluida' && t.status !== 'cancelada');
      
      const tasksData = activeTasks.map(t => ({
        id: t.id,
        title: t.title,
        current_priority: t.priority,
        due_date: t.due_date,
        dependencies_count: t.dependencies?.length || 0,
        status: t.status,
        os: t.qgp_data?.os_number
      }));

      const prompt = `
      Atue como um Gerente de Produção de Oficina experiente.
      Analise esta lista de tarefas e sugira uma repriorização baseada em:
      1. Prazos (due_date) - Mais próximos = maior prioridade
      2. Dependências - Tarefas que bloqueiam outras devem ser priorizadas
      3. Status - Tarefas em andamento ou pausadas podem ter urgência diferente
      
      Tarefas: ${JSON.stringify(tasksData)}

      Retorne um JSON com:
      {
        "summary": "Breve explicação da lógica usada",
        "suggestions": [
          {
            "task_id": "id da tarefa",
            "suggested_priority": "baixa | media | alta | urgente",
            "reason": "motivo curto"
          }
        ]
      }
      Apenas sugira mudanças se realmente necessário. Se a prioridade atual estiver boa, não inclua na lista ou mantenha a mesma.
      `;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  task_id: { type: "string" },
                  suggested_priority: { type: "string", enum: ["baixa", "media", "alta", "urgente"] },
                  reason: { type: "string" }
                }
              }
            }
          }
        }
      });

      setSuggestions(response);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao analisar prioridades");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (suggestion) => {
    try {
      await base44.entities.Task.update(suggestion.task_id, { priority: suggestion.suggested_priority });
      toast.success("Prioridade atualizada!");
      if (onApplyChanges) onApplyChanges();
      
      // Remove applied suggestion from list
      setSuggestions(prev => ({
        ...prev,
        suggestions: prev.suggestions.filter(s => s.task_id !== suggestion.task_id)
      }));
    } catch (error) {
      toast.error("Erro ao atualizar");
    }
  };

  const getTaskTitle = (id) => tasks.find(t => t.id === id)?.title || "Tarefa desconhecida";

  const priorityColors = {
    baixa: "bg-gray-100 text-gray-800",
    media: "bg-blue-100 text-blue-800",
    alta: "bg-orange-100 text-orange-800",
    urgente: "bg-red-100 text-red-800"
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100">
          <Sparkles className="w-4 h-4 mr-2" />
          Priorizar com IA
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Assistente de Priorização
          </DialogTitle>
        </DialogHeader>

        {!suggestions ? (
          <div className="text-center py-8">
            <div className="mb-4 flex justify-center">
              <ArrowUp className="w-12 h-12 text-gray-300" />
            </div>
            <p className="text-gray-600 mb-4">
              A IA analisará prazos, dependências e complexidade para sugerir a melhor ordem de execução.
            </p>
            <Button onClick={analyzePriorities} disabled={loading} className="bg-purple-600 hover:bg-purple-700">
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analisando...</>
              ) : (
                "Analisar Tarefas"
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
              <p className="text-sm text-purple-900">{suggestions.summary}</p>
            </div>

            <div className="space-y-3">
              {suggestions.suggestions.map((sug, idx) => (
                <Card key={idx} className="border hover:shadow-sm transition-shadow">
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{getTaskTitle(sug.task_id)}</h4>
                      <p className="text-xs text-gray-500 mt-1">{sug.reason}</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="text-right mr-2">
                        <span className="text-xs text-gray-400 block">Sugerido</span>
                        <Badge className={priorityColors[sug.suggested_priority]}>
                          {sug.suggested_priority.toUpperCase()}
                        </Badge>
                      </div>
                      <Button size="sm" onClick={() => handleApply(sug)}>
                        Aplicar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {suggestions.suggestions.length === 0 && (
                <div className="text-center py-4 text-green-600 font-medium flex flex-col items-center">
                  <AlertCircle className="w-8 h-8 mb-2" />
                  Tudo parece estar bem priorizado!
                </div>
              )}
            </div>
            
            <Button variant="ghost" onClick={() => setSuggestions(null)} className="w-full mt-4">
              Voltar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}