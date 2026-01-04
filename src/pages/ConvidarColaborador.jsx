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
      const filtered = allProfiles.filter(p => p.type === 'cliente' && p.status === 'ativo');
      console.log("📋 Perfis carregados:", filtered);
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

  // Mutação para enviar convite
  const sendInviteMutation = useMutation({
    mutationFn: async (data) => {
      console.log("Iniciando envio...", data);
      try {
        // Garante que workshop.id existe
        if (!workshop || !workshop.id) {
            throw new Error("ID da oficina não encontrado. Recarregue a página.");
        }

        const payload = {
          ...data,
          workshop_id: workshop?.id,
          workshop_name: workshop?.name || "Oficina"
        };
        
        console.log("Payload enviado:", payload);

        const response = await base44.functions.invoke('sendEmployeeInvite', payload);
        
        console.log("Resposta do servidor:", response);

        // Verifica status HTTP e corpo da resposta
        if (response.status !== 200) {
             const errorMsg = response.data?.error || "Erro desconhecido no servidor";
             throw new Error(errorMsg);
        }
        
        if (response.data && response.data.error) {
            throw new Error(response.data.error);
        }
        
        return response.data;
      } catch (error) {
        console.error("Erro capturado no frontend:", error);
        throw new Error(error.message || "Falha na comunicação. Verifique sua conexão.");
      }
    },
    onSuccess: (data) => {
      console.log("✅ Resposta completa do backend:", data);
      queryClient.invalidateQueries({ queryKey: ['employee-invites'] });
      
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
      
      // Salva o link gerado para exibir
      if (data.invite_url) {
        console.log("🔗 Link gerado:", data.invite_url);
        setGeneratedLink(data.invite_url);
        toast.success("Link de acesso gerado com sucesso!");
      } else {
        console.error("❌ Link não retornado pelo backend");
        toast.error("Erro: Link não foi gerado corretamente");
      }
    },
    onError: (error) => {
      toast.error("Erro ao gerar link: " + error.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    console.log("🔍 Verificando envio...", { formData, profiles });
    
    if (!formData.name || !formData.email || !formData.position || !formData.area) {
      toast.error("Preencha todos os campos obrigatórios (*)");
      return;
    }
    
    if (profiles.length === 0) {
      toast.error("❌ Nenhum perfil de acesso disponível. Entre em contato com o suporte.", { duration: 6000 });
      console.error("❌ Lista de perfis vazia");
      return;
    }
    
    if (!formData.profile_id) {
      toast.error("⚠️ Selecione um Perfil de Acesso para o colaborador");
      return;
    }
    
    setGeneratedLink(null);
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

        {/* Link Gerado */}
        {generatedLink && (
          <Card className="border-green-200 bg-green-50 shadow-lg mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg text-green-800">
                <CheckCircle2 className="w-5 h-5" />
                ✅ Link de Acesso Gerado com Sucesso!
              </CardTitle>
              <CardDescription className="text-green-700 font-medium">
                Envie este link via WhatsApp, Email ou outro meio para o colaborador
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Informações do Colaborador */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs uppercase font-semibold mb-1 text-blue-100">Link Específico Para:</p>
                    <p className="text-lg font-bold mb-1">{formData.name}</p>
                    <p className="text-sm text-blue-100 mb-3">{formData.email}</p>
                    <div className="bg-white/10 rounded px-3 py-2 text-xs">
                      <p className="font-semibold mb-1">⚠️ IMPORTANTE:</p>
                      <p>Este link é <strong>exclusivo</strong> para este colaborador e contém os dados de acesso dele. Não compartilhe com outras pessoas.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Alerta importante */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-blue-900 mb-1">📧 Email automático não disponível</p>
                    <p className="text-blue-800">
                      Por limitação da plataforma, você precisa <strong>enviar o link manualmente</strong> via WhatsApp, Email pessoal ou SMS.
                    </p>
                  </div>
                </div>
              </div>

              {/* Link */}
              <div className="bg-white p-4 rounded-lg border-2 border-green-300">
                <div className="flex items-center gap-2 mb-2">
                  <Link2 className="w-4 h-4 text-green-600" />
                  <span className="text-xs font-semibold text-gray-700 uppercase">Link de Primeiro Acesso</span>
                </div>
                <p className="text-sm text-gray-600 break-all font-mono bg-gray-50 p-3 rounded border border-gray-200">
                  {generatedLink}
                </p>
              </div>

              {/* Botões de ação */}
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  onClick={copyToClipboard}
                  className="bg-green-600 hover:bg-green-700 h-11"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copiar Link
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={() => {
                    const message = `Olá! Você foi convidado para acessar o sistema Oficinas Master.\n\nClique no link abaixo para completar seu cadastro:\n\n${generatedLink}`;
                    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
                  }}
                  variant="outline"
                  className="border-green-600 text-green-700 hover:bg-green-50 h-11"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Enviar via WhatsApp
                </Button>
              </div>

              {/* Instruções */}
              <div className="bg-green-50 border border-green-300 rounded-lg p-4">
                <p className="text-xs font-semibold text-green-900 mb-2">✅ Próximos passos:</p>
                <ol className="text-xs text-green-800 space-y-1 ml-4 list-decimal">
                  <li>Copie o link usando o botão acima</li>
                  <li>Envie para o colaborador via WhatsApp ou Email</li>
                  <li>O colaborador clica no link e completa o cadastro</li>
                  <li><strong>Acesso liberado imediatamente</strong> - ele pode fazer login na hora! ✨</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Colaboradores Cadastrados (Pendentes) */}
          {uninvitedEmployees.length > 0 && (
            <Card className="lg:col-span-2 border-orange-200 bg-orange-50 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg text-orange-800">
                  <Users className="w-5 h-5" />
                  Colaboradores Cadastrados (Sem Link de Acesso)
                </CardTitle>
                <CardDescription className="text-orange-700">
                  Estes colaboradores já estão cadastrados. Selecione um para gerar o link de acesso.
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
                Gerar Link de Acesso
              </CardTitle>
              <CardDescription>
                Preencha os dados para gerar um link de primeiro acesso para o colaborador
              </CardDescription>
              
              {/* Aviso sobre envio manual */}
              <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex gap-2 items-start">
                  <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-800">
                    <strong>Importante:</strong> Após gerar o link, você precisará enviá-lo manualmente via WhatsApp ou Email para o colaborador.
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
                              {profile.name}
                              {profile.description && (
                                <span className="text-xs text-gray-500"> - {profile.description}</span>
                              )}
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
                        Gerando Link...
                    </>
                  ) : (
                    <>
                        <Send className="w-4 h-4 mr-2" />
                        Gerar Link de Acesso
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
                Links de Acesso Gerados
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
                  <p className="font-medium text-gray-900">Nenhum link gerado</p>
                  <p className="text-sm mt-1">Preencha o formulário para gerar o primeiro link de acesso.</p>
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
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs h-8"
                          onClick={() => {
                            if (confirm('Deseja gerar um novo link de acesso para ' + invite.email + '?')) {
                                sendInviteMutation.mutate({
                                    ...invite,
                                    employee_id: invite.employee_id
                                });
                            }
                          }}
                          disabled={sendInviteMutation.isPending}
                        >
                          <RefreshCw className="w-3 h-3 mr-2" />
                          Gerar Novo Link
                        </Button>
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