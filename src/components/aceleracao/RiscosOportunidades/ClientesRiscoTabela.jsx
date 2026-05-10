import React, { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';

function DiasBadge({ dias }) {
  if (dias == null) return <span className="text-gray-300 text-xs">—</span>;
  if (dias === 0) return <span className="text-green-600 font-medium text-xs">0d</span>;
  const cor = dias >= 14 ? 'text-red-600 font-bold' : dias >= 7 ? 'text-orange-500 font-semibold' : 'text-yellow-600 font-medium';
  return <span className={`text-xs ${cor}`}>{dias}d</span>;
}

const fmtDate = (d) => {
  if (!d) return null;
  try { return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }); }
  catch { return d; }
};

// Extrai tooltip rico com dados detalhados do risco de uma categoria
function buildTooltip(risco) {
  if (!risco) return '';
  const c = risco; // cliente dentro do risco (detalhe estruturado)
  const parts = [];
  if (c.consultor_nome) parts.push(`Consultor: ${c.consultor_nome}`);
  if (c.titulo) parts.push(`Tarefa: ${c.titulo}`);
  if (c.tipo) parts.push(`Tipo: ${c.tipo}`);
  if (c.item) parts.push(`Item: ${c.item}`);
  if (c.sprint_title) parts.push(`Sprint ${c.sprint_number}: ${c.sprint_title}`);
  if (c.prazo) parts.push(`Prazo: ${fmtDate(c.prazo)}`);
  if (c.data_agendada) parts.push(`Agendado: ${fmtDate(c.data_agendada)}`);
  if (c.end_date) parts.push(`Venceu: ${fmtDate(c.end_date)}`);
  if (c.data_ativacao) parts.push(`Ativado: ${fmtDate(c.data_ativacao)}`);
  if (c.last_activity_date) parts.push(`Últ. ativ.: ${fmtDate(c.last_activity_date)}`);
  if (c.responsavel) parts.push(`Resp: ${c.responsavel}`);
  return parts.join(' · ');
}

export default function ClientesRiscoTabela({ clientes = [], riscos = [] }) {
  // Hook DEVE vir antes de qualquer early return (regra dos Hooks)
  const riscosClienteMap = useMemo(() => {
    const map = {};
    (riscos || []).forEach(risco => {
      (risco.clientes || []).forEach(c => {
        if (!map[c.id]) map[c.id] = {};
        map[c.id][risco.categoria] = c;
      });
    });
    return map;
  }, [riscos]);

  if (!clientes || clientes.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        ✅ Nenhum cliente em risco identificado
      </div>
    );
  }

  const getMetrica = (cliente, tipo) => {
    const risco = cliente.riscos?.find(r => r.tipo === tipo);
    if (!risco) return null;
    const d = risco.detalhe;
    if (typeof d === 'number') return d;
    const match = String(d || '').match(/\d+/);
    return match ? parseInt(match[0]) : 1;
  };

  // Último contato: menor valor entre follow-up e atendimento atrasado
  const getDiasUltContato = (cliente) => {
    const vals = ['followup_atrasado', 'atendimentos_atrasados']
      .map(t => getMetrica(cliente, t))
      .filter(v => v != null);
    return vals.length > 0 ? Math.min(...vals) : null;
  };

  // Data estimada do último contato
  const getDataUltContato = (cliente) => {
    const dias = getDiasUltContato(cliente);
    if (dias == null) return null;
    const d = new Date();
    d.setDate(d.getDate() - dias);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const columns = [
    { key: 'dt_ult_contato', label: 'Dt. Últ. Contato', title: 'Data estimada do último contato', center: true },
    { key: 'cliente', label: 'Cliente', title: 'Nome do cliente', center: false },
    { key: 'consultor', label: 'Consultor', title: 'Consultor responsável', center: false },
    { key: 'd_sem_cont', label: 'D. S/ Cont.', title: 'Dias sem contato', center: true },
    { key: 'd_fup', label: 'D. FUP Atr.', title: 'Dias com Follow-up Atrasado', center: true },
    { key: 'd_pp', label: 'D. P. Passos', title: 'Dias com Próximos Passos atrasados', center: true },
    { key: 'd_sprints', label: 'D. Sprints', title: 'Dias com Sprints atrasados', center: true },
    { key: 'd_cron', label: 'D. Cron. Atr.', title: 'Dias de Cronograma Atrasado', center: true },
    { key: 'd_atend', label: 'D. Atend. Atr.', title: 'Dias com Atendimento Atrasado', center: true },
    { key: 'd_spo', label: 'D. S/ SPO', title: 'Dias — Recém cadastrado sem reunião', center: true },
  ];

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-xs">
        <thead className="bg-gray-800 text-white">
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                className={`px-3 py-2 font-semibold whitespace-nowrap ${col.center ? 'text-center' : 'text-left'}`}
                title={col.title}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {clientes.map((cliente, idx) => {
            const diasSemCont = getDiasUltContato(cliente);
            const dtUltContato = getDataUltContato(cliente);
            const diasFUP      = getMetrica(cliente, 'followup_atrasado');
            const diasPP       = getMetrica(cliente, 'proximos_passos_atrasados');
            const diasSprints  = getMetrica(cliente, 'sprints_atrasadas');
            const diasSPO      = getMetrica(cliente, 'onboarding_risco');
            const diasCron     = getMetrica(cliente, 'cronograma_atrasado') ?? getMetrica(cliente, 'cronograma_nao_iniciado');
            const diasAtend    = getMetrica(cliente, 'atendimentos_atrasados');

            // Extrair consultor: prioridade FUP > atendimento > PP
            const detalhesCliente = riscosClienteMap[cliente.id] || {};
            const consultor =
              detalhesCliente['followup_atrasado']?.consultor_nome ||
              detalhesCliente['atendimentos_atrasados']?.consultor_nome ||
              detalhesCliente['proximos_passos_atrasados']?.responsavel ||
              detalhesCliente['onboarding_risco']?.consultor_nome ||
              cliente.consultor || '';

            // Tooltip com todos os detalhes de cada risco do cliente
            const tooltipParts = Object.entries(detalhesCliente).map(([cat, det]) => {
              const t = buildTooltip(det);
              return t ? `[${cat}] ${t}` : null;
            }).filter(Boolean).join('\n');

            return (
              <tr key={idx} className={`hover:bg-blue-50/30 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`} title={tooltipParts || undefined}>
                {/* Dt. Últ. Contato */}
                <td className="px-3 py-2 text-center text-gray-500 whitespace-nowrap">
                  {dtUltContato ?? <span className="text-gray-300">—</span>}
                </td>

                {/* Cliente */}
                <td className="px-3 py-2 font-semibold text-gray-900 whitespace-nowrap max-w-[140px] truncate" title={cliente.name}>
                  {cliente.riscos?.length > 0 && <AlertTriangle className="inline w-3 h-3 text-red-500 mr-1" />}
                  {cliente.name}
                </td>

                {/* Consultor */}
                <td className="px-3 py-2 text-gray-600 whitespace-nowrap max-w-[120px] truncate text-xs" title={consultor}>
                  {consultor || <span className="text-gray-300">—</span>}
                </td>

                {/* D. S/ Cont. */}
                <td className="px-3 py-2 text-center"><DiasBadge dias={diasSemCont} /></td>

                {/* D. FUP Atr. */}
                <td className="px-3 py-2 text-center"><DiasBadge dias={diasFUP} /></td>

                {/* D. P. Passos */}
                <td className="px-3 py-2 text-center"><DiasBadge dias={diasPP} /></td>

                {/* D. Sprints */}
                <td className="px-3 py-2 text-center"><DiasBadge dias={diasSprints} /></td>

                {/* D. Cron. Atr. */}
                <td className="px-3 py-2 text-center"><DiasBadge dias={diasCron} /></td>

                {/* D. Atend. Atr. */}
                <td className="px-3 py-2 text-center"><DiasBadge dias={diasAtend} /></td>

                {/* D. S/ SPO */}
                <td className="px-3 py-2 text-center"><DiasBadge dias={diasSPO} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="px-3 py-2 bg-gray-50 border-t text-xs text-gray-400">
        D. = Dias · S/ = Sem · Atr. = Atrasado · SPO = Recém cadastrado sem reunião · P.Passos = Próximos Passos · — = sem dados · 💡 Passe o mouse sobre a linha para ver detalhes
      </div>
    </div>
  );
}