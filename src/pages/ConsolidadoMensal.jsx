import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, Calendar, TrendingUp, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, Cell } from "recharts";
import { format, subMonths, startOfMonth, endOfMonth, getWeek, isSameMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { assessmentCriteria } from "@/components/assessment/AssessmentCriteria";

export default function ConsolidadoMensal() {
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: workshop } = useQuery({
    queryKey: ['user-workshop', user?.id],
    queryFn: async () => {
      const workshops = await base44.entities.Workshop.list();
      return workshops.find(w => w.owner_id === user?.id);
    },
    enabled: !!user
  });

  const { data: assessments = [], isLoading } = useQuery({
    queryKey: ['process-assessments-monthly', workshop?.id],
    queryFn: () => base44.entities.ProcessAssessment.filter({ workshop_id: workshop.id }),
    initialData: [],
    enabled: !!workshop
  });

  const monthlyData = useMemo(() => {
    if (!assessments.length) return null;

    const [year, month] = selectedMonth.split('-');
    const startDate = startOfMonth(new Date(parseInt(year), parseInt(month) - 1));
    const endDate = endOfMonth(startDate);

    // Filter assessments for the selected month
    const monthAssessments = assessments.filter(a => {
      const date = new Date(a.created_date);
      return isSameMonth(date, startDate);
    });

    // Group by week and type
    const weeksData = {};
    
    monthAssessments.forEach(assessment => {
        const date = new Date(assessment.created_date);
        const weekNum = getWeek(date, { weekStartsOn: 1 }); // ISO week
        const type = assessment.assessment_type;
        
        if (!weeksData[weekNum]) {
            weeksData[weekNum] = {
                week: `Semana ${weekNum}`,
                weekNumber: weekNum,
                assessments: []
            };
        }
        
        // If multiple assessments of same type in same week, take the last one (or average?)
        // User said "one per week", so let's assume one. If more, maybe average or last.
        // Let's push all and handle display
        weeksData[weekNum].assessments.push(assessment);
    });

    // Sort weeks
    const sortedWeeks = Object.values(weeksData).sort((a, b) => a.weekNumber - b.weekNumber);
    
    // Prepare chart data
    // We want to show evolution of scores per type across weeks
    const chartData = sortedWeeks.map((weekData, index) => {
        const dataPoint = {
            name: `Semana ${index + 1}`, // Simplified name like Semana 1, 2, 3, 4 relative to month
            weekOriginal: weekData.week
        };

        weekData.assessments.forEach(a => {
            const typeLabel = assessmentCriteria[a.assessment_type]?.title || a.assessment_type;
            // Use average score if multiple
            dataPoint[typeLabel] = a.average_score;
        });

        return dataPoint;
    });

    // Calculate averages per type for the month
    const typeAverages = {};
    monthAssessments.forEach(a => {
        const type = assessmentCriteria[a.assessment_type]?.title || a.assessment_type;
        if (!typeAverages[type]) typeAverages[type] = { total: 0, count: 0 };
        typeAverages[type].total += a.average_score;
        typeAverages[type].count += 1;
    });

    const averages = Object.entries(typeAverages).map(([type, data]) => ({
        type,
        average: data.total / data.count
    })).sort((a, b) => b.average - a.average);

    return {
        assessments: monthAssessments,
        chartData,
        averages,
        totalCount: monthAssessments.length
    };
  }, [assessments, selectedMonth]);

  // Generate last 12 months options
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return {
        value: format(date, 'yyyy-MM'),
        label: format(date, 'MMMM yyyy', { locale: ptBR })
    };
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Colors for charts
  const colors = ["#22c55e", "#3b82f6", "#f59e0b", "#8b5cf6", "#10b981", "#ec4899", "#06b6d4"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <Button variant="ghost" onClick={() => navigate(createPageUrl("Autoavaliacoes"))} className="mb-2 pl-0 hover:pl-2 transition-all">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Voltar para Mapas
                </Button>
                <h1 className="text-3xl font-bold text-gray-900">Consolidado Mensal</h1>
                <p className="text-gray-600">Análise comparativa das avaliações semanais</p>
            </div>

            <div className="w-full md:w-64">
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione o mês" />
                    </SelectTrigger>
                    <SelectContent>
                        {monthOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                                <span className="capitalize">{option.label}</span>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>

        {!monthlyData || monthlyData.totalCount === 0 ? (
            <Card className="bg-white/50 border-dashed">
                <CardContent className="py-12 text-center text-gray-500">
                    <Calendar className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="text-lg">Nenhuma avaliação encontrada para este mês.</p>
                    <p className="text-sm">Realize as autoavaliações semanais para gerar o relatório.</p>
                </CardContent>
            </Card>
        ) : (
            <div className="space-y-8">
                {/* Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">Avaliações Realizadas</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-blue-600">{monthlyData.totalCount}</div>
                            <p className="text-xs text-gray-500 mt-1">Neste mês</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">Melhor Área</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-xl font-bold text-green-600 truncate">
                                {monthlyData.averages[0]?.type || '-'}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Média: {monthlyData.averages[0]?.average.toFixed(1) || '0.0'}
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">Área de Atenção</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-xl font-bold text-red-600 truncate">
                                {monthlyData.averages[monthlyData.averages.length - 1]?.type || '-'}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Média: {monthlyData.averages[monthlyData.averages.length - 1]?.average.toFixed(1) || '0.0'}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Evolution Chart */}
                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-blue-600" />
                            Evolução Semanal por Área
                        </CardTitle>
                        <CardDescription>
                            Comparativo das notas ao longo das semanas do mês
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[400px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={monthlyData.chartData}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                    <XAxis dataKey="name" />
                                    <YAxis domain={[0, 10]} />
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    />
                                    <Legend />
                                    {/* Generate Lines dynamically based on data keys excluding 'name' and 'weekOriginal' */}
                                    {monthlyData.chartData.length > 0 && Object.keys(monthlyData.chartData[0])
                                        .filter(key => key !== 'name' && key !== 'weekOriginal')
                                        .map((key, index) => (
                                            <Line 
                                                key={key}
                                                type="monotone" 
                                                dataKey={key} 
                                                stroke={colors[index % colors.length]} 
                                                strokeWidth={3}
                                                activeDot={{ r: 8 }}
                                            />
                                        ))
                                    }
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Average Performance Chart */}
                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-purple-600" />
                            Média Geral do Mês
                        </CardTitle>
                        <CardDescription>
                            Desempenho consolidado por área
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={monthlyData.averages} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.2} />
                                    <XAxis type="number" domain={[0, 10]} />
                                    <YAxis dataKey="type" type="category" width={150} />
                                    <Tooltip 
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    />
                                    <Bar dataKey="average" name="Média" radius={[0, 4, 4, 0]} fill="#8b5cf6" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-blue-900 mb-2">💡 Análise de Próximos Passos</h3>
                    <p className="text-blue-800 leading-relaxed">
                        Com base nos resultados das últimas 4 semanas, utilize este relatório para planejar o próximo mês.
                        Foque nas áreas com menor desempenho ({monthlyData.averages[monthlyData.averages.length - 1]?.type}) e mantenha a constância nas áreas fortes.
                        A evolução semanal mostra se as ações tomadas durante o mês surtiram efeito imediato.
                    </p>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}