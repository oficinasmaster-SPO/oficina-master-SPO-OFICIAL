import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Download, Target, TrendingUp, Award, AlertCircle, Building2, User } from "lucide-react";
import { formatCurrency, formatNumber } from "../components/utils/formatters";
import ManualGoalRegistration from "../components/goals/ManualGoalRegistration";
import { toast } from "sonner";

export default function HistoricoMetas() {
  const [workshop, setWorkshop] = useState(null);
  const [user, setUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [filterType, setFilterType] = useState("workshop");
  const [filterEmployee, setFilterEmployee] = useState(null);
  const [expandedCards, setExpandedCards] = useState({});
  const queryClient = useQueryClient();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const workshops = await base44.entities.Workshop.filter({ owner_id: currentUser.id });
      if (workshops.length > 0) {
        setWorkshop(workshops[0]);
      }
    } catch (error) {
      console.error("Error loading user:", error);
    }
  };

  const { data: goalHistory = [], isLoading } = useQuery({
    queryKey: ['goal-history', workshop?.id, filterType, filterEmployee],
    queryFn: async () => {
      if (!workshop) return [];
      
      let query = { workshop_id: workshop.id };
      
      if (filterType === "employee" && filterEmployee) {
        query.employee_id = filterEmployee;
      } else if (filterType === "workshop") {
        query.entity_type = "workshop";
      }

      const result = await base44.entities.MonthlyGoalHistory.filter(query);
      return result.sort((a, b) => new Date(b.reference_date) - new Date(a.reference_date));
    },
    enabled: !!workshop
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', workshop?.id],
    queryFn: async () => {
      if (!workshop) return [];
      return await base44.entities.Employee.filter({ 
        workshop_id: workshop.id,
        status: "ativo"
      });
    },
    enabled: !!workshop
  });

  const handleExport = () => {
    toast.info("Exportação em desenvolvimento...");
  };

  const toggleCardExpansion = (recordId) => {
    setExpandedCards(prev => ({
      ...prev,
      [recordId]: !prev[recordId]
    }));
  };

  if (!workshop) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Target className="w-8 h-8 text-blue-600" />
              Histórico da Produção Diária
            </h1>
            <p className="text-gray-600 mt-2">
              Acompanhe os resultados e desempenho da oficina e colaboradores
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Novo Registro Manual
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Filtrar por</Label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="workshop">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Oficina (Geral)
                      </div>
                    </SelectItem>
                    <SelectItem value="employee">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Colaborador
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {filterType === "employee" && (
                <div>
                  <Label>Colaborador</Label>
                  <Select value={filterEmployee} onValueChange={setFilterEmployee}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os colaboradores" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Todos</SelectItem>
                      {employees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.full_name} - {emp.position}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Lista de Histórico */}
        <div className="space-y-4">
          {isLoading ? (
            <Card className="shadow-lg">
              <CardContent className="p-12 text-center">
                <p className="text-gray-500">Carregando histórico...</p>
              </CardContent>
            </Card>
          ) : goalHistory.length === 0 ? (
            <Card className="shadow-lg">
              <CardContent className="p-12 text-center">
                <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">Nenhum registro encontrado</p>
                <Button onClick={() => setShowModal(true)} className="bg-blue-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeiro Registro
                </Button>
              </CardContent>
            </Card>
          ) : (
            goalHistory.map((record) => {
              const achievementPercentage = record.projected_total > 0 
                ? (record.achieved_total / record.projected_total) * 100 
                : 0;
              
              const employee = employees.find(e => e.id === record.employee_id);
              const isExpanded = expandedCards[record.id];

              return (
                <Card key={record.id} className="shadow-lg hover:shadow-xl transition-all border-l-4 border-blue-400">
                  <CardContent className="p-6">
                    {/* Header Compacto */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {record.entity_type === "workshop" ? (
                          <Building2 className="w-5 h-5 text-blue-600" />
                        ) : (
                          <User className="w-5 h-5 text-purple-600" />
                        )}
                        <div>
                          <h3 className="font-bold text-lg text-gray-900">
                            {record.entity_type === "workshop" 
                              ? workshop.name 
                              : employee?.full_name || "Colaborador"}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500">
                              {new Date(record.reference_date).toLocaleDateString('pt-BR')}
                            </span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-500">
                              {new Date(record.month + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                            </span>
                            {record.employee_role && record.employee_role !== "geral" && (
                              <>
                                <span className="text-xs text-gray-400">•</span>
                                <Badge className="bg-purple-100 text-purple-700 capitalize text-xs">
                                  {record.employee_role}
                                </Badge>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 mb-1">Atingimento</p>
                        <p className={`text-4xl font-bold ${
                          achievementPercentage >= 100 ? 'text-green-600' : 
                          achievementPercentage >= 70 ? 'text-yellow-600' : 
                          'text-red-600'
                        }`}>
                          {achievementPercentage.toFixed(1)}%
                        </p>
                      </div>
                    </div>

                    {/* Métricas Principais - Compacto */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      <div className="bg-green-50 p-3 rounded-lg border-l-4 border-green-500">
                        <p className="text-xs text-gray-600 mb-1">PREVISTO</p>
                        <p className="text-xl font-bold text-green-600">
                          R$ R$ {formatCurrency(record.projected_total)}
                        </p>
                      </div>
                      <div className="bg-purple-50 p-3 rounded-lg border-l-4 border-purple-500">
                        <p className="text-xs text-gray-600 mb-1">REALIZADO</p>
                        <p className="text-xl font-bold text-purple-600">
                          R$ R$ {formatCurrency(record.achieved_total)}
                        </p>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-500">
                        <p className="text-xs text-gray-600 mb-1">Faturamento Total</p>
                        <p className="text-xl font-bold text-blue-600">
                          R$ R$ {formatCurrency(record.revenue_total || 0)}
                        </p>
                      </div>
                      <div className="bg-orange-50 p-3 rounded-lg border-l-4 border-orange-500">
                        <p className="text-xs text-gray-600 mb-1">Ticket Médio</p>
                        <p className="text-xl font-bold text-orange-600">
                          R$ R$ {formatCurrency(record.average_ticket || 0)}
                        </p>
                      </div>
                    </div>

                    {/* Resumo Rápido */}
                    <div className="flex items-center gap-6 text-sm mb-3">
                      <div>
                        <span className="text-gray-600">Fat. Peças: </span>
                        <span className="font-bold">R$ {formatCurrency(record.revenue_parts || 0)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Fat. Serviços: </span>
                        <span className="font-bold">R$ {formatCurrency(record.revenue_services || 0)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Clientes: </span>
                        <span className="font-bold">{record.customer_volume || 0}</span>
                      </div>
                      {record.rework_count !== undefined && (
                        <div>
                          <span className="text-gray-600">Obs: </span>
                          <span className="font-semibold text-gray-700">
                            {record.rework_count === 0 ? "zero retrabalho" : `${record.rework_count} retrabalhos`}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Botão Ver Detalhes */}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => toggleCardExpansion(record.id)}
                      className="w-full mt-2"
                    >
                      {isExpanded ? "Ocultar Detalhes" : "Ver Detalhes"}
                    </Button>

                    {/* Detalhes Expandidos */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t space-y-4">
                        {/* Detalhes Comerciais */}
                        {(record.pave_commercial > 0 || record.kit_master > 0 || record.sales_base > 0 || record.sales_marketing > 0 || record.clients_delivered > 0) && (
                          <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-200">
                            <p className="text-sm font-semibold text-indigo-900 mb-2">🎯 Comercial</p>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                              {record.pave_commercial > 0 && (
                                <div>
                                  <p className="text-gray-600">PAVE:</p>
                                  <p className="font-bold">{formatCurrency(record.pave_commercial)}</p>
                                </div>
                              )}
                              {record.kit_master > 0 && (
                                <div>
                                  <p className="text-gray-600">Kit Master:</p>
                                  <p className="font-bold">R$ {formatCurrency(record.kit_master)}</p>
                                </div>
                              )}
                              {record.sales_base > 0 && (
                                <div>
                                  <p className="text-gray-600">Vendas Base:</p>
                                  <p className="font-bold">R$ {formatCurrency(record.sales_base)}</p>
                                </div>
                              )}
                              {record.sales_marketing > 0 && (
                                <div>
                                  <p className="text-gray-600">Vendas Mkt:</p>
                                  <p className="font-bold">R$ {formatCurrency(record.sales_marketing)}</p>
                                </div>
                              )}
                              {record.clients_delivered > 0 && (
                                <div>
                                  <p className="text-gray-600">Clientes Entregues:</p>
                                  <p className="font-bold">{record.clients_delivered}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Detalhes de Agendamento - Comercial */}
                        {(record.clients_scheduled_base > 0 || record.clients_delivered_base > 0 || 
                          record.clients_scheduled_mkt > 0 || record.clients_delivered_mkt > 0 ||
                          record.clients_scheduled_referral > 0 || record.clients_delivered_referral > 0) && (
                          <div className="bg-teal-50 p-3 rounded-lg border border-teal-200">
                            <p className="text-sm font-semibold text-teal-900 mb-2">📅 Agendamentos e Entregas</p>
                            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-xs">
                              <div>
                                <p className="text-gray-600">Agend. Base:</p>
                                <p className="font-bold">{record.clients_scheduled_base || 0}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Entreg. Base:</p>
                                <p className="font-bold">{record.clients_delivered_base || 0}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Agend. Mkt:</p>
                                <p className="font-bold">{record.clients_scheduled_mkt || 0}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Entreg. Mkt:</p>
                                <p className="font-bold">{record.clients_delivered_mkt || 0}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Agend. Indic.:</p>
                                <p className="font-bold">{record.clients_scheduled_referral || 0}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Entreg. Indic.:</p>
                                <p className="font-bold">{record.clients_delivered_referral || 0}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Marketing Data */}
                        {record.marketing_data && record.marketing_data.leads_generated > 0 && (
                          <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                            <p className="text-sm font-semibold text-purple-900 mb-2">📣 Marketing</p>
                            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs">
                              <div>
                                <p className="text-gray-600">Leads:</p>
                                <p className="font-bold">{record.marketing_data.leads_generated}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Agendados:</p>
                                <p className="font-bold">{record.marketing_data.leads_scheduled}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Comparec.:</p>
                                <p className="font-bold">{record.marketing_data.leads_showed_up}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Vendidos:</p>
                                <p className="font-bold">{record.marketing_data.leads_sold}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Investido:</p>
                                <p className="font-bold">R$ {formatCurrency(record.marketing_data.invested_value || 0)}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Custo/Venda:</p>
                                <p className="font-bold">R$ {formatCurrency(record.marketing_data.cost_per_sale || 0)}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Observações */}
                        {record.notes && (
                          <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                            <p className="text-xs font-semibold text-yellow-900 mb-1">📝 Observações</p>
                            <p className="text-sm text-gray-700">{record.notes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Modal de Registro */}
        <ManualGoalRegistration
          open={showModal}
          onClose={() => setShowModal(false)}
          workshop={workshop}
          onSave={() => {
            queryClient.invalidateQueries(['goal-history']);
          }}
        />
      </div>
    </div>
  );
}