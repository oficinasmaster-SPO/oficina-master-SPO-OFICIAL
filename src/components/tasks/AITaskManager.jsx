import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Sparkles, AlertTriangle, TrendingUp, Users, CheckCircle2, ArrowRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function AITaskManager({ tasks, employees }) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [activeTab, setActiveTab] = useState("prioritization");

  const runAnalysis = async (type) => {
    setLoading(true);
    try {
      let prompt = "";
      let schema = null;

      const tasksContext = tasks.filter(t => t.status !== 'concluida' && t.status !== 'cancelada').map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        due_date: t.due_date,
        dependencies: t.dependencies?.length || 0,
        assigned_to: t.assigned_to?.length || 0,
        predicted_time: t.predicted_time_minutes
      })).slice(0, 30); // Limit to 30 active tasks to avoid token limits

      const employeesContext = employees.map(e => ({
        id: e.id,
        name: e.full_name,
        role: e.position,
        current_tasks: tasks.filter(t => t.assigned_to?.includes(e.id) && t.status !== 'concluida').length
      }));

      if (type === "prioritization") {
        prompt = `
          Atue como um gerente de projetos experiente.
          Analise estas tarefas e sugira uma ordem de priorização baseada em:
          1. Prazos (due_date)
          2. Dependências (tarefas que bloqueiam outras são críticas)
          3. Prioridade definida (urgente > alta > media > baixa)
          
          TAREFAS: ${JSON.stringify(tasksContext)}
          
          Retorne um JSON com:
          {
            "suggested_order": [ {"task_id": "id", "reason": "motivo curto"} ],
            "critical_alerts": ["alerta 1", "alerta 2"]
          }
        `;
        schema = {
          type: "object",
          properties: {
            suggested_order: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  task_id: { type: "string" },
                  reason: { type: "string" }
                }
              }
            },
            critical_alerts: { type: "array", items: { type: "string" } }
          }
        };
      } else if (type === "bottlenecks") {
        prompt = `
          Atue como um analista de processos.
          Analise o fluxo de trabalho atual para identificar gargalos e riscos de atraso.
          
          TAREFAS ATIVAS: ${JSON.stringify(tasksContext)}
          COLABORADORES: ${JSON.stringify(employeesContext)}
          
          Considere:
          - Colaboradores sobrecarregados
          - Tarefas com muitas dependências não iniciadas
          - Prazos próximos sem responsável
          
          Retorne um JSON com:
          {
            "bottlenecks": [ {"title": "titulo", "description": "descricao", "severity": "alta/media/baixa"} ],
            "delay_predictions": [ {"task_title": "titulo", "risk_reason": "motivo"} ],
            "workflow_health_score": 0-100
          }
        `;
        schema = {
          type: "object",
          properties: {
            bottlenecks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  severity: { type: "string" }
                }
              }
            },
            delay_predictions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  task_title: { type: "string" },
                  risk_reason: { type: "string" }
                }
              }
            },
            workflow_health_score: { type: "integer" }
          }
        };
      } else if (type === "allocation") {
        const unassignedTasks = tasksContext.filter(t => t.assigned_to === 0);
        prompt = `
          Atue como um gerente de recursos humanos.
          Sugira alocação para as tarefas NÃO ATRIBUÍDAS baseando-se na carga atual dos colaboradores.
          
          TAREFAS SEM DONO: ${JSON.stringify(unassignedTasks)}
          COLABORADORES E CARGA: ${JSON.stringify(employeesContext)}
          
          Equilibre a carga de trabalho e considere o cargo (role) se relevante para a tarefa.
          
          Retorne um JSON com:
          {
            "suggestions": [ 
              {
                "task_id": "id da tarefa", 
                "task_title": "titulo",
                "suggested_employee_id": "id do colaborador",
                "suggested_employee_name": "nome",
                "reason": "motivo"
              } 
            ]
          }
        `;
        schema = {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  task_id: { type: "string" },
                  task_title: { type: "string" },
                  suggested_employee_id: { type: "string" },
                  suggested_employee_name: { type: "string" },
                  reason: { type: "string" }
                }
              }
            }
          }
        };
      }

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: schema
      });

      setAnalysis(response);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao processar análise com IA");
    } finally {
      setLoading(false);
    }
  };

  // Reset analysis when tab changes
  const handleTabChange = (val) => {
    setActiveTab(val);
    setAnalysis(null);
  };

  return (
    <Card className="mb-6 border-indigo-100 bg-indigo-50/30 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Sparkles className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <CardTitle className="text-lg text-indigo-900">Assistente QGP Inteligente</CardTitle>
              <CardDescription>Otimize sua gestão de tarefas com IA</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="prioritization" className="flex gap-2">
              <TrendingUp className="w-4 h-4" /> Priorização
            </TabsTrigger>
            <TabsTrigger value="bottlenecks" className="flex gap-2">
              <AlertTriangle className="w-4 h-4" /> Gargalos
            </TabsTrigger>
            <TabsTrigger value="allocation" className="flex gap-2">
              <Users className="w-4 h-4" /> Alocação
            </TabsTrigger>
          </TabsList>

          <div className="min-h-[200px]">
            {!analysis && !loading && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-gray-600 mb-4 max-w-md">
                  {activeTab === "prioritization" && "A IA analisará prazos, dependências e prioridades para sugerir o que fazer primeiro."}
                  {activeTab === "bottlenecks" && "Identifique riscos, atrasos previstos e sobrecarga da equipe."}
                  {activeTab === "allocation" && "Receba sugestões inteligentes para distribuir tarefas pendentes entre a equipe."}
                </p>
                <Button onClick={() => runAnalysis(activeTab)} className="bg-indigo-600 hover:bg-indigo-700">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Executar Análise
                </Button>
              </div>
            )}

            {loading && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-2" />
                <p className="text-sm text-gray-500">Analisando dados do QGP...</p>
              </div>
            )}

            {analysis && !loading && activeTab === "prioritization" && (
              <div className="space-y-4 animate-in fade-in">
                {analysis.critical_alerts?.length > 0 && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                    <h4 className="text-red-800 font-bold text-sm mb-2 flex items-center">
                      <AlertTriangle className="w-4 h-4 mr-2" /> Pontos de Atenção
                    </h4>
                    <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                      {analysis.critical_alerts.map((alert, i) => (
                        <li key={i}>{alert}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div className="space-y-2">
                  <h4 className="font-semibold text-gray-900">Ordem Sugerida de Execução</h4>
                  {analysis.suggested_order?.map((item, i) => {
                    const task = tasks.find(t => t.id === item.task_id);
                    if (!task) return null;
                    return (
                      <div key={i} className="flex items-start gap-3 bg-white p-3 rounded-lg border hover:shadow-sm transition-shadow">
                        <div className="bg-indigo-100 text-indigo-700 font-bold w-6 h-6 rounded flex items-center justify-center text-xs shrink-0 mt-0.5">
                          {i + 1}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{task.title}</p>
                          <p className="text-xs text-gray-500 mt-1">{item.reason}</p>
                        </div>
                        <Badge variant="outline" className="ml-auto shrink-0">
                          {task.priority}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {analysis && !loading && activeTab === "bottlenecks" && (
              <div className="space-y-6 animate-in fade-in">
                <div className="flex items-center justify-between bg-white p-4 rounded-lg border">
                  <span className="text-sm font-medium text-gray-600">Saúde do Fluxo</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${analysis.workflow_health_score > 70 ? 'bg-green-500' : analysis.workflow_health_score > 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${analysis.workflow_health_score}%` }}
                      />
                    </div>
                    <span className="font-bold text-lg">{analysis.workflow_health_score}%</span>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-500" /> Gargalos Identificados
                    </h4>
                    {analysis.bottlenecks?.map((b, i) => (
                      <div key={i} className="bg-orange-50 p-3 rounded-lg border border-orange-100">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-medium text-orange-900 text-sm">{b.title}</span>
                          <Badge variant="secondary" className="text-[10px] bg-white text-orange-700 border-orange-200">{b.severity}</Badge>
                        </div>
                        <p className="text-xs text-orange-800">{b.description}</p>
                      </div>
                    ))}
                    {(!analysis.bottlenecks || analysis.bottlenecks.length === 0) && (
                      <p className="text-sm text-gray-500 italic">Nenhum gargalo crítico detectado.</p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-red-500" /> Previsão de Atrasos
                    </h4>
                    {analysis.delay_predictions?.map((d, i) => (
                      <div key={i} className="bg-red-50 p-3 rounded-lg border border-red-100">
                        <p className="font-medium text-red-900 text-sm">{d.task_title}</p>
                        <p className="text-xs text-red-800 mt-1">⚠️ {d.risk_reason}</p>
                      </div>
                    ))}
                    {(!analysis.delay_predictions || analysis.delay_predictions.length === 0) && (
                      <p className="text-sm text-gray-500 italic">Nenhum risco iminente de atraso.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {analysis && !loading && activeTab === "allocation" && (
              <div className="space-y-4 animate-in fade-in">
                <h4 className="font-semibold text-gray-900 mb-2">Sugestões de Atribuição</h4>
                {analysis.suggestions?.length === 0 ? (
                  <div className="text-center py-8 bg-white rounded-lg border border-dashed">
                    <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <p className="text-gray-600">Todas as tarefas já estão atribuídas ou não há sugestões.</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {analysis.suggestions?.map((s, i) => (
                      <div key={i} className="bg-white p-4 rounded-lg border flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{s.task_title}</p>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-1">{s.reason}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 bg-indigo-50 px-3 py-2 rounded-full border border-indigo-100">
                          <ArrowRight className="w-4 h-4 text-indigo-400" />
                          <span className="text-sm font-bold text-indigo-700">{s.suggested_employee_name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}