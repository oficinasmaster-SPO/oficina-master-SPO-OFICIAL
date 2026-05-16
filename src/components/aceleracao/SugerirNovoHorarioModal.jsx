import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Calendar, Clock, AlertCircle, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function SugerirNovoHorarioModal({ isOpen, onClose, atendimento, consultor }) {
  const [dataSugerida, setDataSugerida] = useState("");
  const [horaSugerida, setHoraSugerida] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [mostrarAlternativas, setMostrarAlternativas] = useState(false);

  // Validar e sugerir
  const sugerirMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke("sugerirNovoHorario", {
        atendimento_id: atendimento.id,
        data_sugerida: dataSugerida,
        hora_sugerida: horaSugerida,
        mensagem_cliente: mensagem,
        workshop_id: atendimento.workshop_id
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.alternativas && data.alternativas.length > 0) {
        setMostrarAlternativas(true);
      } else {
        toast.success(data.message || "Sugestão enviada com sucesso!");
        onClose();
      }
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao enviar sugestão");
    }
  });

  const handleSugerir = () => {
    // Validações básicas
    if (!dataSugerida || !horaSugerida) {
      toast.error("Preencha data e hora");
      return;
    }

    const dataSugerida_date = new Date(`${dataSugerida}T${horaSugerida}`);
    const dataAtendimentoOriginal = new Date(atendimento.data_agendada);

    if (dataSugerida_date <= new Date()) {
      toast.error("Data e hora devem ser no futuro");
      return;
    }

    sugerirMutation.mutate();
  };

  const dataAtendimentoFormatada = atendimento.data_agendada
    ? new Date(atendimento.data_agendada).toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      })
    : "Não informada";

  const horaAtendimento = atendimento.data_agendada
    ? new Date(atendimento.data_agendada).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit"
      })
    : "Não informada";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            Sugerir Novo Horário
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Atendimento Original */}
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs font-medium text-gray-600 mb-2">Atendimento Original</p>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-gray-700">{dataAtendimentoFormatada}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-gray-700">{horaAtendimento}</span>
              </div>
            </div>
            {consultor && (
              <p className="text-xs text-gray-600 mt-2">
                <strong>Consultor:</strong> {consultor.nome || consultor.full_name}
              </p>
            )}
          </div>

          {!mostrarAlternativas ? (
            <>
              {/* Nova Data */}
              <div>
                <Label className="text-sm font-medium">Data Sugerida</Label>
                <Input
                  type="date"
                  value={dataSugerida}
                  onChange={(e) => setDataSugerida(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="mt-1"
                />
              </div>

              {/* Nova Hora */}
              <div>
                <Label className="text-sm font-medium">Hora Sugerida</Label>
                <Input
                  type="time"
                  value={horaSugerida}
                  onChange={(e) => setHoraSugerida(e.target.value)}
                  className="mt-1"
                />
              </div>

              {/* Mensagem */}
              <div>
                <Label className="text-sm font-medium">Mensagem (Opcional)</Label>
                <Textarea
                  placeholder="Conte ao consultor por que precisa mudar..."
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  className="mt-1 resize-none"
                  rows={3}
                />
              </div>

              <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-sm text-blue-800">
                  Sua sugestão será analisada pelo consultor. Você receberá uma notificação quando a nova data for confirmada.
                </AlertDescription>
              </Alert>
            </>
          ) : (
            <AlternativasPanel alternativas={mostrarAlternativas.alternativas} />
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              if (mostrarAlternativas) {
                setMostrarAlternativas(false);
              } else {
                onClose();
              }
            }}
          >
            {mostrarAlternativas ? "Voltar" : "Cancelar"}
          </Button>
          {!mostrarAlternativas && (
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={sugerirMutation.isPending || !dataSugerida || !horaSugerida}
              onClick={handleSugerir}
            >
              {sugerirMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-1" />
                  Enviar Sugestão
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Painel de alternativas de consultores
function AlternativasPanel({ alternativas }) {
  return (
    <div className="space-y-3">
      <Alert className="bg-amber-50 border-amber-200">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-sm text-amber-800">
          Seu consultor não tem disponibilidade nesse horário. Confira essas alternativas:
        </AlertDescription>
      </Alert>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {alternativas.map((alt, idx) => (
          <div key={idx} className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-sm text-gray-900">{alt.consultor_nome}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(alt.data).toLocaleDateString("pt-BR", {
                      weekday: "short",
                      day: "2-digit",
                      month: "2-digit"
                    })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {alt.hora}
                  </span>
                </div>
              </div>
              {alt.prioridade && (
                <Badge variant="outline" className="text-xs">
                  Prioridade {alt.prioridade}
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-500 text-center">
        Clique em "Voltar" para confirmar sua primeira sugestão ou escolha uma alternativa
      </p>
    </div>
  );
}