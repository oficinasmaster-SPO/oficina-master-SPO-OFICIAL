import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Medal, Award, TrendingUp, Users, Building2 } from "lucide-react";
import { Loader2 } from "lucide-react";

export default function RankingBrasil() {
  const [selectedArea, setSelectedArea] = useState("all");

  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ['employees-all'],
    queryFn: () => base44.entities.Employee.list()
  });

  const { data: workshops = [], isLoading: loadingWorkshops } = useQuery({
    queryKey: ['workshops-all'],
    queryFn: () => base44.entities.Workshop.list()
  });

  const isLoading = loadingEmployees || loadingWorkshops;

  const getEmployeeRanking = () => {
    let filtered = employees.filter(e => e.status === "ativo");
    
    if (selectedArea !== "all") {
      filtered = filtered.filter(e => e.area === selectedArea);
    }

    return filtered
      .map(emp => {
        const totalProduction = (emp.production_parts || 0) + 
                               (emp.production_parts_sales || 0) + 
                               (emp.production_services || 0);
        const totalCost = (emp.salary || 0) + (emp.commission || 0) + (emp.bonus || 0);
        const productivity = totalCost > 0 ? (totalProduction / totalCost) * 100 : 0;

        const workshop = workshops.find(w => w.id === emp.workshop_id);

        return {
          id: emp.id,
          name: emp.full_name,
          position: emp.position,
          area: emp.area,
          workshopName: workshop?.name || "Sem oficina",
          city: workshop?.city || "-",
          state: workshop?.state || "-",
          totalProduction,
          productivity
        };
      })
      .sort((a, b) => b.productivity - a.productivity);
  };

  const getWorkshopRanking = () => {
    return workshops
      .map(workshop => {
        const workshopEmployees = employees.filter(e => e.workshop_id === workshop.id && e.status === "ativo");
        
        const totalProduction = workshopEmployees.reduce((sum, emp) => 
          sum + (emp.production_parts || 0) + (emp.production_parts_sales || 0) + (emp.production_services || 0), 0
        );

        const avgProductivity = workshopEmployees.length > 0
          ? workshopEmployees.reduce((sum, emp) => {
              const cost = (emp.salary || 0) + (emp.commission || 0) + (emp.bonus || 0);
              const prod = (emp.production_parts || 0) + (emp.production_parts_sales || 0) + (emp.production_services || 0);
              return sum + (cost > 0 ? (prod / cost) * 100 : 0);
            }, 0) / workshopEmployees.length
          : 0;

        return {
          id: workshop.id,
          name: workshop.name,
          city: workshop.city,
          state: workshop.state,
          employeeCount: workshopEmployees.length,
          totalProduction,
          avgProductivity
        };
      })
      .filter(w => w.employeeCount > 0)
      .sort((a, b) => b.avgProductivity - a.avgProductivity);
  };

  const employeeRanking = getEmployeeRanking();
  const workshopRanking = getWorkshopRanking();

  const getMedalIcon = (position) => {
    if (position === 0) return <Trophy className="w-6 h-6 text-yellow-500" />;
    if (position === 1) return <Medal className="w-6 h-6 text-gray-400" />;
    if (position === 2) return <Award className="w-6 h-6 text-orange-600" />;
    return <span className="text-gray-600 font-bold">{position + 1}º</span>;
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
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full mb-4">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Ranking Nacional
          </h1>
          <p className="text-gray-600">
            Os melhores colaboradores e oficinas do Brasil
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ranking de Colaboradores */}
          <Card className="shadow-xl border-2 border-blue-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle>Top Colaboradores</CardTitle>
                    <CardDescription>Por produtividade</CardDescription>
                  </div>
                </div>
                <Select value={selectedArea} onValueChange={setSelectedArea}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="vendas">Vendas</SelectItem>
                    <SelectItem value="comercial">Comercial</SelectItem>
                    <SelectItem value="tecnico">Técnico</SelectItem>
                    <SelectItem value="gerencia">Gerência</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {employeeRanking.slice(0, 50).map((emp, index) => (
                  <div 
                    key={emp.id} 
                    className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                      index === 0 ? 'bg-yellow-50 border-yellow-300' :
                      index === 1 ? 'bg-gray-50 border-gray-300' :
                      index === 2 ? 'bg-orange-50 border-orange-300' :
                      'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 flex justify-center">
                        {getMedalIcon(index)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{emp.name}</p>
                        <p className="text-xs text-gray-600">
                          {emp.position} • {emp.workshopName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {emp.city}/{emp.state}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-blue-600">
                        {emp.productivity.toFixed(0)}%
                      </p>
                      <p className="text-xs text-gray-600">
                        R$ {emp.totalProduction.toFixed(0)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Ranking de Oficinas */}
          <Card className="shadow-xl border-2 border-green-200">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle>Top Oficinas</CardTitle>
                  <CardDescription>Por média de produtividade</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {workshopRanking.slice(0, 50).map((workshop, index) => (
                  <div 
                    key={workshop.id} 
                    className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                      index === 0 ? 'bg-yellow-50 border-yellow-300' :
                      index === 1 ? 'bg-gray-50 border-gray-300' :
                      index === 2 ? 'bg-orange-50 border-orange-300' :
                      'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 flex justify-center">
                        {getMedalIcon(index)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{workshop.name}</p>
                        <p className="text-xs text-gray-600">
                          {workshop.city}/{workshop.state}
                        </p>
                        <p className="text-xs text-gray-500">
                          {workshop.employeeCount} colaboradores
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-green-600">
                        {workshop.avgProductivity.toFixed(0)}%
                      </p>
                      <p className="text-xs text-gray-600">
                        R$ {workshop.totalProduction.toFixed(0)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <TrendingUp className="w-12 h-12 text-blue-600" />
              <div>
                <h3 className="text-lg font-bold text-gray-900">Como subir no ranking?</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Aumente sua produtividade mantendo custos equilibrados. Colaboradores e oficinas 
                  com maior percentual de produção sobre custos aparecem no topo do ranking nacional.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}