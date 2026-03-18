import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Building2, Plus, Pencil, Trash2, Loader2, ShieldAlert } from 'lucide-react';
import { useTenant } from '@/components/contexts/TenantContext';

export default function GestaoEmpresas() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { consultingFirm, selectedFirmId } = useTenant();
  
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);

  const myFirmId = user?.data?.consulting_firm_id || selectedFirmId;

  // States for Company Form
  const [companyFormData, setCompanyFormData] = useState({
    name: '',
    owner_user_id: '',
    cnpj: '',
    description: '',
    logo_url: ''
  });

  const { data: companies, isLoading: loadingCompanies } = useQuery({
    queryKey: ['my-companies', myFirmId],
    queryFn: () => myFirmId ? base44.entities.Company.filter({ consulting_firm_id: myFirmId }) : [],
    enabled: !!myFirmId
  });

  const saveCompanyMutation = useMutation({
    mutationFn: async (data) => {
      const payload = { ...data, consulting_firm_id: myFirmId };
      if (editingCompany) {
        return await base44.entities.Company.update(editingCompany.id, payload);
      } else {
        return await base44.entities.Company.create(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-companies'] });
      toast.success(editingCompany ? "Empresa atualizada com sucesso!" : "Empresa criada com sucesso!");
      setIsCompanyModalOpen(false);
      resetCompanyForm();
    },
    onError: (err) => {
      toast.error(`Erro ao salvar: ${err.message}`);
    }
  });

  const deleteCompanyMutation = useMutation({
    mutationFn: (id) => base44.entities.Company.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-companies'] });
      toast.success("Empresa removida com sucesso!");
    },
    onError: (err) => {
      toast.error(`Erro ao remover: ${err.message}`);
    }
  });

  const handleOpenCompanyModal = (company = null) => {
    if (company) {
      setEditingCompany(company);
      setCompanyFormData({
        name: company.name || '',
        owner_user_id: company.owner_user_id || '',
        cnpj: company.cnpj || '',
        description: company.description || '',
        logo_url: company.logo_url || ''
      });
    } else {
      resetCompanyForm();
    }
    setIsCompanyModalOpen(true);
  };

  const resetCompanyForm = () => {
    setEditingCompany(null);
    setCompanyFormData({
      name: '',
      owner_user_id: '',
      cnpj: '',
      description: '',
      logo_url: ''
    });
  };

  if (!user || !myFirmId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Acesso Negado</h2>
        <p className="text-gray-600">Você não possui uma consultoria vinculada ou não tem permissão para acessar esta área.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Minhas Empresas</h1>
          <p className="text-gray-500 mt-1">Gerencie os clientes (empresas) vinculados à sua consultoria.</p>
        </div>
        <Button onClick={() => handleOpenCompanyModal()}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Empresa
        </Button>
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
                    <TableHead>Nome da Empresa</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Admin (Owner ID)</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies?.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell className="font-medium flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        {company.name}
                      </TableCell>
                      <TableCell>{company.cnpj || '-'}</TableCell>
                      <TableCell className="text-xs text-gray-500 font-mono">{company.owner_user_id}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenCompanyModal(company)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => {
                          if (window.confirm("Tem certeza que deseja remover esta empresa?")) {
                            deleteCompanyMutation.mutate(company.id);
                          }
                        }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!companies || companies.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-gray-500">
                        Nenhuma empresa encontrada.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Empresa */}
      <Dialog open={isCompanyModalOpen} onOpenChange={(open) => {
        if (!open) resetCompanyForm();
        setIsCompanyModalOpen(open);
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingCompany ? 'Editar Empresa' : 'Nova Empresa'}</DialogTitle>
            <DialogDescription>
              Preencha os dados da empresa cliente da sua consultoria.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Nome da Empresa</label>
              <Input 
                value={companyFormData.name} 
                onChange={(e) => setCompanyFormData({...companyFormData, name: e.target.value})} 
                placeholder="Ex: Grupo Auto Center Silva" 
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">ID do Usuário Dono (Owner)</label>
              <Input 
                value={companyFormData.owner_user_id} 
                onChange={(e) => setCompanyFormData({...companyFormData, owner_user_id: e.target.value})} 
                placeholder="Ex: 60d5ecb..." 
              />
              <span className="text-xs text-gray-500">O ID do usuário que administra esta empresa.</span>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">CNPJ (Opcional)</label>
              <Input 
                value={companyFormData.cnpj} 
                onChange={(e) => setCompanyFormData({...companyFormData, cnpj: e.target.value})} 
                placeholder="00.000.000/0000-00" 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCompanyModalOpen(false)}>Cancelar</Button>
            <Button 
              onClick={() => saveCompanyMutation.mutate(companyFormData)} 
              disabled={saveCompanyMutation.isPending || !companyFormData.name || !companyFormData.owner_user_id}
            >
              {saveCompanyMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}