import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, MessageCircle, Bell, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function SharePlanoModal({ open, onClose, plan, workshop }) {
  const [shareMethod, setShareMethod] = useState("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleShare = async () => {
    setIsLoading(true);
    try {
      if (shareMethod === "email" && !email.trim()) {
        toast.error("Digite um e-mail válido");
        return;
      }

      if (shareMethod === "whatsapp" && !phone.trim()) {
        toast.error("Digite um telefone válido");
        return;
      }

      const planSummary = `
*Plano de Aceleração - ${workshop.name}*
Mês: ${new Date(plan.reference_month + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}

*Objetivo Principal:*
${plan.plan_data.main_objective_90_days}

*Progresso:* ${plan.completion_percentage}%

Acesse a plataforma para ver o plano completo.
      `.trim();

      if (shareMethod === "email") {
        await base44.integrations.Core.SendEmail({
          to: email,
          subject: `Plano de Aceleração - ${workshop.name}`,
          body: planSummary.replace(/\*/g, '')
        });
        toast.success("E-mail enviado com sucesso!");
      } else if (shareMethod === "whatsapp") {
        const whatsappUrl = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(planSummary)}`;
        window.open(whatsappUrl, '_blank');
        toast.success("WhatsApp aberto!");
      } else if (shareMethod === "platform") {
        // Notificação na plataforma
        toast.info("Funcionalidade em desenvolvimento");
      }

      onClose();
    } catch (error) {
      toast.error("Erro ao compartilhar: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Compartilhar Plano de Aceleração</DialogTitle>
        </DialogHeader>

        <Tabs value={shareMethod} onValueChange={setShareMethod} className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="email" className="gap-2">
              <Mail className="w-4 h-4" />
              E-mail
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="gap-2">
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </TabsTrigger>
            <TabsTrigger value="platform" className="gap-2">
              <Bell className="w-4 h-4" />
              Plataforma
            </TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium block mb-2">E-mail do destinatário:</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemplo@email.com"
              />
            </div>
          </TabsContent>

          <TabsContent value="whatsapp" className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium block mb-2">Telefone (com DDD):</label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 99999-9999"
              />
            </div>
          </TabsContent>

          <TabsContent value="platform" className="space-y-4 mt-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                O plano será disponibilizado internamente na plataforma para outros colaboradores.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleShare} disabled={isLoading} className="gap-2">
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Compartilhando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Compartilhar
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}