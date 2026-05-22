import React, { useMemo, useState } from "react";
import { FileText, BarChart3, Calendar, CheckCircle2, Clock, RefreshCw, Inbox } from "lucide-react";

const TOP_N = 5;

function TiposCollapsible({ tipos, formatarTipo }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? tipos : tipos.slice(0, TOP_N);
  const hidden = tipos.length - TOP_N;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-xs text-gray-400 shrink-0">Tipos:</span>
      {visible.map(([tipo, qtd]) => (
        <span
          key={tipo}
          className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 rounded px-2 py-0.5 border border-gray-200"
        >
          <span className="font-semibold text-gray-800">{qtd}</span>
          {formatarTipo(tipo)}
        </span>
      ))}
      {!expanded && hidden > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-0.5 rounded border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors"
        >
          +{hidden} mais
        </button>
      )}
      {expanded && (
        <button
          onClick={() => setExpanded(false)}
          className="text-xs text-gray-500 hover:text-gray-700 font-medium px-2 py-0.5 rounded border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          recolher
        </button>
      )}
    </div>
  );
}

export default function DashboardAtendimentos({ atendimentos = [], bucketCount = 0, onStatusClick }) {
  const estatisticas = useMemo(() => {
    const grupos = {};
    let totalAtas = 0;
    // contadores de status — baseados nos atendimentos brutos (sem filtro de tab/data)
    const porStatus = { agendado: 0, confirmado: 0, realizado: 0, reagendado: 0 };

    atendimentos.forEach(a => {
      const tipo = a.tipo_atendimento || "outros";
      grupos[tipo] = (grupos[tipo] || 0) + 1;
      if (a.ata_id) totalAtas++;
      const s = a.status;
      if (s === 'agendado' || s === 'atrasado' || s === 'participando') porStatus.agendado++;
      else if (s === 'confirmado') porStatus.confirmado++;
      else if (s === 'realizado' || s === 'concluido') porStatus.realizado++;
      else if (s === 'reagendado') porStatus.reagendado++;
    });

    return { grupos, totalAtas, total: atendimentos.length, porStatus };
  }, [atendimentos]);

  const formatarTipo = (tipo) =>
    tipo.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  const tiposOrdenados = Object.entries(estatisticas.grupos).sort((a, b) => b[1] - a[1]);
  const taxaDoc = estatisticas.total > 0
    ? Math.round((estatisticas.totalAtas / estatisticas.total) * 100)
    : 0;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2 px-1">
      {/* Stat chips */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
          <BarChart3 className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-xs text-gray-500">Total</span>
          <span className="text-sm font-bold text-blue-700">{estatisticas.total}</span>
        </div>
        <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
          <FileText className="w-3.5 h-3.5 text-green-500" />
          <span className="text-xs text-gray-500">ATAs</span>
          <span className="text-sm font-bold text-green-700">{estatisticas.totalAtas}</span>
        </div>
        <div className="flex items-center gap-1.5 bg-purple-50 border border-purple-200 rounded-lg px-3 py-1.5">
          <span className="text-xs text-gray-500">Doc.</span>
          <span className="text-sm font-bold text-purple-700">{taxaDoc}%</span>
        </div>
      </div>

      {/* Divisor */}
      <div className="h-5 w-px bg-gray-200 shrink-0 hidden sm:block" />

      {/* Status chips clicáveis */}
      <div className="flex items-center gap-2 shrink-0 flex-wrap">
        {[
          { key: 'agendado',   label: 'Agendado',   color: 'bg-blue-50 border-blue-200 text-blue-700',   icon: <Calendar className="w-3.5 h-3.5 text-blue-400" /> },
          { key: 'confirmado', label: 'Confirmado', color: 'bg-emerald-50 border-emerald-200 text-emerald-700', icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> },
          { key: 'realizado',  label: 'Realizado',  color: 'bg-green-50 border-green-200 text-green-700', icon: <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> },
          { key: 'reagendado', label: 'Reagendado', color: 'bg-amber-50 border-amber-200 text-amber-700', icon: <RefreshCw className="w-3.5 h-3.5 text-amber-400" /> },
        ].map(({ key, label, color, icon }) => (
          <button
            key={key}
            onClick={() => onStatusClick?.(key)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 border text-xs font-medium transition-colors hover:opacity-80 ${color}`}
          >
            {icon}
            <span className="text-gray-500">{label}</span>
            <span className="font-bold">{estatisticas.porStatus[key]}</span>
          </button>
        ))}
        {/* Bucket — entidade separada (ContractAttendance pendentes) */}
        <button
          onClick={() => onStatusClick?.('bucket')}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 border text-xs font-medium transition-colors hover:opacity-80 bg-indigo-50 border-indigo-200 text-indigo-700"
        >
          <Inbox className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-gray-500">Bucket</span>
          <span className="font-bold">{bucketCount}</span>
        </button>
      </div>

      {/* Divisor */}
      <div className="h-5 w-px bg-gray-200 shrink-0 hidden sm:block" />

      {/* Tags de tipo inline — colapsáveis */}
      <TiposCollapsible tipos={tiposOrdenados} formatarTipo={formatarTipo} />
    </div>
  );
}