import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';

const statusColor = {
  'atendeu': 'bg-green-50 text-green-700',
  'nao_atendeu': 'bg-red-50 text-red-700',
  'retornar': 'bg-yellow-50 text-yellow-700',
  'agendou': 'bg-blue-50 text-blue-700',
  'desistiu': 'bg-gray-50 text-gray-700'
};

const engajamentoColor = {
  'Alto': 'text-green-600',
  'Médio': 'text-yellow-600',
  'Baixo': 'text-red-600'
};

const humorEmoji = {
  'positivo': '😊',
  'neutro': '😐',
  'negativo': '😞'
};

const humorColor = {
  'positivo': 'text-green-600',
  'neutro': 'text-yellow-600',
  'negativo': 'text-red-600'
};

const formatData = (dateString) => {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleDateString('pt-BR');
  } catch {
    return dateString;
  }
};

const formatHora = (dateString) => {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '-';
  }
};

const statusBadge = {
  'realizado': 'bg-green-50 text-green-700 border border-green-200',
  'pendente': 'bg-orange-50 text-orange-700 border border-orange-200'
};

export default function Tabela({ dados = [], expandObservacoes = false }) {
  const [selectedObservacao, setSelectedObservacao] = useState(null);

  if (!dados || dados.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 border rounded-lg bg-gray-50">
        Nenhum registro encontrado para os filtros selecionados.
      </div>
    );
  }

  return (
    <>
      {/* Header da Tabela */}
      <div className="border-b border-gray-300 bg-gray-50 rounded-t-lg">
        <div className="grid grid-cols-14 gap-1 p-3 text-xs font-bold text-gray-700 print:grid-cols-12">
          <div className="col-span-1">Data</div>
          <div className="col-span-1">Hora</div>
          <div className="col-span-2">Oficina</div>
          <div className="col-span-1">Consultor</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-1">Canal</div>
          <div className="col-span-1">Resultado</div>
          <div className="col-span-1">Humor</div>
          <div className="col-span-1">Engajamento</div>
          <div className="col-span-1">Suporte</div>
          {!expandObservacoes && <div className="col-span-2">Observações</div>}
        </div>
      </div>

      {/* Dados */}
      <div className="space-y-1 border border-t-0 border-gray-200 rounded-b-lg divide-y">
        {dados.map((row, idx) => (
          <div key={row.id || `row-${idx}`} className={`transition-colors ${row.status === 'pendente' ? 'bg-orange-50/30 hover:bg-orange-50/50' : 'bg-white hover:bg-gray-50'}`}>
            {/* Linha Principal */}
            <div className="grid grid-cols-14 gap-1 p-3 text-sm items-center print:grid-cols-12">
              <div className="col-span-1 font-medium text-gray-900 whitespace-nowrap text-xs">
                {formatData(row.completedAt || row.dataContato || row.reminder_date)}
              </div>
              <div className="col-span-1 font-medium text-gray-900 whitespace-nowrap text-xs">
                {row.completedAt || row.dataContato ? formatHora(row.completedAt || row.dataContato) : '—'}
              </div>
              <div className="col-span-2 text-gray-700 font-medium text-xs truncate">{row.workshop_name || '-'}</div>
              <div className="col-span-1 text-xs text-gray-600 truncate">{row.consultor_nome || '-'}</div>
              <div className="col-span-1">
                <span className={`text-xs rounded px-2 py-1 whitespace-nowrap font-medium ${statusBadge[row.status] || 'bg-gray-100 text-gray-700'}`}>
                  {row.status === 'pendente' ? '⏳ Pendente' : '✓ Realizado'}
                </span>
              </div>
              <div className="col-span-1">
                <span className="text-xs bg-gray-100 rounded px-2 py-1 whitespace-nowrap">{row.canal || 'N/A'}</span>
              </div>
              <div className="col-span-1">
                <span className={`text-xs rounded px-2 py-1 font-medium whitespace-nowrap ${statusColor[row.resultado] || 'bg-gray-50 text-gray-700'}`}>
                  {row.resultado?.replace(/_/g, ' ') || 'N/A'}
                </span>
              </div>
              <div className="col-span-1 text-center text-lg">
                <span className={humorColor[row.humor] || 'text-gray-400'}>
                  {humorEmoji[row.humor] || '—'}
                </span>
              </div>
              <div className="col-span-1">
                <span className={`text-xs font-medium whitespace-nowrap ${engajamentoColor[row.engajamento] || 'text-gray-600'}`}>
                  {row.engajamento || '-'}
                </span>
              </div>
              <div className="col-span-1">
                <span className="text-xs bg-blue-50 text-blue-700 rounded px-2 py-1 whitespace-nowrap">{row.suporte || 'Consultor'}</span>
              </div>
              {row.observacoes && !expandObservacoes && (
                <div className="col-span-2 flex items-center justify-between gap-1">
                  <span className="text-xs text-gray-600 truncate line-clamp-1">{row.observacoes.substring(0, 30)}...</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 flex-shrink-0"
                    onClick={() => setSelectedObservacao(row.observacoes)}
                  >
                    <Eye className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>

            {/* Observações Expandidas (para PDF/Print) */}
            {expandObservacoes && row.observacoes && (
              <div className="border-t border-gray-100 bg-gray-50 p-3">
                <p className="text-xs text-gray-700 leading-relaxed">
                  <span className="font-semibold">Observações:</span> {row.observacoes}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal de Observações */}
      {selectedObservacao && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="border-b p-4 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Observações Completas</h3>
              <button
                onClick={() => setSelectedObservacao(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-auto">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {selectedObservacao}
              </p>
            </div>
            <div className="border-t p-4 flex gap-2">
              <Button
                className="flex-1"
                onClick={() => setSelectedObservacao(null)}
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}