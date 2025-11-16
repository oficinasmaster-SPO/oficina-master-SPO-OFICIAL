import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp, AlertCircle, LineChart as LineChartIcon } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function PerformanceForecast({ workshop }) {
  const [loading, setLoading] = useState(false);
  const [forecast, setForecast] = useState(null);

  const generateForecast = async () => {
    setLoading(true);
    try {
      // Simular dados históricos (em produção, viriam do banco)
      const historicalData = [
        { month: "2024-07", revenue: 80000, ticket: 850, profit: 15 },
        { month: "2024-08", revenue: 85000, ticket: 900, profit: 16 },
        { month: "2024-09", revenue: 90000, ticket: 920, profit: 18 },
        { month: "2024-10", revenue: 95000, ticket: 950, profit: 17 },
        { month: "2024-11", revenue: 100000, ticket: 1000, profit: 19 },
        { month: "2024-12", revenue: 105000, ticket: 1050, profit: 20 }
      ];

      // Gerar previsão com IA
      const prompt = `
Baseado nos dados históricos abaixo, faça uma previsão para os próximos 3 meses:
${JSON.stringify(historicalData, null, 2)}

Analise tendências, sazonalidade e forneça:
1. Valores previstos de faturamento, ticket médio e lucro
2. Nível de confiança da previsão
3. Análise de tendências
4. Recomendações para manter ou melhorar performance
`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            forecasts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  month: { type: "string" },
                  revenue: { type: "number" },
                  ticket: { type: "number" },
                  profit: { type: "number" }
                }
              }
            },
            confidence_level: { type: "number" },
            trend_analysis: { type: "string" },
            recommendations: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      // Salvar previsão
      const forecastData = {
        workshop_id: workshop.id,
        forecast_period: response.forecasts[0].month,
        predicted_revenue: response.forecasts[0].revenue,
        predicted_ticket: response.forecasts[0].ticket,
        predicted_profit: response.forecasts[0].profit,
        confidence_level: response.confidence_level,
        historical_data_used: historicalData,
        trend_analysis: response.trend_analysis,
        recommendations: response.recommendations
      };

      await base44.entities.PerformanceForecast.create(forecastData);

      setForecast({
        historical: historicalData,
        future: response.forecasts,
        analysis: response.trend_analysis,
        recommendations: response.recommendations,
        confidence: response.confidence_level
      });

      toast.success("Previsão gerada com sucesso!");
    } catch (error) {
      toast.error("Erro ao gerar previsão");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const chartData = forecast ? [
    ...forecast.historical.map(d => ({ ...d, type: 'Histórico' })),
    ...forecast.future.map(d => ({ ...d, type: 'Previsão' }))
  ] : [];

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LineChartIcon className="w-5 h-5 text-blue-600" />
          Previsão de Desempenho (IA)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!forecast ? (
          <div className="text-center py-8">
            <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-4">Gere previsões baseadas em dados históricos</p>
            <Button onClick={generateForecast} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analisando...
                </>
              ) : (
                "Gerar Previsão"
              )}
            </Button>
          </div>
        ) : (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-blue-900">
                  Nível de Confiança: {forecast.confidence}%
                </span>
              </div>
              <p className="text-sm text-blue-800">{forecast.analysis}</p>
            </div>

            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Faturamento" 
                  strokeDasharray={d => d.type === 'Previsão' ? '5 5' : '0'}
                />
                <Line 
                  type="monotone" 
                  dataKey="profit" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Lucro %" 
                  strokeDasharray={d => d.type === 'Previsão' ? '5 5' : '0'}
                />
              </LineChart>
            </ResponsiveContainer>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-900 mb-2">Recomendações:</h4>
              <ul className="space-y-1">
                {forecast.recommendations.map((rec, idx) => (
                  <li key={idx} className="text-sm text-green-800">• {rec}</li>
                ))}
              </ul>
            </div>

            <Button onClick={generateForecast} variant="outline" className="w-full">
              Atualizar Previsão
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}