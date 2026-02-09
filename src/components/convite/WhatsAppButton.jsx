import React from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function WhatsAppButton({ inviteLink, name, workshopName, email, temporaryPassword }) {
  const [copied, setCopied] = useState(false);

  const generateWhatsAppMessage = () => {
    const message = `Olá! 👋 Você foi convidado para acessar a plataforma Oficinas Master.\n\n📧 Email: ${email}\n🔑 Senha temporária: ${temporaryPassword}\n🔗 Acesse: ${inviteLink}\n\nLembre-se de trocar sua senha no primeiro acesso. 🔒`;
    return message;
  };

  const handleCopyToClipboard = () => {
    const message = generateWhatsAppMessage();
    navigator.clipboard.writeText(message);
    setCopied(true);
    toast.success("✅ Mensagem copiada para WhatsApp!");
    
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWhatsApp = () => {
    const message = encodeURIComponent(generateWhatsAppMessage());
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  return (
    <div className="flex gap-2">
      <Button 
        onClick={handleOpenWhatsApp}
        className="bg-green-600 hover:bg-green-700 text-white flex-1"
      >
        <MessageCircle className="w-4 h-4 mr-2" />
        Abrir WhatsApp
      </Button>
      <Button
        onClick={handleCopyToClipboard}
        variant="outline"
        className="flex-1"
      >
        {copied ? (
          <>
            <Check className="w-4 h-4 mr-2" />
            Copiado
          </>
        ) : (
          <>
            <Copy className="w-4 h-4 mr-2" />
            Copiar
          </>
        )}
      </Button>
    </div>
  );
}