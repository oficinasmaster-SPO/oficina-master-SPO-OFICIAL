import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Mail, Share2, Eye } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import VisualizarAtaModal from "./VisualizarAtaModal";
import { downloadAtaPDF } from "./AtasPDFGenerator";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function AtasSection({ atas, workshop }) {
  const [showAta, setShowAta] = useState(false);
  const [selectedAta, setSelectedAta] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendingWhatsapp, setSendingWhatsapp] = useState(false);

  const handleDownloadPDF = async (ata) => {
    try {
      let ataParaDownload = { ...ata };
      
      // Buscar o atendimento vinculado a esta ATA
      const atendimentos = await base44.entities.ConsultoriaAtendimento.filter({ ata_id: ata.id });
      if (atendimentos && atendimentos.length > 0) {
        const atendimentoId = atendimentos[0].id;
        
        // Buscar inteligência vinculada ao atendimento
        const intelligence = await base44.entities.ClientIntelligence.filter({ 
          attendance_id: atendimentoId 
        });
        
        ataParaDownload.client_intelligence = intelligence || [];
      }

      downloadAtaPDF(ataParaDownload, workshop);
      toast.success("PDF baixado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar PDF");
    }
  };

  const handleSendEmail = async (ata) => {
    setSendingEmail(true);
    try {
      await base44.functions.invoke('enviarAtaEmail', {
        ata_id: ata.id,
        workshop_id: workshop.id,
        recipient_email: workshop.owner_email || ''
      });
      toast.success("ATA enviada por email!");
    } catch (error) {
      console.error("Erro ao enviar email:", error);
      toast.error("Erro ao enviar email");
    } finally {
      setSendingEmail(false);
    }
  };

  const handleSendWhatsApp = async (ata) => {
    setSendingWhatsapp(true);
    try {
      const result = await base44.functions.invoke('enviarAtaWhatsApp', {
        ata_id: ata.id,
        workshop_id: workshop.id
      });
      
      if (result.data.whatsapp_url) {
        window.open(result.data.whatsapp_url, '_blank');
      }
      toast.success("Preparando envio via WhatsApp...");
    } catch (error) {
      console.error("Erro ao enviar WhatsApp:", error);
      toast.error("Erro ao preparar envio");
    } finally {
      setSendingWhatsapp(false);
    }
  };

  const handleSharePlatform = async (ata) => {
    try {
      await base44.functions.invoke('disponibilizarAtaPlataforma', {
        ata_id: ata.id,
        workshop_id: workshop.id
      });
      toast.success("ATA disponibilizada na plataforma!");
    } catch (error) {
      console.error("Erro ao disponibilizar:", error);
      toast.error("Erro ao disponibilizar ATA");
    }
  };

  if (!atas || atas.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            ATAs de Reunião
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-8">
            Nenhuma ATA de reunião disponível ainda
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            ATAs de Reunião ({atas.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {atas.map((ata) => (
              <div 
                key={ata.id} 
                className="border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-semibold text-gray-900">
                          {ata.code} - {ata.tipo_aceleracao}
                        </p>
                        <p className="text-sm text-gray-600">
                          {format(new Date(ata.meeting_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })} 
                          {' às '}{ata.meeting_time}
                        </p>
                        <p className="text-xs text-gray-500">
                          Consultor: {ata.consultor_name}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-3">
                      <Badge variant={ata.status === 'finalizada' ? 'success' : 'secondary'}>
                        {ata.status === 'finalizada' ? 'Finalizada' : 'Rascunho'}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedAta(ata);
                        setShowAta(true);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Ver ATA
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownloadPDF(ata)}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      PDF
                    </Button>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSendEmail(ata)}
                        disabled={sendingEmail}
                        title="Enviar por Email"
                      >
                        <Mail className="w-4 h-4" />
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSendWhatsApp(ata)}
                        disabled={sendingWhatsapp}
                        title="Enviar por WhatsApp"
                      >
                        <Share2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {ata.proximos_passos?.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs font-semibold text-gray-700 mb-2">
                      Próximos Passos ({ata.proximos_passos.length}):
                    </p>
                    <ul className="space-y-1">
                      {ata.proximos_passos.slice(0, 2).map((passo, idx) => (
                        <li key={idx} className="text-xs text-gray-600">
                          • {passo.descricao} - {passo.responsavel}
                        </li>
                      ))}
                      {ata.proximos_passos.length > 2 && (
                        <li className="text-xs text-blue-600">
                          + {ata.proximos_passos.length - 2} mais...
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {showAta && selectedAta && (
        <VisualizarAtaModal
          ata={selectedAta}
          workshop={workshop}
          onClose={() => {
            setShowAta(false);
            setSelectedAta(null);
          }}
        />
      )}
    </>
  );
}