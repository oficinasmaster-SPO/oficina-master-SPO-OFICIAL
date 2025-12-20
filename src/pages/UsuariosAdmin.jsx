import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UserPlus, Loader2, Copy, CheckCircle, Shield, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { differenceInDays } from "date-fns";
import UserFormDialog from "@/components/admin/UserFormDialog";
import UserAuditDialog from "@/components/admin/UserAuditDialog";
import UserStatsCards from "@/components/admin/users/UserStatsCards";
import UserFilters from "@/components/admin/users/UserFilters";
import UserTable from "@/components/admin/users/UserTable";
import UserDetailsDrawer from "@/components/admin/users/UserDetailsDrawer";
import ApprovalBanner from "@/components/admin/users/ApprovalBanner";
import PermissionRequestForm from "@/components/rbac/PermissionRequestForm";
import { usePermissionChangeRequest, prepareProfileChangeRequest, prepareCustomRolesChangeRequest, prepareStatusChangeRequest } from "@/components/rbac/PermissionChangeManager";
import AuditHistoryViewer from "@/components/rbac/audit/AuditHistoryViewer";

export default function UsuariosAdmin() {
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [resetPasswordDialog, setResetPasswordDialog] = useState({ open: false, password: "", email: "", loginUrl: "" });
  const [auditDialogOpen, setAuditDialogOpen] = useState(false);
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);
  const [requestFormOpen, setRequestFormOpen] = useState(false);
  const [pendingChangeData, setPendingChangeData] = useState(null);
  const { createRequest, isCreating } = usePermissionChangeRequest();
  const [auditViewOpen, setAuditViewOpen] = useState(false);
  const [userForAudit, setUserForAudit] = useState(null);
  const [filters, setFilters] = useState({
    search: "",
    position: "",
    status: "todos",
    profile: "todos",
    admin: "todos",
    lastLogin: "todos",
    alert: "todos"
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: profiles = [], isLoading: loadingProfiles } = useQuery({
    queryKey: ['user-profiles'],
    queryFn: async () => {
      const allProfiles = await base44.entities.UserProfile.list();
      console.log("📋 Todos os perfis:", allProfiles);
      // Filtra perfis internos ativos (mesma lógica da Gestão de Perfis)
      const internoProfiles = allProfiles.filter(p => p.type === 'interno' && p.status === 'ativo');
      console.log("✅ Perfis internos ativos:", internoProfiles);
      return internoProfiles;
    },
    staleTime: 30000,
    refetchOnWindowFocus: true // Atualiza quando voltar para a aba
  });

  const { data: customRoles = [] } = useQuery({
    queryKey: ['customRoles'],
    queryFn: () => base44.entities.CustomRole.list(),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-admin-users'],
    queryFn: async () => {
      // Busca usuários admin reais do sistema
      const users = await base44.entities.User.list();
      return users.filter(u => u.role === 'admin');
    }
  });

  const { data: adminUsers = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      // Buscar usuários internos da entidade Employee (criados no convite)
      const allEmployees = await base44.entities.Employee.list();
      return allEmployees.filter(e => e.tipo_vinculo === 'interno' || e.is_internal === true);
    }
  });

  const createUserMutation = useMutation({
    mutationFn: async (data) => {
      try {
        console.log("📤 Criando convite para usuário interno:", data);

        // Buscar ou criar company da plataforma
        let platformCompany;
        const companies = await base44.entities.Company.filter({ type: 'platform' });

        if (companies && companies.length > 0) {
          platformCompany = companies[0];
        } else {
          platformCompany = await base44.entities.Company.create({
            name: 'Oficinas Master',
            type: 'platform',
            status: 'active'
          });
        }

        // Enviar convite interno (não cria User/Employee ainda)
        const result = await base44.functions.invoke('sendEmployeeInvite', {
          name: data.full_name,
          email: data.email,
          position: data.position || 'Usuário Interno',
          area: 'administrativo',
          job_role: 'consultor',
          invite_type: 'internal',
          company_id: platformCompany.id,
          profile_id: data.profile_id,
          role: data.role || 'user',
          telefone: data.telefone,
          origin: window.location.origin
        });

        console.log("✅ Convite criado:", result.data);

        return result.data;
      } catch (error) {
        console.error("❌ Erro ao criar convite:", error);
        throw error;
      }
    },
    onSuccess: (result) => {
      console.log("✅ Sucesso no convite:", result);
      queryClient.invalidateQueries(['admin-users']);
      
      if (result.invite_url) {
        toast.success("Convite enviado!", { duration: 3000 });
        
        setResetPasswordDialog({ 
          open: true, 
          inviteUrl: result.invite_url,
          email: result.instructions?.match(/\(([^)]+)\)/)?.[1] || '',
          role: 'user',
          loginUrl: 'https://oficinasmastergtr.com',
          permissionsCreated: false
        });
      } else {
        console.error("❌ Link não retornado:", result);
        toast.error("Erro ao gerar convite");
      }
      
      setIsDialogOpen(false);
      setIsCreateMode(false);
    },
    onError: (error) => {
      toast.error("Erro ao criar usuário: " + error.message);
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, data, changes }) => {
      const auditEntry = {
        changed_by: currentUser.full_name,
        changed_by_email: currentUser.email,
        changed_at: new Date().toISOString(),
        action: changes.action,
        field_changed: changes.field,
        old_value: changes.oldValue,
        new_value: changes.newValue
      };

      const currentAuditLog = selectedUser?.audit_log || [];
      
      // Atualiza Employee com dados completos, incluindo custom_role_ids se fornecido
      const updateData = {
        full_name: data.full_name,
        telefone: data.telefone,
        position: data.position,
        profile_id: data.profile_id,
        user_status: data.user_status,
        audit_log: [...currentAuditLog, auditEntry]
      };

      // Adiciona custom_role_ids se fornecido
      if (data.custom_role_ids !== undefined) {
        updateData.custom_role_ids = data.custom_role_ids;
      }

      return await base44.entities.Employee.update(userId, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-users']);
      queryClient.invalidateQueries(['user-profiles']);
      toast.success("Usuário atualizado!");
      setIsDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error) => toast.error("Erro ao atualizar: " + error.message)
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId) => {
      return await base44.entities.Employee.delete(userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-users']);
      queryClient.invalidateQueries(['user-profiles']);
      toast.success("Usuário excluído!");
    },
    onError: (error) => toast.error("Erro ao excluir: " + error.message)
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId }) => {
      const result = await base44.functions.invoke('resetUserPassword', { user_id: userId });
      return result.data;
    },
    onSuccess: (data) => {
      setResetPasswordDialog({ 
        open: true, 
        password: data.temporary_password,
        email: selectedUser?.email 
      });
      toast.success("Senha resetada!");
    },
    onError: (error) => toast.error("Erro ao resetar senha: " + error.message)
  });

  const resendAccessMutation = useMutation({
    mutationFn: async (user) => {
      // Gera nova senha temporária
      const result = await base44.functions.invoke('resetUserPassword', { user_id: user.id });
      return { ...result.data, email: user.email, role: user.role || 'user' };
    },
    onSuccess: (data) => {
      setResetPasswordDialog({ 
        open: true, 
        password: data.temporary_password,
        email: data.email,
        role: data.role,
        loginUrl: 'https://oficinasmastergtr.com'
      });
      toast.success("Acesso reenviado!");
    },
    onError: (error) => toast.error("Erro ao reenviar acesso: " + error.message)
  });

  const approveAccessMutation = useMutation({
    mutationFn: async ({ employeeId, profileId }) => {
      const result = await base44.functions.invoke('approveUserAccess', { 
        employee_id: employeeId,
        profile_id: profileId
      });
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-users']);
      toast.success("Acesso aprovado! Usuário pode fazer login agora.");
      setShowDetailsDrawer(false);
      setSelectedUser(null);
    },
    onError: (error) => toast.error("Erro ao aprovar acesso: " + error.message)
  });

  const handleSubmit = (data) => {
    if (isCreateMode) {
      createUserMutation.mutate(data);
    } else if (selectedUser) {
      // Verificar se há mudanças críticas que requerem aprovação
      const profileChanged = selectedUser.profile_id !== data.profile_id;
      const customRolesChanged = JSON.stringify(selectedUser.custom_role_ids || []) !== JSON.stringify(data.custom_role_ids || []);
      const statusChanged = selectedUser.user_status !== data.user_status;
      
      const requiresApproval = profileChanged || customRolesChanged || statusChanged;

      if (requiresApproval) {
        // Preparar dados para solicitação de aprovação
        let requestData;
        
        if (profileChanged) {
          const oldProfile = profiles.find(p => p.id === selectedUser.profile_id);
          const newProfile = profiles.find(p => p.id === data.profile_id);
          requestData = prepareProfileChangeRequest(selectedUser, oldProfile, newProfile, '');
        } else if (customRolesChanged) {
          requestData = prepareCustomRolesChangeRequest(selectedUser, selectedUser.custom_role_ids, data.custom_role_ids, '');
        } else if (statusChanged) {
          requestData = prepareStatusChangeRequest(selectedUser, selectedUser.user_status, data.user_status, '');
        }

        // Armazenar dados para usar no formulário de aprovação
        setPendingChangeData({ ...requestData, formData: data });
        setIsDialogOpen(false);
        setRequestFormOpen(true);
      } else {
        // Mudanças não críticas (nome, telefone, cargo) - aplicar diretamente
        let changes = { action: 'updated', field: 'dados_basicos', oldValue: '', newValue: '' };
        
        updateUserMutation.mutate({ 
          userId: selectedUser.id, 
          data,
          changes 
        });
      }
    }
  };

  const handleRequestSubmit = (justification) => {
    if (!pendingChangeData) return;
    
    const requestData = {
      ...pendingChangeData,
      justification
    };
    
    delete requestData.formData;
    
    createRequest(requestData, {
      onSuccess: () => {
        setRequestFormOpen(false);
        setPendingChangeData(null);
        setSelectedUser(null);
      }
    });
  };

  const filteredUsers = useMemo(() => {
    return (adminUsers || []).filter(user => {
      // Busca por nome/email
      if (filters.search && 
          !user?.full_name?.toLowerCase().includes(filters.search.toLowerCase()) &&
          !user?.email?.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }

      // Filtro por cargo
      if (filters.position && !user?.position?.toLowerCase().includes(filters.position.toLowerCase())) {
        return false;
      }

      // Filtro por status
      if (filters.status !== "todos" && user?.user_status !== filters.status) {
        return false;
      }

      // Filtro por perfil
      if (filters.profile !== "todos" && user?.profile_id !== filters.profile) {
        return false;
      }

      // Filtro por admin responsável
      if (filters.admin !== "todos" && user?.admin_responsavel_id !== filters.admin) {
        return false;
      }

      // Filtro por último login
      if (filters.lastLogin !== "todos") {
        if (filters.lastLogin === "nunca" && user?.last_login_at) return false;
        if (filters.lastLogin !== "nunca" && !user?.last_login_at) return false;
        
        if (user?.last_login_at) {
          const diasAtras = differenceInDays(new Date(), new Date(user.last_login_at));
          if (filters.lastLogin === "hoje" && diasAtras !== 0) return false;
          if (filters.lastLogin === "7dias" && diasAtras > 7) return false;
          if (filters.lastLogin === "30dias" && diasAtras > 30) return false;
        }
      }

      // Filtro por alerta
      if (filters.alert !== "todos") {
        if (filters.alert === "primeiro_acesso" && user?.first_login_at) return false;
        if (filters.alert === "inatividade_30") {
          if (!user?.last_login_at) return false;
          const diasSemLogin = differenceInDays(new Date(), new Date(user.last_login_at));
          if (diasSemLogin <= 30) return false;
        }
      }

      return true;
    });
  }, [adminUsers, filters]);

  // Lista de admins para seleção de responsável (todos os internos podem ser responsáveis)
  const adminList = allUsers;

  if (currentUser?.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Acesso restrito a administradores</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const handleCardClick = (filter) => {
    if (!filter) {
      setFilters({
        search: "",
        position: "",
        status: "todos",
        profile: "todos",
        admin: "todos",
        lastLogin: "todos",
        alert: "todos"
      });
      return;
    }

    const newFilters = { ...filters };
    
    if (filter.user_status) {
      if (Array.isArray(filter.user_status)) {
        newFilters.status = filter.user_status[0];
      } else {
        newFilters.status = filter.user_status;
      }
    }
    
    if (filter.primeiroAcesso) {
      newFilters.alert = "primeiro_acesso";
    }
    
    if (filter.inatividade30) {
      newFilters.alert = "inatividade_30";
    }
    
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({
      search: "",
      position: "",
      status: "todos",
      profile: "todos",
      admin: "todos",
      lastLogin: "todos",
      alert: "todos"
    });
  };

  const handleOpenDetailsDrawer = (user) => {
    setSelectedUser(user);
    setShowDetailsDrawer(true);
  };

  const handleResetPassword = (user) => {
    if (!user?.id) return;
    if (confirm(`Resetar senha de ${user.full_name}?`)) {
      setSelectedUser(user);
      resetPasswordMutation.mutate({ userId: user.id });
    }
  };

  const handleResendAccess = (user) => {
    if (!user?.email) return;
    if (confirm(`Reenviar credenciais de acesso para ${user.full_name}?\n\nUm novo email será enviado com as informações de login.`)) {
      resendAccessMutation.mutate(user);
    }
  };

  const handleDelete = (user) => {
    if (confirm(`Excluir ${user.full_name}?\n\nEsta ação não pode ser desfeita.`)) {
      deleteUserMutation.mutate(user.id);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-8 h-8 text-indigo-600" />
            👔 Usuários Admin (Internos)
          </h1>
          <p className="text-gray-600 mt-2">
            Gerencie consultores e aceleradores da equipe interna
          </p>
        </div>
        <Button 
          onClick={() => {
            setSelectedUser(null);
            setIsCreateMode(true);
            setIsDialogOpen(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Novo Usuário Admin
        </Button>
      </div>

      {/* Cards de Resumo */}
      <UserStatsCards 
        users={adminUsers || []} 
        onCardClick={handleCardClick}
      />

      {/* Filtros Avançados */}
      <UserFilters
        filters={filters}
        onFiltersChange={setFilters}
        profiles={profiles}
        admins={allUsers}
        onClearFilters={handleClearFilters}
      />

      <Card>
        <CardContent className="pt-6">
          <UserTable
            users={filteredUsers}
            profiles={profiles}
            admins={allUsers}
            onViewDetails={handleOpenDetailsDrawer}
            onEdit={(user) => {
              setSelectedUser(user);
              setIsCreateMode(false);
              setIsDialogOpen(true);
            }}
            onResetPassword={handleResetPassword}
            onResendAccess={handleResendAccess}
            onViewAudit={(user) => {
              setUserForAudit(user);
              setAuditViewOpen(true);
            }}
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>

      {/* Dialog de Histórico de Auditoria */}
      <Dialog open={auditViewOpen} onOpenChange={setAuditViewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Histórico de Auditoria - {userForAudit?.full_name}
            </DialogTitle>
          </DialogHeader>
          <AuditHistoryViewer auditLog={userForAudit?.audit_log || []} />
        </DialogContent>
      </Dialog>

      {/* Dialog de Solicitação de Aprovação */}
      {pendingChangeData && (
        <PermissionRequestForm
          open={requestFormOpen}
          onClose={() => {
            setRequestFormOpen(false);
            setPendingChangeData(null);
          }}
          employee={selectedUser}
          changeType={pendingChangeData.change_type}
          newProfileId={pendingChangeData.requested_profile_id}
          newProfileName={pendingChangeData.requested_profile_name}
          newCustomRoleIds={pendingChangeData.requested_custom_role_ids}
          newStatus={pendingChangeData.requested_status}
          currentProfileId={pendingChangeData.current_profile_id}
          currentProfileName={pendingChangeData.current_profile_name}
          currentCustomRoleIds={pendingChangeData.current_custom_role_ids}
          currentStatus={pendingChangeData.current_status}
          onSubmit={handleRequestSubmit}
          isLoading={isCreating}
        />
      )}

      {/* Dialog de Senha Resetada */}
      <Dialog open={resetPasswordDialog.open} onOpenChange={(open) => setResetPasswordDialog({ ...resetPasswordDialog, open })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Usuário Criado com Sucesso!
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-sm text-green-800">
                <p className="font-semibold mb-2">✅ Email de Convite Enviado</p>
                <p>O usuário receberá um email em <strong>{resetPasswordDialog.email}</strong> com o link para completar o cadastro e definir a senha.</p>
              </AlertDescription>
            </Alert>

            {resetPasswordDialog.permissionsCreated && (
              <Alert className="bg-blue-50 border-blue-200">
                <CheckCircle className="w-4 h-4 text-blue-600" />
                <AlertDescription className="text-xs text-blue-800">
                  <p className="font-semibold">✅ Permissões Configuradas</p>
                  <p className="mt-1">Perfil e permissões já estão configurados no sistema.</p>
                </AlertDescription>
              </Alert>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-blue-800 mb-2">
                🔗 Link de Primeiro Acesso
              </p>
              <div className="flex items-center gap-2">
                <Input
                  value={resetPasswordDialog.inviteUrl || ''}
                  readOnly
                  className="text-xs bg-white"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(resetPasswordDialog.inviteUrl);
                    toast.success("Link copiado!");
                  }}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                💡 Caso o email não chegue, você pode enviar este link manualmente
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-xs text-gray-600">
                <strong>Próximos passos:</strong>
              </p>
              <ol className="text-xs text-gray-600 mt-2 space-y-1 ml-4 list-decimal">
                <li>Usuário recebe email com link de convite</li>
                <li>Clica no link e completa o cadastro</li>
                <li>Define sua senha de acesso</li>
                <li>Faz login em: <strong>https://oficinasmastergtr.com</strong></li>
              </ol>
            </div>

            <Button
              className="w-full"
              onClick={() => setResetPasswordDialog({ open: false, inviteUrl: "", email: "", loginUrl: "", role: "" })}
            >
              Entendi
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Criar/Editar */}
      <UserFormDialog
        open={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setIsCreateMode(false);
          setSelectedUser(null);
        }}
        isCreateMode={isCreateMode}
        selectedUser={selectedUser}
        profiles={profiles}
        customRoles={customRoles}
        admins={adminList}
        onSubmit={handleSubmit}
        isLoading={createUserMutation.isPending || updateUserMutation.isPending}
      />

      {/* Dialog de Auditoria */}
      <UserAuditDialog
        open={auditDialogOpen}
        onClose={() => {
          setAuditDialogOpen(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
      />

      {/* Drawer de Detalhes */}
      <UserDetailsDrawer
        open={showDetailsDrawer}
        onClose={() => {
          setShowDetailsDrawer(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        profile={profiles.find(p => p.id === selectedUser?.profile_id)}
        admin={allUsers.find(a => a.id === selectedUser?.admin_responsavel_id)}
        onResetPassword={handleResetPassword}
        onApprove={(profileId) => approveAccessMutation.mutate({ 
          employeeId: selectedUser.id, 
          profileId 
        })}
        isApproving={approveAccessMutation.isPending}
        profiles={profiles}
      />
    </div>
  );
}