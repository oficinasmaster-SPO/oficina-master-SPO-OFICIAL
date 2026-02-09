import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, CheckCircle2, Star, Users, FileText, Image } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ActivityDetailsModal({ activity, onClose }) {
  if (!activity) return null;

  const getStatusColor = (status) => {
    const colors = {
      pendente: "bg-yellow-100 text-yellow-800 border-yellow-300",
      em_andamento: "bg-blue-100 text-blue-800 border-blue-300",
      concluida: "bg-green-100 text-green-800 border-green-300"
    };
    return colors[status] || colors.pendente;
  };

  return (
    <Dialog open={!!activity} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{activity.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Status e Tipo */}
          <div className="flex flex-wrap gap-3">
            <Badge className={`${getStatusColor(activity.status)} border px-4 py-1.5`}>
              {activity.status === 'pendente' ? 'Pendente' : 
               activity.status === 'em_andamento' ? 'Em Andamento' : 'Concluída'}
            </Badge>
            <Badge variant="outline" className="px-4 py-1.5">
              {activity.type}
            </Badge>
            {activity.auto_generated && (
              <Badge variant="secondary" className="px-4 py-1.5">
                Auto-gerada
              </Badge>
            )}
          </div>

          {/* Datas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-xs text-gray-600 font-medium">Agendada para</p>
                <p className="text-sm font-semibold text-gray-900">
                  {format(new Date(activity.scheduled_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>
            </div>

            {activity.completion_date && (
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-xs text-gray-600 font-medium">Realizada em</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {format(new Date(activity.completion_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Descrição */}
          {activity.description && (
            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Descrição
              </h4>
              <p className="text-gray-700 whitespace-pre-line">{activity.description}</p>
            </div>
          )}

          {/* Notas de Conclusão */}
          {activity.completion_notes && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                Notas da Execução
              </h4>
              <p className="text-gray-700 whitespace-pre-line">{activity.completion_notes}</p>
            </div>
          )}

          {/* Avaliação */}
          {activity.effectiveness_rating > 0 && (
            <div className="flex items-center gap-3">
              <span className="font-semibold text-gray-900">Efetividade:</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-5 h-5 ${
                      star <= activity.effectiveness_rating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                ))}
                <span className="ml-2 text-sm text-gray-600">
                  ({activity.effectiveness_rating}/5)
                </span>
              </div>
            </div>
          )}

          {/* Participantes */}
          {activity.participants_list && activity.participants_list.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Participantes ({activity.participants_list.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {activity.participants_list.map((name, i) => (
                  <Badge key={i} variant="secondary" className="px-3 py-1">
                    {name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Evidência */}
          {activity.evidence_url && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Image className="w-4 h-4" />
                Evidência
              </h4>
              <a 
                href={activity.evidence_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <FileText className="w-4 h-4" />
                Ver arquivo anexado
              </a>
            </div>
          )}

          {/* Observações adicionais */}
          {activity.notes && (
            <div className="border-t pt-4">
              <h4 className="font-semibold text-gray-900 mb-2">Observações</h4>
              <p className="text-gray-700 text-sm whitespace-pre-line">{activity.notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}