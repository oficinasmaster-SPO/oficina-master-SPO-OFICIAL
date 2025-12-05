import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { UserPlus, Loader2, Sparkles, Heart, FilePenLine } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import AITrainingSuggestions from "../components/rh/AITrainingSuggestions";
import DynamicHelpSystem from "../components/help/DynamicHelpSystem";
import QuickTipsBar from "../components/help/QuickTipsBar";
import AdvancedFilter from "@/components/shared/AdvancedFilter";
// import ActivityNotificationSettings from "../components/rh/ActivityNotificationSettings"; // Removed
// import { Settings } from "lucide-react"; // Removed if unused elsewhere

export default function Colaboradores() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [maturityFilter, setMaturityFilter] = useState("all");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  // const [showSettings, setShowSettings] = useState(false);

  // Fetch user first to get workshop context
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: workshop } = useQuery({
    queryKey: ['userWorkshop', user?.id],
    queryFn: async () => {
        if (!user) return null;
        const ws = await base44.entities.Workshop.filter({ owner_id: user.id });
        return ws[0];
    },
    enabled: !!user
  });

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees', workshop?.id],
    queryFn: async () => {
      if (!workshop) return [];
      try {
        // Filter employees by the specific workshop ID
        const result = await base44.entities.Employee.filter({ workshop_id: workshop.id }, '-created_date');
        return Array.isArray(result) ? result : [];
      } catch (error) {
        console.log("Error fetching employees:", error);
        return [];
      }
    },
    enabled: !!workshop,
    retry: 1
  });

  const { data: coexContracts = [] } = useQuery({
    queryKey: ['coex-contracts'],
    queryFn: async () => {
      try {
        const result = await base44.entities.COEXContract.list('-created_date');
        return Array.isArray(result) ? result : [];
      } catch (error) {
        console.log("Error fetching COEX contracts:", error);
        return [];
      }
    },
    retry: 1
  });

  const statusColors = {
  ativo: "bg-green-100 text-green-700",
  inativo: "bg-gray-100 text-gray-700",
  ferias: "bg-blue-100 text-blue-700"
  };

  const maturityColors = {
  bebe: "bg-yellow-100 text-yellow-800 border-yellow-200",
  crianca: "bg-orange-100 text-orange-800 border-orange-200",
  adolescente: "bg-blue-100 text-blue-800 border-blue-200",
  adulto: "bg-purple-100 text-purple-800 border-purple-200"
  };

  const maturityLabels = {
  bebe: "Bebê",
  crianca: "Criança",
  adolescente: "Adolescente",
  adulto: "Adulto"
  };

  const filteredEmployees = Array.isArray(employees) ? employees.filter((employee) => {
    if (!employee?.full_name || !employee?.position) return false;
    const matchesSearch = employee.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.position.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || employee.status === statusFilter;
    const matchesMaturity = maturityFilter === "all" || (employee.current_maturity_level === maturityFilter);
    return matchesSearch && matchesStatus && matchesMaturity;
  }) : [];

  const getTotalCost = (employee) => {
    return employee.salary + (employee.commission || 0) + (employee.bonus || 0) +
           (employee.benefits?.meal_voucher || 0) + 
           (employee.benefits?.transport_voucher || 0) + 
           (employee.benefits?.health_insurance || 0);
  };

  const getTotalProduction = (employee) => {
    return (employee.production_parts || 0) + (employee.production_services || 0);
  };

  const getActiveCOEX = (employeeId) => {
    if (!Array.isArray(coexContracts)) return null;
    return coexContracts.find(c => c.employee_id === employeeId && c.status === 'ativo');
  };

  const quickTips = [
    "Use a IA para sugestões personalizadas de treinamento para cada colaborador",
    "O CDC (Conexão e Diagnóstico) aumenta o salário emocional da sua equipe",
    "COEX (Contrato de Expectativas) alinha expectativas e reduz turnover",
    "Monitore a produtividade de cada colaborador para identificar necessidades de treinamento"
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4">
      <DynamicHelpSystem pageName="Colaboradores" autoStartTour={employees.length === 0} />
      
      <div className="max-w-7xl mx-auto">
        <QuickTipsBar tips={quickTips} pageName="colaboradores" />

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Colaboradores</h1>
            <p className="text-gray-600">Gerencie sua equipe com inteligência artificial</p>
          </div>
          <Button
            onClick={() => navigate(createPageUrl("CadastroColaborador"))}
            className="bg-blue-600 hover:bg-blue-700"
            id="btn-novo-colaborador"
          >
            <UserPlus className="w-5 h-5 mr-2" />
            Novo Colaborador
          </Button>
          
          {/* Button Notificações removido e movido para Admin */}
        </div>

        <AdvancedFilter 
            onFilter={(params) => {
                setSearchTerm(params.search);
                setStatusFilter(params.status || 'all');
                setMaturityFilter(params.maturity || 'all');
            }}
            filterConfig={[
                {
                    key: "status",
                    label: "Status",
                    type: "select",
                    defaultValue: "all",
                    options: [
                        { value: "all", label: "Todos" },
                        { value: "ativo", label: "Ativo" },
                        { value: "inativo", label: "Inativo" },
                        { value: "ferias", label: "Férias" }
                    ]
                },
                {
                    key: "maturity",
                    label: "Maturidade",
                    type: "select",
                    defaultValue: "all",
                    options: [
                        { value: "all", label: "Todas" },
                        { value: "bebe", label: "Bebê" },
                        { value: "crianca", label: "Criança" },
                        { value: "adolescente", label: "Adolescente" },
                        { value: "adulto", label: "Adulto" }
                    ]
                }
            ]}
            placeholder="Buscar por nome ou cargo..."
        />

        {filteredEmployees.length === 0 ? (
          <Card className="shadow-lg">
            <CardContent className="p-12 text-center">
              <UserPlus className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Nenhum colaborador encontrado
              </h3>
              <p className="text-gray-600 mb-6">
                Cadastre colaboradores para começar
              </p>
              <Button
                onClick={() => navigate(createPageUrl("CadastroColaborador"))}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <UserPlus className="w-5 h-5 mr-2" />
                Adicionar Primeiro Colaborador
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="lista-colaboradores">
            {filteredEmployees.map((employee) => {
              const totalCost = getTotalCost(employee);
              const totalProduction = getTotalProduction(employee);
              const productivity = totalCost > 0 ? ((totalProduction / totalCost) * 100).toFixed(0) : 0;
              const activeCOEX = getActiveCOEX(employee.id);

              return (
                <Card key={employee.id} className="shadow-lg hover:shadow-xl transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl">{employee.full_name}</CardTitle>
                        <p className="text-sm text-gray-600 mt-1">{employee.position}</p>
                        {employee.job_role && (
                          <span className="text-xs text-gray-500 mt-0.5 block capitalize">
                            {employee.job_role.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[employee.status]}`}>
                        {employee.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {employee.current_maturity_level && (
                        <span className={`px-2 py-1 rounded text-xs font-medium border flex items-center gap-1 ${maturityColors[employee.current_maturity_level] || "bg-gray-100 text-gray-700"}`}>
                          {maturityLabels[employee.current_maturity_level] || employee.current_maturity_level}
                        </span>
                      )}
                      {employee.cdc_completed && (
                        <span className="px-2 py-1 bg-pink-100 text-pink-700 rounded text-xs flex items-center gap-1 border border-pink-200">
                          <Heart className="w-3 h-3" />
                          CDC ✓
                        </span>
                      )}
                      {activeCOEX && (
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs flex items-center gap-1 border border-orange-200">
                          <FilePenLine className="w-3 h-3" />
                          COEX ✓
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Custo Total:</span>
                        <span className="font-bold">R$ {totalCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Produção Total:</span>
                        <span className="font-bold text-green-600">R$ {totalProduction.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Produtividade:</span>
                        <span className={`font-bold ${
                          productivity >= 100 ? 'text-green-600' : 'text-orange-600'
                        }`}>
                          {productivity}%
                        </span>
                      </div>
                      
                      <div className="flex gap-2 mt-4">
                        <Button
                          onClick={() => navigate(createPageUrl("DetalhesColaborador") + `?id=${employee.id}`)}
                          className="flex-1"
                          size="sm"
                          variant="outline"
                        >
                          Ver Detalhes
                        </Button>
                        <Button
                          onClick={() => navigate(createPageUrl("ConvidarColaborador") + `?id=${employee.id}`)}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                          title="Convidar para o Portal"
                        >
                          <UserPlus className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => setSelectedEmployee(employee)}
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700"
                          title="Sugestões de IA"
                        >
                          <Sparkles className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Dialog open={!!selectedEmployee} onOpenChange={() => setSelectedEmployee(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            {selectedEmployee && (
              <AITrainingSuggestions 
                employee={selectedEmployee} 
                onClose={() => setSelectedEmployee(null)} 
              />
            )}
          </DialogContent>
        </Dialog>

        {/* ActivityNotificationSettings removido */}
      </div>
    </div>
  );
}