import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, FileText, Search, CheckCircle, Clock, User, Calendar, Filter } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import GuidedTour from "../components/help/GuidedTour";
import HelpButton from "../components/help/HelpButton";
import AdminViewBanner from "../components/shared/AdminViewBanner";

export default function COEXList() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [workshop, setWorkshop] = useState(null);
  const [isAdminView, setIsAdminView] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: workshopData } = useQuery({
    queryKey: ['workshop', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const urlParams = new URLSearchParams(window.location.search);
      const adminWorkshopId = urlParams.get('workshop_id');
      
      if (adminWorkshopId && user.role === 'admin') {
        setIsAdminView(true);
        return await base44.entities.Workshop.get(adminWorkshopId);
      }
      
      setIsAdminView(false);
      const workshops = await base44.entities.Workshop.filter({ owner_id: user.id });
      return workshops[0];
    },
    enabled: !!user,
    onSuccess: (data) => setWorkshop(data)
  });

  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ['employees', workshop?.id],
    queryFn: async () => {
      if (!workshop?.id) return [];
      return await base44.entities.Employee.filter({ workshop_id: workshop.id }, '-created_date');
    },
    enabled: !!workshop?.id
  });

  const { data: coexContracts = [], isLoading: loadingContracts } = useQuery({
    queryKey: ['coex-contracts'],
    queryFn: () => base44.entities.COEXContract.list('-created_date')
  });

  const [statusFilter, setStatusFilter] = useState("todos");

  const getActiveCOEX = (employeeId) => {
    return coexContracts.find(c => c.employee_id === employeeId && c.status === 'ativo');
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          emp.position.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (statusFilter === "todos") return matchesSearch;
    
    const hasActive = !!getActiveCOEX(emp.id);
    
    if (statusFilter === "ativo") return matchesSearch && hasActive;
    if (statusFilter === "pendente") return matchesSearch && !hasActive;
    
    return matchesSearch;
  });

  const activeContracts = coexContracts.filter(c => c.status === 'ativo' || c.status === undefined).length; // Assumir undefined como ativo se recente
  const expiredContracts = coexContracts.filter(c => c.status === 'expirado').length;

  const tourSteps = [
    {
      target: "coex-stats",
      title: "Estatísticas COEX",
      description: "Veja quantos contratos estão ativos e quantos precisam renovação.",
      position: "bottom"
    },
    {
      target: "coex-search",
      title: "Buscar Colaboradores",
      description: "Use a busca para encontrar rapidamente um colaborador específico.",
      position: "bottom"
    },
    {
      target: "coex-card",
      title: "Criar ou Renovar COEX",
      description: "Clique no botão para criar um novo contrato ou visualizar/renovar um existente.",
      position: "top"
    }
  ];

  const helpContent = {
    title: "COEX - Contrato de Expectativa",
    description: "O COEX é um acordo formal que alinha expectativas entre gestor e colaborador. Define metas, entregas, comportamentos esperados e estabelece compromisso mútuo.",
    faqs: [
      {
        question: "O que é o COEX?",
        answer: "COEX é o Contrato de Expectativa. Um documento que alinha o que o gestor espera do colaborador e vice-versa."
      },
      {
        question: "Tem validade jurídica?",
        answer: "Não. O COEX tem validade emocional. Ele cria compromisso e clareza, elevando o salário emocional da equipe."
      },
      {
        question: "Quando renovar?",
        answer: "Renove a cada 6-12 meses. Use esse momento para realinhar expectativas, celebrar conquistas e definir novos objetivos."
      }
    ]
  };

  if (loadingEmployees || loadingContracts) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
      <HelpButton {...helpContent} />
      <GuidedTour tourId="coex_list" steps={tourSteps} autoStart={false} />

      <div className="max-w-7xl mx-auto">
        
        {isAdminView && workshop && (
          <AdminViewBanner workshopName={workshop.name} />
        )}
        
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-10 h-10 text-red-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                COEX - Contrato de Expectativa
              </h1>
              <p className="text-gray-600 mt-1">
                Alinhe expectativas, metas e comportamentos com sua equipe através de acordos formais
              </p>
            </div>
          </div>
        </div>

        <div id="coex-stats" className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-700 font-medium">Total de Colaboradores</p>
                  <p className="text-3xl font-bold text-red-900 mt-1">{employees.length}</p>
                </div>
                <User className="w-12 h-12 text-red-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700 font-medium">Contratos Ativos</p>
                  <p className="text-3xl font-bold text-green-900 mt-1">{activeContracts}</p>
                </div>
                <CheckCircle className="w-12 h-12 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-yellow-50 border-2 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-700 font-medium">Sem Contrato</p>
                  <p className="text-3xl font-bold text-orange-900 mt-1">
                    {employees.length - activeContracts}
                  </p>
                </div>
                <Clock className="w-12 h-12 text-orange-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-700 font-medium">Expirados</p>
                  <p className="text-3xl font-bold text-red-900 mt-1">{expiredContracts}</p>
                </div>
                <Calendar className="w-12 h-12 text-red-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card id="coex-search" className="mb-6 shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Buscar colaborador por nome ou cargo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="w-full md:w-48">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <Filter className="w-4 h-4 mr-2 text-gray-500" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="ativo">Com Contrato Ativo</SelectItem>
                    <SelectItem value="pendente">Sem Contrato / Pendente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEmployees.map((employee, index) => {
            const activeCOEX = getActiveCOEX(employee.id);

            return (
              <Card 
                key={employee.id}
                id={index === 0 ? "coex-card" : undefined}
                className="hover:shadow-xl transition-shadow"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{employee.full_name}</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">{employee.position}</p>
                      <span className="inline-block mt-2 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                        {employee.area || "Não definido"}
                      </span>
                    </div>
                  </div>

                  {activeCOEX && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">Período:</span>
                        <span className="font-medium">
                          {format(new Date(activeCOEX.start_date), 'dd/MM/yy')} - {format(new Date(activeCOEX.end_date), 'dd/MM/yy')}
                        </span>
                      </div>
                      <Badge className="bg-green-100 text-green-700 w-full justify-center">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Contrato Ativo
                      </Badge>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    onClick={() => navigate(createPageUrl("COEXForm") + `?employee_id=${employee.id}`)}
                    className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    {activeCOEX ? 'Ver/Renovar COEX' : 'Criar COEX'}
                  </Button>
                  
                  {activeCOEX && (
                    <Button
                      variant="outline"
                      onClick={() => navigate(createPageUrl("COEXForm") + `?id=${activeCOEX.id}`)}
                      className="w-full"
                      size="sm"
                    >
                      Editar Contrato Atual
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredEmployees.length === 0 && (
          <Card className="shadow-lg">
            <CardContent className="p-12 text-center">
              <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Nenhum colaborador encontrado
              </h3>
              <p className="text-gray-600">
                Ajuste sua busca ou cadastre novos colaboradores
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}