import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, Home, Target, TrendingUp, Users, DollarSign, AlertTriangle, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function PainelMetas() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [breakdown, setBreakdown] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const breakdownId = urlParams.get("id");

      if (!breakdownId) {
        toast.error("Meta não encontrada");
        navigate(createPageUrl("GestaoMetas"));
        return;
      }

      const breakdowns = await base44.entities.GoalBreakdown.list();
      const currentBreakdown = breakdowns.find(b => b.id === breakdownId);

      if (!currentBreakdown) {
        toast.error("Meta não encontrada");
        navigate(createPageUrl("GestaoMetas"));
        return;
      }

      setBreakdown(currentBreakdown);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar painel");
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

  if (!breakdown) return null;

  const achievementPercentage = breakdown.target_revenue > 0 
    ? (breakdown.current_revenue / breakdown.target_revenue) * 100 
    : 0;

  const currentAvgTicket = breakdown.current_clients > 0 
    ? breakdown.current_revenue / breakdown.current_clients 
    : 0;

  const isOnTrack = achievementPercentage >= 80;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 py-12 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Painel de Acompanhamento de Metas
          </h1>
          <p className="text-gray-600">
            Mês Alvo: {new Date(breakdown.target_month_date).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* KPIs Globais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-2 border-green-200">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-600" />
                Faturamento Meta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                R$ {breakdown.target_revenue.toFixed(2)}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Realizado: R$ {breakdown.current_revenue.toFixed(2)}
              </p>
              <Progress value={achievementPercentage} className="mt-3 h-2" />
              <p className="text-xs text-gray-500 mt-1">{achievementPercentage.toFixed(1)}% atingido</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-blue-200">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                Clientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {breakdown.target_clients}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Atendidos: {breakdown.current_clients}
              </p>
              <Progress 
                value={breakdown.target_clients > 0 ? (breakdown.current_clients / breakdown.target_clients) * 100 : 0} 
                className="mt-3 h-2" 
              />
            </CardContent>
          </Card>

          <Card className="border-2 border-purple-200">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-600" />
                Ticket Médio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">
                R$ {breakdown.target_avg_ticket.toFixed(2)}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Atual: R$ {currentAvgTicket.toFixed(2)}
              </p>
              <div className={`mt-3 text-sm font-semibold ${currentAvgTicket >= breakdown.target_avg_ticket ? 'text-green-600' : 'text-red-600'}`}>
                {currentAvgTicket >= breakdown.target_avg_ticket ? '✓ No alvo' : '✗ Abaixo do alvo'}
              </div>
            </CardContent>
          </Card>

          <Card className={`border-2 ${isOnTrack ? 'border-green-300 bg-green-50' : 'border-orange-300 bg-orange-50'}`}>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                {isOnTrack ? <CheckCircle className="w-4 h-4 text-green-600" /> : <AlertTriangle className="w-4 h-4 text-orange-600" />}
                Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${isOnTrack ? 'text-green-700' : 'text-orange-700'}`}>
                {isOnTrack ? 'No Caminho' : 'Atenção'}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {isOnTrack 
                  ? 'Continue com o bom desempenho!' 
                  : 'É necessário aumentar o ritmo para atingir a meta.'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Detalhamento por Área */}
        {["vendas", "comercial", "tecnico"].map(areaKey => {
          const areaNames = { vendas: "Vendas", comercial: "Comercial", tecnico: "Técnica" };
          const area = breakdown.areas[areaKey];
          if (!area || !area.target_revenue) return null;

          return (
            <Card key={areaKey} className="border-2 border-indigo-200">
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50">
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-indigo-600" />
                  Área {areaNames[areaKey]}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div>
                    <p className="text-sm text-gray-600">Meta Faturamento</p>
                    <p className="text-lg font-bold text-indigo-700">R$ {area.target_revenue.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Meta Clientes</p>
                    <p className="text-lg font-bold text-blue-700">{area.target_clients}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Média Diária</p>
                    <p className="text-lg font-bold text-green-700">{area.target_daily_clients.toFixed(1)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Ticket Médio</p>
                    <p className="text-lg font-bold text-purple-700">R$ {area.target_avg_ticket.toFixed(2)}</p>
                  </div>
                </div>

                {area.employees && area.employees.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Colaboradores:</h4>
                    <div className="space-y-2">
                      {area.employees.map((emp, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">{emp.employee_name}</p>
                            <div className="flex gap-4 text-sm text-gray-600 mt-1">
                              <span>Meta: <strong className="text-green-600">R$ {emp.target_revenue.toFixed(2)}</strong></span>
                              <span>Clientes: <strong className="text-blue-600">{emp.target_clients}</strong></span>
                              <span>Ticket: <strong className="text-purple-600">R$ {emp.target_avg_ticket.toFixed(2)}</strong></span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-600">Bônus</p>
                            <p className="text-lg font-bold text-green-600">R$ {emp.bonus.toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        <div className="flex justify-center gap-4">
          <Button variant="outline" onClick={() => navigate(createPageUrl("GestaoMetas"))}>
            <Home className="w-4 h-4 mr-2" />
            Voltar para Metas
          </Button>
        </div>
      </div>
    </div>
  );
}