import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Mail, MessageCircle, Link as LinkIcon, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function AtaSendOptionsBar({ ata, workshop, atendimento }) {
  const [loading, setLoading] = useState(false);
  const [statusDialog, setStatusDialog] = useState(null);

  const handleEnviarEmail = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('enviarAtaEmail', {
        atendimento_id: atendimento.id
      });

      if (response.data?.success) {
        setStatusDialog({
          type: 'success',
          title: '✅ Email Enviado com Sucesso!',
          message: `A ATA foi enviada para ${workshop?.name} com link de acesso à plataforma.`
        });
      } else {
        throw new Error(response.data?.error || "Erro ao enviar email");
      }
    } catch (error) {
      console.error("Erro:", error);
      setStatusDialog({
        type: 'error',
        title: '❌ Falha ao Enviar Email',
        message: error.message || 'Verifique se o email está correto e tente novamente.'
      });
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
          setStatusDialog({
            type: 'success',
            title: '✅ WhatsApp Aberto',
            message: `Clique no contato e a mensagem com a ATA será enviada. Se o número não aparecer, verifique o cadastro.`
          });
        } else {
          navigator.clipboard.writeText(response.data?.whatsapp_message);
          setStatusDialog({
            type: 'warning',
            title: '⚠️ Número de WhatsApp Não Encontrado',
            message: 'A mensagem foi copiada. Cole no WhatsApp manualmente para o cliente.'
          });
        }
      } else {
        throw new Error(response.data?.error || "Erro ao preparar WhatsApp");
      }
    } catch (error) {
      console.error("Erro:", error);
      setStatusDialog({
        type: 'error',
        title: '❌ Falha ao Enviar WhatsApp',
        message: error.message || 'Verifique o número de telefone e tente novamente.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopiarLinkPlataforma = async () => {
    try {
      const linkPlataforma = `${window.location.origin}/VisualizarAtaModal?ata_id=${ata.id}&workshop_id=${workshop.id}`;
      await navigator.clipboard.writeText(linkPlataforma);
      setStatusDialog({
        type: 'success',
        title: '✅ Link Copiado',
        message: `${linkPlataforma}\n\nCliente pode abrir com suas credenciais de acesso.`
      });
    } catch (error) {
      setStatusDialog({
        type: 'error',
        title: '❌ Falha ao Copiar',
        message: 'Verifique as permissões do navegador e tente novamente.'
      });
    }
  };

  return (
    <>
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

      <Dialog open={!!statusDialog} onOpenChange={() => setStatusDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {statusDialog?.type === 'success' && (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              )}
              {statusDialog?.type === 'error' && (
                <AlertCircle className="w-5 h-5 text-red-600" />
              )}
              {statusDialog?.type === 'warning' && (
                <AlertCircle className="w-5 h-5 text-yellow-600" />
              )}
              {statusDialog?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {statusDialog?.message}
            </p>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setStatusDialog(null)}>Fechar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}