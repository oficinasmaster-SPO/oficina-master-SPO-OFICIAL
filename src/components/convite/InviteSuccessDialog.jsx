import React from "react";
import { CheckCircle2, Copy, Eye, MessageCircle, Clock, Link as LinkIcon, ShieldCheck, Building2, Rocket, UserCheck } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const getInviteLink = (inviteData) => inviteData?.invite_link || inviteData?.inviteLink || "";

export default function InviteSuccessDialog({
  open,
  onOpenChange,
  inviteData,
  workshopName,
  profileName,
  onPreview,
}) {
  const inviteLink = getInviteLink(inviteData);
  const employee = inviteData?.employee || inviteData || {};
  const name = employee.full_name || inviteData?.name || inviteData?.full_name || "Colaborador";
  const email = inviteData?.email || employee.email || "-";
  const phone = inviteData?.telefone || employee.telefone || "-";
  const role = employee.position || inviteData?.position || inviteData?.job_role || "-";
  const createdAt = inviteData?.created_date || inviteData?.created_at || employee.created_date || new Date().toISOString();
  const expiresAt = inviteData?.expires_at || inviteData?.invite_expires_at;

  const whatsappMessage = `Olá ${name}.\n\nVocê foi convidado para acessar a plataforma da ${workshopName || "sua oficina"}.\n\nPara concluir seu cadastro:\n\n1. Clique no link abaixo.\n2. Escolha a opção "Criar Conta".\n3. Utilize este mesmo e-mail.\n4. Crie sua senha.\n\nLink:\n\n${inviteLink}\n\nImportante:\n\nEste convite expira em 7 dias.\n\nCaso tenha dúvidas, entre em contato com a administração.`;

  const copyLink = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    toast.success("Link copiado para a área de transferência");
  };

  const openWhatsApp = () => {
    if (!inviteLink) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`, "_blank");
  };

  const steps = [
    { icon: CheckCircle2, title: "Convite Gerado", description: "O sistema criou um convite exclusivo para este colaborador.", color: "text-emerald-600", bg: "bg-emerald-50" },
    { icon: MessageCircle, title: "Enviar Convite", description: "Envie o link por WhatsApp ou copie o link de acesso.", color: "text-green-600", bg: "bg-green-50" },
    { icon: ShieldCheck, title: "Criar Conta", description: "O colaborador deve acessar o link recebido e selecionar: \"Criar Conta\", utilizando exatamente o mesmo e-mail informado no cadastro.", color: "text-blue-600", bg: "bg-blue-50" },
    { icon: Building2, title: "Vinculação Automática", description: "O sistema identificará automaticamente a oficina correta. Nenhuma nova oficina será criada.", color: "text-indigo-600", bg: "bg-indigo-50" },
    { icon: Rocket, title: "Ativação", description: "Após concluir o cadastro, o colaborador aparecerá automaticamente como Ativo.", color: "text-purple-600", bg: "bg-purple-50" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 border-0 bg-white rounded-3xl shadow-2xl" hideClose>
        <div className="bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600 px-6 sm:px-8 py-8 text-white">
          <DialogHeader className="text-center items-center space-y-3">
            <div className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur flex items-center justify-center shadow-lg">
              <CheckCircle2 className="w-11 h-11 text-white" />
            </div>
            <DialogTitle className="text-2xl sm:text-3xl font-bold text-white">🎉 Colaborador Convidado com Sucesso</DialogTitle>
            <DialogDescription className="text-white/90 text-base max-w-xl">
              O acesso foi preparado e o convite já está pronto para ser enviado.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
            <CardContent className="p-0">
              <div className="px-5 py-4 bg-slate-50 border-b flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-slate-600" />
                <h3 className="font-semibold text-slate-900">Resumo do colaborador</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                {[
                  ["Nome", name],
                  ["Email", email],
                  ["Telefone", phone],
                  ["Cargo", role],
                  ["Perfil de Acesso", profileName || "-"],
                  ["Oficina", workshopName || "-"],
                  ["Data de criação", formatDate(createdAt)],
                  ["Validade do convite", expiresAt ? formatDate(expiresAt) : "7 dias"],
                ].map(([label, value]) => (
                  <div key={label} className="p-4 min-w-0">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 break-words">{value || "-"}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <section>
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="text-lg font-bold text-slate-900">Como funciona o acesso do colaborador?</h3>
              <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100">Onboarding seguro</Badge>
            </div>
            <div className="space-y-3">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={step.title} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col items-center">
                      <div className={`w-11 h-11 rounded-2xl ${step.bg} flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 ${step.color}`} />
                      </div>
                      {index < steps.length - 1 && <div className="w-px flex-1 bg-slate-200 mt-2" />}
                    </div>
                    <div className="pt-1">
                      <p className="font-semibold text-slate-900">ETAPA {index + 1} · {step.title}</p>
                      <p className="text-sm text-slate-600 mt-1 leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-5 flex gap-4">
            <div className="w-11 h-11 rounded-2xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h4 className="font-bold text-amber-900">⏰ Atenção</h4>
              <p className="text-sm text-amber-800 mt-1 leading-relaxed">
                Este convite expira em 7 dias. Caso o colaborador não conclua o cadastro dentro desse prazo, será necessário gerar um novo convite.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <LinkIcon className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-semibold text-slate-700">Link de acesso</span>
            </div>
            <code className="block bg-white border rounded-xl p-3 text-xs text-slate-700 break-all">{inviteLink || "Link não disponível"}</code>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            <Button onClick={openWhatsApp} className="h-12 bg-green-600 hover:bg-green-700 text-white font-semibold shadow-lg shadow-green-600/20">
              <MessageCircle className="w-4 h-4 mr-2" /> Enviar por WhatsApp
            </Button>
            <Button onClick={copyLink} variant="outline" className="h-12 bg-white">
              <Copy className="w-4 h-4 mr-2" /> Copiar Link
            </Button>
            <Button onClick={onPreview} variant="outline" className="h-12 bg-white">
              <Eye className="w-4 h-4 mr-2" /> Visualizar Convite
            </Button>
            <Button onClick={() => onOpenChange(false)} variant="ghost" className="h-12">
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}