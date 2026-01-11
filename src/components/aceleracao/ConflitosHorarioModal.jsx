import React, { useState, useEffect } from "react";
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
import { AlertTriangle, Calendar, Clock, MapPin, FileText, CheckCircle2, Loader2 } from "lucide-react";
import { format, addMinutes, parse } from "date-fns";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function ConflitosHorarioModal({ 
  open, 
  onOpenChange, 
  conflitos, 
  dataHorario,
  consultorId,
  onSelectHorario
}) {
  const [horariosSugeridos, setHorariosSugeridos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && dataHorario && consultorId) {
      gerarHorariosSugeridos();
    }
  }, [open, dataHorario, consultorId]);

  const gerarHorariosSugeridos = async () => {
    setIsLoading(true);
    try {
      const dataBase = new Date(dataHorario);
      const diaSemana = dataBase.getDay();
      
      // Não sugerir para fins de semana
      if (diaSemana === 0 || diaSemana === 6) {
        setHorariosSugeridos([]);
        setIsLoading(false);
        return;
      }

      const sugestoes = [];
      const horariosComerciais = [
        '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
        // Pausa almoço 12:00 - 14:00
        '14:00', '14:30', '15:00', '15:30', '16:00'
      ];

      for (const horario of horariosComerciais) {
        const [hora, minuto] = horario.split(':');
        const dataCompleta = new Date(dataBase);
        dataCompleta.setHours(parseInt(hora), parseInt(minuto), 0, 0);
        const dataHoraStr = dataCompleta.toISOString().slice(0, 19);

        try {
          const response = await base44.functions.invoke('verificarConflitoHorario', {
            consultor_id: consultorId,
            data_agendada: dataHoraStr
          });

          if (!response.data.conflito) {
            sugestoes.push({
              horario,
              dataCompleta: dataHoraStr,
              disponivel: true
            });
          }
        } catch (error) {
          console.error(`Erro ao verificar ${horario}:`, error);
        }
      }

      setHorariosSugeridos(sugestoes.slice(0, 8)); // Top 8 sugestões
    } catch (error) {
      console.error('Erro ao gerar sugestões:', error);
      toast.error('Erro ao gerar sugestões de horário');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelecionarHorario = (sugestao) => {
    if (onSelectHorario) {
      const dataObj = new Date(sugestao.dataCompleta);
      onSelectHorario({
        data: dataObj.toISOString().split('T')[0],
        hora: sugestao.horario
      });
      toast.success(`Horário atualizado para ${sugestao.horario}`);
      onOpenChange(false);
    }
  };

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
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
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

        <div className="grid grid-cols-2 gap-6">
          {/* Coluna Esquerda: Conflitos */}
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

          {/* Coluna Direita: Sugestões */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Horários Disponíveis
            </h3>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Buscando horários...</span>
              </div>
            ) : horariosSugeridos.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>Nenhum horário disponível encontrado</p>
                <p className="text-sm mt-1">Tente outro dia ou horário</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {horariosSugeridos.map((sugestao, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    className="h-auto py-3 flex flex-col items-center gap-1 hover:bg-green-50 hover:border-green-300 transition-colors"
                    onClick={() => handleSelecionarHorario(sugestao)}
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span className="font-semibold text-base">{sugestao.horario}</span>
                    </div>
                    <span className="text-xs text-gray-600">Disponível</span>
                  </Button>
                ))}
              </div>
            )}

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800">
                <strong>Horário comercial:</strong> 8h às 16h (pausa 12h-14h)
              </p>
            </div>
          </div>
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