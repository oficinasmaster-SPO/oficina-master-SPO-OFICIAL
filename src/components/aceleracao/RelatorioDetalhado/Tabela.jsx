import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const getHumorColor = (humor) => {
  if (!humor) return 'bg-gray-100 text-gray-700';
  const lower = humor.toLowerCase();
  if (lower.includes('alegr') || lower.includes('feliz') || lower.includes('😊')) return 'bg-green-100 text-green-700';
  if (lower.includes('neutr') || lower.includes('normal') || lower.includes('😐')) return 'bg-yellow-100 text-yellow-700';
  return 'bg-red-100 text-red-700';
};

const getEngajamentoColor = (engajamento) => {
  if (!engajamento) return 'bg-gray-100 text-gray-700';
  const lower = engajamento.toLowerCase();
  if (lower === 'alto') return 'bg-green-100 text-green-700';
  if (lower === 'médio') return 'bg-yellow-100 text-yellow-700';
  return 'bg-red-100 text-red-700';
};

export default function Tabela({ dados }) {
  if (dados.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <p className="text-gray-600">Nenhum dado encontrado para os filtros selecionados</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-gray-200 rounded-lg">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-900 text-white border-b">
            <th className="px-4 py-3 text-left font-semibold">Data/Hora</th>
            <th className="px-4 py-3 text-left font-semibold">Cliente</th>
            <th className="px-4 py-3 text-left font-semibold">Tipo</th>
            <th className="px-4 py-3 text-left font-semibold">Canal</th>
            <th className="px-4 py-3 text-left font-semibold">Humor</th>
            <th className="px-4 py-3 text-left font-semibold">Engajamento</th>
            <th className="px-4 py-3 text-left font-semibold">Consultor</th>
            <th className="px-4 py-3 text-left font-semibold">Atendimento</th>
            <th className="px-4 py-3 text-left font-semibold">Tempo (min)</th>
            <th className="px-4 py-3 text-left font-semibold">Seq</th>
            <th className="px-4 py-3 text-left font-semibold">Observações</th>
          </tr>
        </thead>
        <tbody>
          {dados.map((item, idx) => (
            <tr
              key={item.id}
              className={`border-b hover:bg-blue-50 transition-colors ${
                idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
              }`}
            >
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="text-xs font-medium text-gray-900">
                  {new Date(item.completedAt).toLocaleDateString('pt-BR')}
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(item.completedAt).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </td>
              <td className="px-4 py-3 max-w-xs truncate font-medium text-gray-900">
                {item.workshop_name || '—'}
              </td>
              <td className="px-4 py-3">
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                  {item.tipo || '—'}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-gray-700">
                {item.canal ? item.canal.charAt(0).toUpperCase() + item.canal.slice(1) : '—'}
              </td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded text-xs font-medium ${getHumorColor(item.humor)}`}>
                  {item.humor || '—'}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded text-xs font-medium ${getEngajamentoColor(item.engajamento)}`}>
                  {item.engajamento || '—'}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-gray-700 max-w-xs truncate">
                {item.consultor_nome || '—'}
              </td>
              <td className="px-4 py-3 text-xs">
                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                  {item.atendimento_tipo || '—'}
                </span>
              </td>
              <td className="px-4 py-3 text-center font-medium text-gray-900">
                {item.tempo_atendimento_minutos || item.duracao || '—'}
              </td>
              <td className="px-4 py-3 text-center">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 text-xs font-bold">
                  {item.sequencia || '—'}
                </span>
              </td>
              <td className="px-4 py-3 max-w-xs">
                <p className="text-xs text-gray-600 line-clamp-2">{item.observacoes || '—'}</p>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}