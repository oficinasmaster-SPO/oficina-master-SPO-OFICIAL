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
  Clock, AlertCircle, XCircle, Users
} from "lucide-react";
import { toast } from "sonner";
import { format, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ConvidarColaborador() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    position: "",
    area: "",
    job_role: "outros",
    initial_permission: "colaborador",
    employee_id: null
  });

  const jobRoles = [
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
    { value: "outros", label: "Outros" }
  ];

  // Carregar usuário e oficina
  useEffect(() => {
    const loadUserAndWorkshop = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        // Busca oficina onde o usuário é dono (mais seguro que listar todas)
        const workshops = await base44.entities.Workshop.filter({ owner_id: currentUser.id });
        const userWorkshop = workshops[0];

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
    toast.info("Dados preenchidos! Clique em Enviar Convite.");
  };

  // Mutação para enviar convite
  const sendInviteMutation = useMutation({
    mutationFn: async (data) => {
      try {
        const response = await base44.functions.invoke('sendEmployeeInvite', {
          ...data,
          workshop_id: workshop.id,
          workshop_name: workshop.name,
          origin: window.location.origin
        });
        
        // Verifica se a resposta contém erro
        if (response.data && response.data.error) {
            throw new Error(response.data.error);
        }
        
        return response.data;
      } catch (error) {
        // Relança o erro para cair no onError
        throw new Error(error.message || "Erro ao comunicar com o servidor");
      }
    },
    onSuccess: () => {
      // Invalida a query exata para forçar atualização da lista
      queryClient.invalidateQueries({ queryKey: ['employee-invites'] });
      
      setFormData({ 
        name: "", 
        email: "", 
        position: "", 
        area: "", 
        job_role: "outros", 
        initial_permission: "colaborador", 
        employee_id: null 
      });
      toast.success("Convite enviado com sucesso! Verifique a caixa de spam.");
    },
    onError: (error) => {
      toast.error("Erro ao enviar convite: " + error.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.position || !formData.area) {
      toast.error("Preencha todos os campos obrigatórios (*)");
      return;
    }
    sendInviteMutation.mutate(formData);
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
            <p className="text-gray-600">Envie convites por e-mail para acesso ao portal</p>
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
                Novo Convite
              </CardTitle>
              <CardDescription>
                Preencha os dados para enviar o link de acesso
              </CardDescription>
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

                <div>
                  <Label htmlFor="permission">Permissão Inicial</Label>
                  <Select value={formData.initial_permission} onValueChange={(value) => setFormData({ ...formData, initial_permission: value })}>
                    <SelectTrigger className="bg-gray-50 focus:bg-white transition-colors">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="colaborador">Colaborador</SelectItem>
                      <SelectItem value="lider">Líder de Equipe</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-blue-600 hover:bg-blue-700 h-11 text-base shadow-sm"
                  disabled={sendInviteMutation.isPending}
                >
                  {sendInviteMutation.isPending ? (
                    <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Enviando...
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
                Histórico de Convites
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
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs h-8"
                          onClick={() => {
                            if (confirm('Deseja reenviar o convite para ' + invite.email + '?')) {
                                sendInviteMutation.mutate({
                                    ...invite,
                                    employee_id: invite.employee_id // Ensure ID is passed for updates
                                });
                            }
                          }}
                          disabled={sendInviteMutation.isPending}
                        >
                          <RefreshCw className="w-3 h-3 mr-2" />
                          Reenviar Convite
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