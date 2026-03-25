import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Building2, Briefcase, Plus, Pencil, Trash2, Loader2, ShieldAlert, Search, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function GestaoTenants() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState("consulting-firms");
  const [isConsultingModalOpen, setIsConsultingModalOpen] = useState(false);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [editingConsultingFirm, setEditingConsultingFirm] = useState(null);
  const [editingCompany, setEditingCompany] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Delete User with Workshop Warning state
  const [userToDelete, setUserToDelete] = useState(null);
  const [userDeleteWorkshopAlert, setUserDeleteWorkshopAlert] = useState(null);
  const [isDeleteUserDialogOpen, setIsDeleteUserDialogOpen] = useState(false);

  // States for Consulting Firm Form
  const [firmFormData, setFirmFormData] = useState({
    name: '',
    owner_user_id: '',
    status: 'ativo',
    contact_email: '',
    branding_logo_url: ''
  });

  // States for Company Form (now Workshop)
  const [companyFormData, setCompanyFormData] = useState({
    name: '',
    consulting_firm_id: '',
    owner_id: '',
    cnpj: '',
    city: 'Não informada',
    state: 'ND'
  });

  // Queries
  const { data: consultingFirms, isLoading: loadingFirms } = useQuery({
    queryKey: ['admin-consulting-firms'],
    queryFn: () => base44.entities.ConsultingFirm.list(),
  });

  const { data: companies, isLoading: loadingCompanies } = useQuery({
    queryKey: ['admin-companies'],
    queryFn: () => base44.entities.Workshop.list('-created_date', 1000), // Puxa uma lista maior e recém-criadas primeiro
  });

  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: employees } = useQuery({
    queryKey: ['admin-employees'],
    queryFn: () => base44.entities.Employee.list(),
  });

  const filteredUsers = users?.filter(u => 
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const filteredCompanies = companies?.filter(company => 
    company.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    company.cnpj?.includes(searchQuery)
  ) || [];

  // Mutations: Consulting Firms
  const saveFirmMutation = useMutation({
    mutationFn: async (data) => {
      if (editingConsultingFirm) {
        return await base44.entities.ConsultingFirm.update(editingConsultingFirm.id, data);
      } else {
        return await base44.entities.ConsultingFirm.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-consulting-firms'] });
      toast.success(editingConsultingFirm ? "Consultoria atualizada com sucesso!" : "Consultoria criada com sucesso!");
      setIsConsultingModalOpen(false);
      resetFirmForm();
    },
    onError: (err) => {
      toast.error(`Erro ao salvar: ${err.message}`);
    }
  });

  const deleteFirmMutation = useMutation({
    mutationFn: (id) => base44.entities.ConsultingFirm.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-consulting-firms'] });
      toast.success("Consultoria removida com sucesso!");
    },
    onError: (err) => {
      toast.error(`Erro ao remover: ${err.message}`);
    }
  });

  // Mutations: Companies (Workshops)
  const saveCompanyMutation = useMutation({
    mutationFn: async (data) => {
      if (editingCompany) {
        return await base44.entities.Workshop.update(editingCompany.id, data);
      } else {
        return await base44.entities.Workshop.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-companies'] });
      toast.success(editingCompany ? "Oficina atualizada com sucesso!" : "Oficina criada com sucesso!");
      setIsCompanyModalOpen(false);
      resetCompanyForm();
    },
    onError: (err) => {
      toast.error(`Erro ao salvar: ${err.message}`);
    }
  });

  const deleteCompanyMutation = useMutation({
    mutationFn: async (company) => {
      // 1. Deleta a oficina
      await base44.entities.Workshop.delete(company.id);
      
      // 2. Deleta o usuário admin (owner_id) atrelado a ela
      if (company.owner_id) {
        try {
          await base44.entities.User.delete(company.owner_id);
        } catch (e) {
          console.error("Erro ao deletar o usuário dono:", e);
          // Não falhamos a mutation inteira caso o usuário já tenha sido deletado ou haja erro menor
        }
      }
      return company.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-companies'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success("Oficina e usuário administrador removidos com sucesso!");
    },
    onError: (err) => {
      toast.error(`Erro ao remover: ${err.message}`);
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async ({ userToDelete, workshopToDelete }) => {
      if (workshopToDelete) {
        try {
          await base44.entities.Workshop.delete(workshopToDelete.id);
        } catch (e) {
          console.error("Erro ao deletar workshop associada:", e);
        }
      }

      const employee = employees?.find(e => e.user_id === userToDelete.id || e.email === userToDelete.email);
      if (employee) {
        try {
          await base44.entities.Employee.delete(employee.id);
        } catch (e) {
          console.error("Erro ao deletar employee associado:", e);
        }
      }
      return await base44.entities.User.delete(userToDelete.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-companies'] });
      setIsDeleteUserDialogOpen(false);
      setUserToDelete(null);
      setUserDeleteWorkshopAlert(null);
      toast.success("Usuário removido com sucesso!");
    },
    onError: (err) => {
      toast.error(`Erro ao remover: ${err.message}`);
    }
  });

  // Handlers
  const handleOpenFirmModal = (firm = null) => {
    if (firm) {
      setEditingConsultingFirm(firm);
      setFirmFormData({
        name: firm.name || '',
        owner_user_id: firm.owner_user_id || '',
        status: firm.status || 'ativo',
        contact_email: firm.contact_email || '',
        branding_logo_url: firm.branding_logo_url || ''
      });
    } else {
      resetFirmForm();
    }
    setIsConsultingModalOpen(true);
  };

  const handleOpenCompanyModal = (company = null) => {
    if (company) {
      setEditingCompany(company);
      setCompanyFormData({
        name: company.name || '',
        consulting_firm_id: company.consulting_firm_id || '',
        owner_id: company.owner_id || '',
        cnpj: company.cnpj || '',
        city: company.city || 'Não informada',
        state: company.state || 'ND'
      });
    } else {
      resetCompanyForm();
    }
    setIsCompanyModalOpen(true);
  };

  const resetFirmForm = () => {
    setEditingConsultingFirm(null);
    setFirmFormData({
      name: '',
      owner_user_id: '',
      status: 'ativo',
      contact_email: '',
      branding_logo_url: ''
    });
  };

  const resetCompanyForm = () => {
    setEditingCompany(null);
    setCompanyFormData({
      name: '',
      consulting_firm_id: '',
      owner_id: '',
      cnpj: '',
      city: 'Não informada',
      state: 'ND'
    });
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Acesso Negado</h2>
        <p className="text-gray-600">Você não tem permissão para acessar esta área.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestão de Tenants</h1>
          <p className="text-gray-500 mt-1">Gerencie Escritórios de Consultoria e suas respectivas Empresas Clientes.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:w-[500px]">
          <TabsTrigger value="consulting-firms" className="flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            Consultorias
          </TabsTrigger>
          <TabsTrigger value="companies" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Oficinas
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Usuários
          </TabsTrigger>
        </TabsList>

        <TabsContent value="consulting-firms" className="mt-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">Escritórios de Consultoria</h2>
            <Button onClick={() => handleOpenFirmModal()}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Consultoria
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              {loadingFirms ? (
                <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Email de Contato</TableHead>
                        <TableHead>Admin (Owner ID)</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {consultingFirms?.map((firm) => (
                        <TableRow key={firm.id}>
                          <TableCell className="font-medium">{firm.name}</TableCell>
                          <TableCell>
                            <Badge variant={firm.status === 'ativo' ? 'default' : 'secondary'}>
                              {firm.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{firm.contact_email || '-'}</TableCell>
                          <TableCell className="text-xs text-gray-500 font-mono">{firm.owner_user_id}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenFirmModal(firm)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => {
                              if (window.confirm("Tem certeza que deseja remover esta consultoria?")) {
                                deleteFirmMutation.mutate(firm.id);
                              }
                            }}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!consultingFirms || consultingFirms.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-6 text-gray-500">
                            Nenhuma consultoria encontrada.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="companies" className="mt-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-gray-800">Oficinas (Clientes)</h2>
              <Badge variant="secondary">{filteredCompanies.length}</Badge>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Buscar oficinas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button onClick={() => handleOpenCompanyModal()}>
                <Plus className="w-4 h-4 mr-2" />
                Nova Oficina
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              {loadingCompanies ? (
                <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome da Oficina</TableHead>
                        <TableHead>Consultoria Vinculada</TableHead>
                        <TableHead>CNPJ</TableHead>
                        <TableHead>Admin (Owner ID)</TableHead>
                        <TableHead>Email Admin</TableHead>
                        <TableHead>Data de Criação</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCompanies.map((company) => {
                        const linkedFirm = consultingFirms?.find(f => f.id === company.consulting_firm_id);
                        const ownerUser = users?.find(u => u.id === company.owner_id);
                        return (
                          <TableRow key={company.id}>
                            <TableCell className="font-medium">{company.name}</TableCell>
                            <TableCell>{linkedFirm?.name || <span className="text-gray-400 italic">Desconhecida/Sem Vínculo</span>}</TableCell>
                            <TableCell>{company.cnpj || '-'}</TableCell>
                            <TableCell className="text-xs text-gray-500 font-mono">{company.owner_id}</TableCell>
                            <TableCell>{ownerUser?.email || '-'}</TableCell>
                            <TableCell>{company.created_date ? new Date(company.created_date).toLocaleDateString('pt-BR') : '-'}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" onClick={() => handleOpenCompanyModal(company)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => {
                                if (window.confirm("Tem certeza que deseja remover esta oficina e o usuário dono vinculado?")) {
                                  deleteCompanyMutation.mutate(company);
                                }
                              }}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {filteredCompanies.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-6 text-gray-500">
                            Nenhuma oficina encontrada.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-gray-800">Usuários Cadastrados</h2>
              <Badge variant="secondary">{filteredUsers.length}</Badge>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Buscar usuários..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              {loadingUsers ? (
                <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>CPF</TableHead>
                        <TableHead>Oficina / Empresa</TableHead>
                        <TableHead>Data de Criação</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((usr) => {
                        const employee = employees?.find(e => e.user_id === usr.id || e.email === usr.email);
                        const linkedWorkshop = companies?.find(w => w.id === employee?.workshop_id || w.owner_id === usr.id);
                        
                        return (
                          <TableRow key={usr.id}>
                            <TableCell className="font-medium">{usr.full_name || employee?.full_name || '-'}</TableCell>
                            <TableCell>{usr.email}</TableCell>
                            <TableCell>{employee?.telefone || '-'}</TableCell>
                            <TableCell>{employee?.cpf || '-'}</TableCell>
                            <TableCell>
                              {linkedWorkshop ? linkedWorkshop.name : <span className="text-gray-400 italic">Sem Oficina</span>}
                            </TableCell>
                            <TableCell>{usr.created_date ? new Date(usr.created_date).toLocaleDateString('pt-BR') : '-'}</TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-red-500 hover:text-red-700" 
                                onClick={() => {
                                  const ownedWorkshop = companies?.find(w => w.owner_id === usr.id);
                                  if (ownedWorkshop) {
                                    setUserToDelete(usr);
                                    setUserDeleteWorkshopAlert(ownedWorkshop);
                                    setIsDeleteUserDialogOpen(true);
                                  } else {
                                    if (window.confirm("Tem certeza que deseja excluir este usuário permanentemente do sistema?")) {
                                      deleteUserMutation.mutate({ userToDelete: usr, workshopToDelete: null });
                                    }
                                  }
                                }}
                                disabled={deleteUserMutation.isPending}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {filteredUsers.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-6 text-gray-500">
                            Nenhum usuário encontrado.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal Consultoria */}
      <Dialog open={isConsultingModalOpen} onOpenChange={(open) => {
        if (!open) resetFirmForm();
        setIsConsultingModalOpen(open);
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingConsultingFirm ? 'Editar Consultoria' : 'Nova Consultoria'}</DialogTitle>
            <DialogDescription>
              Preencha os dados do escritório de consultoria.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Nome</label>
              <Input 
                value={firmFormData.name} 
                onChange={(e) => setFirmFormData({...firmFormData, name: e.target.value})} 
                placeholder="Ex: Oficinas Master Aceleradora" 
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Email de Contato</label>
              <Input 
                type="email"
                value={firmFormData.contact_email} 
                onChange={(e) => setFirmFormData({...firmFormData, contact_email: e.target.value})} 
                placeholder="contato@empresa.com" 
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">ID do Usuário Dono (Owner)</label>
              <Input 
                value={firmFormData.owner_user_id} 
                onChange={(e) => setFirmFormData({...firmFormData, owner_user_id: e.target.value})} 
                placeholder="Ex: 60d5ecb..." 
              />
              <span className="text-xs text-gray-500">O ID do usuário que será o administrador principal desta consultoria.</span>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={firmFormData.status} onValueChange={(v) => setFirmFormData({...firmFormData, status: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">URL da Logo (Opcional)</label>
              <Input 
                value={firmFormData.branding_logo_url} 
                onChange={(e) => setFirmFormData({...firmFormData, branding_logo_url: e.target.value})} 
                placeholder="https://..." 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConsultingModalOpen(false)}>Cancelar</Button>
            <Button 
              onClick={() => saveFirmMutation.mutate(firmFormData)} 
              disabled={saveFirmMutation.isPending || !firmFormData.name || !firmFormData.owner_user_id}
            >
              {saveFirmMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Oficina */}
      <Dialog open={isCompanyModalOpen} onOpenChange={(open) => {
        if (!open) resetCompanyForm();
        setIsCompanyModalOpen(open);
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingCompany ? 'Editar Oficina' : 'Nova Oficina'}</DialogTitle>
            <DialogDescription>
              Preencha os dados da oficina (tenant).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Nome da Oficina</label>
              <Input 
                value={companyFormData.name} 
                onChange={(e) => setCompanyFormData({...companyFormData, name: e.target.value})} 
                placeholder="Ex: Auto Center Silva" 
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Consultoria Vinculada</label>
              <Select value={companyFormData.consulting_firm_id} onValueChange={(v) => setCompanyFormData({...companyFormData, consulting_firm_id: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a consultoria" />
                </SelectTrigger>
                <SelectContent>
                  {consultingFirms?.map(firm => (
                    <SelectItem key={firm.id} value={firm.id}>{firm.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">ID do Usuário Dono (Owner)</label>
              <Input 
                value={companyFormData.owner_id} 
                onChange={(e) => setCompanyFormData({...companyFormData, owner_id: e.target.value})} 
                placeholder="Ex: 60d5ecb..." 
              />
              <span className="text-xs text-gray-500">O ID do usuário que administra esta oficina (geralmente o empresário dono).</span>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">CNPJ (Opcional)</label>
              <Input 
                value={companyFormData.cnpj} 
                onChange={(e) => setCompanyFormData({...companyFormData, cnpj: e.target.value})} 
                placeholder="00.000.000/0000-00" 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Cidade</label>
                <Input 
                  value={companyFormData.city} 
                  onChange={(e) => setCompanyFormData({...companyFormData, city: e.target.value})} 
                  placeholder="Ex: São Paulo" 
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Estado (UF)</label>
                <Input 
                  value={companyFormData.state} 
                  onChange={(e) => setCompanyFormData({...companyFormData, state: e.target.value})} 
                  placeholder="Ex: SP" 
                  maxLength={2}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCompanyModalOpen(false)}>Cancelar</Button>
            <Button 
              onClick={() => saveCompanyMutation.mutate(companyFormData)} 
              disabled={saveCompanyMutation.isPending || !companyFormData.name || !companyFormData.consulting_firm_id || !companyFormData.owner_id}
            >
              {saveCompanyMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Exclusão de Usuário Owner Admin */}
      <Dialog open={isDeleteUserDialogOpen} onOpenChange={setIsDeleteUserDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" />
              Atenção: Usuário Administrador de Oficina
            </DialogTitle>
            <DialogDescription className="pt-4 text-base text-gray-700">
              O usuário <strong>{userToDelete?.full_name || userToDelete?.email}</strong> é dono da oficina <strong>{userDeleteWorkshopAlert?.name}</strong>.
              <br /><br />
              Se você prosseguir com a exclusão deste usuário, a oficina <strong>{userDeleteWorkshopAlert?.name}</strong> também será <strong>permanentemente excluída</strong> do sistema, incluindo todos os seus dados.
              <br /><br />
              Tem certeza que deseja continuar com a exclusão?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsDeleteUserDialogOpen(false)}>Cancelar</Button>
            <Button 
              variant="destructive"
              onClick={() => deleteUserMutation.mutate({ userToDelete, workshopToDelete: userDeleteWorkshopAlert })} 
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Sim, Excluir Usuário e Oficina
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}