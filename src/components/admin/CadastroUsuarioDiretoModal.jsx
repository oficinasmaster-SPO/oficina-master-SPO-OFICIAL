import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { UserPlus, Copy, Check, Send, Users, Building2, Search, ChevronDown, X } from "lucide-react";

function WorkshopSearchSelect({ workshops, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);
  const searchRef = useRef(null);

  const selected = workshops.find(w => w.id === value);
  const filtered = workshops.filter(w =>
    w.name.toLowerCase().includes(search.toLowerCase()) ||
    (w.city || "").toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (open && searchRef.current) searchRef.current.focus();
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (id) => {
    onChange(id);
    setOpen(false);
    setSearch("");
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange("");
    setSearch("");
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full h-10 px-3 py-2 text-sm border border-input rounded-md bg-background hover:bg-accent/30 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <span className={selected ? "text-foreground" : "text-muted-foreground"}>
          {selected ? selected.name : "Selecione a oficina"}
        </span>
        <div className="flex items-center gap-1">
          {value && (
            <span onClick={handleClear} className="hover:text-destructive p-0.5 rounded">
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-border rounded-md shadow-lg">
          <div className="p-2 border-b border-border">
            <div className="flex items-center gap-2 px-2 py-1 border border-border rounded-md bg-gray-50">
              <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar oficina..."
                className="flex-1 text-sm bg-transparent outline-none"
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-48 scrollbar-thin">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-sm text-center text-muted-foreground">Nenhuma oficina encontrada</div>
            ) : (
              filtered.map(w => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => handleSelect(w.id)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-accent/50 transition-colors ${w.id === value ? "bg-accent font-medium" : ""}`}
                >
                  <span>{w.name}</span>
                  {w.city && <span className="ml-1 text-xs text-muted-foreground">· {w.city}</span>}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ID da ConsultingFirm "Oficinas Master" — fonte canônica para todos os internos
const OM_CONSULTING_FIRM_ID = "69bab264d7c3fe5d367c3959";

const EMPTY_INTERNO = {
  name: "",
  email: "",
  telefone: "",
  job_role: "consultor",
  profile_id: "",
};

const EMPTY_EXTERNO = {
  name: "",
  email: "",
  telefone: "",
  workshop_id: "",
  position: "",
  job_role: "outros",
  profile_id: "",
};

const JOB_ROLES_INTERNOS = [
  { value: "acelerador", label: "Acelerador" },
  { value: "consultor", label: "Consultor" },
  { value: "socio_interno", label: "Sócio Interno" },
  { value: "diretor", label: "Diretor" },
  { value: "financeiro", label: "Financeiro" },
  { value: "rh", label: "RH" },
  { value: "marketing", label: "Marketing" },
  { value: "administrativo", label: "Administrativo" },
  { value: "outros", label: "Outros" },
];

const JOB_ROLES_EXTERNOS = [
  { value: "socio", label: "Sócio" },
  { value: "diretor", label: "Diretor" },
  { value: "supervisor_loja", label: "Supervisor de Loja" },
  { value: "gerente", label: "Gerente" },
  { value: "lider_tecnico", label: "Líder Técnico" },
  { value: "financeiro", label: "Financeiro" },
  { value: "rh", label: "RH" },
  { value: "tecnico", label: "Técnico" },
  { value: "funilaria_pintura", label: "Funilaria/Pintura" },
  { value: "comercial", label: "Comercial" },
  { value: "consultor_vendas", label: "Consultor de Vendas" },
  { value: "marketing", label: "Marketing" },
  { value: "estoque", label: "Estoque" },
  { value: "administrativo", label: "Administrativo" },
  { value: "motoboy", label: "Motoboy" },
  { value: "lavador", label: "Lavador" },
  { value: "outros", label: "Outros" },
];

export default function CadastroUsuarioDiretoModal({ open, onClose, onOpenChange }) {
  const closeModal = onClose || ((v) => onOpenChange && onOpenChange(v === undefined ? false : v));
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("interno"); // "interno" | "externo"
  const [copied, setCopied] = useState(false);
  const [createdUser, setCreatedUser] = useState(null);
  const [formInterno, setFormInterno] = useState(EMPTY_INTERNO);
  const [formExterno, setFormExterno] = useState(EMPTY_EXTERNO);

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

  // Filtra perfis por tipo
  const profilesInternos = profiles.filter(p => p.type === 'interno' || p.type === 'sistema');
  const profilesExternos = profiles.filter(p => p.type === 'externo' || (!p.type));

  const createUserMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('createUserDirectly', data);
      return response.data;
    },
    onSuccess: (data) => {
      if (data?.success !== false) {
        toast.success(tab === 'interno' ? 'Usuário interno criado com sucesso!' : 'Usuário externo criado com sucesso!');
        setCreatedUser(data?.data || data);
        queryClient.invalidateQueries({ queryKey: ['admin-users'] });
        queryClient.invalidateQueries({ queryKey: ['employees'] });
      } else {
        toast.error(data.error?.message || data.error || 'Erro ao criar usuário');
      }
    },
    onError: (error) => {
      const msg = error?.response?.data?.error?.message || error?.message || 'Erro desconhecido';
      toast.error('Erro: ' + msg);
    }
  });



  const handleSubmitInterno = (e) => {
    e.preventDefault();
    if (!formInterno.name || !formInterno.email) {
      toast.error('Preencha nome e email');
      return;
    }
    createUserMutation.mutate({
      ...formInterno,
      consulting_firm_id: OM_CONSULTING_FIRM_ID,
      user_type: 'internal',
      role: 'user',
      tipo_vinculo: 'interno',
      // W7 FIX (2026-06-10): is_internal removido — campo deprecated. Fonte canônica: user_type.
    });
  };

  const handleSubmitExterno = (e) => {
    e.preventDefault();
    if (!formExterno.name || !formExterno.email || !formExterno.workshop_id) {
      toast.error('Preencha nome, email e oficina');
      return;
    }
    const payload = {
      ...formExterno,
      user_type: 'external',
      role: 'user',
      tipo_vinculo: 'cliente',
      // W7 FIX (2026-06-10): is_internal removido — campo deprecated.
    };
    if (!payload.profile_id) delete payload.profile_id;
    createUserMutation.mutate(payload);
  };

  const handleClose = () => {
    setCreatedUser(null);
    setFormInterno(EMPTY_INTERNO);
    setFormExterno(EMPTY_EXTERNO);
    setTab("interno");
    closeModal(false);
  };

  const handleCopyLink = () => {
    const link = createdUser?.invite_link || createdUser?.link;
    if (link) {
      navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSendWhatsApp = () => {
    const link = createdUser?.invite_link || createdUser?.link;
    const telefone = tab === 'interno' ? formInterno.telefone : formExterno.telefone;
    const name = tab === 'interno' ? formInterno.name : formExterno.name;
    if (link && telefone) {
      const phone = telefone.replace(/\D/g, '');
      const message = encodeURIComponent(
        `Olá ${name}!\n\nSeu acesso à plataforma Oficinas Master foi criado.\n\nClique no link abaixo para definir sua senha:\n${link}`
      );
      window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
    }
  };

  const isPending = createUserMutation.isPending;
  const currentTelefone = tab === 'interno' ? formInterno.telefone : formExterno.telefone;
  const inviteLink = createdUser?.invite_link || createdUser?.link;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Novo Usuário
          </DialogTitle>
          <DialogDescription>
            Crie usuários internos (equipe Oficinas Master) ou externos (colaboradores de oficinas clientes).
          </DialogDescription>
        </DialogHeader>

        {createdUser ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="font-semibold text-green-700 mb-1">✅ {tab === 'interno' ? 'Convite enviado' : 'Usuário criado'} com sucesso!</p>
              <p className="text-sm text-green-600">Email: <strong>{createdUser.email || (tab === 'interno' ? formInterno.email : formExterno.email)}</strong></p>
            </div>

            {(createdUser.user_id || createdUser.id) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <Label className="text-sm text-blue-700 font-semibold">🔑 User ID</Label>
                <div className="flex gap-2 mt-1">
                  <Input value={createdUser.user_id || createdUser.id} readOnly className="flex-1 font-mono text-sm bg-white" />
                  <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(createdUser.user_id || createdUser.id); toast.success('User ID copiado!'); }}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {inviteLink && (
              <div>
                <Label className="text-sm text-gray-600">Link de Primeiro Acesso</Label>
                <div className="flex gap-2 mt-1">
                  <Input value={inviteLink} readOnly className="flex-1" />
                  <Button variant="outline" size="icon" onClick={handleCopyLink}>
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            )}

            {currentTelefone && inviteLink && (
              <Button onClick={handleSendWhatsApp} className="w-full bg-green-600 hover:bg-green-700">
                <Send className="w-4 h-4 mr-2" />
                Enviar por WhatsApp
              </Button>
            )}

            <div className="flex gap-2">
              <Button onClick={() => { setCreatedUser(null); setFormInterno(EMPTY_INTERNO); setFormExterno(EMPTY_EXTERNO); }} variant="outline" className="flex-1">
                Criar Outro
              </Button>
              <Button onClick={handleClose} className="flex-1">Fechar</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Tabs de tipo */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-lg">
              <button
                type="button"
                onClick={() => setTab("interno")}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                  tab === "interno"
                    ? "bg-white shadow text-gray-900"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Users className="w-4 h-4" />
                Equipe Interna
              </button>
              <button
                type="button"
                onClick={() => setTab("externo")}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                  tab === "externo"
                    ? "bg-white shadow text-gray-900"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Building2 className="w-4 h-4" />
                Colaborador de Oficina
              </button>
            </div>

            {/* Descrição do tipo */}
            {tab === "interno" ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                <strong>Equipe Interna:</strong> Consultores, aceleradores e membros da equipe Oficinas Master. Receberão um convite por email para definir sua senha. Role sempre <strong>user</strong> (sem admin global).
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                <strong>Colaborador de Oficina:</strong> Funcionários de uma oficina cliente. Obrigatório vincular a uma oficina. Role sempre <strong>user</strong>.
              </div>
            )}

            {/* Formulário Interno */}
            {tab === "interno" && (
              <form onSubmit={handleSubmitInterno} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Nome Completo *</Label>
                    <Input value={formInterno.name} onChange={(e) => setFormInterno({...formInterno, name: e.target.value})} placeholder="Nome do membro" required />
                  </div>
                  <div>
                    <Label>Email *</Label>
                    <Input type="email" value={formInterno.email} onChange={(e) => setFormInterno({...formInterno, email: e.target.value})} placeholder="email@oficinasmaster.com.br" required />
                  </div>
                  <div>
                    <Label>Telefone (WhatsApp)</Label>
                    <Input value={formInterno.telefone} onChange={(e) => setFormInterno({...formInterno, telefone: e.target.value})} placeholder="(11) 99999-9999" />
                  </div>
                  <div>
                    <Label>Função</Label>
                    <Select value={formInterno.job_role} onValueChange={(v) => setFormInterno({...formInterno, job_role: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {JOB_ROLES_INTERNOS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {profilesInternos.length > 0 && (
                    <div className="md:col-span-2">
                      <Label>Perfil de Acesso</Label>
                      <Select value={formInterno.profile_id || ''} onValueChange={(v) => setFormInterno({...formInterno, profile_id: v})}>
                        <SelectTrigger><SelectValue placeholder="Selecione um perfil" /></SelectTrigger>
                        <SelectContent>
                          {profilesInternos.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                    Fechar
                  </Button>
                  <Button type="submit" disabled={isPending} className="flex-1">
                    {isPending ? 'Criando usuário...' : 'Criar Usuário Interno'}
                  </Button>
                </div>
              </form>
            )}

            {/* Formulário Externo */}
            {tab === "externo" && (
              <form onSubmit={handleSubmitExterno} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Nome Completo *</Label>
                    <Input value={formExterno.name} onChange={(e) => setFormExterno({...formExterno, name: e.target.value})} placeholder="Nome do colaborador" required />
                  </div>
                  <div>
                    <Label>Email *</Label>
                    <Input type="email" value={formExterno.email} onChange={(e) => setFormExterno({...formExterno, email: e.target.value})} placeholder="email@exemplo.com" required />
                  </div>
                  <div>
                    <Label>Telefone (WhatsApp)</Label>
                    <Input value={formExterno.telefone} onChange={(e) => setFormExterno({...formExterno, telefone: e.target.value})} placeholder="(11) 99999-9999" />
                  </div>
                  <div>
                    <Label>Oficina *</Label>
                    <WorkshopSearchSelect
                      workshops={workshops}
                      value={formExterno.workshop_id}
                      onChange={(v) => setFormExterno({...formExterno, workshop_id: v})}
                    />
                  </div>
                  <div>
                    <Label>Cargo</Label>
                    <Input value={formExterno.position} onChange={(e) => setFormExterno({...formExterno, position: e.target.value})} placeholder="Ex: Mecânico, Gerente" />
                  </div>
                  <div>
                    <Label>Função</Label>
                    <Select value={formExterno.job_role} onValueChange={(v) => setFormExterno({...formExterno, job_role: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {JOB_ROLES_EXTERNOS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {profilesExternos.length > 0 && (
                    <div className="md:col-span-2">
                      <Label>Perfil de Acesso</Label>
                      <Select value={formExterno.profile_id || ''} onValueChange={(v) => setFormExterno({...formExterno, profile_id: v})}>
                        <SelectTrigger><SelectValue placeholder="Selecione um perfil" /></SelectTrigger>
                        <SelectContent>
                          {profilesExternos.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                    Fechar
                  </Button>
                  <Button type="submit" disabled={isPending} className="flex-1">
                    {isPending ? 'Criando usuário...' : 'Criar Usuário Externo'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}