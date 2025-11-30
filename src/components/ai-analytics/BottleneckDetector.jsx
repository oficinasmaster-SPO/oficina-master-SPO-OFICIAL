import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, CheckCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function BottleneckDetector({ workshop, employees, osAssessments }) {
  const [loading, setLoading] = useState(false);
  const [bottlenecks, setBottlenecks] = useState([]);

  const detectBottlenecks = async () => {
    setLoading(true);
    try {
      // Análise automática de gargalos
      const detected = [];

      // 1. Tempo ocioso de técnicos
      const technicians = employees.filter(e => e.area === 'tecnico' && e.status === 'ativo');
      const lowProductivity = technicians.filter(t => {
        const production = (t.production_parts || 0) + (t.production_services || 0);
        const cost = (t.salary || 0) + (t.commission || 0);
        return production < cost * 3;
      });

      if (lowProductivity.length > 0) {
        detected.push({
          area: "tecnico",
          type: "baixa_produtividade",
          severity: "alta",
          description: `${lowProductivity.length} técnicos com produtividade abaixo do esperado`,
          metrics: {
            current_value: lowProductivity.length,
            expected_value: 0,
            deviation_percentage: (lowProductivity.length / technicians.length) * 100
          },
          affected_employees: lowProductivity.map(t => t.id)
        });
      }

      // 2. OSs com atrasos
      const delayedOS = osAssessments.filter(os => 
        os.classification === 'alerta_renda' || os.classification === 'reprovada'
      );

      if (delayedOS.length > osAssessments.length * 0.3) {
        detected.push({
          area: "tecnico",
          type: "atraso_os",
          severity: "critica",
          description: `${delayedOS.length} OSs com problemas de rentabilidade`,
          metrics: {
            current_value: delayedOS.length,
            expected_value: osAssessments.length * 0.1,
            deviation_percentage: ((delayedOS.length / osAssessments.length) * 100).toFixed(1)
          }
        });
      }

      // 3. Retrabalho elevado
      const reworkEmployees = employees.filter(e => 
        (e.warnings?.length || 0) > 2
      );

      if (reworkEmployees.length > 0) {
        detected.push({
          area: "tecnico",
          type: "retrabalho",
          severity: "media",
          description: `${reworkEmployees.length} colaboradores com alto índice de retrabalho`,
          metrics: {
            current_value: reworkEmployees.length,
            expected_value: 0,
            deviation_percentage: (reworkEmployees.length / employees.length) * 100
          },
          affected_employees: reworkEmployees.map(e => e.id)
        });
      }

      // Usar IA para análise de causa raiz e sugestões
      for (const bottleneck of detected) {
        const prompt = `
ATENÇÃO: Responda para o LÍDER OPERACIONAL da oficina.
Linguagem simples, direta e focada em AÇÃO IMEDIATA. Nada de "planejamento estratégico" abstrato.
Diga exatamente O QUE FAZER no chão da oficina amanhã cedo.

Analise este gargalo operacional identificado:
Área: ${bottleneck.area}
Tipo: ${bottleneck.type}
Descrição: ${bottleneck.description}
Métricas: ${JSON.stringify(bottleneck.metrics)}

Forneça:
1. Causa raiz (explicada de forma simples)
2. Ações sugeridas (PASSO A PASSO OPERACIONAL CLARO) com prioridade e impacto
`;

        const analysis = await base44.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: "object",
            properties: {
              root_cause: { type: "string" },
              actions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    action: { type: "string" },
                    priority: { type: "string" },
                    estimated_impact: { type: "string" }
                  }
                }
              }
            }
          }
        });

        bottleneck.root_cause_analysis = analysis.root_cause;
        bottleneck.suggested_actions = analysis.actions;

        // Salvar no banco
        await base44.entities.Bottleneck.create({
          workshop_id: workshop.id,
          detection_date: new Date().toISOString(),
          ...bottleneck,
          status: "detectado"
        });
      }

      setBottlenecks(detected);
      toast.success(`${detected.length} gargalos detectados`);
    } catch (error) {
      toast.error("Erro na detecção");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const severityColors = {
    baixa: "bg-yellow-100 text-yellow-800",
    media: "bg-orange-100 text-orange-800",
    alta: "bg-red-100 text-red-800",
    critica: "bg-purple-100 text-purple-800"
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-600" />
          Detector de Gargalos (IA)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {bottlenecks.length === 0 ? (
          <div className="text-center py-8">
            <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-4">Analise a operação para identificar gargalos</p>
            <Button onClick={detectBottlenecks} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analisando...
                </>
              ) : (
                "Detectar Gargalos"
              )}
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {bottlenecks.map((bottleneck, idx) => (
                <div key={idx} className="border-2 border-orange-200 rounded-lg p-4 bg-orange-50">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={severityColors[bottleneck.severity]}>
                          {bottleneck.severity.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">{bottleneck.area}</Badge>
                      </div>
                      <h4 className="font-bold text-gray-900">{bottleneck.description}</h4>
                    </div>
                  </div>

                  <div className="bg-white rounded p-3 mb-3">
                    <p className="text-sm font-semibold text-gray-700 mb-1">Causa Raiz:</p>
                    <p className="text-sm text-gray-600">{bottleneck.root_cause_analysis}</p>
                  </div>

                  <div className="bg-white rounded p-3">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Ações Sugeridas:</p>
                    <div className="space-y-2">
                      {bottleneck.suggested_actions?.map((action, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-gray-800">{action.action}</p>
                            <p className="text-xs text-gray-500">
                              Prioridade: {action.priority} | Impacto: {action.estimated_impact}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button onClick={detectBottlenecks} variant="outline" className="w-full">
              Atualizar Análise
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}