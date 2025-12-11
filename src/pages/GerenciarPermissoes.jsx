import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Shield, Edit, Search, User, CheckCircle2, XCircle, Save } from "lucide-react";
import { toast } from "sonner";

export default function GerenciarPermissoes() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [editingPermissions, setEditingPermissions] = useState(null);

  // Carregar usuários
  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      const result = await base44.entities.User.list();
      return Array.isArray(result) ? result : [];
    }
  });

  // Carregar oficinas
  const { data: workshops = [] } = useQuery({
    queryKey: ['workshops-list'],
    queryFn: async () => {
      const result = await base44.entities.Workshop.list();
      return Array.isArray(result) ? result : [];
    }
  });

  // Carregar permissões personalizadas
  const { data: permissions = [] } = useQuery({
    queryKey: ['user-permissions'],
    queryFn: async () => {
      const result = await base44.entities.UserPermission.list();
      return Array.isArray(result) ? result : [];
    }
  });

  // Módulos e suas ações
  const modules = [
    { 
      id: "dashboard", 
      label: "Dashboard & Rankings", 
      actions: [
        { id: "view", label: "Visualizar" }
      ]
    },
    { 
      id: "cadastros", 
      label: "Cadastros (Oficina, Colaboradores)", 
      actions: [
        { id: "view", label: "Visualizar" },
        { id: "edit", label: "Editar" },
        { id: "delete", label: "Excluir" }
      ]
    },
    { 
      id: "patio", 
      label: "Pátio Operação (QGP)", 
      actions: [
        { id: "view", label: "Visualizar" },
        { id: "edit", label: "Editar" }
      ]
    },
    { 
      id: "resultados", 
      label: "Resultados & Finanças", 
      actions: [
        { id: "view", label: "Visualizar" },
        { id: "edit", label: "Editar" }
      ]
    },
    { 
      id: "pessoas", 
      label: "Pessoas & RH", 
      actions: [
        { id: "view", label: "Visualizar" },
        { id: "edit", label: "Editar" },
        { id: "delete", label: "Excluir" }
      ]
    },
    { 
      id: "diagnosticos", 
      label: "Diagnósticos & IA", 
      actions: [
        { id: "view", label: "Visualizar" },
        { id: "create", label: "Criar Novos" }
      ]
    },
    { 
      id: "processos", 
      label: "Processos", 
      actions: [
        { id: "view", label: "Visualizar" },
        { id: "edit", label: "Editar" }
      ]
    },
    { 
      id: "documentos", 
      label: "Documentos", 
      actions: [
        { id: "view", label: "Visualizar" },
        { id: "upload", label: "Upload" },
        { id: "delete", label: "Excluir" }
      ]
    },
    { 
      id: "cultura", 
      label: "Cultura", 
      actions: [
        { id: "view", label: "Visualizar" },
        { id: "edit", label: "Editar" }
      ]
    },
    { 
      id: "treinamentos", 
      label: "Treinamentos", 
      actions: [
        { id: "view", label: "Visualizar" },
        { id: "create", label: "Criar" },
        { id: "manage", label: "Gerenciar" }
      ]
    },
    { 
      id: "gestao", 
      label: "Gestão", 
      actions: [
        { id: "view", label: "Visualizar" },
        { id: "edit", label: "Editar" }
      ]
    },
    { 
      id: "admin", 
      label: "Administração", 
      actions: [
        { id: "users", label: "Gerenciar Usuários" },
        { id: "permissions", label: "Gerenciar Permissões" },
        { id: "settings", label: "Configurações" }
      ]
    }
  ];

  // Predefinições de níveis
  const permissionLevels = {
    admin: {
      label: "Administrador",
      description: "Acesso completo ao sistema",
      color: "bg-red-100 text-red-700 border-red-200"
    },
    editor: {
      label: "Editor",
      description: "Pode visualizar e editar maioria dos módulos",
      color: "bg-blue-100 text-blue-700 border-blue-200"
    },
    visualizador: {
      label: "Visualizador",
      description: "Apenas visualização",
      color: "bg-gray-100 text-gray-700 border-gray-200"
    },
    personalizado: {
      label: "Personalizado",
      description: "Permissões customizadas",
      color: "bg-purple-100 text-purple-700 border-purple-200"
    }
  };

  // Filtrar usuários
  const filteredUsers = users.filter(user => 
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Obter permissão do usuário
  const getUserPermission = (userId) => {
    return permissions.find(p => p.user_id === userId);
  };

  // Obter oficina do usuário
  const getUserWorkshop = (workshopId) => {
    return workshops.find(w => w.id === workshopId);
  };

  // Predefinir permissões baseado no nível
  const getDefaultPermissions = (level) => {
    const defaults = {
      dashboard: {},
      cadastros: {},
      patio: {},
      resultados: {},
      pessoas: {},
      diagnosticos: {},
      processos: {},
      documentos: {},
      cultura: {},
      treinamentos: {},
      gestao: {},
      admin: {}
    };

    modules.forEach(module => {
      module.actions.forEach(action => {
        if (level === "admin") {
          defaults[module.id][action.id] = true;
        } else if (level === "editor") {
          defaults[module.id][action.id] = action.id !== "delete";
        } else if (level === "visualizador") {
          defaults[module.id][action.id] = action.id === "view";
        }
      });
    });

    return defaults;
  };

  // Abrir modal de edição
  const handleEditUser = (user) => {
    const userPerm = getUserPermission(user.id);
    setSelectedUser(user);
    
    if (userPerm) {
      setEditingPermissions({
        level: userPerm.permission_level,
        modules: userPerm.modules_access || {}
      });
    } else {
      // Padrão baseado no role do User
      const defaultLevel = user.role === 'admin' ? 'admin' : 'visualizador';
      setEditingPermissions({
        level: defaultLevel,
        modules: getDefaultPermissions(defaultLevel)
      });
    }
  };

  // Alterar nível de permissão
  const handleLevelChange = (level) => {
    setEditingPermissions({
      level,
      modules: getDefaultPermissions(level)
    });
  };

  // Toggle permissão específica
  const togglePermission = (moduleId, actionId) => {
    setEditingPermissions(prev => ({
      ...prev,
      level: "personalizado",
      modules: {
        ...prev.modules,
        [moduleId]: {
          ...prev.modules[moduleId],
          [actionId]: !prev.modules[moduleId]?.[actionId]
        }
      }
    }));
  };

  // Salvar permissões
  const savePermissionMutation = useMutation({
    mutationFn: async ({ userId, permissionData }) => {
      const existing = getUserPermission(userId);
      
      if (existing) {
        return await base44.entities.UserPermission.update(existing.id, permissionData);
      } else {
        return await base44.entities.UserPermission.create({
          user_id: userId,
          workshop_id: selectedUser.workshop_id,
          ...permissionData
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['user-permissions']);
      toast.success("Permissões atualizadas com sucesso!");
      setSelectedUser(null);
      setEditingPermissions(null);
    },
    onError: (error) => {
      console.error(error);
      toast.error("Erro ao salvar permissões");
    }
  });

  const handleSave = () => {
    if (!selectedUser || !editingPermissions) return;

    savePermissionMutation.mutate({
      userId: selectedUser.id,
      permissionData: {
        permission_level: editingPermissions.level,
        modules_access: editingPermissions.modules,
        is_active: true
      }
    });
  };

  if (loadingUsers) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gerenciamento de Permissões</h1>
            <p className="text-gray-600">Controle o acesso de cada usuário aos módulos do sistema</p>
          </div>
        </div>

        {/* Barra de Pesquisa */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Buscar por nome ou e-mail..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Lista de Usuários */}
        <Card>
          <CardHeader>
            <CardTitle>Usuários do Sistema</CardTitle>
            <CardDescription>Clique em "Editar Permissões" para personalizar o acesso</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <User className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Nenhum usuário encontrado</p>
                </div>
              ) : (
                filteredUsers.map((user) => {
                  const userPerm = getUserPermission(user.id);
                  const workshop = getUserWorkshop(user.workshop_id);
                  const level = userPerm?.permission_level || (user.role === 'admin' ? 'admin' : 'visualizador');
                  const levelInfo = permissionLevels[level];

                  return (
                    <div 
                      key={user.id} 
                      className="flex items-center justify-between p-4 rounded-lg border bg-white hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                          {user.full_name?.charAt(0) || user.email?.charAt(0) || '?'}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{user.full_name || 'Sem nome'}</h3>
                          <p className="text-sm text-gray-600">{user.email}</p>
                          {workshop && (
                            <p className="text-xs text-gray-500 mt-1">📍 {workshop.name}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className={`${levelInfo.color} border px-3 py-1`}>
                            {levelInfo.label}
                          </Badge>
                          {userPerm?.is_active ? (
                            <div className="flex items-center gap-1 text-green-600 text-xs">
                              <CheckCircle2 className="w-3 h-3" />
                              Ativo
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-gray-400 text-xs">
                              <XCircle className="w-3 h-3" />
                              Padrão
                            </div>
                          )}
                        </div>
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleEditUser(user)}
                            className="ml-4"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Editar Permissões
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Editar Permissões - {selectedUser?.full_name}</DialogTitle>
                            <DialogDescription>
                              Defina o nível de acesso e personalize as permissões por módulo
                            </DialogDescription>
                          </DialogHeader>

                          {editingPermissions && (
                            <div className="space-y-6 mt-4">
                              {/* Nível de Permissão */}
                              <div>
                                <label className="text-sm font-medium mb-2 block">Nível de Permissão</label>
                                <Select 
                                  value={editingPermissions.level} 
                                  onValueChange={handleLevelChange}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(permissionLevels).map(([key, info]) => (
                                      <SelectItem key={key} value={key}>
                                        <div className="flex flex-col">
                                          <span className="font-medium">{info.label}</span>
                                          <span className="text-xs text-gray-500">{info.description}</span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Permissões Detalhadas */}
                              <div>
                                <h3 className="text-sm font-medium mb-3">Permissões por Módulo</h3>
                                <div className="space-y-4">
                                  {modules.map((module) => (
                                    <div key={module.id} className="border rounded-lg p-4 bg-gray-50">
                                      <h4 className="font-medium text-gray-900 mb-3">{module.label}</h4>
                                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {module.actions.map((action) => (
                                          <div key={action.id} className="flex items-center gap-2">
                                            <Checkbox
                                              id={`${module.id}-${action.id}`}
                                              checked={editingPermissions.modules[module.id]?.[action.id] || false}
                                              onCheckedChange={() => togglePermission(module.id, action.id)}
                                            />
                                            <label 
                                              htmlFor={`${module.id}-${action.id}`}
                                              className="text-sm cursor-pointer"
                                            >
                                              {action.label}
                                            </label>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Botões de Ação */}
                              <div className="flex justify-end gap-3 pt-4 border-t">
                                <Button 
                                  variant="outline" 
                                  onClick={() => {
                                    setSelectedUser(null);
                                    setEditingPermissions(null);
                                  }}
                                >
                                  Cancelar
                                </Button>
                                <Button 
                                  onClick={handleSave}
                                  disabled={savePermissionMutation.isPending}
                                  className="bg-blue-600 hover:bg-blue-700"
                                >
                                  {savePermissionMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  ) : (
                                    <Save className="w-4 h-4 mr-2" />
                                  )}
                                  Salvar Permissões
                                </Button>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}