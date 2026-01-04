import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, Send, UserPlus, Mail, RefreshCw, CheckCircle2, 
  Clock, AlertCircle, XCircle, Users, Link2, Copy, Check, User
} from "lucide-react";
import { toast } from "sonner";
import { format, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ConvidarColaborador() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  const [generatedLink, setGeneratedLink] = useState(null);
  const [copied, setCopied] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    position: "",
    area: "",
    job_role: "outros",
    initial_permission: "colaborador",
    employee_id: null,
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

  // Busca convites da oficina
  const { data: invites = [], isLoading: isLoadingInvites } = useQuery({
    queryKey: ['employee-invites', workshop?.id],
    queryFn: async () => {
      if (!workshop?.id) return [];
      const result = await base44.entities.EmployeeInvite.filter({ workshop_id: workshop.id }, '-created_date');
      return Array.isArray(result) ? result : [];
    },
    enabled: !!workshop?.id
  });

  // Busca colaboradores para sugerir convites
  const { data: employees = [] } = useQuery({
    queryKey: ['employees-list', workshop?.id],
    queryFn: async () => {
      if (!workshop?.id) return [];
      const result = await base44.entities.Employee.filter({ workshop_id: workshop.id });
      return Array.isArray(result) ? result : [];
    },
    enabled: !!workshop?.id
  });

  // Filtra colaboradores que ainda não têm convite
  const uninvitedEmployees = employees.filter(emp => {
    if (!emp.email) return false;
    const hasInvite = invites.some(inv => inv.email === emp.email);
    return !hasInvite;
  });

  const fillFormWithEmployee = (emp) => {
    setFormData({
      name: emp.full_name,
      email: emp.email,
      position: emp.position,
      area: emp.area || "",
      job_role: emp.job_role || "outros",
      initial_permission: "colaborador",
      employee_id: emp.id
    });
    toast.info("Dados preenchidos! Clique em Gerar Link de Acesso.");
  };

  // Mutação para convidar colaborador
  const sendInviteMutation = useMutation({
    mutationFn: async (data) => {
      console.log("🚀 Convidando colaborador...", data);
      
      if (!workshop?.id) {
        throw new Error("ID da oficina não encontrado. Recarregue a página.");
      }

      // 1. Criar/atualizar Employee
      let employeeId = data.employee_id;
      
      if (!employeeId) {
        const newEmployee = await base44.entities.Employee.create({
          workshop_id: workshop.id,
          full_name: data.name,
          email: data.email,
          position: data.position,
          area: data.area,
          job_role: data.job_role,
          profile_id: data.profile_id,
          user_status: 'ativo' // Já aprovado
        });
        employeeId = newEmployee.id;
        console.log("✅ Employee criado:", employeeId);
      } else {
        await base44.entities.Employee.update(employeeId, {
          profile_id: data.profile_id,
          user_status: 'ativo'
        });
        console.log("✅ Employee atualizado:", employeeId);
      }

      // 2. Enviar convite via backend (SendEmail com template personalizado)
      const response = await base44.functions.invoke('sendEmployeeInvite', {
        name: data.name,
        email: data.email,
        position: data.position,
        area: data.area,
        job_role: data.job_role,
        profile_id: data.profile_id,
        employee_id: employeeId,
        workshop_id: workshop.id,
        workshop_name: workshop.name
      });

      console.log("✅ Resposta backend:", response);

      return response;
    },
    onSuccess: (response) => {
      console.log("✅ Resposta do backend:", response);
      
      // Invalidar queries para atualizar lista
      queryClient.invalidateQueries({ queryKey: ['employee-invites'] });
      queryClient.invalidateQueries({ queryKey: ['employees-list'] });
      
      if (response?.data?.invite_link) {
        setGeneratedLink(response.data.invite_link);
      }
      
      // Verificar se email foi enviado com sucesso
      if (response?.email_sent) {
        toast.success("✅ Convite enviado! Email entregue com link de acesso.", { duration: 5000 });
      } else {
        toast.error("❌ Convite criado mas email falhou: " + (response?.email_error || "Erro desconhecido"), { duration: 7000 });
      }
      
      setFormData({ 
        name: "", 
        email: "", 
        position: "", 
        area: "", 
        job_role: "outros", 
        initial_permission: "colaborador", 
        employee_id: null,
        profile_id: ""
      });
    },
    onError: (error) => {
      console.error("❌ Erro ao convidar:", error);
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
      toast.error("❌ Nenhum perfil de acesso disponível. Entre em contato com o suporte.", { duration: 6000 });
      return;
    }
    
    if (!formData.profile_id) {
      toast.error("⚠️ Selecione um Perfil de Acesso para o colaborador");
      return;
    }
    
    sendInviteMutation.mutate(formData);
  };

  const copyToClipboard = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getStatusBadge = (invite) => {
    const isExpired = invite.expires_at && isPast(new Date(invite.expires_at));
    
    if (invite.status === "concluido") {
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-200"><CheckCircle2 className="w-3 h-3 mr-1" />Concluído</Badge>;
    }
    if (isExpired || invite.status === "expirado") {
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-200"><XCircle className="w-3 h-3 mr-1" />Expirado</Badge>;
    }
    if (invite.status === "acessado") {
      return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200"><Clock className="w-3 h-3 mr-1" />Acessado</Badge>;
    }
    // Verifica se email foi enviado (metadata.email_sent)
    if (invite.metadata?.email_sent === false) {
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-200"><AlertCircle className="w-3 h-3 mr-1" />Erro no Email</Badge>;
    }
    return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200"><Mail className="w-3 h-3 mr-1" />Enviado</Badge>;
  };

  const checkExistingEmployee = async (email) => {
    if (!email || !email.includes('@') || !workshop) return;
    
    try {
      // Busca colaboradores com este email na oficina atual
      const employees = await base44.entities.Employee.filter({ email: email, workshop_id: workshop.id });
      
      if (employees && employees.length > 0) {
        const emp = employees[0];
        setFormData(prev => ({
          ...prev,
          name: emp.full_name || prev.name,
          position: emp.position || prev.position,
          area: emp.area || prev.area,
          job_role: emp.job_role || prev.job_role,
          employee_id: emp.id
        }));
        toast.info("Colaborador encontrado! Dados vinculados.");
      }
    } catch (error) {
      console.log("Erro ao buscar colaborador:", error);
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



        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Colaboradores Cadastrados (Pendentes) */}
          {uninvitedEmployees.length > 0 && (
            <Card className="lg:col-span-2 border-orange-200 bg-orange-50 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg text-orange-800">
                  <Users className="w-5 h-5" />
                  Colaboradores Cadastrados (Sem Convite)
                </CardTitle>
                <CardDescription className="text-orange-700">
                  Estes colaboradores já estão cadastrados. Selecione um para enviar o convite.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {uninvitedEmployees.map(emp => (
                    <div 
                        key={emp.id} 
                        className="bg-white p-3 rounded-lg border border-orange-200 shadow-sm flex justify-between items-center hover:shadow-md transition-shadow cursor-pointer group" 
                        onClick={() => fillFormWithEmployee(emp)}
                    >
                      <div className="overflow-hidden">
                        <p className="font-medium text-gray-900 truncate" title={emp.full_name}>{emp.full_name}</p>
                        <p className="text-xs text-gray-500 truncate">{emp.position}</p>
                      </div>
                      <Button size="sm" variant="ghost" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 shrink-0 group-hover:bg-blue-50">
                        Convidar
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Formulário de Convite */}
          <Card className="shadow-md border-t-4 border-t-blue-600">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="w-5 h-5 text-blue-600" />
                Convidar Colaborador
              </CardTitle>
              <CardDescription>
                Preencha os dados e o colaborador receberá um email personalizado com link de acesso
              </CardDescription>
              
              {/* Aviso sobre email automático */}
              <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex gap-2 items-start">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-green-800">
                    <strong>✅ Email personalizado:</strong> Email enviado em nome da Oficinas Master com logo e dados da empresa.
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
                    onBlur={(e) => checkExistingEmployee(e.target.value)}
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
                  disabled={sendInviteMutation.isPending || profiles.length === 0}
                >
                  {sendInviteMutation.isPending ? (
                    <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Enviando Convite...
                    </>
                  ) : (
                    <>
                        <Send className="w-4 h-4 mr-2" />
                        Enviar Convite
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Lista de Convites */}
          <Card className="shadow-md h-fit">
            <CardHeader className="border-b bg-gray-50/50">
              <CardTitle className="flex items-center gap-2 text-base">
                <Mail className="w-5 h-5 text-gray-500" />
                Convites Enviados
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingInvites ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
              ) : invites.length === 0 ? (
                <div className="text-center py-12 px-4 text-gray-500">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="font-medium text-gray-900">Nenhum convite enviado</p>
                  <p className="text-sm mt-1">Preencha o formulário para enviar o primeiro convite.</p>
                </div>
              ) : (
                <div className="divide-y max-h-[600px] overflow-y-auto">
                  {invites.map((invite) => (
                    <div key={invite.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-gray-900">{invite.name}</p>
                          <p className="text-sm text-gray-600">{invite.email}</p>
                        </div>
                        {getStatusBadge(invite)}
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                        <span className="bg-gray-100 px-2 py-1 rounded">{invite.position}</span>
                        <span>•</span>
                        <span>{format(new Date(invite.created_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                      </div>
                      
                      {invite.status !== "concluido" && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-xs h-8"
                            onClick={() => {
                              if (confirm('Deseja reenviar convite para ' + invite.email + '?')) {
                                  console.log("🔄 Reenviando convite para:", invite.email);
                                  sendInviteMutation.mutate({
                                      name: invite.name,
                                      email: invite.email,
                                      position: invite.position,
                                      area: invite.area,
                                      job_role: invite.job_role,
                                      profile_id: invite.profile_id,
                                      employee_id: invite.employee_id,
                                      workshop_id: workshop.id,
                                      workshop_name: workshop.name
                                  });
                              }
                            }}
                            disabled={sendInviteMutation.isPending}
                          >
                            <RefreshCw className="w-3 h-3 mr-2" />
                            Reenviar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-xs h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={async () => {
                              if (confirm('Deseja excluir o convite de ' + invite.name + '?')) {
                                try {
                                  await base44.entities.EmployeeInvite.delete(invite.id);
                                  queryClient.invalidateQueries({ queryKey: ['employee-invites'] });
                                  toast.success('Convite excluído');
                                } catch (error) {
                                  toast.error('Erro ao excluir: ' + error.message);
                                }
                              }
                            }}
                          >
                            <XCircle className="w-3 h-3 mr-2" />
                            Excluir
                          </Button>
                        </div>
                      )}
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