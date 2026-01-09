import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mail, MessageCircle, Link as LinkIcon, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function AtaSendOptionsBar({ ata, workshop, atendimento }) {
  const [loading, setLoading] = useState(false);

  const handleEnviarEmail = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('enviarAtaEmail', {
        atendimento_id: atendimento.id
      });

      if (response.data?.success) {
        toast.success("✅ Email enviado com sucesso!");
      } else {
        throw new Error(response.data?.error || "Erro ao enviar email");
      }
    } catch (error) {
      console.error("Erro:", error);
      toast.error("❌ Erro ao enviar email: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEnviarWhatsApp = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('enviarAtaWhatsApp', {
        atendimento_id: atendimento.id
      });

      if (response.data?.success || response.data?.whatsapp_message) {
        const phone = response.data?.phone;
        const message = encodeURIComponent(response.data?.whatsapp_message || "ATA enviada");

        if (phone) {
          window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
        } else {
          toast.warning("📱 Número de WhatsApp não cadastrado. Copie a mensagem manualmente.");
          navigator.clipboard.writeText(response.data?.whatsapp_message);
        }

        toast.success("✅ Mensagem do WhatsApp preparada!");
      } else {
        throw new Error(response.data?.error || "Erro ao preparar WhatsApp");
      }
    } catch (error) {
      console.error("Erro:", error);
      toast.error("❌ Erro ao enviar WhatsApp: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopiarLinkPlataforma = async () => {
    try {
      const linkPlataforma = `${window.location.origin}/VisualizarAtaModal?ata_id=${ata.id}&workshop_id=${workshop.id}`;
      await navigator.clipboard.writeText(linkPlataforma);
      toast.success("✅ Link copiado! Cliente pode acessar com suas credenciais.");
    } catch (error) {
      toast.error("❌ Erro ao copiar link");
    }
  };

  return (
    <div className="flex flex-wrap gap-3 print:hidden">
      <Button
        onClick={handleEnviarEmail}
        disabled={loading}
        variant="outline"
        className="gap-2"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Mail className="w-4 h-4" />
        )}
        Enviar por Email
      </Button>

      <Button
        onClick={handleEnviarWhatsApp}
        disabled={loading}
        variant="outline"
        className="gap-2 text-green-600 border-green-200 hover:bg-green-50"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <MessageCircle className="w-4 h-4" />
        )}
        Enviar WhatsApp
      </Button>

      <Button
        onClick={handleCopiarLinkPlataforma}
        variant="outline"
        className="gap-2 text-blue-600 border-blue-200 hover:bg-blue-50"
      >
        <LinkIcon className="w-4 h-4" />
        Copiar Link da Plataforma
      </Button>
    </div>
  );
}