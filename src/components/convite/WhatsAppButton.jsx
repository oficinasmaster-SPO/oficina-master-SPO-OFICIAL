import React from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function WhatsAppButton({ inviteLink, name, workshopName }) {
  const [copied, setCopied] = useState(false);

  const generateWhatsAppMessage = () => {
    const message = `Olá! 👋\n\nVocê foi convidado para acessar o sistema de ${workshopName}! 🎉\n\n📧 Use este link para se cadastrar:\n${inviteLink}\n\n🔑 Sua senha temporária é: Oficina@2025\n⏰ Este link expira em 7 dias.\n\nAté logo! 🚀`;
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