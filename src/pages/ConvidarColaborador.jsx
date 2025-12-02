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
  Clock, AlertCircle, XCircle, Users, Building2 
} from "lucide-react";
import { toast } from "sonner";
import { format, addDays, isPast } from "date-fns";
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
    initial_permission: "colaborador"
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

  const checkExistingEmployee = async (email) => {
    if (!email || !email.includes('@')) return;
    
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
          job_role: emp.job_role || prev.job_role
        }));
        toast.success("Dados do colaborador encontrados e preenchidos!");
      }
    } catch (error) {
      console.log("Erro ao buscar colaborador:", error);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const workshops = await base44.entities.Workshop.list();
      const userWorkshop = workshops.find(w => w.owner_id === currentUser.id);
      setWorkshop(userWorkshop);

      // Check for employee ID in URL to pre-fill data
      const urlParams = new URLSearchParams(window.location.search);
      const employeeId = urlParams.get('id');
      
      if (employeeId && userWorkshop) {
        const employee = await base44.entities.Employee.get(employeeId);
        if (employee && employee.workshop_id === userWorkshop.id) {
          setFormData(prev => ({
            ...prev,
            name: employee.full_name,
            email: employee.email,
            position: employee.position,
            area: employee.area,
            job_role: employee.job_role || "outros"
          }));
          toast.info("Dados do colaborador carregados!");
        }
      }
    } catch (error) {
      console.log("Error loading user:", error);
    }
  };

  const { data: invites = [], isLoading } = useQuery({
    queryKey: ['employee-invites', workshop?.id],
    queryFn: async () => {
      const result = await base44.entities.EmployeeInvite.filter({ workshop_id: workshop.id }, '-created_date');
      return Array.isArray(result) ? result : [];
    },
    enabled: !!workshop?.id
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees-list', workshop?.id],
    queryFn: async () => {
      const result = await base44.entities.Employee.filter({ workshop_id: workshop.id });
      return Array.isArray(result) ? result : [];
    },
    enabled: !!workshop?.id
  });

  // Filtra colaboradores que ainda não têm convite (baseado no email)
  const uninvitedEmployees = employees.filter(emp => {
    if (!emp.email) return false;
    // Verifica se já existe convite para este email
    const hasInvite = invites.some(inv => inv.email === emp.email);
    // Opcional: Verifica se já é o próprio usuário logado (dono) para não convidar a si mesmo se não quiser
    // const isSelf = user?.email === emp.email; 
    return !hasInvite;
  });

  const fillFormWithEmployee = (emp) => {
    setFormData({
      name: emp.full_name,
      email: emp.email,
      position: emp.position,
      area: emp.area || "",
      job_role: emp.job_role || "outros",
      initial_permission: "colaborador"
    });
    toast.info("Dados preenchidos! Clique em Enviar Convite.");
  };

  const generateToken = () => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36) + Math.random().toString(36).substring(2);
  };

  const sendInviteMutation = useMutation({
    mutationFn: async (data) => {
      // Usar backend function para garantir envio e segurança
      const response = await base44.functions.invoke('sendEmployeeInvite', {
        ...data,
        workshop_id: workshop.id,
        workshop_name: workshop.name,
        origin: window.location.origin
      });
      
      if (response.data && response.data.error) {
        throw new Error(response.data.error);
      }
      
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-invites'] });
      setFormData({ name: "", email: "", position: "", area: "", job_role: "outros", initial_permission: "colaborador" });
      toast.success("Convite enviado com sucesso! Verifique a caixa de spam.");
    },
    onError: (error) => {
      toast.error("Erro ao enviar convite: " + error.message);
    }
  });

  const resendInviteMutation = useMutation({
    mutationFn: async (invite) => {
      // Reutilizando a função de backend para reenvio, passando os mesmos dados
      const response = await base44.functions.invoke('sendEmployeeInvite', {
        name: invite.name,
        email: invite.email,
        position: invite.position,
        area: invite.area,
        job_role: invite.job_role,
        initial_permission: invite.initial_permission,
        workshop_id: workshop.id,
        workshop_name: workshop.name,
        origin: window.location.origin
      });

      if (response.data && response.data.error) {
        throw new Error(response.data.error);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-invites'] });
      toast.success("Convite reenviado! Verifique a caixa de spam.");
    },
    onError: (error) => {
      toast.error("Erro ao reenviar: " + error.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.position || !formData.area) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    sendInviteMutation.mutate(formData);
  };

  const getStatusBadge = (invite) => {
    const isExpired = invite.expires_at && isPast(new Date(invite.expires_at));
    
    if (invite.status === "concluido") {
      return <Badge className="bg-green-100 text-green-700"><CheckCircle2 className="w-3 h-3 mr-1" />Concluído</Badge>;
    }
    if (isExpired || invite.status === "expirado") {
      return <Badge className="bg-red-100 text-red-700"><XCircle className="w-3 h-3 mr-1" />Expirado</Badge>;
    }
    if (invite.status === "acessado") {
      return <Badge className="bg-blue-100 text-blue-700"><Clock className="w-3 h-3 mr-1" />Acessado</Badge>;
    }
    return <Badge className="bg-yellow-100 text-yellow-700"><Mail className="w-3 h-3 mr-1" />Enviado</Badge>;
  };

  if (!workshop) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
            <UserPlus className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Convidar Colaborador</h1>
            <p className="text-gray-600">Envie convites por e-mail para novos membros da equipe</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Colaboradores Cadastrados (Pendentes) */}
          {uninvitedEmployees.length > 0 && (
            <Card className="lg:col-span-2 border-orange-200 bg-orange-50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg text-orange-800">
                  <Users className="w-5 h-5" />
                  Colaboradores Cadastrados (Sem Acesso)
                </CardTitle>
                <CardDescription className="text-orange-700">
                  Estes colaboradores já estão no sistema mas ainda não foram convidados. Selecione um para convidar.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {uninvitedEmployees.map(emp => (
                    <div key={emp.id} className="bg-white p-3 rounded-lg border border-orange-200 shadow-sm flex justify-between items-center hover:shadow-md transition-shadow cursor-pointer" onClick={() => fillFormWithEmployee(emp)}>
                      <div className="overflow-hidden">
                        <p className="font-medium text-gray-900 truncate" title={emp.full_name}>{emp.full_name}</p>
                        <p className="text-xs text-gray-500 truncate">{emp.position}</p>
                      </div>
                      <Button size="sm" variant="ghost" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 shrink-0">
                        Selecionar
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Formulário de Convite */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="w-5 h-5 text-blue-600" />
                Novo Convite
              </CardTitle>
              <CardDescription>
                O colaborador receberá um e-mail com link para completar o cadastro
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
                  />
                </div>

                <div>
                  <Label htmlFor="position">Cargo *</Label>
                  <Input
                    id="position"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    placeholder="Ex: Mecânico, Vendedor"
                  />
                </div>

                <div>
                  <Label htmlFor="area">Área *</Label>
                  <Select value={formData.area} onValueChange={(value) => setFormData({ ...formData, area: value })}>
                    <SelectTrigger>
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
                    <SelectTrigger>
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
                    <SelectTrigger>
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
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={sendInviteMutation.isPending}
                >
                  {sendInviteMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Enviar Convite
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Lista de Convites */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                Convites Enviados
              </CardTitle>
              <CardDescription>
                Acompanhe o status dos convites
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : invites.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Mail className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Nenhum convite enviado ainda</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {invites.map((invite) => (
                    <div key={invite.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{invite.name}</p>
                          <p className="text-sm text-gray-600">{invite.email}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {invite.position} • {invite.area} • {invite.job_role ? invite.job_role.replace('_', ' ') : ''}
                          </p>
                        </div>
                        {getStatusBadge(invite)}
                      </div>
                      
                      <div className="flex items-center justify-between mt-3 pt-3 border-t">
                        <span className="text-xs text-gray-500">
                          Enviado em {format(new Date(invite.created_date), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                        
                        {invite.status !== "concluido" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => resendInviteMutation.mutate(invite)}
                            disabled={resendInviteMutation.isPending}
                          >
                            <RefreshCw className="w-4 h-4 mr-1" />
                            Reenviar
                          </Button>
                        )}
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