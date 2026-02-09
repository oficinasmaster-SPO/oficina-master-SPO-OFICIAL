import React, { useState } from "react";
import { base44 } from '@/api/base44Client';
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Heart, Search, CheckCircle, Clock, User, Filter } from "lucide-react";
import {  Select, SelectContent, SelectItem, SelectTrigger, SelectValue  } from "@/components/ui/select";
import GuidedTour from "@/components/help/GuidedTour";
import HelpButton from "@/components/help/HelpButton";
import AdminViewBanner from "@/components/shared/AdminViewBanner";

export default function CDCList() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAdminView, setIsAdminView] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: workshop } = useQuery({
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
    enabled: !!user
  });

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees', workshop?.id],
    queryFn: async () => {
      if (!workshop?.id) return [];
      return await base44.entities.Employee.filter({ workshop_id: workshop.id }, '-created_date');
    },
    enabled: !!workshop?.id
  });

  const [statusFilter, setStatusFilter] = useState("todos");

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          emp.position.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (statusFilter === "todos") return matchesSearch;
    if (statusFilter === "completo") return matchesSearch && emp.cdc_completed;
    if (statusFilter === "pendente") return matchesSearch && !emp.cdc_completed;
    
    return matchesSearch;
  });

  const completedCDCs = employees.filter(e => e.cdc_completed).length;
  const pendingCDCs = employees.length - completedCDCs;

  const tourSteps = [
    {
      target: "cdc-stats",
      title: "EstatÃ­sticas CDC",
      description: "Veja quantos CDCs foram completados e quantos ainda estÃ£o pendentes.",
      position: "bottom"
    },
    {
      target: "cdc-search",
      title: "Buscar Colaboradores",
      description: "Use a busca para encontrar rapidamente um colaborador especÃ­fico.",
      position: "bottom"
    },
    {
      target: "cdc-card",
      title: "Aplicar ou Editar CDC",
      description: "Clique no botÃ£o para aplicar um novo CDC ou editar um existente.",
      position: "top"
    }
  ];

  const helpContent = {
    title: "CDC - ConexÃ£o e DiagnÃ³stico do Colaborador",
    description: "O CDC Ã© uma ferramenta para criar conexÃ£o genuÃ­na com seus colaboradores. Registre informaÃ§Ãµes pessoais, sonhos, expectativas e perfil comportamental para gestÃ£o personalizada.",
    faqs: [
      {
        question: "O que Ã© o CDC?",
        answer: "CDC significa ConexÃ£o e DiagnÃ³stico do Colaborador. Ã‰ uma entrevista estruturada para conhecer profundamente cada membro da equipe."
      },
      {
        question: "Quando aplicar o CDC?",
        answer: "Ideal aplicar no onboarding de novos colaboradores ou em reuniÃµes 1:1 especiais. Leva cerca de 15-30 minutos."
      },
      {
        question: "Como usar as informaÃ§Ãµes?",
        answer: "Use para personalizar feedbacks, lembrar datas importantes, alinhar expectativas e demonstrar que vocÃª se importa com a pessoa."
      }
    ]
  };

  if (isLoading || !workshop) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
      <HelpButton {...helpContent} />
      <GuidedTour tourId="cdc_list" steps={tourSteps} autoStart={false} />

      <div className="max-w-7xl mx-auto">
        
        {isAdminView && workshop && (
          <AdminViewBanner workshopName={workshop.name} />
        )}
        
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Heart className="w-10 h-10 text-pink-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                CDC - ConexÃ£o e DiagnÃ³stico do Colaborador
              </h1>
              <p className="text-gray-600 mt-1">
                Crie conexÃ£o genuÃ­na com sua equipe atravÃ©s do conhecimento profundo de cada colaborador
              </p>
            </div>
          </div>
        </div>

        <div id="cdc-stats" className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-pink-50 to-red-50 border-2 border-pink-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-pink-700 font-medium">Total de Colaboradores</p>
                  <p className="text-3xl font-bold text-pink-900 mt-1">{employees.length}</p>
                </div>
                <User className="w-12 h-12 text-pink-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700 font-medium">CDCs Completos</p>
                  <p className="text-3xl font-bold text-green-900 mt-1">{completedCDCs}</p>
                </div>
                <CheckCircle className="w-12 h-12 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-yellow-50 border-2 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-700 font-medium">CDCs Pendentes</p>
                  <p className="text-3xl font-bold text-orange-900 mt-1">{pendingCDCs}</p>
                </div>
                <Clock className="w-12 h-12 text-orange-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card id="cdc-search" className="mb-6 shadow-lg">
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
                    <SelectItem value="completo">Completos</SelectItem>
                    <SelectItem value="pendente">Pendentes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEmployees.map((employee, index) => (
            <Card 
              key={employee.id} 
              id={index === 0 ? "cdc-card" : undefined}
              className="hover:shadow-xl transition-shadow"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{employee.full_name}</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">{employee.position}</p>
                    <span className="inline-block mt-2 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                      {employee.area || "NÃ£o definido"}
                    </span>
                  </div>
                  {employee.cdc_completed && (
                    <div className="flex flex-col items-center">
                      <CheckCircle className="w-8 h-8 text-green-500" />
                      <span className="text-xs text-green-700 mt-1 font-medium">Completo</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => navigate(createPageUrl("CDCForm") + `?employee_id=${employee.id}`)}
                  className="w-full bg-gradient-to-r from-pink-600 to-red-600 hover:from-pink-700 hover:to-red-700"
                >
                  <Heart className="w-4 h-4 mr-2" />
                  {employee.cdc_completed ? 'Editar CDC' : 'Aplicar CDC'}
                </Button>
              </CardContent>
            </Card>
          ))}
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



