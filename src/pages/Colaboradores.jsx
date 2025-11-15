import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Users, DollarSign, TrendingUp, Award } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Colaboradores() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list('-created_date'),
  });

  const statusColors = {
    ativo: "bg-green-100 text-green-800",
    inativo: "bg-red-100 text-red-800",
    ferias: "bg-blue-100 text-blue-800"
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         emp.position?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || emp.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getTotalCost = (emp) => {
    const benefits = emp.benefits || {};
    return (emp.salary || 0) + 
           (emp.commission || 0) + 
           (emp.bonus || 0) + 
           (benefits.meal_voucher || 0) + 
           (benefits.transport_voucher || 0) + 
           (benefits.health_insurance || 0);
  };

  const getTotalProduction = (emp) => {
    return (emp.production_parts || 0) + (emp.production_services || 0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Gestão de Colaboradores</h1>
            <p className="text-gray-600">Gerencie sua equipe e acompanhe desempenho</p>
          </div>
          <Link to={createPageUrl("CadastroColaborador")}>
            <Button className="bg-purple-600 hover:bg-purple-700">
              <Plus className="w-5 h-5 mr-2" />
              Novo Colaborador
            </Button>
          </Link>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nome ou cargo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border rounded-lg"
              >
                <option value="all">Todos os Status</option>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
                <option value="ferias">Férias</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Colaboradores */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEmployees.map((emp) => {
            const totalCost = getTotalCost(emp);
            const totalProduction = getTotalProduction(emp);
            const productionPercentage = totalCost > 0 ? (totalProduction / totalCost * 100) : 0;

            return (
              <Card key={emp.id} className="hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                        <Users className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{emp.full_name}</CardTitle>
                        <p className="text-sm text-gray-600">{emp.position}</p>
                      </div>
                    </div>
                    <Badge className={statusColors[emp.status]}>
                      {emp.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <DollarSign className="w-4 h-4" />
                      Custo Total
                    </div>
                    <span className="font-semibold">R$ {totalCost.toFixed(2)}</span>
                  </div>
                  
                  {totalProduction > 0 && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <TrendingUp className="w-4 h-4" />
                        Produção
                      </div>
                      <span className="font-semibold text-green-600">R$ {totalProduction.toFixed(2)}</span>
                    </div>
                  )}

                  {productionPercentage > 0 && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Award className="w-4 h-4" />
                        Produtividade
                      </div>
                      <span className={`font-semibold ${productionPercentage >= 100 ? 'text-green-600' : 'text-orange-600'}`}>
                        {productionPercentage.toFixed(0)}%
                      </span>
                    </div>
                  )}

                  <div className="pt-3 border-t">
                    <Button variant="outline" className="w-full" size="sm">
                      Ver Detalhes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredEmployees.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Nenhum colaborador encontrado</p>
          </div>
        )}
      </div>
    </div>
  );
}