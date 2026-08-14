import React from "react";
import { CheckCircle2, RefreshCw, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * S3 — Hint exibido quando o consultor fechou todos os follow-ups do dia.
 *
 * Etapa 1: Sugere revisitar clientes que não responderam.
 * Etapa 2: Se o outro consultor ainda tem pendentes, oferece ajudar.
 *
 * Props:
 *   naoRespondidos   — número de clientes "não atendeu / aguardando" do consultor
 *   outroConsultor   — { nome, pendentesHoje } do outro consultor (null se não há)
 *   onVerNaoRespondidos — callback pra filtrar lista por não-respondidos
 *   onAjudarColega      — callback pra assumir follow-up do colega
 */
export default function DayCompletedHint({
  naoRespondidos = 0,
  outroConsultor = null,
  onVerNaoRespondidos,
  onAjudarColega,
}) {
  return (
    <div className="rounded-xl border-2 border-dashed border-emerald-300 bg-gradient-to-r from-emerald-50 to-green-50 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
        <p className="text-sm font-bold text-emerald-800">
          Parabéns! Dia concluído.
        </p>
      </div>

      {/* Etapa 1 — Revisitar não-respondidos */}
      {naoRespondidos > 0 && (
        <div className="flex items-start gap-2 bg-white/70 rounded-lg p-3 border border-emerald-200">
          <RefreshCw className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-700 leading-relaxed">
              Valide se algum dos <strong className="text-amber-700">{naoRespondidos} cliente{naoRespondidos !== 1 ? 's' : ''}</strong> que
              não responderam já mandou alguma mensagem.
            </p>
            {onVerNaoRespondidos && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-1.5 h-7 text-xs text-amber-700 hover:text-amber-800 hover:bg-amber-50 px-2"
                onClick={onVerNaoRespondidos}
              >
                Ver lista de não-respondidos
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Etapa 2 — Ajudar o colega */}
      {outroConsultor && outroConsultor.pendentesHoje > 0 && (
        <div className="flex items-start gap-2 bg-white/70 rounded-lg p-3 border border-blue-200">
          <Users className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-700 leading-relaxed">
              Deseja ajudar <strong className="text-blue-700">{outroConsultor.nome}</strong>?
              {' '}Ainda {outroConsultor.pendentesHoje === 1 ? 'resta' : 'restam'}{' '}
              <strong className="text-blue-700">{outroConsultor.pendentesHoje}</strong>{' '}
              follow-up{outroConsultor.pendentesHoje !== 1 ? 's' : ''} pendente{outroConsultor.pendentesHoje !== 1 ? 's' : ''} hoje.
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              Os atendimentos serão registrados como executor por você. A empresa continua atribuída a {outroConsultor.nome}.
            </p>
            {onAjudarColega && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-1.5 h-7 text-xs text-blue-700 hover:text-blue-800 hover:bg-blue-50 px-2"
                onClick={onAjudarColega}
              >
                Assumir próximo follow-up
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
