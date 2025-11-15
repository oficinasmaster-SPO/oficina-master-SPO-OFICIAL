
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search, Users, DollarSign, TrendingUp, Award, Loader2, UserPlus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom"; // Add useNavigate
import { createPageUrl } from "@/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // Add Select components

export default function Colaboradores() {
  const navigate = useNavigate(); // Initialize useNavigate hook
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // Renamed filterStatus to statusFilter

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list('-created_date')
  });

  const statusColors = {
    ativo: "bg-green-100 text-green-700", // Updated color
    inativo: "bg-gray-100 text-gray-700", // Updated color
    ferias: "bg-blue-100 text-blue-700" // Updated color
  };

  const filteredEmployees = employees.filter((employee) => { // Changed emp to employee
    const matchesSearch = employee.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.position.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || employee.status === statusFilter; // Changed filterStatus to statusFilter
    return matchesSearch && matchesStatus;
  });

  const getTotalCost = (employee) => { // Changed emp to employee
    return employee.salary + (employee.commission || 0) + (employee.bonus || 0) +
           (employee.benefits?.meal_voucher || 0) +
           (employee.benefits?.transport_voucher || 0) +
           (employee.benefits?.health_insurance || 0);
  };

  const getTotalProduction = (employee) => { // Changed emp to employee
    return (employee.production_parts || 0) + (employee.production_services || 0);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4"> {/* Updated gradient */}
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8"> {/* Updated layout */}
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Colaboradores</h1> {/* Updated title */}
            <p className="text-gray-600">Gerencie sua equipe e monitore a produtividade</p> {/* Updated description */}
          </div>
          <Button
            onClick={() => navigate(createPageUrl("CadastroColaborador"))} // Changed to Button with navigate
            className="bg-blue-600 hover:bg-blue-700" // Updated button style
          >
            <UserPlus className="w-5 h-5 mr-2" /> {/* Updated icon */}
            Novo Colaborador
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6"> {/* Updated filter layout */}
          <div className="flex-1">
            <Input
              placeholder="Buscar por nome ou cargo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              // className="pl-10" removed as Search icon is gone
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}> {/* Replaced with Shadcn Select */}
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
              <UserPlus className="w-16 h-16 text-gray-400 mx-auto mb-4" /> {/* Updated icon */}
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
            {filteredEmployees.map((employee) => { // Changed emp to employee
              const totalCost = getTotalCost(employee);
              const totalProduction = getTotalProduction(employee);
              const productivity = totalCost > 0 ? ((totalProduction / totalCost) * 100).toFixed(0) : 0; // Renamed productionPercentage to productivity

              return (
                <Card key={employee.id} className="shadow-lg hover:shadow-xl transition-shadow"> {/* Added shadow */}
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl">{employee.full_name}</CardTitle> {/* Updated text size */}
                        <p className="text-sm text-gray-600 mt-1">{employee.position}</p> {/* Updated text style */}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[employee.status]}`}> {/* Replaced Badge with span */}
                        {employee.status}
                      </span>
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
                      <Button
                        variant="outline"
                        className="w-full mt-4" // Updated margin
                        size="sm"
                      >
                        Ver Detalhes
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
