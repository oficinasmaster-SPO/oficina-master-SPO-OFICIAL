import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { UserPlus, ArrowLeft, Copy, Check, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function CadastroUsuarioDireto() {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [createdUser, setCreatedUser] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    telefone: "",
    position: "",
    area: "tecnico",
    job_role: "outros",
    role: "user",
    data_nascimento: "",
    workshop_id: "",
    profile_id: ""
  });

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: workshops = [] } = useQuery({
    queryKey: ['workshops-list'],
    queryFn: () => base44.entities.Workshop.list(),
    enabled: !!user
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-list'],
    queryFn: () => base44.entities.UserProfile.list(),
    enabled: !!user
  });

  const createUserMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('createUserDirectly', data);
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Usuário criado com sucesso!');
        setCreatedUser(data);
        queryClient.invalidateQueries({ queryKey: ['admin-users'] });
        queryClient.invalidateQueries({ queryKey: ['employees'] });
      } else {
        toast.error(data.error || 'Erro ao criar usuário');
      }
    },
    onError: (error) => {
      toast.error('Erro ao criar usuário: ' + error.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.workshop_id) {
      toast.error('Preencha nome, email e oficina');
      return;
    }

    createUserMutation.mutate(formData);
  };

  const handleCopyLink = () => {
    if (createdUser?.invite_link) {
      navigator.clipboard.writeText(createdUser.invite_link);
      setCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSendWhatsApp = () => {
    if (createdUser?.invite_link && formData.telefone) {
      const phone = formData.telefone.replace(/\D/g, '');
      const message = encodeURIComponent(
        `Olá ${formData.name}!\n\nSeu acesso à plataforma Oficinas Master foi criado.\n\nClique no link abaixo para definir sua senha:\n${createdUser.invite_link}`
      );
      window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
    }
  };

  if (createdUser) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-700">✅ Usuário Criado com Sucesso!</CardTitle>
            <CardDescription>O usuário foi criado diretamente no sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm text-gray-600">Email</Label>
              <p className="font-medium">{createdUser.email}</p>
            </div>

            <div>
              <Label className="text-sm text-gray-600">Profile ID</Label>
              <p className="font-medium">{createdUser.profile_id}</p>
            </div>

            <div>
              <Label className="text-sm text-gray-600">Link de Primeiro Acesso</Label>
              <div className="flex gap-2 mt-1">
                <Input 
                  value={createdUser.invite_link} 
                  readOnly 
                  className="flex-1"
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={handleCopyLink}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {formData.telefone && (
              <Button 
                onClick={handleSendWhatsApp}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <Send className="w-4 h-4 mr-2" />
                Enviar por WhatsApp
              </Button>
            )}

            <Button 
              onClick={() => {
                setCreatedUser(null);
                setFormData({
                  name: "",
                  email: "",
                  telefone: "",
                  position: "",
                  area: "tecnico",
                  job_role: "outros",
                  role: "user",
                  data_nascimento: "",
                  workshop_id: "",
                  profile_id: ""
                });
              }}
              variant="outline"
              className="w-full"
            >
              Criar Outro Usuário
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link to={createPageUrl("UsuariosAdmin")}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Cadastro Direto de Usuário
          </CardTitle>
          <CardDescription>
            Cria o registro diretamente na entidade User, sem passar pela tela de convite
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Nome Completo *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Nome do usuário"
                  required
                />
              </div>

              <div>
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="email@exemplo.com"
                  required
                />
              </div>

              <div>
                <Label>Telefone (WhatsApp)</Label>
                <Input
                  value={formData.telefone}
                  onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                  placeholder="(11) 99999-9999"
                />
              </div>

              <div>
                <Label>Data de Nascimento</Label>
                <Input
                  type="date"
                  value={formData.data_nascimento}
                  onChange={(e) => setFormData({...formData, data_nascimento: e.target.value})}
                />
              </div>

              <div>
                <Label>Oficina *</Label>
                <Select
                  value={formData.workshop_id}
                  onValueChange={(value) => setFormData({...formData, workshop_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a oficina" />
                  </SelectTrigger>
                  <SelectContent>
                    {workshops.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Cargo</Label>
                <Input
                  value={formData.position}
                  onChange={(e) => setFormData({...formData, position: e.target.value})}
                  placeholder="Ex: Mecânico, Gerente"
                />
              </div>

              <div>
                <Label>Área</Label>
                <Select
                  value={formData.area}
                  onValueChange={(value) => setFormData({...formData, area: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
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
                <Label>Função</Label>
                <Select
                  value={formData.job_role}
                  onValueChange={(value) => setFormData({...formData, job_role: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="socio">Sócio</SelectItem>
                    <SelectItem value="diretor">Diretor</SelectItem>
                    <SelectItem value="supervisor_loja">Supervisor de Loja</SelectItem>
                    <SelectItem value="gerente">Gerente</SelectItem>
                    <SelectItem value="lider_tecnico">Líder Técnico</SelectItem>
                    <SelectItem value="financeiro">Financeiro</SelectItem>
                    <SelectItem value="rh">RH</SelectItem>
                    <SelectItem value="tecnico">Técnico</SelectItem>
                    <SelectItem value="funilaria_pintura">Funilaria/Pintura</SelectItem>
                    <SelectItem value="comercial">Comercial</SelectItem>
                    <SelectItem value="consultor_vendas">Consultor de Vendas</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="estoque">Estoque</SelectItem>
                    <SelectItem value="administrativo">Administrativo</SelectItem>
                    <SelectItem value="motoboy">Motoboy</SelectItem>
                    <SelectItem value="lavador">Lavador</SelectItem>
                    <SelectItem value="acelerador">Acelerador</SelectItem>
                    <SelectItem value="consultor">Consultor</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Perfil de Acesso (Opcional)</Label>
                <Select
                  value={formData.profile_id}
                  onValueChange={(value) => setFormData({...formData, profile_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Gerar automaticamente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Gerar automaticamente</SelectItem>
                    {profiles.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Role no Sistema *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({...formData, role: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User (usuário padrão)</SelectItem>
                    <SelectItem value="admin">Admin (administrador)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                type="submit" 
                disabled={createUserMutation.isPending}
                className="flex-1"
              >
                {createUserMutation.isPending ? 'Criando...' : 'Criar Usuário'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
