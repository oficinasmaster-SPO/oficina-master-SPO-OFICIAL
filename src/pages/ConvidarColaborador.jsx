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
    initial_permission: "colaborador"
  });

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

  const generateToken = () => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36) + Math.random().toString(36).substring(2);
  };

  const sendInviteMutation = useMutation({
    mutationFn: async (data) => {
      const token = generateToken();
      const expiresAt = addDays(new Date(), 5);
      
      // Criar o convite
      const invite = await base44.entities.EmployeeInvite.create({
        ...data,
        workshop_id: workshop.id,
        invite_token: token,
        expires_at: expiresAt.toISOString(),
        status: "enviado"
      });

      // Enviar e-mail
      const inviteUrl = `${window.location.origin}${createPageUrl("PrimeiroAcesso")}?token=${token}`;
      
      await base44.integrations.Core.SendEmail({
        to: data.email,
        subject: `Convite para ${workshop.name} - Oficinas Master`,
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #3b82f6, #6366f1); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0;">🔧 ${workshop.name}</h1>
              <p style="color: rgba(255,255,255,0.9); margin-top: 10px;">Oficinas Master</p>
            </div>
            
            <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px;">
              <h2 style="color: #1e293b; margin-top: 0;">Olá, ${data.name}!</h2>
              
              <p style="color: #475569; line-height: 1.6;">
                Você foi convidado(a) para fazer parte da equipe da <strong>${workshop.name}</strong> 
                como <strong>${data.position}</strong> na área de <strong>${data.area}</strong>.
              </p>
              
              <p style="color: #475569; line-height: 1.6;">
                Para completar seu cadastro e começar a usar a plataforma, clique no botão abaixo:
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${inviteUrl}" style="background: linear-gradient(135deg, #3b82f6, #6366f1); color: white; padding: 15px 40px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                  Completar Cadastro
                </a>
              </div>
              
              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px; margin: 20px 0;">
                <p style="color: #92400e; margin: 0; font-size: 14px;">
                  ⚠️ <strong>Atenção:</strong> Este link expira em 5 dias e só pode ser usado uma vez.
                </p>
              </div>
              
              <p style="color: #64748b; font-size: 12px; margin-top: 30px;">
                Se você não reconhece este convite, ignore este e-mail.
              </p>
            </div>
          </div>
        `
      });

      return invite;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-invites'] });
      setFormData({ name: "", email: "", position: "", area: "", initial_permission: "colaborador" });
      toast.success("Convite enviado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao enviar convite: " + error.message);
    }
  });

  const resendInviteMutation = useMutation({
    mutationFn: async (invite) => {
      const token = generateToken();
      const expiresAt = addDays(new Date(), 5);
      
      await base44.entities.EmployeeInvite.update(invite.id, {
        invite_token: token,
        expires_at: expiresAt.toISOString(),
        status: "enviado",
        resent_count: (invite.resent_count || 0) + 1,
        last_resent_at: new Date().toISOString()
      });

      const inviteUrl = `${window.location.origin}${createPageUrl("PrimeiroAcesso")}?token=${token}`;
      
      await base44.integrations.Core.SendEmail({
        to: invite.email,
        subject: `Reenvio: Convite para ${workshop.name} - Oficinas Master`,
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #3b82f6, #6366f1); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0;">🔧 ${workshop.name}</h1>
            </div>
            
            <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px;">
              <h2 style="color: #1e293b; margin-top: 0;">Olá, ${invite.name}!</h2>
              
              <p style="color: #475569;">
                Este é um novo link de convite para completar seu cadastro.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${inviteUrl}" style="background: linear-gradient(135deg, #3b82f6, #6366f1); color: white; padding: 15px 40px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                  Completar Cadastro
                </a>
              </div>
              
              <p style="color: #92400e; font-size: 14px;">
                ⚠️ Este link expira em 5 dias.
              </p>
            </div>
          </div>
        `
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-invites'] });
      toast.success("Convite reenviado!");
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
                            {invite.position} • {invite.area}
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