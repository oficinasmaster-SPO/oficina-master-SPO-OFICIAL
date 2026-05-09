import React from 'react';
import { AlertCircle, Calendar, User, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function ClientesRiscoTabela({ clientes = [] }) {
  if (!clientes || clientes.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        ✅ Nenhum cliente em risco identificado
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-100 border-b">
          <tr>
            <th className="px-4 py-3 text-left font-semibold">Cliente</th>
            <th className="px-4 py-3 text-left font-semibold">Consultor</th>
            <th className="px-4 py-3 text-left font-semibold">Tipo de Risco</th>
            <th className="px-4 py-3 text-left font-semibold">Detalhes</th>
            <th className="px-4 py-3 text-center font-semibold">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {clientes.map((cliente, idx) => (
            <tr key={idx} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900">{cliente.name}</td>
              <td className="px-4 py-3 text-gray-600">{cliente.consultor || '-'}</td>
              <td className="px-4 py-3">
                <div className="space-y-1">
                  {cliente.riscos?.map((risco, ridx) => (
                    <Badge key={ridx} variant="outline" className="block w-fit text-xs">
                      {risco.titulo}
                    </Badge>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                <div className="space-y-1">
                  {cliente.riscos?.map((risco, ridx) => (
                    <div key={ridx} className="text-xs">
                      {risco.detalhe && (
                        <>
                          {typeof risco.detalhe === 'number' ? (
                            <span>⏱️ {risco.detalhe} dias</span>
                          ) : (
                            <span>📌 {risco.detalhe}</span>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3 text-center">
                <AlertCircle className="w-5 h-5 text-red-600 mx-auto" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}