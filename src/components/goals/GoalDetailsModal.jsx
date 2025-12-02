import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { Brain, TrendingUp, AlertTriangle, Lightbulb, ArrowRight, Download, FileSpreadsheet, FileText } from "lucide-react";
import { formatCurrency } from "@/components/utils/formatters";
import { Button } from "@/components/ui/button";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function GoalDetailsModal({ isOpen, onClose, goal, history }) {
  if (!goal) return null;

  const statusColor = {
    red: "bg-red-100 text-red-800 border-red-200",
    yellow: "bg-yellow-100 text-yellow-800 border-yellow-200",
    green: "bg-green-100 text-green-800 border-green-200"
  }[goal.status];

  const pieData = [
    { name: 'Realizado', value: goal.result_achieved },
    { name: 'Faltante', value: Math.max(0, goal.goal_established - goal.result_achieved) }
  ];
  const COLORS = ['#10b981', '#e5e7eb'];

  // Prepare trend data (reverse history to show chronological order)
  const trendData = [...history].reverse().map(h => ({
    name: h.month_year,
    meta: h.goal_established,
    realizado: h.result_achieved,
    atingimento: h.percentage_achieved
  }));

  const handleExportPDF = async () => {
    const element = document.getElementById('goal-details-content');
    if (!element) return;
    
    const canvas = await html2canvas(element);
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF();
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`relatorio-metas-${goal.month_year}.pdf`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0">
        <div className="p-6 pb-0">
          <DialogHeader className="flex flex-row items-center justify-between pb-4 border-b">
            <div>
              <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                Resultados de {goal.month_year}
                <Badge className={statusColor}>
                  {goal.percentage_achieved.toFixed(1)}% Atingido
                </Badge>
              </DialogTitle>
              <DialogDescription>Detalhamento completo de performance e análise</DialogDescription>
            </div>
            <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExportPDF}>
                    <FileText className="w-4 h-4 mr-2" /> PDF
                </Button>
                <Button variant="outline" size="sm">
                    <FileSpreadsheet className="w-4 h-4 mr-2" /> XLS
                </Button>
            </div>
          </DialogHeader>
        </div>

        <ScrollArea className="flex-1 p-6" id="goal-details-content">
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="analysis">Análise IA & Insights</TabsTrigger>
              <TabsTrigger value="trends">Tendências</TabsTrigger>
              <TabsTrigger value="ranking">Ranking</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">Meta Estabelecida</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(goal.goal_established)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">Resultado Alcançado</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">{formatCurrency(goal.result_achieved)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">Diferença</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${goal.result_achieved >= goal.goal_established ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(goal.result_achieved - goal.goal_established)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Atingimento</CardTitle>
                  </CardHeader>
                  <CardContent className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="text-center mt-[-110px]">
                      <span className="text-3xl font-bold">{goal.percentage_achieved.toFixed(1)}%</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Meta vs Realizado</CardTitle>
                  </CardHeader>
                  <CardContent className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[{ name: 'Atual', meta: goal.goal_established, real: goal.result_achieved }]}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                        <Bar dataKey="meta" fill="#94a3b8" name="Meta" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="real" fill={goal.status === 'green' ? '#10b981' : goal.status === 'yellow' ? '#f59e0b' : '#ef4444'} name="Realizado" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="analysis" className="space-y-4">
              {goal.ai_insights ? (
                <>
                  <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-purple-900">
                        <Brain className="w-5 h-5" />
                        Resumo Inteligente
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-purple-800 leading-relaxed">{goal.ai_insights.summary}</p>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border-l-4 border-l-red-500">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-red-700 text-base">
                          <AlertTriangle className="w-4 h-4" /> Riscos
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="list-disc pl-4 space-y-1 text-sm text-gray-700">
                          {goal.ai_insights.risks?.map((item, i) => <li key={i}>{item}</li>)}
                        </ul>
                      </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-green-500">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-green-700 text-base">
                          <Lightbulb className="w-4 h-4" /> Oportunidades
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="list-disc pl-4 space-y-1 text-sm text-gray-700">
                          {goal.ai_insights.opportunities?.map((item, i) => <li key={i}>{item}</li>)}
                        </ul>
                      </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-blue-500">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-blue-700 text-base">
                          <TrendingUp className="w-4 h-4" /> Sugestões
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="list-disc pl-4 space-y-1 text-sm text-gray-700">
                          {goal.ai_insights.suggestions?.map((item, i) => <li key={i}>{item}</li>)}
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <Card className="bg-slate-50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <ArrowRight className="w-4 h-4" /> Previsão (Forecast)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-slate-700 text-sm">{goal.ai_insights.forecast}</p>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Brain className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Insights de IA não gerados para este período.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="trends">
              <Card>
                <CardHeader>
                  <CardTitle>Evolução Histórica (Últimos Meses)</CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" unit="%" />
                      <Tooltip formatter={(value, name) => [name === 'atingimento' ? `${value}%` : formatCurrency(value), name === 'atingimento' ? '% Atingido' : name]} />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="meta" stroke="#94a3b8" name="Meta" strokeDasharray="5 5" />
                      <Line yAxisId="left" type="monotone" dataKey="realizado" stroke="#3b82f6" name="Realizado" strokeWidth={2} />
                      <Line yAxisId="right" type="monotone" dataKey="atingimento" stroke="#f59e0b" name="% Atingido" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="ranking">
                <Card>
                    <CardHeader>
                        <CardTitle>Rankings do Mês</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {goal.detailed_data?.ranking ? (
                            <div className="space-y-4">
                                {/* Placeholder for ranking rendering based on detailed_data structure */}
                                <p className="text-gray-500 text-sm">Dados de ranking disponíveis no detalhamento.</p>
                                <pre className="bg-gray-50 p-4 rounded text-xs overflow-auto max-h-60">
                                    {JSON.stringify(goal.detailed_data.ranking, null, 2)}
                                </pre>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                Nenhum dado de ranking vinculado a este registro.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
          </Tabs>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}