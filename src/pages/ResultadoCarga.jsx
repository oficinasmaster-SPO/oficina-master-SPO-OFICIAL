import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Home, RotateCcw, AlertTriangle, TrendingUp, Users, ArrowRightLeft, CheckCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";
import { toast } from "sonner";

export default function ResultadoCarga() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [diagnostic, setDiagnostic] = useState(null);
  const [employees, setEmployees] = useState([]);

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

      const diagnostics = await base44.entities.WorkloadDiagnostic.list();
      const currentDiagnostic = diagnostics.find(d => d.id === diagnosticId);

      if (!currentDiagnostic) {
        toast.error("Diagnóstico não encontrado");
        navigate(createPageUrl("Home"));
        return;
      }

      setDiagnostic(currentDiagnostic);

      const allEmployees = await base44.entities.Employee.list();
      setEmployees(allEmployees);
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

  const healthConfig = {
    excelente: {
      title: "Excelente",
      color: "from-green-500 to-emerald-600",
      icon: CheckCircle,
      description: "Distribuição de carga equilibrada"
    },
    bom: {
      title: "Bom",
      color: "from-blue-500 to-blue-600",
      icon: TrendingUp,
      description: "Pequenos ajustes recomendados"
    },
    atencao: {
      title: "Atenção",
      color: "from-yellow-500 to-amber-600",
      icon: AlertTriangle,
      description: "Requer redistribuição de tarefas"
    },
    critico: {
      title: "Crítico",
      color: "from-red-500 to-red-600",
      icon: AlertTriangle,
      description: "Ação imediata necessária"
    }
  };

  const currentHealth = healthConfig[diagnostic.overall_health];
  const HealthIcon = currentHealth.icon;

  // Preparar dados para o gráfico
  const chartData = diagnostic.workload_data.map(emp => {
    const employee = employees.find(e => e.id === emp.employee_id);
    const utilization = (emp.weekly_hours_worked / emp.ideal_weekly_hours) * 100;
    
    return {
      name: employee?.full_name || emp.position_title,
      utilizacao: utilization,
      ideal: 100,
      horas: emp.weekly_hours_worked
    };
  });

  const getEmployeeName = (employeeId) => {
    const employee = employees.find(e => e.id === employeeId);
    return employee?.full_name || "Colaborador";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 py-12 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Resultado do Diagnóstico de Carga
          </h1>
          <p className="text-xl text-gray-600">
            Período: {new Date(diagnostic.period_start).toLocaleDateString()} - {new Date(diagnostic.period_end).toLocaleDateString()}
          </p>
        </div>

        {/* Saúde Geral */}
        <Card className={`border-2 shadow-xl bg-gradient-to-br ${currentHealth.color}`}>
          <CardContent className="p-8 text-white">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <HealthIcon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold">{currentHealth.title}</h2>
                <p className="text-white/90 text-lg">{currentHealth.description}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gráfico de Utilização */}
        <Card>
          <CardHeader>
            <CardTitle>Taxa de Utilização por Colaborador</CardTitle>
            <CardDescription>Comparação entre horas trabalhadas e capacidade ideal</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis label={{ value: 'Utilização (%)', angle: -90, position: 'insideLeft' }} />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === "utilizacao") return [`${value.toFixed(1)}%`, "Utilização"];
                    if (name === "ideal") return [`${value}%`, "Ideal"];
                    return [value, name];
                  }}
                />
                <Legend />
                <Bar dataKey="ideal" fill="#94a3b8" name="Capacidade Ideal (100%)" />
                <Bar dataKey="utilizacao" name="Utilização Atual">
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`}
                      fill={entry.utilizacao > 110 ? "#ef4444" : entry.utilizacao < 70 ? "#3b82f6" : "#22c55e"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            <div className="flex flex-wrap gap-4 mt-4 justify-center">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded" />
                <span className="text-sm">Equilibrado (70-110%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded" />
                <span className="text-sm">Sobrecarregado (&gt;110%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded" />
                <span className="text-sm">Subutilizado (&lt;70%)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Colaboradores Sobrecarregados */}
        {diagnostic.analysis_results.overloaded_employees?.length > 0 && (
          <Card className="border-2 border-red-200">
            <CardHeader>
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-red-600" />
                <div>
                  <CardTitle className="text-red-900">Colaboradores Sobrecarregados</CardTitle>
                  <CardDescription>Identificados {diagnostic.analysis_results.overloaded_employees.length} casos</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {diagnostic.analysis_results.overloaded_employees.map((emp, index) => (
                <div key={index} className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-red-900">
                      {getEmployeeName(emp.employee_id)}
                    </h3>
                    <span className="text-red-700 font-bold">
                      +{emp.overload_percentage.toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-sm text-red-800">{emp.recommendation}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Colaboradores Subutilizados */}
        {diagnostic.analysis_results.underutilized_employees?.length > 0 && (
          <Card className="border-2 border-blue-200">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Users className="w-6 h-6 text-blue-600" />
                <div>
                  <CardTitle className="text-blue-900">Colaboradores Subutilizados</CardTitle>
                  <CardDescription>Identificados {diagnostic.analysis_results.underutilized_employees.length} casos</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {diagnostic.analysis_results.underutilized_employees.map((emp, index) => (
                <div key={index} className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-blue-900">
                      {getEmployeeName(emp.employee_id)}
                    </h3>
                    <span className="text-blue-700 font-bold">
                      {emp.utilization_percentage.toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-sm text-blue-800">{emp.recommendation}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Sugestões de Redistribuição */}
        {diagnostic.analysis_results.redistribution_suggestions?.length > 0 && (
          <Card className="border-2 border-purple-200">
            <CardHeader>
              <div className="flex items-center gap-3">
                <ArrowRightLeft className="w-6 h-6 text-purple-600" />
                <div>
                  <CardTitle className="text-purple-900">Sugestões de Redistribuição</CardTitle>
                  <CardDescription>Propostas para equilibrar a carga de trabalho</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {diagnostic.analysis_results.redistribution_suggestions.map((suggestion, index) => (
                <div key={index} className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="font-semibold text-purple-900">
                      {getEmployeeName(suggestion.from_employee_id)}
                    </div>
                    <ArrowRightLeft className="w-4 h-4 text-purple-600" />
                    <div className="font-semibold text-purple-900">
                      {getEmployeeName(suggestion.to_employee_id)}
                    </div>
                  </div>
                  <p className="text-sm text-purple-800 mb-2">{suggestion.justification}</p>
                  {suggestion.tasks_to_transfer?.length > 0 && (
                    <ul className="text-sm text-purple-700 ml-4 list-disc">
                      {suggestion.tasks_to_transfer.map((task, i) => (
                        <li key={i}>{task}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

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
            onClick={() => navigate(createPageUrl("DiagnosticoCarga"))}
            className="px-8 bg-orange-600 hover:bg-orange-700"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Novo Diagnóstico
          </Button>
        </div>
      </div>
    </div>
  );
}