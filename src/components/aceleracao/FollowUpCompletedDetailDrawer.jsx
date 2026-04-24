import React, { useState, useEffect } from "react";
import { X, Download, Eye, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const CANAL_LABELS = {
  ligacao: "Ligação",
  whatsapp: "WhatsApp",
  email: "E-mail",
  video: "Vídeo",
  presencial: "Presencial",
};

const RESULTADO_LABELS = {
  atendeu: "Atendeu",
  nao_atendeu: "Não atendeu",
  retornar: "Retornar",
  agendou: "Agendou",
  reagendou: "Reagendou",
  desistiu: "Desistiu",
};

const PROXIMO_PASSO_LABELS = {
  reagendar: "Reagendar follow-up",
  agendar: "Agendar sessão",
  enviar: "Enviar material",
  escalar: "Escalar para gestor",
  concluir: "Concluir programa",
  cancelar: "Cancelamento",
};

export default function FollowUpCompletedDetailDrawer({ followUp, open, onClose }) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);

  // Carregar dados do atendimento do localStorage quando o follow-up for selecionado
  React.useEffect(() => {
    if (open && followUp?.id) {
      const storageKey = `draft_atendimento_${followUp.id}`;
      const savedData = localStorage.getItem(storageKey);
      if (savedData) {
        try {
          setAttendanceData(JSON.parse(savedData));
        } catch (err) {
          console.error('Erro ao carregar dados do atendimento:', err);
        }
      }
    }
  }, [open, followUp?.id]);

  if (!followUp) return null;

  const data = attendanceData || {};

  const handleDownloadImage = (image) => {
    const link = document.createElement("a");
    link.href = image.src;
    link.download = image.name || "imagem.png";
    link.click();
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "—";
    try {
      return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent className="w-full md:w-[500px] max-h-[95vh] overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>Detalhes do Follow-up Concluído</SheetTitle>
          </SheetHeader>

          {!attendanceData && (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Follow-up Concluído</h3>
              <p className="text-sm text-gray-600">
                Este follow-up foi completado, mas não contém dados de atendimento registrados.
              </p>
              <p className="text-xs text-gray-500 mt-4">
                Dados de atendimento são registrados apenas para follow-ups concluídos após as novas atualizações do sistema.
              </p>
            </div>
          )}

          {attendanceData && (
            <div className="space-y-6">
            {/* Consultor */}
            <div className="border-b pb-4">
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">
                Consultor Responsável
              </p>
              <p className="text-sm text-gray-900">{followUp?.consultor_nome || "—"}</p>
            </div>

            {/* Data e Hora */}
            <div className="grid grid-cols-2 gap-4 border-b pb-4">
              <div>
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">
                  Data do Contato
                </p>
                <p className="text-sm text-gray-900">{formatDate(data.dataContato)}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">
                  Tempo de Atendimento
                </p>
                <p className="text-sm text-gray-900">{data.duracao || "—"} min</p>
              </div>
            </div>

            {/* Canal de Contato */}
            <div className="border-b pb-4">
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">
                Canal de Contato
              </p>
              <p className="text-sm text-gray-900">
                {CANAL_LABELS[data.canal] || data.canal || "—"}
              </p>
            </div>

            {/* Resultado do Contato */}
            <div className="border-b pb-4">
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">
                Resultado do Contato
              </p>
              <p className="text-sm text-gray-900">
                {RESULTADO_LABELS[data.resultado] || data.resultado || "—"}
              </p>
            </div>

            {/* Humor do Cliente */}
            <div className="border-b pb-4">
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">
                Humor do Cliente
              </p>
              <p className="text-sm text-gray-900">{data.humor || "—"}</p>
            </div>

            {/* Engajamento */}
            <div className="border-b pb-4">
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">
                Engajamento
              </p>
              <p className="text-sm text-gray-900">{data.engajamento || "—"}</p>
            </div>

            {/* Observações */}
            <div className="border-b pb-4">
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">
                Observações
              </p>
              <p className="text-sm text-gray-900 whitespace-pre-wrap">
                {data.observacoes || "—"}
              </p>
            </div>

            {/* Compromissos do Cliente */}
            <div className="border-b pb-4">
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">
                Compromissos do Cliente
              </p>
              <p className="text-sm text-gray-900 whitespace-pre-wrap">
                {data.compromissos || "—"}
              </p>
            </div>

            {/* Próximo Passo */}
            <div className="border-b pb-4">
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">
                Próximo Passo
              </p>
              <p className="text-sm text-gray-900">
                {PROXIMO_PASSO_LABELS[data.proximoPasso] || data.proximoPasso || "—"}
              </p>
            </div>

            {/* Data/Hora Próximo Contato */}
            {(data.proxData || data.proxHora) && (
              <div className="grid grid-cols-2 gap-4 border-b pb-4">
                <div>
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">
                    Data Próx. Contato
                  </p>
                  <p className="text-sm text-gray-900">{formatDate(data.proxData) || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">
                    Hora
                  </p>
                  <p className="text-sm text-gray-900">{data.proxHora || "—"}</p>
                </div>
              </div>
            )}

            {/* Documentos */}
            {data.documentos && data.documentos.length > 0 && (
              <div className="border-b pb-4">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-3">
                  Documentos Anexados
                </p>
                <div className="space-y-2">
                  {data.documentos.map((doc, idx) => (
                    <a
                      key={idx}
                      href={doc}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 rounded border border-gray-200 hover:bg-gray-50 text-sm text-blue-600 hover:underline"
                    >
                      <Download className="w-4 h-4" />
                      Baixar documento
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Screenshots/Imagens */}
            {data.pastedImages && data.pastedImages.length > 0 && (
              <div className="pb-4">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-3">
                  Screenshots ({data.pastedImages.length})
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {data.pastedImages.map((img, idx) => (
                    <div
                      key={idx}
                      className="relative group rounded-lg overflow-hidden border border-gray-200 bg-white cursor-pointer"
                      onClick={() => setSelectedImage(img)}
                    >
                      <img
                        src={img.src}
                        alt={img.name}
                        className="w-full h-24 object-cover group-hover:opacity-75 transition"
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-black/50">
                        <Eye className="w-5 h-5 text-white" />
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadImage(img);
                        }}
                        className="absolute bottom-1 right-1 bg-blue-600 text-white rounded p-1 opacity-0 group-hover:opacity-100 transition"
                        title="Baixar imagem"
                      >
                        <Download className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            </div>
          )}

          <div className="mt-8 pt-4 border-t">
            <Button variant="outline" className="w-full" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Image Preview Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative bg-white rounded-lg max-w-2xl w-full">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 bg-gray-200 hover:bg-gray-300 p-2 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={selectedImage.src}
              alt={selectedImage.name}
              className="w-full h-auto rounded-lg"
            />
            <div className="p-4 border-t flex gap-2">
              <p className="flex-1 text-sm text-gray-700">{selectedImage.name}</p>
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownloadImage(selectedImage);
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                Baixar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}