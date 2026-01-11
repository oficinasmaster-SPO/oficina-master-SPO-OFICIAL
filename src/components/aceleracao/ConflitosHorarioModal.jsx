import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Calendar, Clock, MapPin, FileText } from "lucide-react";
import { format } from "date-fns";

export default function ConflitosHorarioModal({ open, onOpenChange, conflitos, dataHorario }) {
  if (!conflitos || conflitos.length === 0) return null;

  const getStatusColor = (status) => {
    const cores = {
      agendado: "bg-blue-100 text-blue-800",
      confirmado: "bg-green-100 text-green-800",
      participando: "bg-yellow-100 text-yellow-800",
      realizado: "bg-gray-100 text-gray-800"
    };
    return cores[status] || "bg-gray-100 text-gray-800";
  };

  const getStatusLabel = (status) => {
    const labels = {
      agendado: "Agendado",
      confirmado: "Confirmado",
      participando: "Em andamento",
      realizado: "Realizado"
    };
    return labels[status] || status;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <DialogTitle className="text-xl">Conflito de Horário Detectado</DialogTitle>
              <DialogDescription className="text-base mt-1">
                {conflitos.length > 1 
                  ? `Existem ${conflitos.length} atendimentos já agendados para este horário`
                  : 'Já existe um atendimento agendado para este horário'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 text-yellow-800">
            <Clock className="w-5 h-5" />
            <p className="font-semibold">
              Horário solicitado: {dataHorario ? format(new Date(dataHorario), "dd/MM/yyyy 'às' HH:mm") : 'Não informado'}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900">
            Atendimento{conflitos.length > 1 ? 's' : ''} já agendado{conflitos.length > 1 ? 's' : ''}:
          </h3>

          {conflitos.map((atendimento, index) => (
            <div
              key={atendimento.id}
              className="border border-gray-200 rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-gray-900">
                      {atendimento.workshop?.name || 'Oficina não identificada'}
                    </span>
                    <Badge className={getStatusColor(atendimento.status)}>
                      {getStatusLabel(atendimento.status)}
                    </Badge>
                  </div>
                  {atendimento.workshop?.city && (
                    <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
                      <MapPin className="w-4 h-4" />
                      <span>{atendimento.workshop.city}{atendimento.workshop.state && ` - ${atendimento.workshop.state}`}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>{format(new Date(atendimento.data_agendada), "dd/MM/yyyy 'às' HH:mm")}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>Duração: {atendimento.duracao_minutos || 60} min</span>
                </div>
                {atendimento.tipo_atendimento && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <FileText className="w-4 h-4" />
                    <span>{atendimento.tipo_atendimento}</span>
                  </div>
                )}
              </div>

              {atendimento.observacoes && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold">Observações:</span> {atendimento.observacoes}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        <DialogFooter className="mt-6">
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Escolher outro horário
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}