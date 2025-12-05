import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, Brain, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function AIResourceAllocator({ task, employees, currentTasks, onAssign }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState(null);

  const analyzeAllocation = async () => {
    setLoading(true);
    try {
      // Prepare data for AI
      const availableEmployees = employees.filter(e => e.status === 'ativo').map(e => ({
        id: e.id,
        name: e.full_name,
        role: e.position,
        active_tasks: currentTasks.filter(t => t.employee_id === e.id && t.status === 'em_andamento').length,
        queued_tasks: currentTasks.filter(t => t.employee_id === e.id && t.status === 'pendente').length,
        skills_summary: `Área: ${e.area}, Cargo: ${e.job_role}`
      }));

      const prompt = `
      Atue como um Gerente de Oficina inteligente.
      Preciso alocar um colaborador para a seguinte tarefa:
      Tarefa: "${task.title}"
      Tipo: ${task.task_type || 'Geral'}
      Complexidade/Info: ${task.description || task.qgp_data?.service_type || 'N/A'}

      Analise a lista de colaboradores disponíveis considerando:
      1. Competência técnica (baseado no cargo/área)
      2. Carga de trabalho atual (active_tasks = executando agora, queued_tasks = fila)
      3. Evitar sobrecarga e garantir qualidade

      Colaboradores: ${JSON.stringify(availableEmployees)}

      Retorne um JSON com as 3 melhores opções:
      {
        "recommendations": [
          {
            "employee_id": "id",
            "match_score": number (0-100),
            "reason": "Explicação curta (ex: Tem habilidade e está livre)"
          }
        ]
      }
      `;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  employee_id: { type: "string" },
                  match_score: { type: "integer" },
                  reason: { type: "string" }
                }
              }
            }
          }
        }
      });

      setRecommendations(response.recommendations);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar recomendações");
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (employeeId) => {
    try {
      await base44.entities.Task.update(task.id, { 
        employee_id: employeeId,
        assigned_to: [employeeId] // Update assigned_to array as well for consistency
      });
      toast.success("Tarefa atribuída!");
      setIsOpen(false);
      if (onAssign) onAssign();
    } catch (error) {
      toast.error("Erro ao atribuir tarefa");
    }
  };

  const getEmployeeData = (id) => employees.find(e => e.id === id);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-blue-600 hover:bg-blue-50">
          <Users className="w-4 h-4 mr-1" />
          Sugerir Técnico
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-600" />
            Alocação Inteligente
          </DialogTitle>
        </DialogHeader>

        {!recommendations ? (
          <div className="text-center py-6">
            <p className="text-gray-600 mb-4">
              A IA buscará o melhor técnico com base em habilidades e carga de trabalho.
            </p>
            <Button onClick={analyzeAllocation} disabled={loading} className="bg-blue-600">
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Buscando...</>
              ) : (
                "Buscar Recomendação"
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {recommendations.map((rec, idx) => {
              const emp = getEmployeeData(rec.employee_id);
              if (!emp) return null;
              
              return (
                <Card key={idx} className={`border cursor-pointer hover:border-blue-400 transition-colors ${idx === 0 ? 'bg-blue-50 border-blue-200' : ''}`}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{emp.full_name}</span>
                        {idx === 0 && <Badge className="bg-green-500 hover:bg-green-600">Melhor Opção</Badge>}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{rec.reason}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px]">{emp.position}</Badge>
                        <span className="text-[10px] text-gray-400 flex items-center">Match: {rec.match_score}%</span>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => handleAssign(rec.employee_id)}>
                      Atribuir
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}