import React from 'react';
import { AlertTriangle } from 'lucide-react';

// Função para exibir dias com cor de severidade
function DiasBadge({ dias, semDados = false }) {
  if (semDados || dias == null) return <span className="text-gray-300 text-xs">—</span>;
  if (dias === 0) return <span className="text-green-600 font-medium text-xs">0d</span>;
  const cor = dias >= 14 ? 'text-red-600 font-bold' : dias >= 7 ? 'text-orange-500 font-semibold' : 'text-yellow-600 font-medium';
  return <span className={`text-xs ${cor}`}>{dias}d</span>;
}

export default function ClientesRiscoTabela({ clientes = [] }) {
  if (!clientes || clientes.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        ✅ Nenhum cliente em risco identificado
      </div>
    );
  }

  // Extrair métricas de cada risco do cliente para as colunas
  const getMetrica = (cliente, tipo) => {
    const risco = cliente.riscos?.find(r => r.tipo === tipo);
    if (!risco) return null;
    const d = risco.detalhe;
    if (typeof d === 'number') return d;
    // tentar extrair número do detalhe string (ex: "3 FUP(s) em atraso")
    const match = String(d || '').match(/\d+/);
    return match ? parseInt(match[0]) : 1;
  };

  // Data último contato: pegar o menor "dias sem contato" de qualquer risco
  const getDiasContato = (cliente) => {
    const tiposContato = ['followup_atrasado', 'atendimentos_atrasados'];
    let menor = null;
    for (const tipo of tiposContato) {
      const v = getMetrica(cliente, tipo);
      if (v != null && (menor == null || v < menor)) menor = v;
    }
    return menor;
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-xs">
        <thead className="bg-gray-800 text-white">
          <tr>
            <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">Cliente</th>
            <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">Consultor</th>
            <th className="px-3 py-2 text-center font-semibold whitespace-nowrap" title="Dias Sem Contato">D. S/ Cont.</th>
            <th className="px-3 py-2 text-center font-semibold whitespace-nowrap" title="Dias Sem Próximos Passos">D. S/ P.P.</th>
            <th className="px-3 py-2 text-center font-semibold whitespace-nowrap" title="Dias Sem Execução de Sprints">D. S/ Sprints</th>
            <th className="px-3 py-2 text-center font-semibold whitespace-nowrap" title="Dias de Cronograma Atrasado">D. Cron. Atr.</th>
            <th className="px-3 py-2 text-center font-semibold whitespace-nowrap" title="Dias com Follow-ups Atrasados">D. FUP Atr.</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {clientes.map((cliente, idx) => {
            const diasContato = getDiasContato(cliente);
            const diasPP = getMetrica(cliente, 'proximos_passos_atrasados');
            const diasSprints = getMetrica(cliente, 'sprints_atrasadas');
            const diasCron = getMetrica(cliente, 'cronograma_atrasado') ?? getMetrica(cliente, 'cronograma_nao_iniciado');
            const diasFUP = getMetrica(cliente, 'followup_atrasado') ?? getMetrica(cliente, 'fup_atrasado') ?? 
                            (cliente.riscos?.find(r => r.tipo?.includes('follow'))
                              ? (typeof cliente.riscos.find(r => r.tipo?.includes('follow'))?.detalhe === 'number'
                                  ? cliente.riscos.find(r => r.tipo?.includes('follow')).detalhe
                                  : null)
                              : null);

            const temRisco = cliente.riscos?.length > 0;

            return (
              <tr key={idx} className={`hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                <td className="px-3 py-2 font-semibold text-gray-900 whitespace-nowrap max-w-[160px] truncate" title={cliente.name}>
                  {temRisco && <AlertTriangle className="inline w-3 h-3 text-red-500 mr-1" />}
                  {cliente.name}
                </td>
                <td className="px-3 py-2 text-gray-600 whitespace-nowrap max-w-[120px] truncate" title={cliente.consultor || ''}>
                  {cliente.consultor || '—'}
                </td>
                <td className="px-3 py-2 text-center">
                  <DiasBadge dias={diasContato} semDados={diasContato == null} />
                </td>
                <td className="px-3 py-2 text-center">
                  <DiasBadge dias={diasPP} semDados={diasPP == null} />
                </td>
                <td className="px-3 py-2 text-center">
                  <DiasBadge dias={diasSprints} semDados={diasSprints == null} />
                </td>
                <td className="px-3 py-2 text-center">
                  <DiasBadge dias={diasCron} semDados={diasCron == null} />
                </td>
                <td className="px-3 py-2 text-center">
                  <DiasBadge dias={diasFUP} semDados={diasFUP == null} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="px-3 py-2 bg-gray-50 border-t text-xs text-gray-400">
        D. = Dias · S/ = Sem · Atr. = Atrasado · P.P. = Próximos Passos · FUP = Follow-up · — = sem dados
      </div>
    </div>
  );
}