import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserPlus, Users, Clock, FileText, Settings, Eye } from "lucide-react";
import { formatNumber } from "../components/utils/formatters";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import AdvancedFilter from "../components/shared/AdvancedFilter";

export default function AdminUsuarios() {
  const navigate = useNavigate();
  const [filterParams, setFilterParams] = useState({ search: "", funcao: "all", status: "all" });

  const { data: adminUsers = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      try {
        const result = await base44.entities.AdminUser.list('-created_date');
        return Array.isArray(result) ? result : [];
      } catch (error) {
        console.error("Error fetching admin users:", error);
        return [];
      }
    }
  });

  const filteredUsers = adminUsers.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(filterParams.search.toLowerCase()) ||
                          user.email.toLowerCase().includes(filterParams.search.toLowerCase());
    const matchesFuncao = filterParams.funcao === 'all' || user.funcao === filterParams.funcao;
    const matchesStatus = filterParams.status === 'all' || user.status === filterParams.status;
    return matchesSearch && matchesFuncao && matchesStatus;
  });

  const funcaoLabels = {
    acelerador: "Acelerador",
    mentor: "Mentor",
    gerente: "Gerente",
    consultor: "Consultor",
    secretario: "Secretário",
    editor: "Editor"
  };

  const funcaoColors = {
    acelerador: "bg-purple-100 text-purple-700 border-purple-200",
    mentor: "bg-blue-100 text-blue-700 border-blue-200",
    gerente: "bg-green-100 text-green-700 border-green-200",
    consultor: "bg-orange-100 text-orange-700 border-orange-200",
    secretario: "bg-pink-100 text-pink-700 border-pink-200",
    editor: "bg-indigo-100 text-indigo-700 border-indigo-200"
  };

  const statusColors = {
    ativo: "bg-green-100 text-green-700",
    inativo: "bg-gray-100 text-gray-700"
  };

  const totalAtivos = adminUsers.filter(u => u.status === 'ativo').length;
  const totalHorasAtendidas = adminUsers.reduce((sum, u) => sum + (u.metricas?.horas_atendidas || 0), 0);
  const totalRegistros = adminUsers.reduce((sum, u) => sum + (u.metricas?.quantidade_registros || 0), 0);

  const filterConfig = [
    {
      key: "funcao",
      label: "Função",
      type: "select",
      defaultValue: "all",
      options: [
        { value: "all", label: "Todas" },
        { value: "acelerador", label: "Acelerador" },
        { value: "mentor", label: "Mentor" },
        { value: "gerente", label: "Gerente" },
        { value: "consultor", label: "Consultor" },
        { value: "secretario", label: "Secretário" },
        { value: "editor", label: "Editor" }
      ]
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      defaultValue: "all",
      options: [
        { value: "all", label: "Todos" },
        { value: "ativo", label: "Ativo" },
        { value: "inativo", label: "Inativo" }
      ]
    }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Usuários Administrativos</h1>
            <p className="text-gray-600">Gerencie a equipe administrativa da plataforma</p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => navigate(createPageUrl("AdminUserCadastro"))}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <UserPlus className="w-5 h-5 mr-2" />
              Novo Usuário
            </Button>
            <Button
              onClick={() => navigate(createPageUrl("AdminPermissoes"))}
              variant="outline"
              className="border-purple-200 text-purple-700 hover:bg-purple-50"
            >
              <Settings className="w-5 h-5 mr-2" />
              Gerenciar Permissões
            </Button>
          </div>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-700 font-medium">Total de Usuários</p>
                  <p className="text-3xl font-bold text-blue-900 mt-1">{adminUsers.length}</p>
                </div>
                <Users className="w-12 h-12 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700 font-medium">Ativos</p>
                  <p className="text-3xl font-bold text-green-900 mt-1">{totalAtivos}</p>
                </div>
                <Users className="w-12 h-12 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-700 font-medium">Horas Atendidas</p>
                  <p className="text-3xl font-bold text-purple-900 mt-1">{formatNumber(totalHorasAtendidas, 1)}h</p>
                </div>
                <Clock className="w-12 h-12 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-2 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-700 font-medium">Registros Totais</p>
                  <p className="text-3xl font-bold text-orange-900 mt-1">{totalRegistros}</p>
                </div>
                <FileText className="w-12 h-12 text-orange-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        <AdvancedFilter 
          onFilter={setFilterParams}
          filterConfig={filterConfig}
          placeholder="Buscar por nome ou email..."
        />

        {filteredUsers.length === 0 ? (
          <Card className="shadow-lg">
            <CardContent className="p-12 text-center">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Nenhum usuário encontrado
              </h3>
              <p className="text-gray-600 mb-6">
                Cadastre usuários administrativos para começar
              </p>
              <Button
                onClick={() => navigate(createPageUrl("AdminUserCadastro"))}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <UserPlus className="w-5 h-5 mr-2" />
                Adicionar Primeiro Usuário
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredUsers.map((user) => (
              <Card key={user.id} className="shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{user.full_name}</CardTitle>
                      <p className="text-sm text-gray-600">{user.email}</p>
                      <p className="text-xs text-gray-500 mt-1">{user.telefone}</p>
                    </div>
                    <Badge className={statusColors[user.status]}>
                      {user.status}
                    </Badge>
                  </div>
                  <div className="mt-3">
                    <Badge className={`${funcaoColors[user.funcao]} border`}>
                      {funcaoLabels[user.funcao]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Métricas */}
                  <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Horas Atendidas:</span>
                      <span className="font-bold text-purple-700">
                        {formatNumber(user.metricas?.horas_atendidas || 0, 1)}h
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Reuniões:</span>
                      <span className="font-bold">{user.metricas?.reunioes_realizadas || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Registros:</span>
                      <span className="font-bold">{user.metricas?.quantidade_registros || 0}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-gray-200">
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Finalizado</p>
                        <p className="text-sm font-bold text-green-600">
                          {user.metricas?.registros_finalizados || 0}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Andamento</p>
                        <p className="text-sm font-bold text-blue-600">
                          {user.metricas?.registros_andamento || 0}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Aberto</p>
                        <p className="text-sm font-bold text-orange-600">
                          {user.metricas?.registros_abertos || 0}
                        </p>
                      </div>
                    </div>
                    {user.metricas?.ultimo_acesso && (
                      <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
                        Último acesso: {format(new Date(user.metricas.ultimo_acesso), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </div>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => navigate(createPageUrl("AdminUserCadastro") + `?id=${user.id}`)}
                      variant="outline"
                      className="flex-1"
                      size="sm"
                    >
                      Editar
                    </Button>
                    <Button
                      onClick={() => navigate(createPageUrl("AdminPermissoes") + `?user_id=${user.id}`)}
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700"
                      title="Gerenciar Permissões"
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}