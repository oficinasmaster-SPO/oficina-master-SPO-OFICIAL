import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { MoreVertical, UserPlus, Loader2, Eye, Edit, Key, Trash2, Mail, FileText, Shield, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import UserFormDialog from "@/components/admin/UserFormDialog";
import CadastroUsuarioDiretoModal from "@/components/admin/CadastroUsuarioDiretoModal";
import UserAuditDialog from "@/components/admin/UserAuditDialog";
import UserDetailsDrawer from "@/components/admin/users/UserDetailsDrawer";
import PromoteToAdminDialog from "@/components/admin/PromoteToAdminDialog";
import PermissionExceptionsModal from "@/components/admin/PermissionExceptionsModal";
import { PermissionRequestForm } from "@/components/rbac/PermissionRequestForm";
import { usePermissionChangeRequest } from "@/components/rbac/hooks/usePermissionChangeRequest";

export default function UsuariosAdmin() {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [selectedUser, setSelectedUser] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isAuditDialogOpen, setIsAuditDialogOpen] = useState(false);
  const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false);
  const [isPromoteDialogOpen, setIsPromoteDialogOpen] = useState(false);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [permissionRequestData, setPermissionRequestData] = useState(null);
  const queryClient = useQueryClient();

  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return Array.isArray(users) ? users : [];
    }
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['user-profiles'],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.list();
      return Array.isArray(profiles) ? profiles : [];
    }
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const employees = await base44.entities.Employee.list();
      return Array.isArray(employees) ? employees : [];
    }
  });

  const filteredUsers = useMemo(() => {
    if (!search) return users;
    
    const searchLower = search.toLowerCase();
    return users.filter(u => 
      u.full_name?.toLowerCase().includes(searchLower)
    );
  }, [users, search]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredUsers.slice(start, end);
  }, [filteredUsers, currentPage, itemsPerPage]);

  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const getPaginationItems = () => {
    const items = [];
    const range = 1; // Mostra 1 página antes e 1 depois da atual
    
    items.push(1); // Sempre primeira
    
    if (currentPage - range > 2) {
      items.push('...');
    }
    
    for (let i = Math.max(2, currentPage - range); i <= Math.min(totalPages - 1, currentPage + range); i++) {
      if (!items.includes(i)) items.push(i);
    }
    
    if (currentPage + range < totalPages - 1) {
      items.push('...');
    }
    
    if (totalPages > 1) items.push(totalPages); // Sempre última
    
    return items;
  };

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Usuário atualizado com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar usuário: ' + error.message);
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id) => base44.functions.invoke('deleteUser', { user_id: id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Usuário excluído com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao excluir usuário: ' + error.message);
    }
  });

  const handleEdit = (user) => {
    setSelectedUser(user);
    setIsEditDialogOpen(true);
  };

  const handleViewDetails = (user) => {
    setSelectedUser(user);
    setIsDetailsDrawerOpen(true);
  };

  const handleViewAudit = (user) => {
    setSelectedUser(user);
    setIsAuditDialogOpen(true);
  };

  const handleDelete = (user) => {
    if (window.confirm(`Tem certeza que deseja excluir o usuário ${user.full_name}?`)) {
      deleteUserMutation.mutate(user.id);
    }
  };

  const handleResetPassword = async (user) => {
    try {
      await base44.functions.invoke('resetUserPassword', { user_id: user.id });
      toast.success('Senha resetada. E-mail enviado para o usuário.');
    } catch (error) {
      toast.error('Erro ao resetar senha: ' + error.message);
    }
  };

  const handleResendAccess = async (user) => {
    try {
      await base44.functions.invoke('createUserOnFirstAccess', { user_id: user.id });
      toast.success('E-mail de acesso reenviado');
    } catch (error) {
      toast.error('Erro ao reenviar acesso: ' + error.message);
    }
  };

  const handlePromoteToAdmin = (user) => {
    setSelectedUser(user);
    setIsPromoteDialogOpen(true);
  };

  const handleRequestPermissionChange = (user, newRole) => {
    setPermissionRequestData({
      user,
      field: 'role',
      currentValue: user.role,
      requestedValue: newRole
    });
  };

  const getProfileName = (profileId) => {
    const profile = profiles.find(p => p.id === profileId);
    return profile?.name || "Sem perfil";
  };

  const getCargo = (user) => {
    const employee = employees.find(e => e.user_id === user.id);
    return employee?.position || user.position || "Não definido";
  };

  const getLastLoginDisplay = (user) => {
    // Buscar dados de login do Employee (fonte de verdade)
    const employee = employees.find(e => e.user_id === user.id);
    const loginDate = employee?.last_login_at || employee?.first_login_at;
    
    if (!loginDate) return "Nunca acessou";
    
    const now = new Date();
    const login = new Date(loginDate);
    const diffDays = Math.floor((now - login) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Hoje";
    if (diffDays === 1) return "Ontem";
    if (diffDays <= 7) return `${diffDays} dias atrás`;
    return login.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  if (isLoadingUsers) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestão de Usuários</h1>
          <p className="text-gray-600 mt-1">Gerencie usuários, perfis e permissões do sistema</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsPermissionModalOpen(true)}>
            <Users className="w-4 h-4 mr-2" />
            Permissões por Usuário
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Novo Usuário
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50/50">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Usuário</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Cargo</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Perfil</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Último Login</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Ações</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-500">
                      Nenhum usuário encontrado
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((user) => (
                    <tr 
                      key={user.id} 
                      className="border-b hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-gray-900">{user.full_name}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-700">{getCargo(user)}</span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="text-xs">
                          {getProfileName(user.profile_id)}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm text-gray-700">{getLastLoginDisplay(user)}</span>
                          <Badge 
                            className={`w-fit text-xs ${
                              user.user_status === 'active' ? 'bg-green-100 text-green-700' :
                              user.user_status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                              user.user_status === 'blocked' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {user.user_status === 'active' ? 'Ativo' :
                             user.user_status === 'pending' ? 'Pendente' :
                             user.user_status === 'blocked' ? 'Bloqueado' : 'Inativo'}
                          </Badge>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => handleViewDetails(user)}>
                                <Eye className="w-4 h-4 mr-2" />
                                Ver Detalhes
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEdit(user)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleViewAudit(user)}>
                                <FileText className="w-4 h-4 mr-2" />
                                Auditoria
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleResetPassword(user)}>
                                <Key className="w-4 h-4 mr-2" />
                                Resetar Senha
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleResendAccess(user)}>
                                <Mail className="w-4 h-4 mr-2" />
                                Reenviar Acesso
                              </DropdownMenuItem>
                              {user.role !== 'admin' && (
                                <DropdownMenuItem onClick={() => handlePromoteToAdmin(user)}>
                                  <Shield className="w-4 h-4 mr-2" />
                                  Promover para Admin
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDelete(user)}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {totalPages > 1 && (
            <div className="border-t px-4 py-3 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Mostrando <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> até{' '}
                <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredUsers.length)}</span> de{' '}
                <span className="font-medium">{filteredUsers.length}</span> usuários
              </p>
              <div className="flex gap-1 items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                {getPaginationItems().map((item, idx) => (
                  <div key={idx}>
                    {item === '...' ? (
                      <span className="px-2 text-gray-500">...</span>
                    ) : (
                      <Button
                        variant={currentPage === item ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => goToPage(item)}
                        className={currentPage === item ? 'bg-primary text-primary-foreground' : ''}
                      >
                        {item}
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {isEditDialogOpen && selectedUser && (
        <UserFormDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          selectedUser={selectedUser}
          profiles={profiles}
          onSubmit={(data) => {
            updateUserMutation.mutate({ id: selectedUser.id, data });
            setIsEditDialogOpen(false);
          }}
        />
      )}

      {isCreateDialogOpen && (
        <CadastroUsuarioDiretoModal
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          profiles={profiles}
        />
      )}

      {isAuditDialogOpen && selectedUser && (
        <UserAuditDialog
          open={isAuditDialogOpen}
          onOpenChange={setIsAuditDialogOpen}
          user={selectedUser}
        />
      )}

      {isDetailsDrawerOpen && selectedUser && (
        <UserDetailsDrawer
          open={isDetailsDrawerOpen}
          onOpenChange={setIsDetailsDrawerOpen}
          user={selectedUser}
          profile={profiles.find(p => p.id === selectedUser.profile_id)}
          admin={users.find(u => u.id === selectedUser.admin_responsavel_id)}
          onUpdate={(data) => updateUserMutation.mutate({ id: selectedUser.id, data })}
          onRequestPermissionChange={handleRequestPermissionChange}
        />
      )}

      {isPromoteDialogOpen && selectedUser && (
        <PromoteToAdminDialog
          open={isPromoteDialogOpen}
          onOpenChange={setIsPromoteDialogOpen}
          user={selectedUser}
          onConfirm={() => {
            updateUserMutation.mutate({ id: selectedUser.id, data: { role: 'admin' } });
            setIsPromoteDialogOpen(false);
          }}
        />
      )}

      {permissionRequestData && (
        <PermissionRequestForm
          open={!!permissionRequestData}
          onOpenChange={(open) => !open && setPermissionRequestData(null)}
          employee={permissionRequestData.user}
          changeType="profile_change"
          newProfileName={permissionRequestData.requestedValue === 'admin' ? 'Admin' : 'User'}
          currentProfileName={permissionRequestData.currentValue === 'admin' ? 'Admin' : 'User'}
          onSubmit={(justification) => {
            // Implementar lógica de solicitação
            setPermissionRequestData(null);
          }}
        />
      )}

      <PermissionExceptionsModal
        open={isPermissionModalOpen}
        onOpenChange={setIsPermissionModalOpen}
        user={selectedUser}
      />
    </div>
  );
}