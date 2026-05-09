import React from 'react';

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

export default function Tabela({ dados = [] }) {
  if (!dados || dados.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 border rounded-lg bg-gray-50">
        Nenhum registro encontrado para os filtros selecionados.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border rounded-lg">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b">
            <th className="px-3 py-3 text-left font-semibold text-gray-700 text-xs">Data/Hora</th>
            <th className="px-3 py-3 text-left font-semibold text-gray-700 text-xs">Cliente</th>
            <th className="px-3 py-3 text-left font-semibold text-gray-700 text-xs">Consultor</th>
            <th className="px-3 py-3 text-left font-semibold text-gray-700 text-xs">Tipo</th>
            <th className="px-3 py-3 text-left font-semibold text-gray-700 text-xs">Canal</th>
            <th className="px-3 py-3 text-left font-semibold text-gray-700 text-xs">Resultado</th>
            <th className="px-3 py-3 text-left font-semibold text-gray-700 text-xs">Humor</th>
            <th className="px-3 py-3 text-left font-semibold text-gray-700 text-xs">Engajamento</th>
            <th className="px-3 py-3 text-left font-semibold text-gray-700 text-xs">Suporte</th>
            <th className="px-3 py-3 text-left font-semibold text-gray-700 text-xs">Observações</th>
          </tr>
        </thead>
        <tbody>
          {dados.map((row, idx) => (
            <tr 
              key={row.id || `row-${idx}`} 
              className="border-b hover:bg-gray-50 transition-colors text-sm"
            >
              <td className="px-3 py-3 text-gray-900 whitespace-nowrap">
                 {formatData(row.completedAt || row.dataContato)} {formatHora(row.completedAt || row.dataContato)}
               </td>
              <td className="px-3 py-3 text-gray-700">{row.workshop_name || '-'}</td>
              <td className="px-3 py-3 text-gray-700">{row.consultor_nome || '-'}</td>
              <td className="px-3 py-3">
                <span className="text-xs bg-gray-100 rounded px-2 py-1">
                  {row.tipo || 'Follow-up'}
                </span>
              </td>
              <td className="px-3 py-3">
                <span className="inline-block px-2 py-1 bg-gray-100 rounded text-xs font-medium">
                  {row.canal || 'N/A'}
                </span>
              </td>
              <td className="px-3 py-3">
                <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${statusColor[row.resultado] || 'bg-gray-50 text-gray-700'}`}>
                  {row.resultado?.replace(/_/g, ' ') || 'N/A'}
                </span>
              </td>
              <td className="px-3 py-3 text-center">
                <span className={`text-lg ${humorColor[row.humor] || 'text-gray-400'}`}>
                  {humorEmoji[row.humor] || '—'}
                </span>
              </td>
              <td className="px-3 py-3">
                <span className={`font-medium text-xs ${engajamentoColor[row.engajamento] || 'text-gray-600'}`}>
                  {row.engajamento ? `${row.engajamento}` : '-'}
                </span>
              </td>
              <td className="px-3 py-3 text-xs">
                <span className="bg-blue-50 text-blue-700 rounded px-2 py-1">
                  {row.suporte || 'Consultor'}
                </span>
              </td>
              <td className="px-3 py-3 text-gray-600 max-w-xs truncate" title={row.observacoes}>
                {row.observacoes || '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}