import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { UserPlus, Copy, Check, Send } from "lucide-react";

const EMPTY_FORM = {
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
};

export default function CadastroUsuarioDiretoModal({ open, onClose }) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [createdUser, setCreatedUser] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000
  });

  const { data: workshops = [] } = useQuery({
    queryKey: ['workshops-list'],
    queryFn: () => base44.entities.Workshop.list(),
    enabled: !!user && open,
    staleTime: 5 * 60 * 1000
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-list'],
    queryFn: () => base44.entities.UserProfile.list(),
    enabled: !!user && open,
    staleTime: 5 * 60 * 1000
  });

  const createUserMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('createUserDirectly', data);
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Usuário criado com sucesso!');
        setCreatedUser(data.data || data);
        queryClient.invalidateQueries({ queryKey: ['admin-users'] });
        queryClient.invalidateQueries({ queryKey: ['employees'] });
      } else {
        toast.error(data.error?.message || data.error || 'Erro ao criar usuário');
      }
    },
    onError: (error) => {
      const msg = error?.response?.data?.error?.message || error?.message || 'Erro desconhecido';
      toast.error('Erro ao criar usuário: ' + msg);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.workshop_id) {
      toast.error('Preencha nome, email e oficina');
      return;
    }
    const payload = { ...formData };
    if (!payload.profile_id || payload.profile_id === 'null') delete payload.profile_id;
    createUserMutation.mutate(payload);
  };

  const handleClose = () => {
    setCreatedUser(null);
    setFormData(EMPTY_FORM);
    onClose();
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Cadastro Direto de Usuário
          </DialogTitle>
          <DialogDescription>
            Cria o registro diretamente na entidade User, sem passar pela tela de convite
          </DialogDescription>
        </DialogHeader>

        {createdUser ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="font-semibold text-green-700 mb-1">✅ Usuário Criado com Sucesso!</p>
              <p className="text-sm text-green-600">Email: <strong>{createdUser.email}</strong></p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <Label className="text-sm text-blue-700 font-semibold">🔑 User ID</Label>
              <div className="flex gap-2 mt-1">
                <Input value={createdUser.user_id || createdUser.id || '—'} readOnly className="flex-1 font-mono text-sm bg-white" />
                <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(createdUser.user_id || createdUser.id || ''); toast.success('User ID copiado!'); }}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {createdUser.invite_link && (
              <div>
                <Label className="text-sm text-gray-600">Link de Primeiro Acesso</Label>
                <div className="flex gap-2 mt-1">
                  <Input value={createdUser.invite_link} readOnly className="flex-1" />
                  <Button variant="outline" size="icon" onClick={handleCopyLink}>
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            )}

            {formData.telefone && createdUser.invite_link && (
              <Button onClick={handleSendWhatsApp} className="w-full bg-green-600 hover:bg-green-700">
                <Send className="w-4 h-4 mr-2" />
                Enviar por WhatsApp
              </Button>
            )}

            <div className="flex gap-2">
              <Button onClick={() => { setCreatedUser(null); setFormData(EMPTY_FORM); }} variant="outline" className="flex-1">
                Criar Outro
              </Button>
              <Button onClick={handleClose} className="flex-1">Fechar</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Nome Completo *</Label>
                <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Nome do usuário" required />
              </div>

              <div>
                <Label>Email *</Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="email@exemplo.com" required />
              </div>

              <div>
                <Label>Telefone (WhatsApp)</Label>
                <Input value={formData.telefone} onChange={(e) => setFormData({...formData, telefone: e.target.value})} placeholder="(11) 99999-9999" />
              </div>

              <div>
                <Label>Data de Nascimento</Label>
                <Input type="date" value={formData.data_nascimento} onChange={(e) => setFormData({...formData, data_nascimento: e.target.value})} />
              </div>

              <div>
                <Label>Oficina *</Label>
                <Select value={formData.workshop_id} onValueChange={(value) => setFormData({...formData, workshop_id: value})}>
                  <SelectTrigger><SelectValue placeholder="Selecione a oficina" /></SelectTrigger>
                  <SelectContent>
                    {workshops.map((w) => (<SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Cargo</Label>
                <Input value={formData.position} onChange={(e) => setFormData({...formData, position: e.target.value})} placeholder="Ex: Mecânico, Gerente" />
              </div>

              <div>
                <Label>Área</Label>
                <Select value={formData.area} onValueChange={(value) => setFormData({...formData, area: value})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
                <Select value={formData.job_role} onValueChange={(value) => setFormData({...formData, job_role: value})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
                <Select value={formData.profile_id || '__auto__'} onValueChange={(value) => setFormData({...formData, profile_id: value === '__auto__' ? '' : value})}>
                  <SelectTrigger><SelectValue placeholder="Gerar automaticamente" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__auto__">Gerar automaticamente</SelectItem>
                    {profiles.map((p) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Role no Sistema *</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({...formData, role: value})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User (usuário padrão)</SelectItem>
                    <SelectItem value="admin">Admin (administrador)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" disabled={createUserMutation.isPending} className="w-full">
              {createUserMutation.isPending ? 'Criando...' : 'Criar Usuário'}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}