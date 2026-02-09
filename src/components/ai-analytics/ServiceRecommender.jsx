import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Lightbulb, DollarSign } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function ServiceRecommender({ workshop }) {
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState(null);
  const [vehicleInfo, setVehicleInfo] = useState({
    brand: "",
    model: "",
    year: "",
    mileage: ""
  });

  const generateRecommendations = async () => {
    if (!vehicleInfo.brand || !vehicleInfo.model) {
      toast.error("Preencha marca e modelo");
      return;
    }

    setLoading(true);
    try {
      const prompt = `
ATENÇÃO: Você é o CHEFE DE OFICINA orientando os mecânicos.
Seja EXTREMAMENTE OPERACIONAL e TÉCNICO.
Diga exatamente quais serviços executar e porquê, de forma simples e direta.

Baseado no veículo:
- Marca: ${vehicleInfo.brand}
- Modelo: ${vehicleInfo.model}
- Ano: ${vehicleInfo.year}
- Quilometragem: ${vehicleInfo.mileage} km

Forneça:
1. Serviços recomendados (urgente, recomendado, preventivo) com justificativa técnica simples
2. Manutenção preventiva OBRIGATÓRIA para esta km
3. Oportunidades de venda (upsell) fáceis de explicar para o cliente
4. Valor estimado
`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            recommended_services: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  service_name: { type: "string" },
                  reason: { type: "string" },
                  priority: { type: "string" },
                  estimated_value: { type: "number" },
                  confidence_score: { type: "number" }
                }
              }
            },
            predictive_maintenance: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  component: { type: "string" },
                  estimated_failure_date: { type: "string" },
                  preventive_action: { type: "string" }
                }
              }
            },
            upsell_opportunities: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  product_service: { type: "string" },
                  value_proposition: { type: "string" },
                  estimated_value: { type: "number" }
                }
              }
            }
          }
        }
      });

      // Salvar recomendação
      await base44.entities.ServiceRecommendation.create({
        workshop_id: workshop.id,
        vehicle_info: vehicleInfo,
        ...response
      });

      setRecommendations(response);
      toast.success("Recomendações geradas!");
    } catch (error) {
      toast.error("Erro ao gerar recomendações");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const priorityColors = {
    urgente: "bg-red-100 text-red-800",
    recomendado: "bg-yellow-100 text-yellow-800",
    preventivo: "bg-blue-100 text-blue-800"
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-yellow-600" />
          Recomendador de Serviços (IA)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            placeholder="Marca"
            value={vehicleInfo.brand}
            onChange={(e) => setVehicleInfo({...vehicleInfo, brand: e.target.value})}
          />
          <Input
            placeholder="Modelo"
            value={vehicleInfo.model}
            onChange={(e) => setVehicleInfo({...vehicleInfo, model: e.target.value})}
          />
          <Input
            placeholder="Ano"
            type="number"
            value={vehicleInfo.year}
            onChange={(e) => setVehicleInfo({...vehicleInfo, year: e.target.value})}
          />
          <Input
            placeholder="Km"
            type="number"
            value={vehicleInfo.mileage}
            onChange={(e) => setVehicleInfo({...vehicleInfo, mileage: e.target.value})}
          />
        </div>

        <Button onClick={generateRecommendations} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analisando...
            </>
          ) : (
            "Gerar Recomendações"
          )}
        </Button>

        {recommendations && (
          <div className="space-y-4 mt-6">
            {/* Serviços Recomendados */}
            <div>
              <h4 className="font-bold text-gray-900 mb-3">Serviços Recomendados:</h4>
              <div className="space-y-2">
                {recommendations.recommended_services.map((service, idx) => (
                  <div key={idx} className="border rounded-lg p-3 bg-gray-50">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={priorityColors[service.priority.toLowerCase()]}>
                            {service.priority}
                          </Badge>
                          <span className="font-semibold text-gray-900">{service.service_name}</span>
                        </div>
                        <p className="text-sm text-gray-600">{service.reason}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">
                          R$ {service.estimated_value.toFixed(0)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {service.confidence_score}% conf.
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Manutenção Preventiva */}
            {recommendations.predictive_maintenance.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-bold text-blue-900 mb-3">Manutenção Preventiva:</h4>
                <div className="space-y-2">
                  {recommendations.predictive_maintenance.map((item, idx) => (
                    <div key={idx} className="text-sm">
                      <p className="font-medium text-blue-800">{item.component}</p>
                      <p className="text-blue-700">{item.preventive_action}</p>
                      <p className="text-xs text-blue-600">Estimado: {item.estimated_failure_date}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upsell */}
            {recommendations.upsell_opportunities.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-bold text-green-900 mb-3">Oportunidades de Venda:</h4>
                <div className="space-y-2">
                  {recommendations.upsell_opportunities.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-green-800">{item.product_service}</p>
                        <p className="text-sm text-green-700">{item.value_proposition}</p>
                      </div>
                      <p className="text-lg font-bold text-green-600">
                        R$ {item.estimated_value.toFixed(0)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}