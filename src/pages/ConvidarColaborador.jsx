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
  Loader2, UserPlus, CheckCircle2, Users, Copy, Key, AlertCircle, Link as LinkIcon, Mail
} from "lucide-react";
import { toast } from "sonner";
import EmailPreview from "@/components/convite/EmailPreview";
import WhatsAppButton from "@/components/convite/WhatsAppButton";
import StatusBadge from "@/components/convite/StatusBadge";


export default function ConvidarColaborador() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  const [createdUser, setCreatedUser] = useState(null);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    telefone: "",
    position: "",
    area: "",
    job_role: "outros",
    profile_id: "",
    role: "user"
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

  // Preencher formulário com dados do Employee
  const fillFormWithEmployee = (employee) => {
    setFormData({
      name: employee.full_name || "",
      email: employee.email || "",
      telefone: employee.telefone || "",
      position: employee.position || "",
      area: employee.area || "",
      job_role: employee.job_role || "outros",
      profile_id: employee.profile_id || "",
      role: "user"
    });
  };

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

  // Busca convites para os colaboradores
  const { data: invites = {}, isLoading: isLoadingInvites } = useQuery({
    queryKey: ['employee-invites', workshop?.id],
    queryFn: async () => {
      if (!workshop?.id) return {};
      const allInvites = await base44.entities.EmployeeInvite.filter({ workshop_id: workshop.id });
      const invitesMap = {};
      
      if (Array.isArray(allInvites)) {
        allInvites.forEach(invite => {
          if (invite.employee_id) {
            invitesMap[invite.employee_id] = invite;
          }
        });
      }
      
      return invitesMap;
    },
    enabled: !!workshop?.id
  });



  // Mutação para criar colaborador
  const createUserMutation = useMutation({
    mutationFn: async (data) => {
      if (!workshop?.id) {
        throw new Error("Oficina não encontrada");
      }

      // Verificar se colaborador já existe
      const existingEmployees = await base44.entities.Employee.filter({
        email: data.email,
        workshop_id: workshop.id
      });

      if (existingEmployees && existingEmployees.length > 0) {
        const existing = existingEmployees[0];
        
        // Oferecer reenvio de convite
        const shouldResend = window.confirm(
          `Colaborador ${data.name} (${data.email}) já está cadastrado.\n\n` +
          `Deseja reenviar o convite de acesso?`
        );
        
        if (!shouldResend) {
          throw new Error("Operação cancelada pelo usuário");
        }
        
        // Reenviar convite
          const resendResponse = await base44.functions.invoke('resendEmployeeInvite', {
            employee_id: existing.id
          });

          if (!resendResponse.data.success) {
            throw new Error(resendResponse.data.error || "Erro ao reenviar convite");
          }

          return {
            success: true,
            message: 'Convite reenviado com sucesso!',
            email: resendResponse.data.email,
            temporary_password: resendResponse.data.temporary_password,
            invite_link: resendResponse.data.invite_link,
            employee: existing,
            action: 'resent'
          };
      }

      console.log("🚀 Criando novo colaborador:", data.email);
      console.log("📤 PAYLOAD ENVIADO:", {
        name: data.name,
        email: data.email,
        telefone: data.telefone,
        position: data.position,
        area: data.area,
        job_role: data.job_role,
        profile_id: data.profile_id,
        workshop_id: workshop.id
      });

      const response = await base44.functions.invoke('createEmployeeUser', {
        name: data.name,
        email: data.email,
        telefone: data.telefone,
        position: data.position,
        area: data.area,
        job_role: data.job_role,
        profile_id: data.profile_id,
        workshop_id: workshop.id,
        role: data.role
      });

      console.log("📦 RESPONSE STATUS:", response.status);
      console.log("📦 RESPONSE DATA:", response.data);

      if (!response.data.success) {
        throw new Error(response.data.error || "Erro ao criar colaborador");
      }

      return { ...response.data, action: 'created' };
    },
    onSuccess: (data) => {
      console.log("🎉 Sucesso ao criar colaborador:", data);
      console.log("📧 Email:", data?.email);
      console.log("🔑 Senha:", data?.temporary_password);
      console.log("🔗 Invite Link:", data?.invite_link);
      
      // Validar se todos os dados necessários estão presentes
      if (!data?.email || !data?.temporary_password || !data?.invite_link) {
        console.error("❌ Dados incompletos na resposta:", data);
        toast.error("Erro: Dados incompletos na resposta do servidor");
        return;
      }
      
      console.log("✅ Dados validados e prontos para exibição");
      console.log("📝 Setando createdUser com:", { email: data.email, password: data.temporary_password, link: data.invite_link });
      queryClient.invalidateQueries({ queryKey: ['employees-list'] });
      
      // Somente setar createdUser quando TODOS os dados estão disponíveis
      setCreatedUser(data);
      console.log("✅ createdUser setado com sucesso");

      if (data.action === 'resent') {
        toast.success("📧 Convite reenviado com sucesso!", { duration: 5000 });
      } else {
        toast.success("✅ Colaborador criado com sucesso!", { duration: 5000 });
      }
      
      // Limpar formulário
      setFormData({ 
        name: "", 
        email: "", 
        telefone: "",
        position: "", 
        area: "", 
        job_role: "outros",
        profile_id: "",
        role: "user"
      });
    },
    onError: (error) => {
      console.error("❌ Erro:", error);
      if (error.message === "Operação cancelada pelo usuário") {
        return; // Não mostrar erro se usuário cancelou
      }
      toast.error(error.response?.data?.error || error.message || "Erro ao criar colaborador");
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    console.log("📝 Dados do formulário:", formData);
    console.log("🏢 Workshop ID:", workshop?.id);
    
    if (!formData.name || !formData.email || !formData.telefone || !formData.position || !formData.area) {
      toast.error("Preencha todos os campos obrigatórios (*)");
      return;
    }
    
    if (!workshop?.id) {
      toast.error("❌ Erro: Oficina não identificada");
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
      const text = `Você foi convidado para acessar a plataforma.\nEmail: ${createdUser.email}\nSenha: ${createdUser.temporary_password}\nAcesse: ${createdUser.invite_link}`;
      navigator.clipboard.writeText(text);
      toast.success("✅ Credenciais copiadas!");
    }
  };

  const copyLink = () => {
    if (createdUser?.invite_link) {
      navigator.clipboard.writeText(createdUser.invite_link);
      toast.success("✅ Link copiado para a área de transferência!");
    }
  };

  const copyInviteLink = (link) => {
    if (link) {
      navigator.clipboard.writeText(link);
      toast.success("✅ Link copiado para a área de transferência!");
    }
  };

  const getInviteLinkForEmployee = (employeeId) => {
    const invite = invites[employeeId];
    if (!invite) return null;
    if (!invite.invite_token) return null;

    // Usar domínio publicado correto + workshop_id para rastreamento
    const inviteDomain = `https://oficinasmastergtr.com`;
    return `${inviteDomain}/PrimeiroAcesso?token=${invite.invite_token}&workshop_id=${invite.workshop_id}`;
  };

  const getInviteStatus = (employeeId) => {
    const invite = invites[employeeId];
    if (!invite) return { status: 'Sem convite', color: 'bg-gray-100', textColor: 'text-gray-700' };

    const now = new Date();
    const expiresAt = invite.expires_at ? new Date(invite.expires_at) : null;

    if (invite.status === 'concluido' || invite.status === 'acessado') {
      return { status: 'Ativado', color: 'bg-green-100', textColor: 'text-green-700' };
    }

    if (expiresAt && expiresAt < now) {
      return { status: 'Expirado', color: 'bg-red-100', textColor: 'text-red-700' };
    }

    return { status: 'Pendente', color: 'bg-yellow-100', textColor: 'text-yellow-700' };
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



        {/* Modal de credenciais - Foco em WhatsApp */}
        {createdUser && createdUser.email && createdUser.invite_link && (
          <Card className="mb-6 border-2 border-green-400 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg animate-slide-up">
            <CardHeader className="pb-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-white">
                <CheckCircle2 className="w-6 h-6" />
                ✅ Link de Acesso Gerado!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              {/* SEÇÃO PRINCIPAL - Link para WhatsApp */}
              <div className="bg-white rounded-xl p-6 border-2 border-green-300 shadow-md">
                <p className="text-lg font-bold text-green-700 mb-4 flex items-center gap-2">
                  📱 Enviar por WhatsApp
                </p>
                
                {/* Link em destaque */}
                <div className="bg-gradient-to-b from-blue-50 to-blue-100 p-6 rounded-lg border-2 border-blue-400 mb-4">
                  <p className="text-xs text-blue-700 mb-2 font-semibold">🔗 Link de Acesso (7 dias):</p>
                  <p className="text-sm font-mono bg-white p-4 rounded border-2 border-blue-300 break-all text-blue-900 mb-3">
                    {createdUser.invite_link}
                  </p>
                  <Button onClick={copyLink} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold h-11 mb-3">
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar Link
                  </Button>
                </div>

                {/* WhatsApp Button Destaque */}
                <div className="bg-gradient-to-r from-green-100 to-emerald-100 p-4 rounded-lg border-2 border-green-400">
                  <p className="text-sm font-bold text-green-800 mb-3">Mensagem formatada para WhatsApp:</p>
                  <WhatsAppButton 
                    inviteLink={createdUser.invite_link} 
                    email={createdUser.email}
                    temporaryPassword={createdUser.temporary_password}
                    workshopName={workshop.name}
                  />
                </div>

                <p className="text-xs text-green-700 mt-4 text-center italic">
                  💡 Cole o link ou a mensagem formatada direto no WhatsApp do colaborador
                </p>
              </div>

              {/* Informações Adicionais */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-xs font-semibold text-gray-700 mb-3">📋 Dados do Colaborador:</p>
                <div className="space-y-2 text-sm text-gray-600 font-mono">
                  <p><strong>📧 Email:</strong> {createdUser.email}</p>
                  <p><strong>🔑 Senha temporária:</strong> {createdUser.temporary_password}</p>
                  <p><strong>⏰ Validade do link:</strong> 7 dias</p>
                </div>
              </div>

              <Button onClick={() => setCreatedUser(null)} variant="outline" className="w-full">
                Fechar
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Email Preview Modal */}
        {workshop && (
          <EmailPreview 
            isOpen={showEmailPreview}
            onClose={() => setShowEmailPreview(false)}
            email={createdUser?.email || formData.email || "email@exemplo.com"}
            name={createdUser?.email ? (employees.find(e => e.email === createdUser.email)?.full_name || formData.name) : formData.name || "Colaborador"}
            workshopName={workshop.name}
            inviteLink={createdUser?.invite_link || formData.email ? `https://[seu-domínio]/PrimeiroAcesso?token=[token-será-gerado]` : "https://..."}
            temporaryPassword={createdUser?.temporary_password || "Oficina@2025"}
            isPreview={!createdUser}
          />
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
                  <Label htmlFor="telefone">Telefone *</Label>
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    placeholder="(00) 00000-0000"
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

                <div>
                   <Label htmlFor="role">Nível de Acesso *</Label>
                   <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                     <SelectTrigger className="bg-gray-50 focus:bg-white transition-colors">
                       <SelectValue placeholder="Selecione o nível" />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="user">Usuário (Colaborador)</SelectItem>
                       <SelectItem value="admin">Admin (Gestor)</SelectItem>
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

                <div className="space-y-2">
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
                  
                  <Button 
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowEmailPreview(true)}
                    disabled={!formData.name || !formData.email}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Pré-visualizar Email
                  </Button>
                </div>
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
                  {employees.map((emp) => {
                    const inviteLink = getInviteLinkForEmployee(emp.id);
                    
                    return (
                      <div key={emp.id} className="p-4 hover:bg-gray-50 transition-colors" onClick={() => {
                        fillFormWithEmployee(emp);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}>
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-gray-900">{emp.full_name}</p>
                            <p className="text-sm text-gray-600">{emp.email}</p>
                            {emp.telefone && <p className="text-sm text-gray-600">{emp.telefone}</p>}
                          </div>
                          <Badge className={emp.user_status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                            {emp.user_status === 'ativo' ? 'Ativo' : 'Pendente'}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="bg-gray-100 px-2 py-1 rounded">{emp.position}</span>
                            <span>•</span>
                            <span>{emp.area}</span>
                          </div>
                          <StatusBadge status={emp.user_status} expiresAt={emp.updated_date} />
                        </div>

                        {/* Link de Acesso */}
                        {/* Status e Link do Convite */}
                        <div className={`${getInviteStatus(emp.id).color} rounded p-3 mb-3`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-xs font-semibold ${getInviteStatus(emp.id).textColor}`}>
                              {getInviteStatus(emp.id).status}
                            </span>
                            {inviteLink && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyInviteLink(inviteLink);
                                }}
                              >
                                <Copy className="w-3 h-3 mr-1" />
                                Copiar Link
                              </Button>
                            )}
                          </div>
                          {inviteLink && (
                            <code className="text-xs text-gray-600 bg-white rounded px-2 py-1 block break-all font-mono mb-2">
                              {inviteLink.length > 45 ? inviteLink.substring(0, 45) + '...' : inviteLink}
                            </code>
                          )}
                          {inviteLink && (
                            <WhatsAppButton
                              inviteLink={inviteLink}
                              email={emp.email}
                              temporaryPassword="Oficina@2025"
                              workshopName={workshop.name}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}