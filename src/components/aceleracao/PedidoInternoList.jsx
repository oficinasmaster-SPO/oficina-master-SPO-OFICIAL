import React, { useMemo, useState } from 'react';
import { ChevronDown, Clock } from 'lucide-react';

/* Cabeçalho padrão da tabela original */
export function ColumnHeaders() {
  return (
    <div className="grid grid-cols-6 items-center px-6 py-2 bg-gray-50 border-b border-gray-200 text-[10px] font-bold uppercase tracking-wider text-gray-400">
      <div>Solicitante</div>
      <div>Título do Chamado</div>
      <div>Cliente</div>
      <div>Prioridade</div>
      <div>Status</div>
      <div className="text-right">SLA / Responsável</div>
    </div>
  );
}

const PrioridadeBadge = ({ nivel }) => {
  if (!nivel || nivel === "—" || nivel === "-") return <span className="text-gray-400 text-xs">—</span>;
  return <span className="text-xs font-medium text-gray-700">{nivel}</span>;
};

const StatusPill = ({ status }) => {
  const configs = {
    pendente: { bg: "bg-amber-50 text-amber-700 border-amber-200", label: "Pendente" },
    em_analise: { bg: "bg-blue-50 text-blue-700 border-blue-200", label: "Em Análise" },
    aprovado: { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Aprovado" },
  };
  const c = configs[status] || { bg: "bg-gray-100 text-gray-700 border-gray-200", label: status };

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${c.bg}`}>
      {c.label}
    </span>
  );
};

const PedidoRow = ({ pedido, onClick, isSelected }) => {
  return (
    <div 
      onClick={() => onClick(pedido)}
      className={`
        grid grid-cols-6 items-center px-6 py-3 border-b border-gray-100 cursor-pointer transition-colors
        ${isSelected ? 'bg-blue-50/70' : 'bg-white hover:bg-gray-50/80'}
      `}
    >
      {/* Coluna 1: Solicitante + ID */}
      <div className="flex items-center gap-3">
        <div className="h-7 w-7 rounded-full bg-gray-900 text-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-sm">
          {pedido.solicitante_nome?.charAt(0) || 'S'}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[11px] font-mono text-gray-400">#{pedido.id?.slice(-6).toUpperCase() || '000000'}</span>
          <span className="text-xs font-medium text-gray-800 truncate">{pedido.solicitante_nome || 'Usuário'}</span>
        </div>
      </div>

      {/* Coluna 2: Título */}
      <div className="flex flex-col min-w-0 pr-4">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Chamado</span>
        <span className="text-xs font-semibold text-gray-900 truncate">{pedido.titulo || 'Sem título'}</span>
      </div>

      {/* Coluna 3: Cliente */}
      <div className="flex flex-col min-w-0 pr-4">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Cliente</span>
        {pedido.cliente_nome ? (
          <span className="inline-block w-max max-w-full truncate rounded-md bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700 border border-purple-100">
            {pedido.cliente_nome}
          </span>
        ) : (
          <span className="text-xs text-gray-400 italic">Não informado</span>
        )}
      </div>

      {/* Coluna 4: Prioridade */}
      <div>
        <PrioridadeBadge nivel={pedido.prioridade} />
      </div>

      {/* Coluna 5: Status */}
      <div>
        <StatusPill status={pedido.status} />
      </div>

      {/* Coluna 6: SLA / Responsável */}
      <div className="flex items-center justify-end gap-3">
        <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
          <Clock className="h-3 w-3" /> 2d
        </span>
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold shrink-0">
            {pedido.assignee_nome?.charAt(0) || 'R'}
          </div>
          <span className="text-xs text-gray-700 truncate max-w-[100px]">{pedido.assignee_nome || 'Não atribuído'}</span>
        </div>
      </div>
    </div>
  );
};

export default function PedidoInternoList({ pedidos, onSelect, isLoading, selectedId }) {
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const toggleGroup = (groupId) => {
    setCollapsedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };
  
  const grupos = useMemo(() => {
    if (!pedidos) return [];
    
    const agrupado = {
      em_analise: { id: 'em_analise', label: 'Em Análise', count: 0, itens: [] },
      pendente: { id: 'pendente', label: 'Pendente', count: 0, itens: [] },
      aprovado: { id: 'aprovado', label: 'Aprovado', count: 0, itens: [] },
    };

    pedidos.forEach(p => {
      const key = agrupado[p.status] ? p.status : 'pendente';
      agrupado[key].itens.push(p);
      agrupado[key].count++;
    });

    return Object.values(agrupado).filter(g => g.count > 0);
  }, [pedidos]);

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-3 border-b border-gray-100 animate-pulse">
             <div className="h-4 w-48 bg-gray-200 rounded"></div>
             <div className="h-4 w-32 bg-gray-200 rounded"></div>
             <div className="h-4 w-24 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (grupos.length === 0) return null;

  return (
    <div className="flex flex-col bg-white">
      <ColumnHeaders />
      {grupos.map((grupo) => {
        const isCollapsed = collapsedGroups[grupo.id];

        return (
          <div key={grupo.id} className="border-b border-gray-200">
            <button 
              onClick={() => toggleGroup(grupo.id)}
              className="w-full flex items-center gap-2 px-6 py-2.5 bg-gray-50/80 hover:bg-gray-100/80 transition-colors text-left"
            >
              <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : 'rotate-0'}`} />
              <span className="text-xs font-bold uppercase tracking-wider text-gray-700">{grupo.label}</span>
              <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-bold text-gray-600">{grupo.count}</span>
            </button>
            
            {!isCollapsed && (
              <div className="flex flex-col">
                {grupo.itens.map((pedido) => (
                  <PedidoRow 
                    key={pedido.id} 
                    pedido={pedido} 
                    onClick={onSelect}
                    isSelected={selectedId === pedido.id}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}