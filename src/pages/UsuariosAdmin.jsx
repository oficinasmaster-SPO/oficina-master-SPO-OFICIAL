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

export default function UsuariosAdmin() {
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [resetPasswordDialog, setResetPasswordDialog] = useState({ open: false, password: "", email: "", loginUrl: "" });
  const [auditDialogOpen, setAuditDialogOpen] = useState(false);
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);
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
      const employees = await base44.entities.Employee.list();
      // Busca usuários internos (consultores/aceleradores)
      return employees.filter(e => e.tipo_vinculo === 'interno' || e.is_internal);
    }
  });

  const createUserMutation = useMutation({
    mutationFn: async (data) => {
      try {
        // 1. Criar User com auditoria
        const auditEntry = {
          changed_by: currentUser.full_name,
          changed_by_email: currentUser.email,
          changed_at: new Date().toISOString(),
          action: 'created',
          field_changed: 'user_created',
          old_value: null,
          new_value: `Usuário interno criado com perfil ${data.profile_id} e role ${data.role}`
        };

        const userData = {
          full_name: data.full_name,
          email: data.email,
          telefone: data.telefone,
          position: data.position,
          profile_id: data.profile_id,
          user_status: 'ativo',
          role: data.role || 'user',
          is_internal: true,
          audit_log: [auditEntry]
        };

        console.log("📤 Enviando dados para criação:", userData);

        // 2. Criar User via função backend (que cria conta e senha)
        const result = await base44.functions.invoke('createUserForEmployee', {
          user_data: userData,
          email: data.email,
          full_name: data.full_name
        });

        console.log("✅ Resultado da criação:", result.data);

        return result.data;
      } catch (error) {
        console.error("❌ Erro ao criar usuário:", error);
        throw error;
      }
    },
    onSuccess: (result) => {
      console.log("✅ Sucesso na criação:", result);
      queryClient.invalidateQueries(['admin-users']);
      queryClient.invalidateQueries(['user-profiles']);
      toast.success("Usuário criado com sucesso!");
      
      if (result.password && result.email) {
        setResetPasswordDialog({ 
          open: true, 
          password: result.password, 
          email: result.email,
          role: result.role || 'user',
          loginUrl: result.login_url || window.location.origin
        });
      } else {
        console.error("❌ Dados incompletos:", result);
        toast.error("Erro ao criar usuário");
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
      
      // Atualiza Employee com dados completos
      return await base44.entities.Employee.update(userId, {
        full_name: data.full_name,
        telefone: data.telefone,
        position: data.position,
        profile_id: data.profile_id,
        user_status: data.user_status,
        audit_log: [...currentAuditLog, auditEntry]
      });
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
        loginUrl: window.location.origin
      });
      toast.success("Acesso reenviado!");
    },
    onError: (error) => toast.error("Erro ao reenviar acesso: " + error.message)
  });

  const handleSubmit = (data) => {
    if (isCreateMode) {
      createUserMutation.mutate(data);
    } else if (selectedUser) {
      // Detectar mudanças
      let changes = { action: 'updated', field: 'dados_basicos', oldValue: '', newValue: '' };
      
      if (selectedUser.profile_id !== data.profile_id) {
        const oldProfile = profiles.find(p => p.id === selectedUser.profile_id);
        const newProfile = profiles.find(p => p.id === data.profile_id);
        changes = {
          action: 'profile_changed',
          field: 'profile_id',
          oldValue: oldProfile?.name || 'Sem perfil',
          newValue: newProfile?.name || 'Sem perfil'
        };
      } else if (selectedUser.user_status !== data.user_status) {
        changes = {
          action: 'status_changed',
          field: 'user_status',
          oldValue: selectedUser.user_status,
          newValue: data.user_status
        };
      }

      updateUserMutation.mutate({ 
        userId: selectedUser.id, 
        data,
        changes 
      });
    }
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
              setSelectedUser(user);
              setAuditDialogOpen(true);
            }}
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>

      {/* Dialog de Senha Resetada */}
      <Dialog open={resetPasswordDialog.open} onOpenChange={(open) => setResetPasswordDialog({ ...resetPasswordDialog, open })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Colaborador Criado!
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-blue-800 mb-2">
                📧 Email
              </p>
              <div className="flex items-center gap-2">
                <Input
                  value={resetPasswordDialog.email}
                  readOnly
                  className="text-sm bg-white"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(resetPasswordDialog.email);
                    toast.success("Email copiado!");
                  }}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-yellow-800 mb-2">
                🔑 Senha Temporária
              </p>
              <div className="flex items-center gap-2">
                <Input
                  value={resetPasswordDialog.password}
                  readOnly
                  className="font-mono text-sm bg-white"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(resetPasswordDialog.password);
                    toast.success("Senha copiada!");
                  }}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <Alert className="bg-amber-50 border-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <AlertDescription className="text-xs text-amber-800">
                <p className="font-semibold mb-2">⚠️ Próximo Passo Obrigatório:</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Acesse o <strong>Dashboard Base44</strong></li>
                  <li>Vá em <strong>Configurações → Usuários</strong></li>
                  <li>Clique em <strong>"Convidar Usuário"</strong></li>
                  <li>Use o email: <strong>{resetPasswordDialog.email}</strong></li>
                  <li>Role: <strong>{resetPasswordDialog.role || 'user'}</strong></li>
                  <li>Envie o convite</li>
                </ol>
              </AlertDescription>
            </Alert>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-xs text-gray-600">
                💡 O perfil e permissões já estão configurados no sistema.
              </p>
            </div>

            <Button
              className="w-full"
              onClick={() => setResetPasswordDialog({ open: false, password: "", email: "", loginUrl: "", role: "" })}
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
      />
    </div>
  );
}