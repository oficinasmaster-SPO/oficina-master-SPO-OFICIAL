
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
import { Dialog, DialogContent } from "@/components/ui/dialog";
import AITrainingSuggestions from "../components/rh/AITrainingSuggestions";

export default function Colaboradores() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list('-created_date')
  });

  const { data: coexContracts = [] } = useQuery({
    queryKey: ['coex-contracts'],
    queryFn: () => base44.entities.COEXContract.list('-created_date')
  });

  const statusColors = {
    ativo: "bg-green-100 text-green-700",
    inativo: "bg-gray-100 text-gray-700",
    ferias: "bg-blue-100 text-blue-700"
  };

  const filteredEmployees = employees.filter((employee) => {
    const matchesSearch = employee.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.position.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || employee.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
    return coexContracts.find(c => c.employee_id === employeeId && c.status === 'ativo');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Colaboradores</h1>
            <p className="text-gray-600">Gerencie sua equipe com inteligência artificial</p>
          </div>
          <Button
            onClick={() => navigate(createPageUrl("CadastroColaborador"))}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <UserPlus className="w-5 h-5 mr-2" />
            Novo Colaborador
          </Button>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Input
              placeholder="Buscar por nome ou cargo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="inativo">Inativo</SelectItem>
              <SelectItem value="ferias">Férias</SelectItem>
            </SelectContent>
          </Select>
        </div>

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[employee.status]}`}>
                        {employee.status}
                      </span>
                    </div>
                    <div className="flex gap-2 mt-3">
                      {employee.cdc_completed && (
                        <span className="px-2 py-1 bg-pink-100 text-pink-700 rounded text-xs flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                          CDC ✓
                        </span>
                      )}
                      {activeCOEX && (
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs flex items-center gap-1">
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
                        >
                          Ver Completo
                        </Button>
                        <Button
                          onClick={() => setSelectedEmployee(employee)}
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          <Sparkles className="w-4 h-4 mr-1" />
                          IA
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
      </div>
    </div>
  );
}
