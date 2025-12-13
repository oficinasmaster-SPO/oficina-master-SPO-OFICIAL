import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Mail, MessageCircle, Share2, Loader2, Download } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function ExportCronogramaModal({ 
  open, 
  onClose, 
  cronogramaData, 
  workshop,
  onGeneratePDF 
}) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [telefone, setTelefone] = useState("");

  const handlePrintPDF = () => {
    onGeneratePDF('print');
    toast.success("Abrindo visualização de impressão...");
  };

  const handleDownloadPDF = () => {
    onGeneratePDF('download');
    toast.success("PDF baixado com sucesso!");
  };

  const handleSendEmail = async () => {
    if (!email) {
      toast.error("Por favor, informe o e-mail de destino");
      return;
    }

    setIsLoading(true);
    try {
      const pdfBlob = await onGeneratePDF('blob');
      
      // Converter blob para base64
      const reader = new FileReader();
      reader.readAsDataURL(pdfBlob);
      reader.onloadend = async () => {
        const base64data = reader.result.split(',')[1];
        
        await base44.functions.invoke('enviarCronogramaEmail', {
          email_destino: email,
          workshop_nome: workshop.name,
          pdf_base64: base64data,
          stats: cronogramaData.stats
        });

        toast.success(`Relatório enviado para ${email}`);
        setEmail("");
      };
    } catch (error) {
      console.error("Erro ao enviar e-mail:", error);
      toast.error("Erro ao enviar e-mail");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendWhatsApp = () => {
    if (!telefone) {
      toast.error("Por favor, informe o número do WhatsApp");
      return;
    }

    // Gera mensagem com resumo
    const { stats } = cronogramaData;
    const mensagem = `📊 *Cronograma de Implementação - ${workshop.name}*\n\n` +
      `📈 *Resumo do Projeto:*\n` +
      `✅ Total de Itens: ${stats.total}\n` +
      `🟢 Concluídos: ${stats.concluidos}\n` +
      `🟡 Em Andamento: ${stats.em_andamento}\n` +
      `🔴 Atrasados: ${stats.atrasados}\n\n` +
      `Acesse o sistema para mais detalhes!`;

    const telefoneFormatado = telefone.replace(/\D/g, '');
    const url = `https://wa.me/${telefoneFormatado}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
    
    toast.success("Abrindo WhatsApp...");
  };

  const handleSharePlatform = async () => {
    setIsLoading(true);
    try {
      const user = await base44.auth.me();
      
      // Salvar notificação interna com link para o cronograma
      await base44.entities.Notification.create({
        user_id: user.id,
        type: 'relatorio_compartilhado',
        title: 'Relatório de Cronograma Compartilhado',
        message: `Relatório do cronograma de implementação foi gerado em ${new Date().toLocaleDateString('pt-BR')}`,
        is_read: false
      });

      toast.success("Relatório salvo nas notificações!");
    } catch (error) {
      console.error("Erro ao compartilhar na plataforma:", error);
      toast.error("Erro ao compartilhar");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Exportar Cronograma</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="pdf" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pdf">
              <FileText className="w-4 h-4 mr-2" />
              PDF
            </TabsTrigger>
            <TabsTrigger value="email">
              <Mail className="w-4 h-4 mr-2" />
              E-mail
            </TabsTrigger>
            <TabsTrigger value="whatsapp">
              <MessageCircle className="w-4 h-4 mr-2" />
              WhatsApp
            </TabsTrigger>
            <TabsTrigger value="plataforma">
              <Share2 className="w-4 h-4 mr-2" />
              Plataforma
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pdf" className="space-y-4 mt-4">
            <div className="text-sm text-gray-600 mb-4">
              Gere o relatório em PDF para impressão ou download.
            </div>
            <div className="flex gap-3">
              <Button onClick={handlePrintPDF} className="flex-1">
                <FileText className="w-4 h-4 mr-2" />
                Imprimir
              </Button>
              <Button onClick={handleDownloadPDF} variant="outline" className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                Baixar PDF
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="email" className="space-y-4 mt-4">
            <div>
              <Label htmlFor="email">E-mail de Destino</Label>
              <Input
                id="email"
                type="email"
                placeholder="exemplo@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2"
              />
            </div>
            <Button 
              onClick={handleSendEmail} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Enviar por E-mail
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="whatsapp" className="space-y-4 mt-4">
            <div>
              <Label htmlFor="telefone">Número do WhatsApp</Label>
              <Input
                id="telefone"
                type="tel"
                placeholder="+55 11 99999-9999"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                className="mt-2"
              />
              <p className="text-xs text-gray-500 mt-2">
                Inclua o código do país (ex: +55 para Brasil)
              </p>
            </div>
            <Button onClick={handleSendWhatsApp} className="w-full">
              <MessageCircle className="w-4 h-4 mr-2" />
              Enviar por WhatsApp
            </Button>
          </TabsContent>

          <TabsContent value="plataforma" className="space-y-4 mt-4">
            <div className="text-sm text-gray-600 mb-4">
              Salvar o relatório nas notificações da plataforma para acesso rápido.
            </div>
            <Button 
              onClick={handleSharePlatform} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 mr-2" />
                  Salvar na Plataforma
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}