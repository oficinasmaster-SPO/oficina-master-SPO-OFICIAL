import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Clock, User, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const CANAL_ICONS = {
  ligacao: '📞',
  whatsapp: '💬',
  email: '📧',
  reuniao: '👥',
  video: '🎥',
};

const RESULTADO_COLORS = {
  atendeu: 'bg-green-100 text-green-800',
  nao_atendeu: 'bg-red-100 text-red-800',
  retornar: 'bg-amber-100 text-amber-800',
  agendou: 'bg-blue-100 text-blue-800',
  reagendou: 'bg-purple-100 text-purple-800',
  desistiu: 'bg-gray-100 text-gray-800',
};

export default function FollowUpConcluidoCard({ registro, isBatch = false }) {
  const [expanded, setExpanded] = useState(false);

  if (!registro) return null;

  const dataFormatada = format(
    new Date(registro.concluded_at || registro.completedAt),
    "dd 'de' MMMM 'às' HH:mm",
    { locale: ptBR }
  );

  const canalIcon = CANAL_ICONS[registro.canal] || '📋';
  const resultadoColor = RESULTADO_COLORS[registro.resultado] || 'bg-gray-100 text-gray-800';

  if (isBatch && registro.totalFUs > 1) {
    // Card consolidado para conclusão em massa
    return (
      <div className="border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl overflow-hidden">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-blue-100/50 transition-colors"
        >
          <div className="flex items-center gap-3 text-left flex-1">
            <div className="text-2xl">{canalIcon}</div>
            <div className="flex-1">
              <h4 className="font-bold text-gray-900">
                🎯 Conclusão em Massa — {registro.totalFUs} FUs
              </h4>
              <p className="text-sm text-gray-600 mt-0.5">
                <span className="font-semibold">Resultado:</span> {registro.resultado} ·{' '}
                <span className="font-semibold">Por:</span> {registro.concluded_by_name}
              </p>
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {dataFormatada}
              </p>
            </div>
          </div>
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-blue-600" />
          ) : (
            <ChevronDown className="w-5 h-5 text-blue-600" />
          )}
        </button>

        {expanded && (
          <div className="border-t border-blue-200 bg-white">
            {/* Lista dos FUs encerrados */}
            <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
              {registro.fusList.map((fu, idx) => (
                <div key={idx} className="px-4 py-2.5 flex items-start gap-3">
                  <span className="text-sm font-bold text-blue-600">✓</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {fu.workshop_name}
                    </p>
                    {fu.consultor_nome && (
                      <p className="text-xs text-gray-500">
                        Consultor: {fu.consultor_nome}
                      </p>
                    )}
                    {fu.observacoes && (
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                        {fu.observacoes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer com metadata */}
            <div className="px-4 py-3 bg-blue-50 border-t border-blue-200 text-[11px] text-gray-600 space-y-1">
              <p>
                <span className="font-semibold">Batch ID:</span>{' '}
                <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px]">
                  {registro.batch_group_id?.slice(-8)}
                </code>
              </p>
              <p>
                <span className="font-semibold">Horário exato:</span> {dataFormatada}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Card individual para conclusão simples
  return (
    <div className="border border-gray-200 bg-white rounded-lg overflow-hidden hover:shadow-md transition-shadow">
      <div className="px-4 py-3 flex items-start gap-3">
        <div className="text-2xl flex-shrink-0">{canalIcon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h4 className="font-semibold text-gray-900">
              {registro.workshop_name || 'Follow-up'}
            </h4>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${resultadoColor}`}>
              {registro.resultado}
            </span>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm text-gray-600 flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              {registro.concluded_by_name || registro.consultor_nome || 'Consultor'}
            </p>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {dataFormatada}
            </p>
            {registro.observacoes && (
              <p className="text-sm text-gray-600 mt-2 p-2 bg-gray-50 rounded line-clamp-3">
                {registro.observacoes}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}