import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { differenceInDays } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import UserFormDialog from "@/components/admin/UserFormDialog";
import CadastroUsuarioDiretoModal from "@/components/admin/CadastroUsuarioDiretoModal";
import UserAuditDialog from "@/components/admin/UserAuditDialog";
import UserDetailsDrawer from "@/components/admin/users/UserDetailsDrawer";
import UserTable from "@/components/admin/users/UserTable";
import UserFilters from "@/components/admin/users/UserFilters";
import UserStatsCards from "@/components/admin/users/UserStatsCards";
import PromoteToAdminDialog from "@/components/admin/PromoteToAdminDialog";
import { PermissionRequestForm } from "@/components/rbac/PermissionRequestForm";
import { usePermissionChangeRequest } from "@/components/rbac/hooks/usePermissionChangeRequest";
import AuditHistoryViewer from "@/components/rbac/audit/AuditHistoryViewer";

export default function UsuariosAdmin() {
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    profile: 'all',
    responsible: 'all',
    activity: 'all'
  });
  const [selectedUser, setSelectedUser] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isAuditDialogOpen, setIsAuditDialogOpen] = useState(false);
  const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false);
  const [isPromoteDialogOpen, setIsPromoteDialogOpen] = useState(false);
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

  const admins = useMemo(() => 
    users.filter(u => u.role === 'admin'), 
    [users]
  );

  const filteredUsers = useMemo(() => {
    let filtered = users;
    
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(u => 
        u.full_name?.toLowerCase().includes(search) ||
        u.email?.toLowerCase().includes(search)
      );
    }
    
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(u => u.user_status === filters.status);
    }
    
    if (filters.profile && filters.profile !== 'all') {
      filtered = filtered.filter(u => u.profile_id === filters.profile);
    }
    
    if (filters.responsible && filters.responsible !== 'all') {
      filtered = filtered.filter(u => u.admin_responsavel_id === filters.responsible);
    }
    
    if (filters.activity && filters.activity === 'inactive_30d') {
      filtered = filtered.filter(u => {
        const loginDate = u.last_login_at || u.first_login_at;
        if (!loginDate) return true;
        return differenceInDays(new Date(), new Date(loginDate)) > 30;
      });
    }
    
    return filtered;
  }, [users, filters]);

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
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Novo Usuário
          </Button>
        </div>
      </div>

      <UserStatsCards 
        users={users} 
        onCardClick={(filter) => setFilters(prev => ({ ...prev, ...filter }))} 
      />

      <UserFilters 
        filters={filters}
        onFilterChange={setFilters}
        profiles={profiles}
        admins={admins}
      />

      <Card>
        <CardContent className="p-0">
          <UserTable
            users={filteredUsers}
            profiles={profiles}
            admins={admins}
            onViewDetails={handleViewDetails}
            onEdit={handleEdit}
            onResetPassword={handleResetPassword}
            onResendAccess={handleResendAccess}
            onViewAudit={handleViewAudit}
            onDelete={handleDelete}
            onPromoteToAdmin={handlePromoteToAdmin}
          />
        </CardContent>
      </Card>

      {isEditDialogOpen && selectedUser && (
        <UserFormDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          selectedUser={selectedUser}
          profiles={profiles}
          onSubmit={(data) => updateUserMutation.mutate({ id: selectedUser.id, data })}
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
          profiles={profiles}
          employees={employees}
          onUpdate={(data) => updateUserMutation.mutate({ id: selectedUser.id, data })}
          onRequestPermissionChange={handleRequestPermissionChange}
        />
      )}

      {isPromoteDialogOpen && selectedUser && (
        <PromoteToAdminDialog
          open={isPromoteDialogOpen}
          onOpenChange={setIsPromoteDialogOpen}
          user={selectedUser}
          onConfirm={() => updateUserMutation.mutate({ id: selectedUser.id, data: { role: 'admin' } })}
        />
      )}

      {permissionRequestData && (
        <PermissionRequestForm
          open={!!permissionRequestData}
          onOpenChange={(open) => !open && setPermissionRequestData(null)}
          user={permissionRequestData.user}
          field={permissionRequestData.field}
          currentValue={permissionRequestData.currentValue}
          requestedValue={permissionRequestData.requestedValue}
        />
      )}
    </div>
  );
}