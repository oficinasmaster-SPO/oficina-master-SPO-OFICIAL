import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserPlus, Loader2, Trash2, Edit, Key, Copy, CheckCircle, Shield, FileText, AlertTriangle, Clock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import UserFormDialog from "@/components/admin/UserFormDialog";
import UserAuditDialog from "@/components/admin/UserAuditDialog";

export default function UsuariosAdmin() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [resetPasswordDialog, setResetPasswordDialog] = useState({ open: false, password: "", email: "" });
  const [auditDialogOpen, setAuditDialogOpen] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['user-profiles'],
    queryFn: async () => {
      const allProfiles = await base44.entities.UserProfile.list();
      return allProfiles.filter(p => p.type === 'interno');
    }
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      const employees = await base44.entities.Employee.list();
      // Busca todos os usuários internos para lista de admins responsáveis
      return employees.filter(e => e.tipo_vinculo === 'interno' || e.is_internal);
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
          new_value: `Usuário interno criado com perfil ${data.profile_id}`
        };

        const userData = {
          full_name: data.full_name,
          email: data.email,
          telefone: data.telefone,
          position: data.position,
          profile_id: data.profile_id,
          admin_responsavel_id: data.admin_responsavel_id,
          user_status: 'ativo',
          is_internal: true,
          audit_log: [auditEntry]
        };

        // 2. Criar User via função backend (que cria conta e senha)
        const result = await base44.functions.invoke('createUserForEmployee', {
          user_data: userData,
          email: data.email,
          full_name: data.full_name
        });

        return result.data;
      } catch (error) {
        console.error("Erro ao criar usuário:", error);
        throw error;
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries(['admin-users']);
      queryClient.invalidateQueries(['user-profiles']);
      toast.success("Usuário criado com sucesso!");
      setResetPasswordDialog({ 
        open: true, 
        password: result.password, 
        email: result.user.email 
      });
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
        admin_responsavel_id: data.admin_responsavel_id,
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

  const filteredUsers = adminUsers.filter(user =>
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.position?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Shield className="w-8 h-8 text-indigo-600" />
              Usuários Admin (Internos)
            </h1>
            <p className="text-gray-600">Gerencie consultores e aceleradores da empresa</p>
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

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Buscar</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Nome, email ou cargo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </CardContent>
        </Card>

        {filteredUsers.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <UserPlus className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Nenhum usuário encontrado
              </h3>
              <p className="text-gray-600 mb-4">Crie o primeiro usuário admin da sua empresa</p>
              <Button 
                onClick={() => {
                  setIsCreateMode(true);
                  setIsDialogOpen(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Criar Usuário
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Nome</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Perfil</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Último Acesso</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredUsers.map((user) => {
                    const userProfile = profiles.find(p => p.id === user.profile_id);
                    const daysInactive = user.last_login_at 
                      ? Math.floor((new Date() - new Date(user.last_login_at)) / (1000 * 60 * 60 * 24))
                      : null;

                    return (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-medium text-gray-900">{user.full_name}</p>
                            <p className="text-xs text-gray-500">{user.position}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm text-gray-700">{user.email}</p>
                        </td>
                        <td className="px-4 py-4">
                          {userProfile ? (
                            <Badge className="bg-purple-100 text-purple-700">
                              {userProfile.name}
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-700">
                              Sem perfil
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <Badge className={
                            user.user_status === 'ativo' ? 'bg-green-100 text-green-700' :
                            user.user_status === 'bloqueado' ? 'bg-red-100 text-red-700' :
                            user.user_status === 'ferias' ? 'bg-blue-100 text-blue-700' :
                            user.user_status === 'inativo' ? 'bg-gray-100 text-gray-700' :
                            'bg-gray-100 text-gray-700'
                          }>
                            {user.user_status === 'ativo' && '✅ Ativo'}
                            {user.user_status === 'inativo' && '⏸️ Inativo'}
                            {user.user_status === 'bloqueado' && '🔒 Bloqueado'}
                            {user.user_status === 'ferias' && '🏖️ Férias'}
                            {!user.user_status && '➖ Indefinido'}
                          </Badge>
                        </td>
                        <td className="px-4 py-4">
                          {user.last_login_at ? (
                            <div>
                              <p className="text-sm text-gray-700">
                                {format(new Date(user.last_login_at), 'dd/MM/yyyy HH:mm')}
                              </p>
                              {daysInactive > 30 && (
                                <div className="flex items-center gap-1 mt-1">
                                  <AlertTriangle className="w-3 h-3 text-amber-500" />
                                  <span className="text-xs text-amber-600">
                                    {daysInactive}d sem acesso
                                  </span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-gray-400" />
                              <span className="text-xs text-gray-400">Aguardando primeiro acesso</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedUser(user);
                                setIsCreateMode(false);
                                setIsDialogOpen(true);
                              }}
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedUser(user);
                                setAuditDialogOpen(true);
                              }}
                              title="Ver Auditoria"
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (user.id) {
                                  if (confirm(`Resetar senha de ${user.full_name}?`)) {
                                    setSelectedUser(user);
                                    resetPasswordMutation.mutate({ userId: user.id });
                                  }
                                }
                              }}
                              title="Resetar Senha"
                            >
                              <Key className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                if (confirm(`Excluir ${user.full_name}?\n\nEsta ação não pode ser desfeita.`)) {
                                  deleteUserMutation.mutate(user.id);
                                }
                              }}
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Dialog de Senha Resetada */}
        <Dialog open={resetPasswordDialog.open} onOpenChange={(open) => setResetPasswordDialog({ ...resetPasswordDialog, open })}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Senha Temporária Gerada
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800 mb-3">
                  ⚠️ Copie esta senha e compartilhe com o usuário de forma segura.
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    value={resetPasswordDialog.password}
                    readOnly
                    className="font-mono text-lg bg-white"
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
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  📧 Compartilhe com <strong>{resetPasswordDialog.email}</strong>
                </p>
              </div>
              <Button
                className="w-full"
                onClick={() => setResetPasswordDialog({ open: false, password: "", email: "" })}
              >
                Fechar
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
      </div>
    </div>
  );
}