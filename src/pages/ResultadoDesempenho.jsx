import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Home, RotateCcw, TrendingUp, AlertCircle, Award, Target } from "lucide-react";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ZAxis, ReferenceLine, ReferenceArea, Label } from "recharts";
import { classificationRules } from "../components/performance/PerformanceCriteria";
import { toast } from "sonner";

export default function ResultadoDesempenho() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [diagnostic, setDiagnostic] = useState(null);
  const [employee, setEmployee] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const diagnosticId = urlParams.get("id");

      if (!diagnosticId) {
        toast.error("Diagnóstico não encontrado");
        navigate(createPageUrl("Home"));
        return;
      }

      const diagnostics = await base44.entities.PerformanceMatrixDiagnostic.list();
      const currentDiagnostic = diagnostics.find(d => d.id === diagnosticId);

      if (!currentDiagnostic) {
        toast.error("Diagnóstico não encontrado");
        navigate(createPageUrl("Home"));
        return;
      }

      setDiagnostic(currentDiagnostic);

      const employees = await base44.entities.Employee.list();
      const currentEmployee = employees.find(e => e.id === currentDiagnostic.employee_id);
      setEmployee(currentEmployee);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar resultado");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!diagnostic) return null;

  const classificationInfo = classificationRules[diagnostic.classification];
  
  const colorMap = {
    red: "#ef4444",
    orange: "#f97316",
    yellow: "#eab308",
    blue: "#3b82f6",
    green: "#22c55e",
    purple: "#a855f7"
  };

  const bgColorMap = {
    red: "from-red-500 to-red-600",
    orange: "from-orange-500 to-orange-600",
    yellow: "from-yellow-500 to-yellow-600",
    blue: "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600",
    purple: "from-purple-500 to-purple-600"
  };

  const matrixData = [{
    x: diagnostic.technical_average,
    y: diagnostic.emotional_average,
    z: 500
  }];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border-2 border-gray-300">
          <p className="font-semibold">{employee?.full_name}</p>
          <p className="text-sm">Técnica: {payload[0].value.toFixed(1)}</p>
          <p className="text-sm">Emocional: {payload[1].value.toFixed(1)}</p>
        </div>
      );
    }
    return null;
  };

  // Renderiza forma customizada (quadrado)
  const renderCustomShape = (props) => {
    const { cx, cy, fill } = props;
    const size = 15;
    return (
      <rect
        x={cx - size / 2}
        y={cy - size / 2}
        width={size}
        height={size}
        fill={fill}
        stroke="#000"
        strokeWidth={1.5}
      />
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 py-12 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Resultado da Avaliação de Desempenho
          </h1>
          {employee && (
            <p className="text-xl text-gray-600">
              {employee.full_name} - {employee.position}
            </p>
          )}
        </div>

        {/* Classificação */}
        <Card className={`border-2 shadow-xl bg-gradient-to-br ${bgColorMap[classificationInfo.color]}`}>
          <CardContent className="p-8 text-white">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <Award className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold">{classificationInfo.title}</h2>
                <p className="text-white/90 text-lg">{classificationInfo.description}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Competências */}
        <Card>
          <CardHeader>
            <CardTitle>Competências</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-2 text-left font-semibold">Competência</th>
                    <th className="border border-gray-300 p-2 text-center font-semibold bg-yellow-100">
                      {employee?.full_name || "Colaborador"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-yellow-50">
                    <td className="border border-gray-300 p-2 font-semibold">COMPETÊNCIA TÉCNICA</td>
                    <td className="border border-gray-300 p-2 text-center font-bold text-lg">
                      {diagnostic.technical_average.toFixed(1)}
                    </td>
                  </tr>
                  <tr className="bg-yellow-50">
                    <td className="border border-gray-300 p-2 font-semibold">COMPETÊNCIA EMOCIONAL</td>
                    <td className="border border-gray-300 p-2 text-center font-bold text-lg">
                      {diagnostic.emotional_average.toFixed(1)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Matriz de Decisão */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-center text-2xl font-bold">MATRIZ DE DECISÃO</CardTitle>
          </CardHeader>
          <CardContent className="bg-white">
            <ResponsiveContainer width="100%" height={600}>
              <ScatterChart margin={{ top: 20, right: 100, bottom: 80, left: 100 }}>
                {/* Grade completa */}
                <CartesianGrid 
                  strokeDasharray="0" 
                  stroke="#d1d5db" 
                  strokeWidth={0.5}
                  verticalPoints={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
                  horizontalPoints={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
                />
                
                {/* Bordas retangulares das zonas */}
                <ReferenceArea x1={7} x2={10} y1={6} y2={7} stroke="#000" strokeWidth={2} fill="none" />
                <ReferenceArea x1={7} x2={10} y1={7} y2={10} stroke="#000" strokeWidth={2} fill="none" />
                <ReferenceArea x1={8} x2={10} y1={8} y2={10} stroke="#000" strokeWidth={2} fill="none" />

                <XAxis 
                  type="number" 
                  dataKey="x" 
                  name="Técnica" 
                  domain={[0, 10]}
                  ticks={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
                  tickLine={false}
                  axisLine={{ stroke: '#000', strokeWidth: 2 }}
                  tick={{ fontSize: 12 }}
                >
                  <Label 
                    value="COMPETÊNCIAS TÉCNICAS - HABILIDADE/CONHECIMENTO" 
                    position="bottom" 
                    offset={50}
                    style={{ fontSize: 13, fontWeight: 600, fill: '#000' }}
                  />
                </XAxis>
                
                <YAxis 
                  type="number" 
                  dataKey="y" 
                  name="Emocional" 
                  domain={[0, 10]}
                  ticks={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
                  tickLine={false}
                  axisLine={{ stroke: '#000', strokeWidth: 2 }}
                  tick={{ fontSize: 12 }}
                >
                  <Label 
                    value="COMPETÊNCIAS EMOCIONAIS - ATITUDE/CARÁTER" 
                    angle={-90} 
                    position="left" 
                    offset={70}
                    style={{ fontSize: 13, fontWeight: 600, fill: '#000' }}
                  />
                </YAxis>

                <ZAxis type="number" dataKey="z" range={[400, 600]} />
                
                <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />

                {/* Linhas de Divisão Principais */}
                <ReferenceLine 
                  y={5} 
                  stroke="#000" 
                  strokeWidth={3}
                />
                <ReferenceLine 
                  x={5} 
                  stroke="#000" 
                  strokeWidth={3}
                />

                {/* Linhas Secundárias */}
                <ReferenceLine 
                  y={6} 
                  stroke="#000" 
                  strokeWidth={1.5}
                />
                <ReferenceLine 
                  y={7} 
                  stroke="#000" 
                  strokeWidth={1.5}
                />
                <ReferenceLine 
                  x={7} 
                  stroke="#000" 
                  strokeWidth={1.5}
                />

                {/* Labels dos Quadrantes */}
                <text x="20%" y="20%" fill="#333" fontSize="14" fontWeight="600" textAnchor="middle">
                  TREINAMENTO TÉCNICO
                </text>
                <text x="17%" y="80%" fill="#333" fontSize="14" fontWeight="600" textAnchor="middle">
                  DEMISSÃO
                </text>
                <text x="75%" y="80%" fill="#333" fontSize="14" fontWeight="600" textAnchor="middle">
                  TREINAMENTO EMOCIONAL
                </text>
                <text x="65%" y="45%" fill="#333" fontSize="13" fontWeight="600" textAnchor="middle">
                  OBSERVAÇÃO
                </text>
                <text x="78%" y="35%" fill="#333" fontSize="13" fontWeight="600" textAnchor="middle">
                  RECONHECIMENTO
                </text>
                <text x="83%" y="20%" fill="#333" fontSize="13" fontWeight="600" textAnchor="middle">
                  INVESTIMENTO
                </text>
                <text x="92%" y="88%" fill="#333" fontSize="13" fontWeight="600" textAnchor="middle">
                  PROMOÇÃO
                </text>

                <Scatter 
                  name="Colaborador" 
                  data={matrixData} 
                  fill={colorMap[classificationInfo.color]}
                  shape={renderCustomShape}
                />
              </ScatterChart>
            </ResponsiveContainer>

            {/* Legenda */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-6 p-4 bg-gray-50 rounded-lg border">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 border border-gray-700" />
                <span className="text-xs">Demissão</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-500 border border-gray-700" />
                <span className="text-xs">Treinamento Técnico</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 border border-gray-700" />
                <span className="text-xs">Treinamento Emocional</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 border border-gray-700" />
                <span className="text-xs">Observação</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 border border-gray-700" />
                <span className="text-xs">Reconhecimento</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-500 border border-gray-700" />
                <span className="text-xs">Investimento/Promoção</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recomendação */}
        <Card className="border-2 border-amber-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              Recomendações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 leading-relaxed">
              {diagnostic.recommendation}
            </p>
          </CardContent>
        </Card>

        {/* Ações */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            variant="outline"
            onClick={() => navigate(createPageUrl("Home"))}
            className="px-8"
          >
            <Home className="w-4 h-4 mr-2" />
            Voltar ao Início
          </Button>
          <Button
            onClick={() => navigate(createPageUrl("DiagnosticoDesempenho"))}
            className="px-8 bg-indigo-600 hover:bg-indigo-700"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Avaliar Outro Colaborador
          </Button>
        </div>
      </div>
    </div>
  );
}