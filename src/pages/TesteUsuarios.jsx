import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Users, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function TesteUsuarios() {
  const queryClient = useQueryClient();
  const [userType, setUserType] = useState("interno");
  const [selectedProfile, setSelectedProfile] = useState("");
  const [selectedJobRole, setSelectedJobRole] = useState("");
  const [selectedArea, setSelectedArea] = useState("");
  const [selectedRole, setSelectedRole] = useState("user");
  const [selectedWorkshop, setSelectedWorkshop] = useState("");

  const { data: currentUser, isLoading: loadingUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    retry: 1
  });

  const { data: profiles = [], isLoading: loadingProfiles } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      try {
        const all = await base44.entities.UserProfile.list();
        return all.filter(p => p.status === 'ativo');
      } catch (error) {
        console.error("Erro ao carregar perfis:", error);
        return [];
      }
    },
    enabled: !!currentUser
  });

  const { data: workshops = [], isLoading: loadingWorkshops } = useQuery({
    queryKey: ['workshops'],
    queryFn: async () => {
      try {
        return await base44.entities.Workshop.list();
      } catch (error) {
        console.error("Erro ao carregar oficinas:", error);
        return [];
      }
    },
    enabled: !!currentUser
  });

  const createUserMutation = useMutation({
    mutationFn: async (data) => {
      console.log("📤 Criando usuário com dados:", data);
      
      try {
        // Criar Employee primeiro
        const employeeData = {
          full_name: data.full_name,
          email: data.email,
          telefone: data.telefone,
          position: data.position,
          job_role: data.job_role,
          area: data.area,
          is_internal: data.is_internal,
          workshop_id: data.workshop_id || null,
          hire_date: data.hire_date || new Date().toISOString().split('T')[0],
          admin_responsavel_id: currentUser?.id || null,
          user_status: 'pending',
          profile_id: data.profile_id || null,
          tipo_vinculo: data.is_internal ? 'interno' : 'cliente'
        };

        console.log("📋 Criando Employee com dados:", employeeData);
        const employee = await base44.entities.Employee.create(employeeData);
        console.log("✅ Employee criado:", employee.id);

        return { employee, success: true };
      } catch (error) {
        console.error("❌ Erro ao criar Employee:", error);
        throw error;
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries(['employees']);
      console.log("✅ Sucesso:", result);
      toast.success("✅ Usuário criado com sucesso! ID: " + result.employee.id);
    },
    onError: (error) => {
      console.error("❌ Erro na mutation:", error);
      toast.error("❌ Erro ao criar usuário: " + error.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const data = {
      full_name: formData.get('full_name'),
      email: formData.get('email'),
      telefone: formData.get('telefone'),
      position: formData.get('position'),
      job_role: selectedJobRole,
      area: selectedArea,
      role: selectedRole,
      profile_id: selectedProfile || null,
      is_internal: userType === 'interno',
      workshop_id: userType === 'colaborador' ? selectedWorkshop : null,
      hire_date: userType === 'colaborador' ? formData.get('hire_date') : null
    };

    console.log("📋 Dados do formulário:", data);

    // Validações
    if (userType === 'interno') {
      if (!selectedProfile) {
        toast.error("Perfil é obrigatório para usuário interno");
        return;
      }
      if (!selectedJobRole || !selectedArea) {
        toast.error("Job role e área são obrigatórios para usuário interno");
        return;
      }
    }

    if (userType === 'colaborador') {
      if (!selectedWorkshop) {
        toast.error("Oficina é obrigatória para colaborador");
        return;
      }
      if (!selectedJobRole) {
        toast.error("Job role é obrigatório para colaborador");
        return;
      }
      if (!formData.get('hire_date')) {
        toast.error("Data de contratação é obrigatória");
        return;
      }
    }

    createUserMutation.mutate(data);
  };

  if (loadingUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!currentUser || currentUser?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-screen">
        <Alert className="max-w-md">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>Acesso restrito a administradores</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">🧪 Teste - Criação Padronizada de Usuários</h1>
          <p className="text-gray-600 mt-1">Validação de identidade completa no cadastro</p>
        </div>
      </div>

      {/* Resumo das Regras */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-600" />
              Usuário Interno
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3 h-3 text-green-600" />
              <span>is_internal = true</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3 h-3 text-green-600" />
              <span>workshop_id = null</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3 h-3 text-green-600" />
              <span>profile_id obrigatório</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3 h-3 text-green-600" />
              <span>job_role obrigatório</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3 h-3 text-green-600" />
              <span>area obrigatório</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3 h-3 text-green-600" />
              <span>user_status = 'pending'</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-600" />
              Colaborador de Oficina
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3 h-3 text-green-600" />
              <span>is_internal = false</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3 h-3 text-green-600" />
              <span>workshop_id obrigatório</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3 h-3 text-green-600" />
              <span>position obrigatório</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3 h-3 text-green-600" />
              <span>job_role obrigatório</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3 h-3 text-green-600" />
              <span>hire_date obrigatório</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3 h-3 text-green-600" />
              <span>user_status = 'pending'</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Formulário */}
      <Card>
        <CardHeader>
          <CardTitle>Criar Novo Usuário</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={userType} onValueChange={setUserType}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="interno">
                <Shield className="w-4 h-4 mr-2" />
                Usuário Interno
              </TabsTrigger>
              <TabsTrigger value="colaborador">
                <Users className="w-4 h-4 mr-2" />
                Colaborador
              </TabsTrigger>
            </TabsList>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Dados Básicos */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold border-b pb-2">Dados Básicos</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nome Completo *</Label>
                    <Input name="full_name" required placeholder="Ex: João Silva" />
                  </div>
                  <div>
                    <Label>Email *</Label>
                    <Input name="email" type="email" required placeholder="joao@email.com" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Telefone *</Label>
                    <Input name="telefone" required placeholder="(00) 00000-0000" />
                  </div>
                  <div>
                    <Label>Cargo/Posição *</Label>
                    <Input name="position" required placeholder="Ex: Consultor Sênior" />
                  </div>
                </div>
              </div>

              {/* Identificação */}
              <TabsContent value="interno" className="space-y-4 mt-0">
                <h3 className="text-sm font-semibold border-b pb-2">Identificação (Interno)</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Perfil de Acesso *</Label>
                    <Select value={selectedProfile} onValueChange={setSelectedProfile}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o perfil" />
                      </SelectTrigger>
                      <SelectContent>
                        {loadingProfiles ? (
                          <div className="p-2 text-center text-xs">Carregando...</div>
                        ) : profiles.filter(p => p.type === 'interno').length === 0 ? (
                          <div className="p-2 text-center text-xs text-gray-500">Nenhum perfil interno</div>
                        ) : (
                          profiles.filter(p => p.type === 'interno').map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Job Role *</Label>
                    <Select value={selectedJobRole} onValueChange={setSelectedJobRole}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a função" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="consultor">Consultor</SelectItem>
                        <SelectItem value="acelerador">Acelerador</SelectItem>
                        <SelectItem value="diretor">Diretor</SelectItem>
                        <SelectItem value="gerente">Gerente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Área *</Label>
                    <Select value={selectedArea} onValueChange={setSelectedArea}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a área" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="comercial">Comercial</SelectItem>
                        <SelectItem value="administrativo">Administrativo</SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                        <SelectItem value="gerencia">Gerência</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Role no Sistema *</Label>
                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Usuário Padrão</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="colaborador" className="space-y-4 mt-0">
                <h3 className="text-sm font-semibold border-b pb-2">Identificação (Colaborador)</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Oficina *</Label>
                    <Select value={selectedWorkshop} onValueChange={setSelectedWorkshop}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a oficina" />
                      </SelectTrigger>
                      <SelectContent>
                        {loadingWorkshops ? (
                          <div className="p-2 text-center text-xs">Carregando...</div>
                        ) : workshops.length === 0 ? (
                          <div className="p-2 text-center text-xs text-gray-500">Nenhuma oficina cadastrada</div>
                        ) : (
                          workshops.map(w => (
                            <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Job Role *</Label>
                    <Select value={selectedJobRole} onValueChange={setSelectedJobRole}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a função" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tecnico">Técnico</SelectItem>
                        <SelectItem value="vendas">Vendas</SelectItem>
                        <SelectItem value="gerente">Gerente</SelectItem>
                        <SelectItem value="financeiro">Financeiro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Área</Label>
                    <Select value={selectedArea} onValueChange={setSelectedArea}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a área" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tecnico">Técnico</SelectItem>
                        <SelectItem value="vendas">Vendas</SelectItem>
                        <SelectItem value="administrativo">Administrativo</SelectItem>
                        <SelectItem value="financeiro">Financeiro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Data de Contratação *</Label>
                    <Input name="hire_date" type="date" required />
                  </div>
                </div>

                <div>
                  <Label>Role no Sistema *</Label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Usuário Padrão</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              {/* Status Automático */}
              <Alert className="bg-yellow-50 border-yellow-200">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <AlertDescription className="text-xs text-yellow-800">
                  <strong>Status automático:</strong> user_status = 'pending' | first_login_at = null | last_login_at = null | admin_responsavel_id = {currentUser.email}
                </AlertDescription>
              </Alert>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="submit" disabled={createUserMutation.isPending} className="gap-2">
                  {createUserMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    '✨ Criar Usuário'
                  )}
                </Button>
              </div>
            </form>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}