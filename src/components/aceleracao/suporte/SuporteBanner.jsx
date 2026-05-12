import React from "react";

/**
 * Banner âmbar que aparece no topo do modal quando o atendimento é do tipo Suporte.
 * Sinaliza visualmente ao consultor que ele está fora do ciclo normal de follow-ups.
 */
export default function SuporteBanner({ followUp }) {
  const isSuporte = followUp?.origin_type === 'suporte';
  const isCheckin = followUp?.origin_type === 'suporte_checkin';

  if (!isSuporte && !isCheckin) return null;

  return (
    <div className="bg-amber-500 text-amber-950 px-5 py-2.5 flex items-center gap-3 flex-shrink-0 border-b border-amber-600">
      <span className="text-lg flex-shrink-0">🛟</span>
      <div className="flex-1 min-w-0 flex items-center flex-wrap gap-x-2 gap-y-0.5">
        <span className="font-bold text-sm">
          {isCheckin ? 'Check-in Pós-Suporte' : 'Suporte ao Cliente'}
        </span>
        {followUp?.suporte_id && (
          <span className="font-mono text-xs bg-amber-700/20 border border-amber-700/30 px-2 py-0.5 rounded-full">
            {followUp.suporte_id}
          </span>
        )}
        <span className="text-xs text-amber-800">
          {isCheckin
            ? '· Verificar se a demanda foi resolvida'
            : '· Demanda reativa — fora do ciclo de follow-ups'}
        </span>
      </div>
    </div>
  );
}