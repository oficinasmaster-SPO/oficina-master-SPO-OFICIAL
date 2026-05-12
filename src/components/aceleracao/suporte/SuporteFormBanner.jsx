import React from "react";

/**
 * Banner simples dentro do formulário de atendimento.
 * Aparece quando o usuário está em modo suporte, indicando que não é um follow-up padrão.
 */
export default function SuporteFormBanner({ followUp }) {
  const isSuporte = followUp?.origin_type === 'suporte';
  const isCheckin = followUp?.origin_type === 'suporte_checkin';

  if (!isSuporte && !isCheckin) return null;

  return (
    <div className="rounded-lg border-l-4 border-amber-500 bg-amber-50 px-3 py-2.5 flex items-start gap-2">
      <span className="text-lg flex-shrink-0 mt-0.5">🛟</span>
      <div className="flex-1">
        <p className="text-xs font-bold text-amber-900 uppercase tracking-wide">
          {isCheckin ? 'Check-in de Suporte' : 'Registro de Suporte'}
        </p>
        {followUp?.suporte_id && (
          <p className="text-xs text-amber-700 mt-0.5">
            Protocolo: {followUp.suporte_id}
          </p>
        )}
      </div>
    </div>
  );
}