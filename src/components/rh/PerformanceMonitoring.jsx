import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, AlertTriangle, Target, Award, Brain } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function PerformanceMonitoring({ employee }) {
  const { data: productivityDiagnostics = [] } = useQuery({
    queryKey: ['productivity-diagnostics', employee.id],
    queryFn: () => base44.entities.ProductivityDiagnostic.filter({ employee_id: employee.id })
  });

  const { data: maturityDiagnostics = [] } = useQuery({
    queryKey: ['maturity-diagnostics', employee.id],
    queryFn: () => base44.entities.CollaboratorMaturityDiagnostic.filter({ employee_id: employee.id })
  });

  const { data: performanceDiagnostics = [] } = useQuery({
    queryKey: ['performance-diagnostics', employee.id],
    queryFn: () => base44.entities.PerformanceMatrixDiagnostic.filter({ employee_id: employee.id })
  });

  // Processar dados de produtividade ao longo do tempo
  const productivityTrend = productivityDiagnostics
    .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
    .map(d => ({
      date: format(new Date(d.created_date), "MMM/yy", { locale: ptBR }),
      percentage: d.cost_percentage || 0,
      productivity: d.total_productivity || 0
    }));

  // Último diagnóstico de produtividade
  const latestProductivity = productivityDiagnostics
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];

  // Último diagnóstico de maturidade
  const latestMaturity = maturityDiagnostics
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];

  // Último diagnóstico de desempenho
  const latestPerformance = performanceDiagnostics
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];

  // Dados para o radar chart de competências
  const competenciesData = latestPerformance ? [
    {
      competency: 'Técnica',
      value: latestPerformance.technical_average || 0
    },
    {
      competency: 'Emocional',
      value: latestPerformance.emotional_average || 0
    },
    {
      competency: 'Produtividade',
      value: latestProductivity ? (latestProductivity.cost_percentage <= 15 ? 10 : latestProductivity.cost_percentage <= 20 ? 8 : 5) : 0
    },
    {
      competency: 'Maturidade',
      value: latestMaturity ? (latestMaturity.maturity_level === 'adulto' ? 10 : latestMaturity.maturity_level === 'adolescente' ? 7 : latestMaturity.maturity_level === 'crianca' ? 4 : 2) : 0
    }
  ] : [];

  const getClassificationColor = (classification) => {
    const colors = {
      'ideal': 'bg-green-100 text-green-700',
      'limite': 'bg-yellow-100 text-yellow-700',
      'aceitavel': 'bg-orange-100 text-orange-700',
      'acima_aceitavel': 'bg-red-100 text-red-700',
      'investimento': 'bg-blue-100 text-blue-700',
      'reconhecimento': 'bg-purple-100 text-purple-700',
      'adulto': 'bg-green-100 text-green-700',
      'adolescente': 'bg-blue-100 text-blue-700',
      'crianca': 'bg-yellow-100 text-yellow-700',
      'bebe': 'bg-orange-100 text-orange-700'
    };
    return colors[classification] || 'bg-gray-100 text-gray-700';
  };

  const getMaturityLabel = (level) => {
    const labels = {
      'adulto': 'Adulto',
      'adolescente': 'Adolescente',
      'crianca': 'Criança',
      'bebe': 'Bebê'
    };
    return labels[level] || level;
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Produtividade */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-600" />
              Produtividade
            </CardTitle>
          </CardHeader>
          <CardContent>
            {latestProductivity ? (
              <div className="space-y-2">
                <div className="text-2xl font-bold">
                  {latestProductivity.cost_percentage?.toFixed(1)}%
                </div>
                <Badge className={getClassificationColor(latestProductivity.classification)}>
                  {latestProductivity.classification?.replace('_', ' ')}
                </Badge>
                <p className="text-xs text-gray-600 mt-2">
                  {latestProductivity.recommendation}
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Nenhum diagnóstico realizado</p>
            )}
          </CardContent>
        </Card>

        {/* Maturidade */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="w-4 h-4 text-purple-600" />
              Maturidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            {latestMaturity ? (
              <div className="space-y-2">
                <div className="text-2xl font-bold">
                  {getMaturityLabel(latestMaturity.maturity_level)}
                </div>
                <Badge className={getClassificationColor(latestMaturity.maturity_level)}>
                  Nível {latestMaturity.maturity_level}
                </Badge>
                <div className="text-xs text-gray-600 mt-2">
                  Avaliado em {format(new Date(latestMaturity.created_date), "dd/MM/yyyy")}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Nenhum diagnóstico realizado</p>
            )}
          </CardContent>
        </Card>

        {/* Desempenho */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Award className="w-4 h-4 text-green-600" />
              Desempenho
            </CardTitle>
          </CardHeader>
          <CardContent>
            {latestPerformance ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div>
                    <div className="text-sm text-gray-600">Técnica</div>
                    <div className="text-xl font-bold">{latestPerformance.technical_average?.toFixed(1)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Emocional</div>
                    <div className="text-xl font-bold">{latestPerformance.emotional_average?.toFixed(1)}</div>
                  </div>
                </div>
                <Badge className={getClassificationColor(latestPerformance.classification)}>
                  {latestPerformance.classification}
                </Badge>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Nenhum diagnóstico realizado</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Evolução de Produtividade */}
      {productivityTrend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Evolução da Produtividade</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={productivityTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="percentage" stroke="#3b82f6" name="% Custo" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm">
              <div className="flex items-center gap-2 text-blue-700">
                {productivityTrend.length >= 2 && 
                  productivityTrend[productivityTrend.length - 1].percentage < productivityTrend[productivityTrend.length - 2].percentage ? (
                  <>
                    <TrendingDown className="w-4 h-4" />
                    <span>Produtividade em melhora (custo diminuindo)</span>
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4" />
                    <span>Monitorar custos</span>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Radar Chart de Competências */}
      {competenciesData.length > 0 && latestPerformance && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Mapa de Competências</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={competenciesData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="competency" />
                <PolarRadiusAxis angle={90} domain={[0, 10]} />
                <Radar name="Competências" dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Alertas e Recomendações */}
      {(latestProductivity || latestMaturity || latestPerformance) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              Alertas e Recomendações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {latestProductivity && latestProductivity.classification !== 'ideal' && (
                <div className="p-3 bg-orange-50 border-l-4 border-orange-500 text-sm">
                  <strong>Produtividade:</strong> {latestProductivity.recommendation}
                </div>
              )}
              {latestMaturity && latestMaturity.maturity_level !== 'adulto' && (
                <div className="p-3 bg-yellow-50 border-l-4 border-yellow-500 text-sm">
                  <strong>Maturidade:</strong> Colaborador no nível {getMaturityLabel(latestMaturity.maturity_level)}. 
                  Considere programas de desenvolvimento comportamental.
                </div>
              )}
              {latestPerformance && latestPerformance.recommendation && (
                <div className="p-3 bg-blue-50 border-l-4 border-blue-500 text-sm">
                  <strong>Desempenho:</strong> {latestPerformance.recommendation}
                </div>
              )}
              {!latestProductivity && !latestMaturity && !latestPerformance && (
                <p className="text-sm text-gray-500">Nenhum alerta no momento</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}