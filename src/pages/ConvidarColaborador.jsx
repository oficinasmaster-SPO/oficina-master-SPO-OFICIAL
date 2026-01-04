import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, UserPlus, CheckCircle2, Users, Copy, Key
} from "lucide-react";
import { toast } from "sonner";


export default function ConvidarColaborador() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  const [createdUser, setCreatedUser] = useState(null);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    position: "",
    area: "",
    job_role: "outros",
    profile_id: ""
  });

  const jobRoles = [
    { value: "socio", label: "Sócio" },
    { value: "diretor", label: "Diretor" },
    { value: "supervisor_loja", label: "Supervisor de Loja" },
    { value: "gerente", label: "Gerente" },
    { value: "lider_tecnico", label: "Líder Técnico" },
    { value: "financeiro", label: "Financeiro" },
    { value: "rh", label: "Recursos Humanos" },
    { value: "tecnico", label: "Técnico" },
    { value: "funilaria_pintura", label: "Funilaria e Pintura" },
    { value: "comercial", label: "Comercial" },
    { value: "consultor_vendas", label: "Consultor de Vendas" },
    { value: "marketing", label: "Marketing" },
    { value: "estoque", label: "Estoque" },
    { value: "administrativo", label: "Administrativo" },
    { value: "motoboy", label: "Motoboy" },
    { value: "lavador", label: "Lavador" },
    { value: "acelerador", label: "Acelerador" },
    { value: "consultor", label: "Consultor" },
    { value: "outros", label: "Outros" }
  ];

  // Buscar perfis disponíveis
  const { data: profiles = [], isLoading: isLoadingProfiles } = useQuery({
    queryKey: ['user-profiles'],
    queryFn: async () => {
      const allProfiles = await base44.entities.UserProfile.list();
      // CORRIGIDO: Busca perfis 'externo' ao invés de 'cliente'
      const filtered = allProfiles.filter(p => 
        (p.type === 'externo' || p.type === 'cliente') && 
        p.status === 'ativo'
      );
      console.log("📋 Perfis carregados:", filtered);
      console.log("📋 Total de perfis no sistema:", allProfiles.length);
      return filtered;
    }
  });

  // Carregar usuário e oficina
  useEffect(() => {
    const loadUserAndWorkshop = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        // Busca oficina onde o usuário é dono (mais seguro que listar todas)
        const workshops = await base44.entities.Workshop.filter({ owner_id: currentUser.id });
        const userWorkshop = Array.isArray(workshops) && workshops.length > 0 ? workshops[0] : null;

        if (userWorkshop) {
          setWorkshop(userWorkshop);
          
          // Se tiver ID na URL, preenche o formulário
          const urlParams = new URLSearchParams(window.location.search);
          const employeeId = urlParams.get('id');
          
          if (employeeId) {
            const employee = await base44.entities.Employee.get(employeeId);
            if (employee && employee.workshop_id === userWorkshop.id) {
              fillFormWithEmployee(employee);
            }
          }
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      }
    };

    loadUserAndWorkshop();
  }, []);

  // Busca colaboradores cadastrados
  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery({
    queryKey: ['employees-list', workshop?.id],
    queryFn: async () => {
      if (!workshop?.id) return [];
      const result = await base44.entities.Employee.filter({ workshop_id: workshop.id }, '-created_date');
      return Array.isArray(result) ? result : [];
    },
    enabled: !!workshop?.id
  });



  // Mutação para criar colaborador
  const createUserMutation = useMutation({
    mutationFn: async (data) => {
      if (!workshop?.id) {
        throw new Error("Oficina não encontrada");
      }

      const response = await base44.functions.invoke('createEmployeeUser', {
        name: data.name,
        email: data.email,
        position: data.position,
        area: data.area,
        job_role: data.job_role,
        profile_id: data.profile_id,
        workshop_id: workshop.id
      });

      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['employees-list'] });
      
      setCreatedUser(data);
      toast.success("✅ Colaborador criado com sucesso!", { duration: 5000 });
      
      setFormData({ 
        name: "", 
        email: "", 
        position: "", 
        area: "", 
        job_role: "outros",
        profile_id: ""
      });
    },
    onError: (error) => {
      console.error("❌ Erro:", error);
      toast.error("Erro: " + error.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.position || !formData.area) {
      toast.error("Preencha todos os campos obrigatórios (*)");
      return;
    }
    
    if (profiles.length === 0) {
      toast.error("❌ Nenhum perfil disponível. Configure perfis antes.", { duration: 6000 });
      return;
    }
    
    if (!formData.profile_id) {
      toast.error("⚠️ Selecione um Perfil de Acesso");
      return;
    }
    
    createUserMutation.mutate(formData);
  };

  const copyCredentials = () => {
    if (createdUser) {
      const text = `Email: ${createdUser.email}\nSenha: ${createdUser.temporary_password}`;
      navigator.clipboard.writeText(text);
      toast.success("✅ Credenciais copiadas!");
    }
  };



  if (!workshop) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Carregando oficina...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <UserPlus className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Convidar Colaborador</h1>
            <p className="text-gray-600">Gere links de acesso para compartilhar com colaboradores</p>
          </div>
        </div>



        {/* Modal de credenciais */}
        {createdUser && (
          <Card className="mb-6 border-green-300 bg-green-50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-green-800">
                <CheckCircle2 className="w-6 h-6" />
                Colaborador Criado com Sucesso!
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-white rounded-lg p-4 border-2 border-green-300">
                <p className="text-sm text-gray-700 mb-3">
                  <strong>Envie estas credenciais para o colaborador:</strong>
                </p>
                <div className="bg-gray-50 p-4 rounded border mb-3 font-mono text-sm">
                  <p className="mb-1"><strong>Email:</strong> {createdUser.email}</p>
                  <p><strong>Senha:</strong> {createdUser.temporary_password}</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={copyCredentials} className="flex-1">
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar Credenciais
                  </Button>
                  <Button onClick={() => setCreatedUser(null)} variant="outline">
                    Fechar
                  </Button>
                </div>
                <p className="text-xs text-gray-600 mt-3">
                  💡 O colaborador deve trocar a senha no primeiro login
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Formulário */}

          <Card className="shadow-md border-t-4 border-t-blue-600">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                Criar Colaborador
              </CardTitle>
              <CardDescription>
                Crie o acesso e envie as credenciais para o colaborador
              </CardDescription>

              <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex gap-2 items-start">
                  <Key className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-800">
                    <strong>🔑 Senha temporária:</strong> Sistema gera senha "Oficina@2025" - colaborador troca no primeiro login
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nome do colaborador"
                    className="bg-gray-50 focus:bg-white transition-colors"
                  />
                </div>

                <div>
                  <Label htmlFor="email">E-mail *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@exemplo.com"
                    className="bg-gray-50 focus:bg-white transition-colors"
                  />
                </div>

                <div>
                  <Label htmlFor="position">Cargo *</Label>
                  <Input
                    id="position"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    placeholder="Ex: Mecânico, Vendedor"
                    className="bg-gray-50 focus:bg-white transition-colors"
                  />
                </div>

                <div>
                  <Label htmlFor="area">Área *</Label>
                  <Select value={formData.area} onValueChange={(value) => setFormData({ ...formData, area: value })}>
                    <SelectTrigger className="bg-gray-50 focus:bg-white transition-colors">
                      <SelectValue placeholder="Selecione a área" />
                    </SelectTrigger>
                    <SelectContent>
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
                  <Label htmlFor="job_role">Função do Sistema *</Label>
                  <Select value={formData.job_role} onValueChange={(value) => setFormData({ ...formData, job_role: value })}>
                    <SelectTrigger className="bg-gray-50 focus:bg-white transition-colors">
                      <SelectValue placeholder="Selecione a função" />
                    </SelectTrigger>
                    <SelectContent>
                      {jobRoles.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
                  <Label htmlFor="profile_id" className="text-blue-900 font-bold flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Perfil de Acesso * (Define Permissões)
                  </Label>
                  
                  {isLoadingProfiles ? (
                    <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Carregando perfis...
                    </div>
                  ) : profiles.length === 0 ? (
                    <div className="mt-2 bg-red-50 border border-red-200 rounded p-3">
                      <p className="text-sm text-red-800 font-medium mb-2">
                        ❌ Nenhum perfil de acesso disponível
                      </p>
                      <p className="text-xs text-red-700">
                        Entre em contato com o suporte para configurar perfis de acesso antes de convidar colaboradores.
                      </p>
                    </div>
                  ) : (
                    <>
                      <Select value={formData.profile_id} onValueChange={(value) => setFormData({ ...formData, profile_id: value })}>
                        <SelectTrigger id="profile_id" className="mt-2 bg-white">
                          <SelectValue placeholder="Selecione o perfil de acesso" />
                        </SelectTrigger>
                        <SelectContent>
                          {profiles.map((profile) => (
                            <SelectItem key={profile.id} value={profile.id}>
                              {profile.name.length > 25 
                                ? profile.name.substring(0, 25) + '...' 
                                : profile.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-blue-700 mt-2">
                        ✅ <strong>Acesso liberado automaticamente</strong> - O colaborador poderá fazer login assim que completar o cadastro
                      </p>
                    </>
                  )}
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-blue-600 hover:bg-blue-700 h-11 text-base shadow-sm"
                  disabled={createUserMutation.isPending || profiles.length === 0}
                >
                  {createUserMutation.isPending ? (
                    <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Criando Acesso...
                    </>
                  ) : (
                    <>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Criar Acesso
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Lista de Colaboradores */}
          <Card className="shadow-md h-fit">
            <CardHeader className="border-b bg-gray-50/50">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="w-5 h-5 text-gray-500" />
                Colaboradores Cadastrados
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingEmployees ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
              ) : employees.length === 0 ? (
                <div className="text-center py-12 px-4 text-gray-500">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="font-medium text-gray-900">Nenhum colaborador</p>
                  <p className="text-sm mt-1">Crie o primeiro acesso usando o formulário.</p>
                </div>
              ) : (
                <div className="divide-y max-h-[600px] overflow-y-auto">
                  {employees.map((emp) => (
                    <div key={emp.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-gray-900">{emp.full_name}</p>
                          <p className="text-sm text-gray-600">{emp.email}</p>
                        </div>
                        <Badge className={emp.user_status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                          {emp.user_status === 'ativo' ? 'Ativo' : 'Pendente'}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="bg-gray-100 px-2 py-1 rounded">{emp.position}</span>
                        <span>•</span>
                        <span>{emp.area}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}