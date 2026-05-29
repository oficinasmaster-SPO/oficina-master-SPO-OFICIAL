import React from "react";
import { AlertCircle, ShieldAlert } from "lucide-react";
import { isSuporteFlow } from "@/utils/suporteHelper";

/**
 * SuporteFormBanner
 *
 * Banner de sinalização de modo suporte dentro do formulário de atendimento.
 * Aparece somente quando origin_type = 'suporte' | 'suporte_checkin'.
 *
 * Contratos (cobertos por tests/suporte/suporteFormBanner.test.js):
 *  - null / undefined / tipos padrão → não renderiza
 *  - origin_type='suporte'          → "Modo Suporte Ativo" + protocolo + descrição de urgência
 *  - origin_type='suporte_checkin'  → "Check-in de Suporte" + protocolo + descrição de acompanhamento
 */
export default function SuporteFormBanner({ followUp }) {
  if (!isSuporteFlow(followUp)) return null;

  const isCheckin = followUp.origin_type === 'suporte_checkin';

  const label = isCheckin ? 'Check-in de Suporte' : 'Modo Suporte Ativo';
  const description = isCheckin
    ? 'Este é um check-in de acompanhamento pós-suporte.'
    : 'Atendimento fora do fluxo padrão de follow-up — registre com atenção.';

  return (
    <div
      role="status"
      aria-label={`Banner: ${label}`}
      className="rounded-lg border-l-4 border-amber-500 bg-amber-50 px-4 py-3 flex items-start gap-3"
    >
      {/* Ícone */}
      <div className="flex-shrink-0 mt-0.5">
        {isCheckin
          ? <AlertCircle className="w-5 h-5 text-amber-600" />
          : <ShieldAlert className="w-5 h-5 text-amber-600" />
        }
      </div>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        {/* Título em linha com emoji */}
        <p className="text-xs font-bold text-amber-900 uppercase tracking-wide flex items-center gap-1.5">
          <span>{isCheckin ? '🔔' : '🛟'}</span>
          {label}
        </p>

        {/* Descrição */}
        <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
          {description}
        </p>

        {/* Protocolo — só exibe se presente */}
        {followUp.suporte_id && (
          <p className="text-[11px] text-amber-700 mt-1 font-mono bg-amber-100 border border-amber-200 rounded px-2 py-0.5 inline-block">
            Protocolo: <span className="font-bold">{followUp.suporte_id}</span>
          </p>
        )}
      </div>
    </div>
  );
}