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
import { UserPlus, Loader2, Mail, Phone, Trash2, UserX, Building2 } from "lucide-react";
import { toast } from "sonner";

export default function Usuarios() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: workshops = [] } = useQuery({
    queryKey: ['workshops'],
    queryFn: async () => {
      const result = await base44.entities.Workshop.list();
      return Array.isArray(result) ? result : [];
    }
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users-list'],
    queryFn: async () => {
      // Lista todos os usuários - admin vê todos, usuário comum só vê da sua empresa
      const allUsers = await base44.entities.User.list();
      return Array.isArray(allUsers) ? allUsers : [];
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, data }) => {
      return await base44.entities.User.update(userId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['users-list']);
      toast.success("Usuário atualizado!");
      setIsDialogOpen(false);
      setSelectedUser(null);
    },
    onError: () => toast.error("Erro ao atualizar usuário")
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId) => {
      return await base44.entities.User.delete(userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['users-list']);
      toast.success("Usuário excluído!");
    },
    onError: () => toast.error("Erro ao excluir usuário")
  });

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;

    const formData = new FormData(e.target);
    const workshopId = formData.get('workshop_id');
    const planoSelecionado = formData.get('plano');
    
    const data = {
      workshop_id: workshopId,
      position: formData.get('position'),
      job_role: formData.get('job_role'),
      area: formData.get('area'),
      telefone: formData.get('telefone'),
      user_status: formData.get('user_status')
    };

    // Atualizar usuário
    await updateUserMutation.mutateAsync({ userId: selectedUser.id, data });

    // Se admin e tem workshop, atualizar plano do workshop
    if (currentUser?.role === 'admin' && workshopId && planoSelecionado) {
      try {
        await base44.entities.Workshop.update(workshopId, {
          planoAtual: planoSelecionado
        });
        queryClient.invalidateQueries(['workshops']);
        toast.success("Plano atualizado!");
      } catch (error) {
        toast.error("Erro ao atualizar plano");
      }
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Se não for admin, mostra só da mesma empresa
    if (currentUser?.role !== 'admin' && currentUser?.workshop_id) {
      return matchesSearch && user.workshop_id === currentUser.workshop_id;
    }
    
    return matchesSearch;
  });

  const getWorkshopName = (workshopId) => {
    const workshop = workshops.find(w => w.id === workshopId);
    return workshop?.name || "Sem empresa";
  };

  const getWorkshopPlan = (workshopId) => {
    const workshop = workshops.find(w => w.id === workshopId);
    return workshop?.planoAtual || "FREE";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Usuários do Sistema</h1>
            <p className="text-gray-600">Gerencie todos os usuários e suas empresas</p>
          </div>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <Input
              placeholder="Buscar por nome ou e-mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </CardContent>
        </Card>

        {filteredUsers.length === 0 ? (
          <Card className="shadow-lg">
            <CardContent className="p-12 text-center">
              <UserPlus className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Nenhum usuário encontrado
              </h3>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredUsers.map((user) => (
              <Card key={user.id} className="shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl">{user.full_name || "Sem nome"}</CardTitle>
                      <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {user.email}
                      </p>
                      {user.telefone && (
                        <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {user.telefone}
                        </p>
                      )}
                    </div>
                    <Badge className={user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}>
                      {user.role === 'admin' ? 'Admin' : 'Usuário'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <Building2 className="w-4 h-4 text-gray-500" />
                        <span className="font-medium">{getWorkshopName(user.workshop_id)}</span>
                      </div>
                      {user.workshop_id && (
                        <div className="ml-6 flex items-center gap-2">
                          <span className="text-gray-600">Plano:</span>
                          <Badge className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                            {getWorkshopPlan(user.workshop_id)}
                          </Badge>
                        </div>
                      )}
                    </div>
                    
                    {user.position && (
                      <div className="text-sm">
                        <span className="text-gray-600">Cargo: </span>
                        <span className="font-medium">{user.position}</span>
                      </div>
                    )}

                    {user.area && (
                      <Badge variant="outline" className="capitalize">
                        {user.area}
                      </Badge>
                    )}

                    <Badge className={
                      user.user_status === 'ativo' ? 'bg-green-100 text-green-700' :
                      user.user_status === 'ferias' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }>
                      {user.user_status || 'ativo'}
                    </Badge>

                    <div className="flex gap-2 mt-4 pt-3 border-t">
                      <Button
                        onClick={() => {
                          setSelectedUser(user);
                          setIsDialogOpen(true);
                        }}
                        className="flex-1"
                        size="sm"
                        variant="outline"
                      >
                        Editar
                      </Button>
                      {user.id !== currentUser?.id && (
                        <>
                          <Button
                            onClick={async () => {
                              if (confirm(`${user.user_status === 'ativo' ? 'Inativar' : 'Ativar'} ${user.full_name}?`)) {
                                updateUserMutation.mutate({
                                  userId: user.id,
                                  data: { user_status: user.user_status === 'ativo' ? 'inativo' : 'ativo' }
                                });
                              }
                            }}
                            size="sm"
                            variant="outline"
                          >
                            <UserX className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={async () => {
                              if (confirm(`EXCLUIR ${user.full_name}? Ação irreversível!`)) {
                                deleteUserMutation.mutate(user.id);
                              }
                            }}
                            size="sm"
                            variant="destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar Usuário: {selectedUser?.full_name}</DialogTitle>
            </DialogHeader>
            {selectedUser && (
              <form onSubmit={handleSaveUser} className="space-y-4">
                <div>
                  <Label>Empresa (opcional)</Label>
                  <Select name="workshop_id" defaultValue={selectedUser.workshop_id || ""}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a empresa" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Sem empresa</SelectItem>
                      {workshops.map(w => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name} - {w.planoAtual || "FREE"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Cargo (opcional)</Label>
                  <Input name="position" defaultValue={selectedUser.position || ""} placeholder="Ex: Gerente de Operações" />
                </div>

                <div>
                  <Label>Função (opcional)</Label>
                  <Select name="job_role" defaultValue={selectedUser.job_role || ""}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma função" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Nenhuma</SelectItem>
                      <SelectItem value="diretor">Diretor</SelectItem>
                      <SelectItem value="gerente">Gerente</SelectItem>
                      <SelectItem value="supervisor_loja">Supervisor</SelectItem>
                      <SelectItem value="tecnico">Técnico</SelectItem>
                      <SelectItem value="comercial">Comercial</SelectItem>
                      <SelectItem value="financeiro">Financeiro</SelectItem>
                      <SelectItem value="rh">RH</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Área (opcional)</Label>
                  <Select name="area" defaultValue={selectedUser.area || ""}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma área" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Nenhuma</SelectItem>
                      <SelectItem value="vendas">Vendas</SelectItem>
                      <SelectItem value="comercial">Comercial</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="tecnico">Técnico</SelectItem>
                      <SelectItem value="administrativo">Administrativo</SelectItem>
                      <SelectItem value="financeiro">Financeiro</SelectItem>
                      <SelectItem value="gerencia">Gerência</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Telefone (opcional)</Label>
                  <Input name="telefone" defaultValue={selectedUser.telefone || ""} placeholder="(00) 00000-0000" />
                </div>

                <div>
                  <Label>Status</Label>
                  <Select name="user_status" defaultValue={selectedUser.user_status || "ativo"}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="inativo">Inativo</SelectItem>
                      <SelectItem value="ferias">Férias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {currentUser?.role === 'admin' && selectedUser.workshop_id && (
                  <div className="border-t pt-4">
                    <Label className="text-lg font-semibold text-gray-900">Plano da Oficina</Label>
                    <p className="text-sm text-gray-600 mb-2">Altere o plano da oficina deste usuário</p>
                    <Select name="plano" defaultValue={getWorkshopPlan(selectedUser.workshop_id)}>
                      <SelectTrigger className="border-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FREE">🆓 FREE - Grátis</SelectItem>
                        <SelectItem value="START">🚀 START - Inicial</SelectItem>
                        <SelectItem value="BRONZE">🥉 BRONZE</SelectItem>
                        <SelectItem value="PRATA">🥈 PRATA</SelectItem>
                        <SelectItem value="GOLD">🥇 GOLD</SelectItem>
                        <SelectItem value="IOM">💎 IOM - Premium</SelectItem>
                        <SelectItem value="MILLIONS">👑 MILLIONS - Elite</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={updateUserMutation.isPending}>
                    {updateUserMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}