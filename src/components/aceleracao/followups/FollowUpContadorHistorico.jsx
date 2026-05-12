import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

/**
 * Exibe histórico completo de um FollowUpContador
 * Mostra todos os ciclos concluídos com snapshots
 */
export default function FollowUpContadorHistorico({ fu }) {
  const [expandidos, setExpandidos] = useState({});

  if (!fu?.historico || fu.historico.length === 0) {
    return (
      <Card className="bg-gray-50 border-gray-200">
        <CardHeader>
          <CardTitle className="text-sm">Histórico</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-gray-400 text-center py-8">
          Nenhum follow-up concluído ainda
        </CardContent>
      </Card>
    );
  }

  const toggleExpand = (numero) => {
    setExpandidos(prev => ({
      ...prev,
      [numero]: !prev[numero]
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">
          Histórico ({fu.historico.length} ciclo{fu.historico.length !== 1 ? 's' : ''})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {fu.historico.map((item) => {
          const isOpen = expandidos[item.numero];
          const evolucao = item.metricas?.evolucao || 'N/A';
          const duracao = item.dias_duracao || 0;

          return (
            <div key={item.numero} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Header */}
              <button
                onClick={() => toggleExpand(item.numero)}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-center gap-3 flex-1">
                  <Badge className="bg-blue-100 text-blue-700 border-blue-300">
                    #{item.numero}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.motivo_fechamento}
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(item.data_criacao), 'dd/MM')} → {format(new Date(item.data_baixa), 'dd/MM')} ({duracao}d)
                    </p>
                  </div>
                </div>
                {isOpen ? (
                  <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                )}
              </button>

              {/* Detalhes */}
              {isOpen && (
                <div className="border-t border-gray-100 bg-gray-50 p-3 space-y-3">
                  {/* Evolução */}
                  <div>
                    <p className="text-xs font-semibold text-gray-700 mb-1">Evolução</p>
                    <p className="text-sm text-gray-600">{evolucao}</p>
                  </div>

                  {/* Métricas */}
                  {item.metricas && (
                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-2">Métricas</p>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(item.metricas).map(([key, value]) => (
                          <div key={key} className="bg-white rounded p-2 border border-gray-200">
                            <p className="text-xs text-gray-500 capitalize">
                              {key.replace(/_/g, ' ')}
                            </p>
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {value}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Snapshot */}
                  {item.snapshot && (
                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-2">Snapshot</p>
                      <div className="bg-white rounded p-2 border border-gray-200 text-xs text-gray-600 space-y-1">
                        {Object.entries(item.snapshot).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="capitalize">{key.replace(/_/g, ' ')}:</span>
                            <span className="font-medium text-gray-900">
                              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}