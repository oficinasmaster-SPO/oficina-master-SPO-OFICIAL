import React from 'react';

export default function KPIBar({ metricas }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
        <p className="text-xs text-green-700 font-medium">✅ Realizados</p>
        <p className="text-2xl font-bold text-green-900 mt-2">{metricas.realizados || 0}</p>
      </div>
      <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg p-4">
        <p className="text-xs text-yellow-700 font-medium">⏳ Pendentes</p>
        <p className="text-2xl font-bold text-yellow-900 mt-2">{metricas.pendentes || 0}</p>
      </div>
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
        <p className="text-xs text-blue-700 font-medium">📈 Taxa de Realização</p>
        <p className="text-2xl font-bold text-blue-900 mt-2">{metricas.taxaRealizacao || 0}%</p>
      </div>
    </div>
  );
}