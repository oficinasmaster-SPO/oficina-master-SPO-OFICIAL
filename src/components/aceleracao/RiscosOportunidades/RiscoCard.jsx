import React, { useState } from 'react';
import { ChevronDown, AlertCircle, AlertTriangle, AlertOctagon } from 'lucide-react';
import { Button } from '@/components/ui/button';

const severidadeConfig = {
  critico: {
    icon: AlertOctagon,
    color: 'bg-red-50 border-red-300',
    text: 'text-red-700',
    badge: 'bg-red-100 text-red-800',
    label: '🔴 CRÍTICO'
  },
  alto: {
    icon: AlertTriangle,
    color: 'bg-orange-50 border-orange-300',
    text: 'text-orange-700',
    badge: 'bg-orange-100 text-orange-800',
    label: '🟠 ALTO'
  },
  medio: {
    icon: AlertCircle,
    color: 'bg-yellow-50 border-yellow-300',
    text: 'text-yellow-700',
    badge: 'bg-yellow-100 text-yellow-800',
    label: '🟡 MÉDIO'
  }
};

export default function RiscoCard({ risco, onAcao }) {
  const [expanded, setExpanded] = useState(false);
  const config = severidadeConfig[risco.severidade] || severidadeConfig.medio;
  const Icon = config.icon;

  return (
    <div className={`border-2 rounded-lg p-4 ${config.color}`}>
      {/* Header */}
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3">
          <Icon className={`w-5 h-5 ${config.text}`} />
          <div>
            <h3 className={`font-bold ${config.text}`}>{risco.titulo}</h3>
            <p className="text-sm text-gray-600">{risco.descricao}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-sm font-bold ${config.badge}`}>
            {risco.total} cliente{risco.total !== 1 ? 's' : ''}
          </span>
          <ChevronDown className={`w-5 h-5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Detalhes Expandidos */}
      {expanded && (
        <div className="mt-4 space-y-2 border-t-2 pt-4">
          {risco.clientes && risco.clientes.length > 0 ? (
            risco.clientes.map((cliente, idx) => (
              <div key={idx} className="flex items-center justify-between bg-white bg-opacity-60 p-2 rounded">
                <div className="text-sm">
                  <p className="font-medium">{cliente.name}</p>
                  {cliente.dias_atrasado && (
                    <p className="text-xs text-gray-600">{cliente.dias_atrasado} dia(s) atrasado</p>
                  )}
                  {cliente.detalhes && (
                    <p className="text-xs text-gray-600">{cliente.detalhes}</p>
                  )}
                </div>
                {onAcao && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onAcao(risco, cliente)}
                    className="text-xs"
                  >
                    Agir
                  </Button>
                )}
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-600">Nenhum cliente em risco nesta categoria</p>
          )}
        </div>
      )}
    </div>
  );
}