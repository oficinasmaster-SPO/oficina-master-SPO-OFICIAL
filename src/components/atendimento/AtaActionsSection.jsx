import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Upload, Trash2, Send, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import AtaAIConfigPanel from "@/components/aceleracao/AtaAIConfigPanel";

export default function AtaActionsSection({
  formData, setFormData, workshops, gerarAtaMutation, handleDeleteAta, queryClient
}) {
  if (formData.status !== 'realizado' && formData.status !== 'concluido') return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documentação e Envio (ATA)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex gap-3">
            {!formData.ata_id ? (
              <div className="flex-1 space-y-3">
                <AtaAIConfigPanel
                  onGenerate={(config) => gerarAtaMutation.mutate({ atendimento_id: formData.id, ...config })}
                  isGenerating={gerarAtaMutation.isPending}
                />
              </div>
            ) : (
              <div className="flex-1 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                <span className="text-green-800 font-medium flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  ATA Gerada
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        const ata = await base44.entities.MeetingMinutes.get(formData.ata_id);
                        if (ata) {
                          const intelligence = await base44.entities.ClientIntelligence.filter({
                            attendance_id: formData.id
                          });
                          const ataComInteligencia = {
                            ...ata,
                            client_intelligence: intelligence || [],
                            checklist_respostas: ata.checklist_respostas || formData.checklist_respostas || []
                          };
                          const { downloadAtaPDF } = await import("@/components/aceleracao/AtasPDFGenerator");
                          const workshop = workshops?.find(w => w.id === formData.workshop_id);
                          await downloadAtaPDF(ataComInteligencia, workshop);
                          toast.success("Download iniciado!");
                        }
                      } catch (error) {
                        toast.error("Erro ao acessar ATA: " + error.message);
                      }
                    }}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Baixar PDF
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDeleteAta}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 border-red-200"
                    title="Excluir ATA"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={!formData.ata_id}
              onClick={async () => {
                if (!formData.workshop_id) {
                  toast.error("Selecione uma oficina primeiro");
                  return;
                }
                try {
                  const response = await base44.functions.invoke('enviarAtaWhatsApp', {
                    atendimento_id: formData.id
                  });
                  const phone = response.data.phone?.replace(/\D/g, '') || '';
                  const message = encodeURIComponent(response.data.whatsapp_message);
                  window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
                  toast.success("WhatsApp aberto!");
                } catch (error) {
                  toast.error("Erro: " + error.message);
                }
              }}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              WhatsApp
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={!formData.ata_id}
              onClick={async () => {
                if (!formData.workshop_id) {
                  toast.error("Selecione uma oficina primeiro");
                  return;
                }
                try {
                  await base44.functions.invoke('enviarAtaEmail', {
                    atendimento_id: formData.id
                  });
                  toast.success("Ata enviada por email!");
                } catch (error) {
                  toast.error("Erro: " + error.message);
                }
              }}
            >
              <Send className="w-4 h-4 mr-2" />
              E-mail
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={!formData.ata_id}
              onClick={async () => {
                if (!formData.workshop_id) {
                  toast.error("Selecione uma oficina primeiro");
                  return;
                }
                try {
                  await base44.functions.invoke('disponibilizarAtaPlataforma', {
                    atendimento_id: formData.id
                  });
                  toast.success("Ata disponibilizada na plataforma!");
                } catch (error) {
                  toast.error("Erro: " + error.message);
                }
              }}
            >
              <FileText className="w-4 h-4 mr-2" />
              Plataforma
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}