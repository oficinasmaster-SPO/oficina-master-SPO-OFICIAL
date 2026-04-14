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
  Loader2, UserPlus, CheckCircle2, Users, Copy, Key, AlertCircle, Link as LinkIcon, Mail, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import EmailPreview from "@/components/convite/EmailPreview";
import WhatsAppButton from "@/components/convite/WhatsAppButton";
import StatusBadge from "@/components/convite/StatusBadge";
import { jobRoles } from "@/components/lib/jobRoles";
import { useWorkshopContext } from "@/components/hooks/useWorkshopContext";
import { useNavigate } from "react-router-dom";

export default function ConvidarColaborador() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const { workshop: activeWorkshop } = useWorkshopContext();
  const [workshop, setWorkshop] = useState(null);
  const [createdUser, setCreatedUser] = useState(null);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    telefone: "",
    job_role: "",
    profile_id: "",
    role: "user"
  });

  // Buscar oficinas do usuário (não apenas a principal)
  const { data: userWorkshops = [], isLoading: isLoadingWorkshops } = useQuery({
    queryKey: ['user-workshops'],
    queryFn: async () => {
      if (!user?.id) return [];
      const workshops = await base44.entities.Workshop.filter({ owner_id: user.id });
      return Array.isArray(workshops) ? workshops : [];
    },
    enabled: !!user?.id
  });

  // Buscar perfis disponíveis - FILTRADOS POR WORKSHOP/ADMIN
  const { data: profiles = [], isLoading: isLoadingProfiles } = useQuery({
    queryKey: ['user-profiles', workshop?.id], // Dependência do workshop
    queryFn: async () => {
      const allProfiles = await base44.entities.UserProfile.list();
      
      // Filtro de segurança: perfis devem ser do tipo adequado E pertencer ao workshop/tenant atual
      // Se UserProfile não tiver workshop_id explícito, assume-se perfis globais ou criados pelo admin
      const filtered = allProfiles.filter(p => 
        (p.type === 'externo' || p.type === 'cliente' || p.type === 'interno') && 
        p.status === 'ativo' &&
        // Verifica se o perfil pertence ao workshop do admin (Isolamento Multi-tenant)
        // Se p.workshop_id existir, deve bater. Se não existir, assume perfil de sistema (global).
        (!p.workshop_id || p.workshop_id === workshop?.id)
      );
      
      console.log("📋 Perfis filtrados por segurança:", filtered);
      return filtered;
    },
    enabled: !!workshop?.id // Só busca quando tiver oficina carregada
  });

  // Preencher formulário com dados do Employee
  const fillFormWithEmployee = (employee) => {
    setFormData({
      name: employee.full_name || "",
      email: employee.email || "",
      telefone: employee.telefone || "",
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

        const userWorkshop = activeWorkshop;

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
  }, [activeWorkshop]);

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



  // Mutação para regerar link (reenviar convite)
  const regenerateLinkMutation = useMutation({
    mutationFn: async (employeeId) => {
      if (!workshop?.id) throw new Error("Oficina não identificada");
      
      const response = await base44.functions.invoke('resendEmployeeInvite', {
        employee_id: employeeId,
        workshop_id: workshop.id
      });

      if (!response.data.success) {
        throw new Error(response.data.error || "Erro ao regerar link");
      }

      return response.data;
    },
    onSuccess: (data) => {
      toast.success("✅ Link regerado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['employee-invites'] });
      // Atualizar createdUser para mostrar o modal de sucesso com o novo link se desejado, 
      // ou apenas copiar para área de transferência? 
      // O usuário pediu "um botão de regerar link", vamos manter simples e talvez atualizar a UI.
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao regerar link");
    }
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
        
        // Reenviar convite com workshop_id
            const resendResponse = await base44.functions.invoke('resendEmployeeInvite', {
              employee_id: existing.id,
              workshop_id: data.workshop_id || workshop?.id
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
        job_role: data.job_role,
        profile_id: data.profile_id,
        workshop_id: workshop.id
      });

      const selectedJobRole = jobRoles.find(jr => jr.id === data.job_role);
      const derivedPosition = selectedJobRole ? selectedJobRole.label : "Colaborador";

      const response = await base44.functions.invoke('createUserDirectly', {
        name: data.name,
        email: data.email,
        telefone: data.telefone,
        position: derivedPosition,
        job_role: data.job_role,
        profile_id: data.profile_id,
        workshop_id: workshop.id,
        role: "user"
      });

      console.log("📦 RESPONSE STATUS:", response.status);
      console.log("📦 RESPONSE DATA:", response.data);

      if (!response.data.success) {
        throw new Error(response.data.error || "Erro ao criar colaborador");
      }

      return { ...response.data, action: 'created' };
    },
    onSuccess: (data) => {
      console.log("🎉 Sucesso ao criar colaborador");
      
      // Validar se todos os dados necessários estão presentes
      if (!data?.email || !data?.temporary_password || !data?.invite_link) {
        console.error("❌ Dados incompletos na resposta:", data);
        toast.error("Erro: Dados incompletos na resposta do servidor");
        return;
      }
      
      console.log("✅ Dados validados e prontos para exibição");
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
        job_role: "",
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
    console.log("🏢 Workshop ID (Inquilino):", workshop?.id);
    console.log("🏭 Empresa:", workshop?.name);
    console.log("🔗 Associando colaborador à empresa:", workshop?.name, `(ID: ${workshop?.id})`);
    
    if (!formData.name || !formData.email || !formData.telefone || !formData.job_role || !formData.profile_id) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    
    if (!formData.workshop_id && !workshop?.id) {
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
      const text = `Você foi convidado para acessar a plataforma.\nEmail: ${createdUser.email}\nSenha: Crie sua senha acessando a opção 'Criar conta'\nAcesse: ${createdUser.invite_link}`;
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

    // Link com profile_id (sem workshop_id - será obtido via perfil)
    const inviteDomain = `https://oficinasmastergtr.com`;
    return `${inviteDomain}/PrimeiroAcesso?token=${invite.invite_token}&profile_id=${invite.profile_id}`;
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
                  <p><strong>🔑 Senha:</strong> (Criada pelo colaborador no primeiro acesso usando Sign up)</p>
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
          inviteLink={createdUser?.invite_link || `https://[seu-domínio]/PrimeiroAcesso?token=[token-será-gerado]`}
          temporaryPassword={"(Crie sua senha via Sign up/Criar Conta)"}
          isPreview={true}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Resumo do Colaborador */}
          <Card className="shadow-lg h-fit border-0 ring-1 ring-gray-200">
            <CardHeader className="border-b bg-gray-50/50 flex flex-row items-center justify-between py-4">
              <CardTitle className="text-base flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                Resumo do Colaborador
              </CardTitle>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowEmailPreview(true)} className="text-gray-600 hover:text-blue-600">
                <Mail className="w-4 h-4 mr-2" /> Pré-visualizar Email
              </Button>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm space-y-4 mb-6">
                <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                  <span className="text-sm text-gray-500 font-medium">Nome Completo</span>
                  <span className="text-sm font-semibold text-gray-900">{formData.name || "-"}</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                  <span className="text-sm text-gray-500 font-medium">Email</span>
                  <span className="text-sm font-semibold text-gray-900">{formData.email || "-"}</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                  <span className="text-sm text-gray-500 font-medium">Telefone</span>
                  <span className="text-sm font-semibold text-gray-900">{formData.telefone || "-"}</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                  <span className="text-sm text-gray-500 font-medium">Cargo</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {jobRoles.find(r => r.id === formData.job_role || r.value === formData.job_role)?.label || formData.job_role || "-"}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-1">
                  <span className="text-sm text-gray-500 font-medium">Perfil de Acesso</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {profiles.find(p => p.id === formData.profile_id)?.name || formData.profile_id || "-"}
                  </span>
                </div>
              </div>

              <Button 
                onClick={handleSubmit} 
                disabled={createUserMutation.isPending || !formData.email} 
                className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-base shadow-md transition-all duration-200 hover:scale-[1.02]"
              >
                {createUserMutation.isPending ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Mail className="w-5 h-5 mr-2" />}
                {createdUser ? "Reenviar Convite" : "Gerar e Enviar Convite"}
              </Button>
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
                      <div key={emp.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-gray-900">
                              {emp.identificador ? `[${emp.identificador}]` : ''} {emp.full_name}
                            </p>
                            {workshop?.identificador && (
                              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-bold rounded">
                                {workshop.identificador}
                              </span>
                            )}
                          </div>
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
                            <div className="flex gap-1">
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
                                  Copiar
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                disabled={regenerateLinkMutation.isPending}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm("Deseja reenviar o email com um novo link para este colaborador? O link anterior deixará de funcionar.")) {
                                    regenerateLinkMutation.mutate(emp.id);
                                  }
                                }}
                              >
                                {regenerateLinkMutation.isPending ? (
                                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                ) : (
                                  <Mail className="w-3 h-3 mr-1" />
                                )}
                                Reenviar Email
                              </Button>
                            </div>
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
                              temporaryPassword="Oficina@2026"
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
          
          <div className="flex justify-end mt-6">
            <Button 
              onClick={() => navigate('/Colaboradores')}
              className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto h-12 px-8 text-base"
            >
              Concluir
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}