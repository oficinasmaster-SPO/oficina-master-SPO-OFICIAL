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
              Histórico de Metas
            </h1>
            <p className="text-gray-600 mt-2">
              Acompanhe os resultados mensais da oficina e colaboradores
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

              return (
                <Card key={record.id} className="shadow-lg hover:shadow-xl transition-all border-2 border-blue-100">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {record.entity_type === "workshop" ? (
                            <Building2 className="w-5 h-5 text-blue-600" />
                          ) : (
                            <User className="w-5 h-5 text-purple-600" />
                          )}
                          {record.entity_type === "workshop" 
                            ? workshop.name 
                            : employee?.full_name || "Colaborador"}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline">
                            {new Date(record.reference_date).toLocaleDateString('pt-BR')}
                          </Badge>
                          <Badge variant="outline">
                            {new Date(record.month + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                          </Badge>
                          {record.employee_role && record.employee_role !== "geral" && (
                            <Badge className="bg-purple-100 text-purple-700 capitalize">
                              {record.employee_role}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 mb-1">Atingimento</p>
                        <p className={`text-3xl font-bold ${
                          achievementPercentage >= 100 ? 'text-green-600' : 
                          achievementPercentage >= 70 ? 'text-yellow-600' : 
                          'text-red-600'
                        }`}>
                          {achievementPercentage.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-green-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">PREVISTO</p>
                        <p className="text-lg font-bold text-green-600">
                          R$ {formatCurrency(record.projected_total)}
                        </p>
                      </div>
                      <div className="bg-purple-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">REALIZADO</p>
                        <p className="text-lg font-bold text-purple-600">
                          R$ {formatCurrency(record.achieved_total)}
                        </p>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">Faturamento Total</p>
                        <p className="text-lg font-bold text-blue-600">
                          R$ {formatCurrency(record.revenue_total || 0)}
                        </p>
                      </div>
                      <div className="bg-orange-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">Ticket Médio</p>
                        <p className="text-lg font-bold text-orange-600">
                          R$ {formatCurrency(record.average_ticket || 0)}
                        </p>
                      </div>
                    </div>

                    {/* Detalhes adicionais */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-sm">
                      <div>
                        <p className="text-gray-600">Fat. Peças:</p>
                        <p className="font-semibold">R$ {formatCurrency(record.revenue_parts || 0)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Fat. Serviços:</p>
                        <p className="font-semibold">R$ {formatCurrency(record.revenue_services || 0)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Clientes:</p>
                        <p className="font-semibold">{record.customer_volume || 0}</p>
                      </div>
                      {record.rework_count > 0 && (
                        <div>
                          <p className="text-gray-600">Retrabalho:</p>
                          <p className="font-semibold text-red-600">{record.rework_count}</p>
                        </div>
                      )}
                    </div>

                    {/* Marketing Data */}
                    {record.marketing_data && record.marketing_data.leads_generated > 0 && (
                      <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                        <p className="text-sm font-semibold text-purple-900 mb-2">Marketing</p>
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

                    {record.notes && (
                      <div className="mt-3 p-2 bg-gray-50 rounded text-sm text-gray-700">
                        <strong>Obs:</strong> {record.notes}
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