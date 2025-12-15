import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Loader2, Trash2, Edit, Key, Copy, CheckCircle, Shield } from "lucide-react";
import { toast } from "sonner";

export default function UsuariosAdmin() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [resetPasswordDialog, setResetPasswordDialog] = useState({ open: false, password: "", email: "" });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: adminUsers = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const employees = await base44.entities.Employee.list();
      // Filtrar apenas internos (consultores/aceleradores)
      return employees.filter(e => 
        e.tipo_vinculo === 'interno' || 
        e.job_role === 'acelerador' || 
        e.job_role === 'consultor'
      );
    }
  });

  const createUserMutation = useMutation({
    mutationFn: async (data) => {
      // 1. Criar Employee interno
      const employee = await base44.entities.Employee.create({
        full_name: data.full_name,
        email: data.email,
        telefone: data.telefone,
        position: data.position,
        job_role: data.job_role,
        tipo_vinculo: 'interno',
        status: 'ativo'
      });

      // 2. Criar User via função backend
      const tempPassword = await base44.functions.invoke('createUserForEmployee', {
        employee_id: employee.id,
        email: data.email,
        full_name: data.full_name
      });

      return { employee, password: tempPassword.data };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries(['admin-users']);
      toast.success("Usuário criado com sucesso!");
      setResetPasswordDialog({ 
        open: true, 
        password: result.password, 
        email: result.employee.email 
      });
      setIsDialogOpen(false);
      setIsCreateMode(false);
    },
    onError: (error) => {
      console.error("Erro ao criar usuário:", error);
      toast.error("Erro ao criar usuário: " + error.message);
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ employeeId, data }) => {
      return await base44.entities.Employee.update(employeeId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-users']);
      toast.success("Usuário atualizado!");
      setIsDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error) => toast.error("Erro ao atualizar: " + error.message)
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (employeeId) => {
      return await base44.entities.Employee.delete(employeeId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-users']);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    const data = {
      full_name: formData.get('full_name'),
      email: formData.get('email'),
      telefone: formData.get('telefone'),
      position: formData.get('position'),
      job_role: formData.get('job_role')
    };

    if (isCreateMode) {
      createUserMutation.mutate(data);
    } else if (selectedUser) {
      updateUserMutation.mutate({ employeeId: selectedUser.id, data });
    }
  };

  const filteredUsers = adminUsers.filter(user =>
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.position?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Cargo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Função</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <p className="font-medium text-gray-900">{user.full_name}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-gray-700">{user.email}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-gray-700">{user.position}</p>
                      </td>
                      <td className="px-4 py-4">
                        <Badge className="bg-indigo-100 text-indigo-700">
                          {user.job_role}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        <Badge className={
                          user.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }>
                          {user.status}
                        </Badge>
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
                              if (user.user_id) {
                                if (confirm(`Resetar senha de ${user.full_name}?`)) {
                                  setSelectedUser(user);
                                  resetPasswordMutation.mutate({ userId: user.user_id });
                                }
                              } else {
                                toast.error("Usuário não possui conta ativa");
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
                              if (confirm(`Excluir ${user.full_name}?`)) {
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
                  ))}
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
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {isCreateMode ? 'Criar Novo Usuário Admin' : `Editar: ${selectedUser?.full_name}`}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Nome Completo *</Label>
                <Input 
                  name="full_name" 
                  defaultValue={selectedUser?.full_name || ""} 
                  placeholder="Ex: João Silva"
                  required 
                />
              </div>

              <div>
                <Label>Email *</Label>
                <Input 
                  name="email" 
                  type="email"
                  defaultValue={selectedUser?.email || ""} 
                  placeholder="joao@oficinasmaster.com.br"
                  disabled={!isCreateMode}
                  required 
                />
                {!isCreateMode && (
                  <p className="text-xs text-gray-500 mt-1">Email não pode ser alterado</p>
                )}
              </div>

              <div>
                <Label>Telefone *</Label>
                <Input 
                  name="telefone" 
                  defaultValue={selectedUser?.telefone || ""} 
                  placeholder="(00) 00000-0000"
                  required 
                />
              </div>

              <div>
                <Label>Cargo *</Label>
                <Input 
                  name="position" 
                  defaultValue={selectedUser?.position || ""} 
                  placeholder="Ex: Consultor Sênior"
                  required 
                />
              </div>

              <div>
                <Label>Função *</Label>
                <Select name="job_role" defaultValue={selectedUser?.job_role || "consultor"} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a função" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="acelerador">Acelerador</SelectItem>
                    <SelectItem value="consultor">Consultor</SelectItem>
                    <SelectItem value="diretor">Diretor</SelectItem>
                    <SelectItem value="gerente">Gerente</SelectItem>
                    <SelectItem value="administrativo">Administrativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsDialogOpen(false);
                    setIsCreateMode(false);
                    setSelectedUser(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createUserMutation.isPending || updateUserMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {(createUserMutation.isPending || updateUserMutation.isPending) ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    isCreateMode ? 'Criar Usuário' : 'Salvar Alterações'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}