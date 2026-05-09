import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const getHumorColor = (humor) => {
  const map = {
    'feliz': 'text-green-600 bg-green-50',
    'neutro': 'text-gray-600 bg-gray-50',
    'insatisfeito': 'text-red-600 bg-red-50'
  };
  return map[humor?.toLowerCase()] || 'text-gray-600 bg-gray-50';
};

const getEngajamentoColor = (engajamento) => {
  const map = {
    'Alto': 'text-green-600 font-bold',
    'Médio': 'text-amber-600 font-bold',
    'Baixo': 'text-red-600 font-bold'
  };
  return map[engajamento] || 'text-gray-600';
};

export default function RelatorioTabela({ dados = [] }) {
  if (dados.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Nenhum registro encontrado
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-gray-900 text-white sticky top-0">
          <tr>
            <th className="px-4 py-3 text-left">Data/Hora</th>
            <th className="px-4 py-3 text-left">Cliente</th>
            <th className="px-4 py-3 text-left">Tipo</th>
            <th className="px-4 py-3 text-left">Canal</th>
            <th className="px-4 py-3 text-left">Humor</th>
            <th className="px-4 py-3 text-left">Engajamento</th>
            <th className="px-4 py-3 text-left">Consultor</th>
            <th className="px-4 py-3 text-left">Atendimento</th>
            <th className="px-4 py-3 text-left">Observações</th>
            <th className="px-4 py-3 text-center">Tempo (min)</th>
            <th className="px-4 py-3 text-center">Seq</th>
          </tr>
        </thead>
        <tbody>
          {dados.map((row, idx) => (
            <tr key={row.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="px-4 py-3 whitespace-nowrap">
                {row.completedAt ? format(new Date(row.completedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '—'}
              </td>
              <td className="px-4 py-3">{row.workshop_name || '—'}</td>
              <td className="px-4 py-3">
                <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                  {row.tipo || '—'}
                </span>
              </td>
              <td className="px-4 py-3">{row.canal || '—'}</td>
              <td className="px-4 py-3">
                <span className={`inline-block px-2 py-1 rounded text-xs ${getHumorColor(row.humor)}`}>
                  {row.humor || '—'}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className={getEngajamentoColor(row.engajamento)}>
                  {row.engajamento || '—'}
                </span>
              </td>
              <td className="px-4 py-3 text-xs">{row.consultor_nome || '—'}</td>
              <td className="px-4 py-3 text-xs">
                <span className="inline-block px-2 py-1 bg-purple-100 text-purple-700 rounded">
                  {row.atendimento_tipo || '—'}
                </span>
              </td>
              <td className="px-4 py-3 max-w-xs truncate text-xs text-gray-700" title={row.observacoes}>
                {row.observacoes || '—'}
              </td>
              <td className="px-4 py-3 text-center">{row.tempo_atendimento_minutos || '—'}</td>
              <td className="px-4 py-3 text-center font-bold">{row.sequencia || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}