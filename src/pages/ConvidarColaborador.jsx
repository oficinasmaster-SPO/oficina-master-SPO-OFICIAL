import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  AlertCircle,
  Briefcase,
  Building2,
  CheckCircle2,
  Clock,
  Copy,
  Eye,
  History,
  Loader2,
  Mail,
  MessageCircle,
  RefreshCw,
  Send,
  ShieldCheck,
  Timer,
  TrendingUp,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import EmailPreview from "@/components/convite/EmailPreview";
import InviteSuccessDialog from "@/components/convite/InviteSuccessDialog";
import { jobRoles } from "@/components/lib/jobRoles";
import { CANONICAL_PROFILE_JOB_ROLES } from "@/components/lib/canonicalProfiles";
import { useWorkshopContext } from "@/components/hooks/useWorkshopContext";

const INVITE_DOMAIN = "https://oficinasmastergtr.com";

const emptyForm = {
  name: "",
  email: "",
  telefone: "",
  job_role: "",
  profile_id: "",
  role: "user",
};

const formatDate = (value, fallback = "-") => {
  if (!value) return fallback;
  return new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const daysUntil = (value) => {
  if (!value) return "7 dias";
  const diff = Math.ceil((new Date(value).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return "Expirado";
  if (diff === 0) return "Hoje";
  return `${diff} dia${diff > 1 ? "s" : ""}`;
};

const getRoleLabel = (role) => jobRoles.find((item) => item.id === role || item.value === role)?.label || role || "-";

const getInviteLink = (invite) => {
  if (!invite?.invite_token) return null;
  return `${INVITE_DOMAIN}/PrimeiroAcesso?token=${invite.invite_token}${invite.profile_id ? `&profile_id=${invite.profile_id}` : ""}`;
};

const getStatusMeta = (employee, invite) => {
  const now = new Date();
  const expiresAt = invite?.expires_at ? new Date(invite.expires_at) : null;

  if (employee?.user_status === "ativo" || invite?.status === "concluido") {
    return {
      label: "Ativo",
      description: "Onboarding concluído.",
      icon: "🟢",
      badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
      tone: "text-emerald-700",
    };
  }

  if (expiresAt && expiresAt < now) {
    return {
      label: "Expirado",
      description: "Necessário reenviar convite.",
      icon: "🔴",
      badge: "bg-red-100 text-red-700 border-red-200",
      tone: "text-red-700",
    };
  }

  if (invite?.status === "acessado") {
    return {
      label: "Cadastro Iniciado",
      description: "Conta criada, aguardando conclusão.",
      icon: "🟠",
      badge: "bg-orange-100 text-orange-700 border-orange-200",
      tone: "text-orange-700",
    };
  }

  return {
    label: "Convite Enviado",
    description: "Aguardando primeiro acesso.",
    icon: "🟡",
    badge: "bg-amber-100 text-amber-700 border-amber-200",
    tone: "text-amber-700",
  };
};

const buildWhatsAppMessage = ({ name, workshopName, inviteLink }) => `Olá ${name || ""}.\n\nVocê foi convidado para acessar a plataforma da ${workshopName || "sua oficina"}.\n\nPara concluir seu cadastro:\n\n1. Clique no link abaixo.\n2. Escolha a opção "Criar Conta".\n3. Utilize este mesmo e-mail.\n4. Crie sua senha.\n\nLink:\n\n${inviteLink}\n\nImportante:\n\nEste convite expira em 7 dias.\n\nCaso tenha dúvidas, entre em contato com a administração.`;

function KpiCard({ title, value, detail, icon: Icon, className = "" }) {
  return (
    <Card className="border-0 shadow-sm ring-1 ring-slate-200 bg-white/90 rounded-2xl">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{title}</p>
            <p className="text-2xl font-bold text-slate-950 mt-1">{value}</p>
            <p className="text-xs text-slate-500 mt-1">{detail}</p>
          </div>
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${className}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function WizardStep({ number, title, description, children }) {
  return (
    <div className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-2xl bg-slate-950 text-white flex items-center justify-center font-bold text-sm">{number}</div>
        <div>
          <h3 className="font-bold text-slate-950">{title}</h3>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

export default function ConvidarColaborador() {
  const queryClient = useQueryClient();
  const { workshop: activeWorkshop } = useWorkshopContext();
  const [user, setUser] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [createdUser, setCreatedUser] = useState(null);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [duplicateEmployee, setDuplicateEmployee] = useState(null);
  const [resendEmployee, setResendEmployee] = useState(null);
  const [cancelInvite, setCancelInvite] = useState(null);
  const [historyEmployee, setHistoryEmployee] = useState(null);

  useEffect(() => {
    const loadContext = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      if (activeWorkshop) {
        setWorkshop(activeWorkshop);
        const employeeId = new URLSearchParams(window.location.search).get("id");
        if (employeeId) {
          const employee = await base44.entities.Employee.get(employeeId);
          if (employee && employee.workshop_id === activeWorkshop.id) {
            setFormData({
              name: employee.full_name || "",
              email: employee.email || "",
              telefone: employee.telefone || "",
              job_role: employee.job_role || "outros",
              profile_id: employee.profile_id || "",
              role: "user",
            });
          }
        }
      }
    };

    loadContext();
  }, [activeWorkshop]);

  const { data: profiles = [], isLoading: isLoadingProfiles } = useQuery({
    queryKey: ["user-profiles", workshop?.id],
    queryFn: async () => {
      const allProfiles = await base44.entities.UserProfile.list();
      return allProfiles.filter((profile) =>
        profile.status === "ativo" &&
        profile.job_roles?.some((role) => CANONICAL_PROFILE_JOB_ROLES.includes(role)) &&
        (!profile.workshop_id || profile.workshop_id === workshop?.id)
      );
    },
    enabled: !!workshop?.id,
  });

  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery({
    queryKey: ["employees-list", workshop?.id],
    queryFn: async () => {
      const result = await base44.entities.Employee.filter({ workshop_id: workshop.id }, "-created_date");
      return Array.isArray(result) ? result : [];
    },
    enabled: !!workshop?.id,
  });

  const { data: invites = {}, isLoading: isLoadingInvites } = useQuery({
    queryKey: ["employee-invites", workshop?.id],
    queryFn: async () => {
      const allInvites = await base44.entities.EmployeeInvite.filter({ workshop_id: workshop.id });
      const invitesMap = {};
      if (Array.isArray(allInvites)) {
        allInvites.forEach((invite) => {
          if (invite.employee_id) invitesMap[invite.employee_id] = invite;
        });
      }
      return invitesMap;
    },
    enabled: !!workshop?.id,
  });

  const selectedProfile = useMemo(() => profiles.find((profile) => profile.id === formData.profile_id), [profiles, formData.profile_id]);

  const kpis = useMemo(() => {
    const total = employees.length;
    const active = employees.filter((employee) => employee.user_status === "ativo" || invites[employee.id]?.status === "concluido").length;
    const expired = employees.filter((employee) => getStatusMeta(employee, invites[employee.id]).label === "Expirado").length;
    const pending = Math.max(total - active - expired, 0);
    const activationRate = total ? Math.round((active / total) * 100) : 0;

    return { total, active, pending, expired, activationRate };
  }, [employees, invites]);

  const createUserMutation = useMutation({
    mutationFn: async (data) => {
      if (!workshop?.id) throw new Error("Oficina não encontrada");

      const selectedJobRole = jobRoles.find((role) => role.id === data.job_role || role.value === data.job_role);
      const response = await base44.functions.invoke("createUserDirectly", {
        name: data.name,
        email: data.email,
        telefone: data.telefone,
        position: selectedJobRole?.label || "Colaborador",
        job_role: data.job_role,
        profile_id: data.profile_id,
        workshop_id: workshop.id,
        role: "user",
      });

      if (!response.data.success) {
        throw new Error(response.data.error || "Erro ao criar colaborador");
      }

      return { ...response.data, action: "created" };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["employees-list"] });
      queryClient.invalidateQueries({ queryKey: ["employee-invites"] });
      const enriched = {
        ...data,
        name: formData.name,
        telefone: formData.telefone,
        position: getRoleLabel(formData.job_role),
        employee: {
          ...(data.employee || {}),
          full_name: formData.name,
          email: data.email || formData.email,
          telefone: formData.telefone,
          position: getRoleLabel(formData.job_role),
          created_date: new Date().toISOString(),
        },
      };
      setCreatedUser(enriched);
      setFormData(emptyForm);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || error.message || "Erro ao gerar convite");
    },
  });

  const resendMutation = useMutation({
    mutationFn: async (employee) => {
      const response = await base44.functions.invoke("resendEmployeeInvite", {
        employee_id: employee.id,
        workshop_id: workshop.id,
      });

      if (!response.data.success) {
        throw new Error(response.data.error || "Erro ao reenviar convite");
      }

      return { ...response.data, employee };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["employee-invites"] });
      setResendEmployee(null);
      setDuplicateEmployee(null);
      setCreatedUser({
        ...data,
        name: data.employee?.full_name,
        telefone: data.employee?.telefone,
        position: data.employee?.position,
      });
      toast.success("Convite reenviado com sucesso");
    },
    onError: (error) => toast.error(error.message || "Erro ao reenviar convite"),
  });

  const cancelInviteMutation = useMutation({
    mutationFn: async (invite) => base44.entities.EmployeeInvite.update(invite.id, { status: "expirado" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-invites"] });
      setCancelInvite(null);
      toast.success("Convite cancelado");
    },
    onError: () => toast.error("Não foi possível cancelar o convite"),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.telefone || !formData.job_role || !formData.profile_id) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const existing = employees.find((employee) => employee.email?.toLowerCase() === formData.email.toLowerCase());
    if (existing) {
      setDuplicateEmployee(existing);
      return;
    }

    createUserMutation.mutate(formData);
  };

  const copyInviteLink = async (link) => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    toast.success("Link copiado para a área de transferência");
  };

  const sendWhatsApp = (employee, invite) => {
    const inviteLink = getInviteLink(invite);
    if (!inviteLink) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(buildWhatsAppMessage({
      name: employee.full_name,
      workshopName: workshop?.name,
      inviteLink,
    }))}`, "_blank");
  };

  const selectedInviteForHistory = historyEmployee ? invites[historyEmployee.id] : null;

  if (!workshop) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-slate-700" />
        <span className="ml-2 text-slate-600">Carregando oficina...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 py-6 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-950 text-white flex items-center justify-center shadow-xl shadow-slate-900/15">
              <UserPlus className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-950">Convidar Novo Colaborador</h1>
              <p className="text-slate-600 mt-1">Cadastre colaboradores e acompanhe todo o processo de ativação.</p>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 flex items-center gap-3 shadow-sm">
            <Building2 className="w-5 h-5 text-slate-500" />
            <div>
              <p className="text-xs text-slate-500">Oficina atual</p>
              <p className="font-semibold text-slate-900">{workshop.name}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4">
          <KpiCard title="Total Colaboradores" value={kpis.total} detail="Cadastrados na oficina" icon={Users} className="bg-blue-50 text-blue-600" />
          <KpiCard title="Ativos" value={kpis.active} detail="Onboarding concluído" icon={CheckCircle2} className="bg-emerald-50 text-emerald-600" />
          <KpiCard title="Pendentes" value={kpis.pending} detail="Aguardando ação" icon={Clock} className="bg-amber-50 text-amber-600" />
          <KpiCard title="Expirados" value={kpis.expired} detail="Precisam novo convite" icon={XCircle} className="bg-red-50 text-red-600" />
          <KpiCard title="Taxa de Ativação" value={`${kpis.activationRate}%`} detail="Colaboradores ativos" icon={TrendingUp} className="bg-purple-50 text-purple-600" />
          <KpiCard title="Tempo Médio" value="7 dias" detail="Validade do convite" icon={Timer} className="bg-slate-100 text-slate-700" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[0.9fr_1.3fr] gap-6 items-start">
          <Card className="border-0 shadow-xl shadow-slate-200/60 rounded-3xl overflow-hidden">
            <CardHeader className="bg-white border-b border-slate-100 p-6">
              <CardTitle className="flex items-center gap-2 text-xl text-slate-950">
                <Send className="w-5 h-5 text-blue-600" /> Cadastro
              </CardTitle>
              <CardDescription>Preencha os dados em etapas para gerar o convite de acesso.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                <WizardStep number="1" title="Dados Pessoais" description="Identificação e contato do colaborador.">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label>Nome *</Label>
                      <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Nome completo" className="mt-1 h-11" />
                    </div>
                    <div>
                      <Label>Email *</Label>
                      <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@empresa.com" className="mt-1 h-11" />
                    </div>
                    <div>
                      <Label>Telefone *</Label>
                      <Input value={formData.telefone} onChange={(e) => setFormData({ ...formData, telefone: e.target.value })} placeholder="(00) 00000-0000" className="mt-1 h-11" />
                    </div>
                  </div>
                </WizardStep>

                <WizardStep number="2" title="Função" description="Cargo e perfil que definem as permissões.">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Cargo *</Label>
                      <Select value={formData.job_role} onValueChange={(value) => setFormData({ ...formData, job_role: value })}>
                        <SelectTrigger className="mt-1 h-11"><SelectValue placeholder="Selecione o cargo" /></SelectTrigger>
                        <SelectContent>
                          {jobRoles.filter((role) => role.category !== "interna" && role.value !== "socio_interno").map((role) => (
                            <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Perfil de acesso *</Label>
                      <Select value={formData.profile_id} onValueChange={(value) => setFormData({ ...formData, profile_id: value })}>
                        <SelectTrigger className="mt-1 h-11"><SelectValue placeholder={isLoadingProfiles ? "Carregando..." : "Selecione o perfil"} /></SelectTrigger>
                        <SelectContent>
                          {profiles.map((profile) => (
                            <SelectItem key={profile.id} value={profile.id}>{profile.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </WizardStep>

                <WizardStep number="3" title="Convite" description="Revise o acesso antes de gerar o link.">
                  <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-slate-500">Oficina</span>
                      <span className="text-sm font-semibold text-slate-900 text-right">{workshop.name}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-slate-500">Perfil</span>
                      <span className="text-sm font-semibold text-slate-900 text-right">{selectedProfile?.name || "Selecione um perfil"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-slate-500">Validade</span>
                      <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">7 dias</Badge>
                    </div>
                    <div className="flex items-start gap-3 rounded-xl bg-blue-50 border border-blue-100 p-3">
                      <ShieldCheck className="w-4 h-4 text-blue-600 mt-0.5" />
                      <p className="text-xs text-blue-800 leading-relaxed">O colaborador usará o mesmo e-mail informado e será vinculado automaticamente a esta oficina.</p>
                    </div>
                  </div>
                </WizardStep>

                <Button type="submit" disabled={createUserMutation.isPending} className="w-full h-12 rounded-2xl bg-slate-950 hover:bg-slate-800 text-base shadow-lg shadow-slate-900/15">
                  {createUserMutation.isPending ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Send className="w-5 h-5 mr-2" />}
                  Gerar Convite
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl shadow-slate-200/60 rounded-3xl overflow-hidden">
            <CardHeader className="bg-white border-b border-slate-100 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl text-slate-950">
                    <Mail className="w-5 h-5 text-blue-600" /> Central de Convites
                  </CardTitle>
                  <CardDescription>Acompanhe envio, expiração e ativação dos colaboradores.</CardDescription>
                </div>
                <Button variant="outline" onClick={() => setShowEmailPreview(true)} className="rounded-xl">
                  <Eye className="w-4 h-4 mr-2" /> Visualizar modelo
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingEmployees || isLoadingInvites ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
                  Carregando convites...
                </div>
              ) : employees.length === 0 ? (
                <div className="text-center py-16 px-6">
                  <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="font-semibold text-slate-950">Nenhum colaborador cadastrado</p>
                  <p className="text-sm text-slate-500 mt-1">Gere o primeiro convite para iniciar o onboarding.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                        <th className="px-5 py-4 font-semibold">Nome</th>
                        <th className="px-5 py-4 font-semibold">Cargo</th>
                        <th className="px-5 py-4 font-semibold">Status</th>
                        <th className="px-5 py-4 font-semibold">Expiração</th>
                        <th className="px-5 py-4 font-semibold">Última ação</th>
                        <th className="px-5 py-4 font-semibold text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {employees.map((employee) => {
                        const invite = invites[employee.id];
                        const inviteLink = getInviteLink(invite);
                        const status = getStatusMeta(employee, invite);

                        return (
                          <tr key={employee.id} className="hover:bg-slate-50/70 transition-colors align-top">
                            <td className="px-5 py-4 min-w-[220px]">
                              <p className="font-semibold text-slate-950">{employee.full_name}</p>
                              <p className="text-xs text-slate-500 mt-1">{employee.email}</p>
                            </td>
                            <td className="px-5 py-4 min-w-[150px] text-slate-700">
                              <div className="flex items-center gap-2">
                                <Briefcase className="w-4 h-4 text-slate-400" />
                                {employee.position || getRoleLabel(employee.job_role)}
                              </div>
                            </td>
                            <td className="px-5 py-4 min-w-[190px]">
                              <Badge className={`${status.badge} border font-medium`}>{status.icon} {status.label}</Badge>
                              <p className="text-xs text-slate-500 mt-2">{status.description}</p>
                            </td>
                            <td className="px-5 py-4 min-w-[130px]">
                              <p className="font-semibold text-slate-800">{daysUntil(invite?.expires_at)}</p>
                              <p className="text-xs text-slate-500">{formatDate(invite?.expires_at, "Sem data")}</p>
                            </td>
                            <td className="px-5 py-4 min-w-[140px] text-slate-600">
                              {formatDate(invite?.last_resent_at || invite?.updated_date || employee.updated_date)}
                            </td>
                            <td className="px-5 py-4 min-w-[360px]">
                              <div className="flex flex-wrap justify-end gap-2">
                                <Button size="sm" variant="outline" disabled={!inviteLink} onClick={() => copyInviteLink(inviteLink)} className="rounded-xl">
                                  <Copy className="w-3.5 h-3.5 mr-1" /> Copiar Link
                                </Button>
                                <Button size="sm" variant="outline" disabled={!inviteLink} onClick={() => sendWhatsApp(employee, invite)} className="rounded-xl text-green-700 border-green-200 hover:bg-green-50">
                                  <MessageCircle className="w-3.5 h-3.5 mr-1" /> WhatsApp
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setResendEmployee(employee)} className="rounded-xl">
                                  <RefreshCw className="w-3.5 h-3.5 mr-1" /> Reenviar
                                </Button>
                                <Button size="sm" variant="outline" disabled={!invite} onClick={() => setCancelInvite(invite)} className="rounded-xl text-red-700 border-red-200 hover:bg-red-50">
                                  <XCircle className="w-3.5 h-3.5 mr-1" /> Cancelar
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setHistoryEmployee(employee)} className="rounded-xl">
                                  <History className="w-3.5 h-3.5 mr-1" /> Histórico
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <InviteSuccessDialog
        open={!!createdUser}
        onOpenChange={(open) => !open && setCreatedUser(null)}
        inviteData={createdUser}
        workshopName={workshop?.name}
        profileName={selectedProfile?.name || profiles.find((profile) => profile.id === createdUser?.employee?.profile_id)?.name}
        onPreview={() => setShowEmailPreview(true)}
      />

      <EmailPreview
        isOpen={showEmailPreview}
        onClose={() => setShowEmailPreview(false)}
        email={createdUser?.email || formData.email || "email@exemplo.com"}
        name={createdUser?.employee?.full_name || createdUser?.name || formData.name || "Colaborador"}
        workshopName={workshop?.name}
        inviteLink={createdUser?.invite_link || "https://oficinasmastergtr.com/PrimeiroAcesso?token=convite"}
        temporaryPassword="(Crie sua senha usando Criar Conta)"
        isPreview
      />

      <AlertDialog open={!!duplicateEmployee} onOpenChange={(open) => !open && setDuplicateEmployee(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600" /> Colaborador já cadastrado
            </AlertDialogTitle>
            <AlertDialogDescription>
              Este e-mail já pertence a um colaborador desta oficina. Você pode reenviar um novo convite de acesso sem criar um cadastro duplicado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => resendMutation.mutate(duplicateEmployee)} className="bg-slate-950 hover:bg-slate-800">
              Reenviar convite
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!resendEmployee} onOpenChange={(open) => !open && setResendEmployee(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Reenviar convite?</AlertDialogTitle>
            <AlertDialogDescription>
              Um novo link será gerado para {resendEmployee?.full_name}. O link anterior poderá deixar de funcionar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => resendMutation.mutate(resendEmployee)} className="bg-blue-600 hover:bg-blue-700">
              {resendMutation.isPending ? "Reenviando..." : "Reenviar convite"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!cancelInvite} onOpenChange={(open) => !open && setCancelInvite(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar convite?</AlertDialogTitle>
            <AlertDialogDescription>
              O convite será marcado como expirado e será necessário gerar um novo link caso o colaborador ainda precise acessar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={() => cancelInviteMutation.mutate(cancelInvite)} className="bg-red-600 hover:bg-red-700">
              Cancelar convite
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!historyEmployee} onOpenChange={(open) => !open && setHistoryEmployee(null)}>
        <DialogContent className="max-w-xl rounded-3xl">
          <DialogHeader>
            <DialogTitle>Histórico de Onboarding</DialogTitle>
            <DialogDescription>{historyEmployee?.full_name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {[
              ["Convite criado", selectedInviteForHistory?.created_date],
              ["Convite enviado", selectedInviteForHistory?.created_date],
              ["Link acessado", selectedInviteForHistory?.status === "acessado" || selectedInviteForHistory?.status === "concluido" ? selectedInviteForHistory?.updated_date : null],
              ["Cadastro iniciado", selectedInviteForHistory?.status === "acessado" || selectedInviteForHistory?.status === "concluido" ? selectedInviteForHistory?.updated_date : null],
              ["Cadastro concluído", selectedInviteForHistory?.completed_at],
              ["Conta ativada", historyEmployee?.user_status === "ativo" ? historyEmployee?.updated_date : null],
            ].map(([label, date], index) => (
              <div key={label} className="flex gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${date ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                  {date ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{label}</p>
                  <p className="text-sm text-slate-500">{date ? formatDate(date) : "Ainda não realizado"}</p>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}