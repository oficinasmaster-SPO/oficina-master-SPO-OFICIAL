import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Clock, Building2, CheckCircle, AlertCircle } from "lucide-react";

export default function ReunioesDetalhesModal({ isOpen, onClose, reunioes, tipo, workshops = [] }) {
  const getTitulo = () => {
    if (tipo === 'realizadas') return 'Reuniões Realizadas';
    if (tipo === 'futuras') return 'Reuniões Agendadas';
    if (tipo === 'atrasadas') return 'Atendimentos Atrasados';
    return 'Reuniões';
  };

  const getStatusColor = (status) => {
    const colors = {
      agendado: "bg-blue-100 text-blue-800",
      confirmado: "bg-green-100 text-green-800",
      realizado: "bg-gray-100 text-gray-800",
      cancelado: "bg-red-100 text-red-800"
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getWorkshopName = (workshopId) => {
    const workshop = workshops.find(w => w.id === workshopId);
    return workshop ? workshop.name : 'Cliente não identificado';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            {getTitulo()}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3">
          {reunioes && reunioes.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Nenhuma reunião encontrada</p>
          ) : (
            reunioes?.map((reuniao) => (
              <div key={reuniao.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1">
                    {tipo === 'atrasadas' ? (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    ) : tipo === 'realizadas' ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <Calendar className="w-5 h-5 text-blue-500" />
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">
                        {reuniao.tipo_atendimento?.replace(/_/g, ' ').toUpperCase() || 'Atendimento'}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                        <Building2 className="w-4 h-4" />
                        <span>{getWorkshopName(reuniao.workshop_id)}</span>
                      </div>
                    </div>
                  </div>
                  <Badge className={getStatusColor(reuniao.status)}>
                    {reuniao.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {format(
                        new Date(reuniao.data_realizada || reuniao.data_agendada), 
                        "dd 'de' MMMM 'de' yyyy", 
                        { locale: ptBR }
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>
                      {format(new Date(reuniao.data_agendada), "HH:mm", { locale: ptBR })} 
                      {' - '}
                      {reuniao.duracao_real_minutos || reuniao.duracao_minutos || 60}min
                    </span>
                  </div>
                </div>

                {reuniao.consultor_nome && (
                  <div className="mt-2 text-sm text-gray-600">
                    Consultor: <span className="font-medium">{reuniao.consultor_nome}</span>
                  </div>
                )}

                {tipo === 'atrasadas' && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-red-600 font-medium">
                      ⚠️ Atendimento não foi realizado na data prevista
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}