import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Calendar, Clock, User, Building2, Save, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AtaSaveConfirmDialog({ open, onOpenChange, formData, workshop, status, loading, onConfirm }) {
  const isFinalizar = status === "finalizada";
  
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    try {
      return format(new Date(dateStr + "T12:00:00"), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <FileText className="w-5 h-5 text-blue-600" />
            Confirmar {isFinalizar ? "Finalização" : "Salvamento"} da ATA
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-gray-600">
            Confira os dados abaixo antes de {isFinalizar ? "finalizar" : "salvar"} a ATA:
          </p>

          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Building2 className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-500 font-medium">Cliente</p>
                <p className="text-sm font-semibold text-gray-900">{workshop?.name || "Não definido"}</p>
                {workshop?.city && (
                  <p className="text-xs text-gray-500">{workshop.city}/{workshop.state}</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <User className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-500 font-medium">Consultor</p>
                <p className="text-sm font-semibold text-gray-900">{formData?.consultor_name || "Não definido"}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <FileText className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-500 font-medium">Tipo / Tema</p>
                <p className="text-sm font-semibold text-gray-900 capitalize">{formData?.tipo_aceleracao || "-"}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-500 font-medium">Data</p>
                <p className="text-sm font-semibold text-gray-900">{formatDate(formData?.meeting_date)}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-500 font-medium">Horário</p>
                <p className="text-sm font-semibold text-gray-900">{formData?.meeting_time || "-"}</p>
              </div>
            </div>

            {formData?.participantes?.filter(p => p.name).length > 0 && (
              <div className="flex items-start gap-3">
                <User className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 font-medium">Participantes ({formData.participantes.filter(p => p.name).length})</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {formData.participantes.filter(p => p.name).map((p, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{p.name}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <Badge className={isFinalizar ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
              {isFinalizar ? "Finalizada" : "Rascunho"}
            </Badge>
            <span className="text-xs text-gray-600">
              {isFinalizar 
                ? "A ATA será salva como finalizada e o atendimento marcado como realizado." 
                : "A ATA será salva como rascunho e poderá ser editada depois."
              }
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Voltar e Revisar
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            className={isFinalizar ? "bg-blue-600 hover:bg-blue-700" : ""}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Confirmar e {isFinalizar ? "Finalizar" : "Salvar"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}