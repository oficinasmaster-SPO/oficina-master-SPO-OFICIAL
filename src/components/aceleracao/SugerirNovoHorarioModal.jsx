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

// Retorna true se o atendimento está em modo reagendamento
// (data já passou OU falta menos de 8h)
function isModoReagendamento(atendimento) {
  if (!atendimento?.data_agendada) return false;
  const agora = new Date();
  const dataAtendimento = new Date(atendimento.data_agendada);
  const diffMs = dataAtendimento - agora;
  const oitoHorasMs = 8 * 60 * 60 * 1000;
  return diffMs < oitoHorasMs; // já passou ou < 8h
}

export default function SugerirNovoHorarioModal({ isOpen, onClose, atendimento, consultor }) {
  const [dataSugerida, setDataSugerida] = useState("");
  const [horaSugerida, setHoraSugerida] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [alternativas, setAlternativas] = useState(null);

  const modoReagendamento = isModoReagendamento(atendimento);

  const sugerirMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke("sugerirNovoHorario", {
        atendimento_id: atendimento.id,
        data_sugerida: dataSugerida,
        hora_sugerida: horaSugerida,
        mensagem_cliente: mensagem,
        workshop_id: atendimento.workshop_id,
        modo_reagendamento: modoReagendamento
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.alternativas && data.alternativas.length > 0) {
        setAlternativas(data.alternativas);
      } else {
        toast.success(data.message || (modoReagendamento
          ? "Solicitação de reagendamento enviada! O consultor irá confirmar."
          : "Sugestão enviada com sucesso!"));
        onClose();
      }
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao enviar sugestão");
    }
  });

  const handleSugerir = () => {
    if (!dataSugerida || !horaSugerida) {
      toast.error("Preencha data e hora");
      return;
    }
    const dataSugerida_date = new Date(`${dataSugerida}T${horaSugerida}`);
    if (dataSugerida_date <= new Date()) {
      toast.error("A nova data e hora devem ser no futuro");
      return;
    }
    sugerirMutation.mutate();
  };

  // Guard: evitar renderizar se atendimento for null
  if (!isOpen || !atendimento) return null;

  const dataAtendimentoFormatada = atendimento.data_agendada
    ? new Date(atendimento.data_agendada).toLocaleDateString("pt-BR", {
        weekday: "long", day: "2-digit", month: "2-digit", year: "numeric"
      })
    : "Não informada";

  const horaAtendimento = atendimento.data_agendada
    ? new Date(atendimento.data_agendada).toLocaleTimeString("pt-BR", {
        hour: "2-digit", minute: "2-digit"
      })
    : "Não informada";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            {modoReagendamento ? "Solicitar Reagendamento" : "Sugerir Novo Horário"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Atendimento Original */}
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs font-medium text-gray-600 mb-2">Atendimento Original</p>
            <div className="flex items-center gap-4 text-sm flex-wrap">
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

          {/* Banner de modo reagendamento */}
          {modoReagendamento && (
            <Alert className="bg-amber-50 border-amber-300">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-sm text-amber-900">
                <strong>Data próxima ou vencida.</strong> Esta solicitação entrará como <strong>reagendamento</strong> — o consultor irá confirmar a nova data e registrar o motivo.
              </AlertDescription>
            </Alert>
          )}

          {!alternativas ? (
            <>
              <div>
                <Label className="text-sm font-medium">Nova Data</Label>
                <Input
                  type="date"
                  value={dataSugerida}
                  onChange={(e) => setDataSugerida(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Novo Horário</Label>
                <Input
                  type="time"
                  value={horaSugerida}
                  onChange={(e) => setHoraSugerida(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Motivo / Mensagem {modoReagendamento ? "*" : "(Opcional)"}</Label>
                <Textarea
                  placeholder={modoReagendamento
                    ? "Explique o motivo do reagendamento..."
                    : "Conte ao consultor por que precisa mudar..."}
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  className="mt-1 resize-none"
                  rows={3}
                />
              </div>

              {!modoReagendamento && (
                <Alert className="bg-blue-50 border-blue-200">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-sm text-blue-800">
                    Sua sugestão será analisada pelo consultor. Você receberá uma notificação quando a nova data for confirmada.
                  </AlertDescription>
                </Alert>
              )}
            </>
          ) : (
            <AlternativasPanel alternativas={alternativas} />
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => alternativas ? setAlternativas(null) : onClose()}
          >
            {alternativas ? "Voltar" : "Cancelar"}
          </Button>
          {!alternativas && (
            <Button
              className={modoReagendamento ? "bg-amber-600 hover:bg-amber-700" : "bg-indigo-600 hover:bg-indigo-700"}
              disabled={sugerirMutation.isPending || !dataSugerida || !horaSugerida || (modoReagendamento && !mensagem.trim())}
              onClick={handleSugerir}
            >
              {sugerirMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Enviando...</>
              ) : (
                <><Check className="w-4 h-4 mr-1" />{modoReagendamento ? "Solicitar Reagendamento" : "Enviar Sugestão"}</>
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