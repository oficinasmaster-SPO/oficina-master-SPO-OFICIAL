import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, ArrowLeft, Shield, CheckCircle, X } from "lucide-react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";

export default function AdminPermissoes() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [permissionsMatrix, setPermissionsMatrix] = useState({});

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('user_id');
    if (userId) {
      setSelectedUserId(userId);
    }
  }, []);

  const { data: adminUsers = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      try {
        const result = await base44.entities.AdminUser.list('-created_date');
        return Array.isArray(result) ? result : [];
      } catch (error) {
        console.error(error);
        return [];
      }
    }
  });

  useEffect(() => {
    if (adminUsers.length > 0) {
      const matrix = {};
      adminUsers.forEach(user => {
        matrix[user.id] = user.permissoes || {};
      });
      setPermissionsMatrix(matrix);
    }
  }, [adminUsers]);

  const permissions = [
    { key: "agendar", label: "Agendar", description: "Criar e gerenciar agendamentos" },
    { key: "registrar", label: "Registrar", description: "Criar registros e atendimentos" },
    { key: "visualizar", label: "Visualizar", description: "Ver dados e relatórios" },
    { key: "editar", label: "Editar", description: "Modificar registros existentes" },
    { key: "aceleracao", label: "Aceleração", description: "Acesso ao módulo de aceleração" },
    { key: "apagar", label: "Apagar", description: "Excluir registros" },
    { key: "hora_atendimento", label: "Hora Atendimento", description: "Registrar horas de atendimento" }
  ];

  const togglePermission = (userId, permKey) => {
    setPermissionsMatrix({
      ...permissionsMatrix,
      [userId]: {
        ...permissionsMatrix[userId],
        [permKey]: !permissionsMatrix[userId]?.[permKey]
      }
    });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const promises = Object.keys(permissionsMatrix).map(userId => {
        return base44.entities.AdminUser.update(userId, {
          permissoes: permissionsMatrix[userId]
        });
      });
      await Promise.all(promises);
    },
    onSuccess: () => {
      toast.success("Permissões atualizadas com sucesso!");
      queryClient.invalidateQueries(['admin-users']);
    },
    onError: () => {
      toast.error("Erro ao salvar permissões");
    }
  });

  const applyPreset = (userId, preset) => {
    const presets = {
      total: {
        agendar: true,
        registrar: true,
        visualizar: true,
        editar: true,
        aceleracao: true,
        apagar: true,
        hora_atendimento: true
      },
      padrao: {
        agendar: true,
        registrar: true,
        visualizar: true,
        editar: false,
        aceleracao: false,
        apagar: false,
        hora_atendimento: true
      },
      visualizacao: {
        agendar: false,
        registrar: false,
        visualizar: true,
        editar: false,
        aceleracao: false,
        apagar: false,
        hora_atendimento: false
      }
    };

    setPermissionsMatrix({
      ...permissionsMatrix,
      [userId]: presets[preset]
    });
  };

  const funcaoLabels = {
    acelerador: "Acelerador",
    mentor: "Mentor",
    gerente: "Gerente",
    consultor: "Consultor",
    secretario: "Secretário",
    editor: "Editor"
  };

  const funcaoColors = {
    acelerador: "bg-purple-100 text-purple-700",
    mentor: "bg-blue-100 text-blue-700",
    gerente: "bg-green-100 text-green-700",
    consultor: "bg-orange-100 text-orange-700",
    secretario: "bg-pink-100 text-pink-700",
    editor: "bg-indigo-100 text-indigo-700"
  };

  // Filtrar se houver um usuário específico selecionado
  const displayUsers = selectedUserId 
    ? adminUsers.filter(u => u.id === selectedUserId)
    : adminUsers;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        
        <Button
          onClick={() => navigate(createPageUrl("AdminUsuarios"))}
          variant="ghost"
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-10 h-10 text-purple-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Gerenciar Permissões
              </h1>
              <p className="text-gray-600 mt-1">
                Defina os níveis de acesso para cada usuário administrativo
              </p>
            </div>
          </div>
        </div>

        <Card className="shadow-lg border-t-4 border-t-purple-500 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50">
            <div className="flex items-center justify-between">
              <CardTitle>Matriz de Permissões</CardTitle>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Todas as Alterações
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-100">
                  <TableRow>
                    <TableHead className="w-[250px] font-bold">Usuário</TableHead>
                    <TableHead className="w-[120px]">Presets</TableHead>
                    {permissions.map(perm => (
                      <TableHead key={perm.key} className="text-center min-w-[100px]">
                        <div className="flex flex-col items-center">
                          <span className="text-xs font-bold">{perm.label}</span>
                          <span className="text-[10px] text-gray-500 font-normal">{perm.description}</span>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2 + permissions.length} className="text-center py-12 text-gray-500">
                        Nenhum usuário administrativo cadastrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayUsers.map((user) => (
                      <TableRow key={user.id} className="hover:bg-slate-50">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            {user.profile_picture_url && (
                              <img 
                                src={user.profile_picture_url} 
                                alt={user.full_name}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            )}
                            <div>
                              <p className="font-semibold">{user.full_name}</p>
                              <p className="text-xs text-gray-500">{user.email}</p>
                              <Badge className={`${funcaoColors[user.funcao]} text-[10px] mt-1`}>
                                {funcaoLabels[user.funcao]}
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => applyPreset(user.id, 'total')}
                              className="text-xs h-7"
                            >
                              Total
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => applyPreset(user.id, 'padrao')}
                              className="text-xs h-7"
                            >
                              Padrão
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => applyPreset(user.id, 'visualizacao')}
                              className="text-xs h-7"
                            >
                              Apenas Ver
                            </Button>
                          </div>
                        </TableCell>
                        {permissions.map(perm => (
                          <TableCell key={perm.key} className="text-center">
                            <div className="flex justify-center">
                              <Checkbox
                                checked={permissionsMatrix[user.id]?.[perm.key] || false}
                                onCheckedChange={() => togglePermission(user.id, perm.key)}
                                className="w-5 h-5"
                              />
                            </div>
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Legenda */}
        <Card className="mt-6 bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <h3 className="font-semibold text-sm text-blue-900 mb-3">Descrição das Permissões:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              {permissions.map(perm => (
                <div key={perm.key} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-semibold text-blue-900">{perm.label}:</span>
                    <span className="text-blue-700 ml-1">{perm.description}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}