import React, { useMemo } from 'react';
import { 
  AlertCircle, CheckCircle2, Circle, Clock, 
  ArrowUp, ArrowDown, AlertTriangle, Eye, Edit2, MoreHorizontal, ArrowRight 
} from 'lucide-react';

/* ── 1. HELPERS VISUAIS (KPIs de Alto Contraste) ─────────────────────────── */

const PrioridadeIndicador = ({ nivel }) => {
  const norm = nivel?.toLowerCase();
  if (norm === 'alta' || norm === 'urgente') {
    return (
      <div className="flex items-center gap-1.5 text-red-600 font-bold text-xs w-20">
        <ArrowUp className="h-4 w-4 stroke-[3]" /> Alta
      </div>
    );
  }
  if (norm === 'critica') {
    return (
      <div className="flex items-center gap-1.5 text-purple-700 font-black text-xs w-20">
        <AlertTriangle className="h-4 w-4 stroke-[3]" /> Crítica
      </div>
    );
  }
  if (norm === 'media') {
    return (
      <div className="flex items-center gap-1.5 text-orange-500 font-semibold text-xs w-20">
        <div className="h-2 w-2 rounded-full bg-orange-500" /> Média
      </div>
    );
  }
  // Default / Baixa
  return (
    <div className="flex items-center gap-1.5 text-gray-400 font-medium text-xs w-20">
      <ArrowDown className="h-4 w-4 stroke-[2]" /> Baixa
    </div>
  );
};

const TempoAbertoSemantico = ({ dataCriacao }) => {
  // Simulação de cálculo de dias (Substitua pela sua lib de datas, ex: date-fns)
  const dias = Math.floor(Math.random() * 15); 
  
  let config = { color: "text-emerald-600 bg-emerald-50", icon: "🟢", label: dias === 0 ? '2h' : `${dias}d` };
  
  if (dias > 3) config = { color: "text-amber-600 bg-amber-50", icon: "🟡", label: `${dias}d` };
  if (dias > 7) config = { color: "text-orange-600 bg-orange-50 font-bold", icon: "🟠", label: `${dias}d` };
  if (dias > 10) config = { color: "text-red-600 bg-red-50 font-black ring-1 ring-red-200", icon: "🔴", label: `${dias}d` };

  return (
    <div className="group/tooltip relative flex items-center justify-end w-20 cursor-help">
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${config.color}`}>
        <span className="text-[10px]">{config.icon}</span> {config.label}
      </span>
      
      {/* Tooltip Nativo (Custom) */}
      <div className="absolute bottom-full right-0 mb-2 hidden w-max flex-col items-center group-hover/tooltip:flex z-50">
        <div className="rounded bg-gray-900 px-3 py-1.5 text-xs text-white shadow-xl">
          <p className="font-semibold text-gray-300">Criado em</p>
          <p>22/07/2026 às 09:14</p>
        </div>
        <div className="h-2 w-2 -mt-1 rotate-45 bg-gray-900"></div>
      </div>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const configs = {
    pendente: { class: "bg-amber-100 text-amber-800 border-amber-200", label: "Pendente" },
    em_analise: { class: "bg-blue-100 text-blue-800 border-blue-200", label: "Em Análise" },
    aprovado: { class: "bg-emerald-100 text-emerald-800 border-emerald-200", label: "Aprovado" },
  };
  const c = configs[status] || configs.pendente;
  
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-widest border ${c.class}`}>
      {c.label}
    </span>
  );
};

/* ── 2. COMPONENTE DE LINHA (Rich List Row) ─────────────────────────────── */

const PedidoRow = ({ pedido, onClick, isSelected }) => {
  return (
    <div 
      onClick={() => onClick(pedido)}
      className={`
        group relative flex items-center gap-6 px-6 py-3 transition-all duration-200 cursor-pointer border-b border-gray-100
        ${isSelected 
          ? 'bg-blue-50/60 border-l-4 border-l-blue-600 shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)]' 
          : 'bg-white border-l-4 border-l-transparent hover:bg-gray-50 hover:shadow-sm hover:z-10 hover:border-l-gray-300'
        }
      `}
    >
      {/* Bloco 1: Cliente, Título e ID (O Contexto Principal) */}
      <div className="flex-1 min-w-[300px] flex flex-col justify-center">
        <div className="flex items-center gap-2 mb-0.5">
          <div className="h-2 w-2 rounded-full bg-purple-500 shrink-0" />
          <span className="text-xs font-bold text-gray-600 uppercase tracking-wide truncate">
            {pedido.cliente_nome || 'Cliente Não Informado'}
          </span>
        </div>
        <span className="text-sm font-bold text-gray-900 truncate pr-4">
          {pedido.titulo || 'Manutenção de Equipamento'}
        </span>
        <span className="text-[11px] font-mono text-gray-400 mt-0.5">
          #{pedido.id?.slice(-6).toUpperCase() || '000000'}
        </span>
      </div>

      {/* Bloco 2: Fluxo de Responsabilidade (Solicitante -> Responsável) */}
      <div className="hidden lg:flex items-center gap-3 w-[280px] shrink-0">
        <div className="flex items-center gap-2 max-w-[120px]">
          <div className="h-[26px] w-[26px] shrink-0 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600 border border-white shadow-sm">
            {pedido.solicitante_nome?.charAt(0) || 'S'}
          </div>
          <div className="flex flex-col truncate">
            <span className="text-xs font-semibold text-gray-700 truncate">{pedido.solicitante_nome}</span>
            <span className="text-[9px] text-gray-400 truncate">Comercial</span>
          </div>
        </div>
        
        <ArrowRight className="h-3 w-3 text-gray-300 shrink-0" />
        
        <div className="flex items-center gap-2 max-w-[120px]">
          <div className="h-[26px] w-[26px] shrink-0 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-700 border border-white shadow-sm">
            {pedido.assignee_nome?.charAt(0) || 'R'}
          </div>
          <div className="flex flex-col truncate">
            <span className="text-xs font-semibold text-gray-700 truncate">{pedido.assignee_nome || 'Não atribuído'}</span>
            <span className="text-[9px] text-gray-400 truncate">Técnico</span>
          </div>
        </div>
      </div>

      {/* Bloco 3: KPIs Visuais */}
      <div className="flex items-center gap-6 shrink-0 pr-4">
        <PrioridadeIndicador nivel={pedido.prioridade} />
        <div className="w-[100px] flex justify-center">
          <StatusBadge status={pedido.status} />
        </div>
        <TempoAbertoSemantico dataCriacao={pedido.created_date} />
      </div>

      {/* Quick Actions (Visível apenas no Hover da linha) */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-l from-gray-50 via-gray-50 to-transparent pl-8 py-2">
        <button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Visualizar">
          <Eye className="h-4 w-4" />
        </button>
        <button className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors" title="Editar">
          <Edit2 className="h-4 w-4" />
        </button>
        <button className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-200 rounded-md transition-colors" title="Mais opções">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

/* ── 3. LISTA PRINCIPAL (Memoizada & Agrupada) ──────────────────────────── */

export default function PedidoInternoList({ pedidos, onSelect, isLoading, selectedId }) {
  
  // Memoização pesada para evitar re-cálculo de agrupamentos em re-renders simples
  const grupos = useMemo(() => {
    if (!pedidos) return [];
    
    const agrupado = {
      em_analise: { id: 'em_analise', label: 'Em Análise', count: 0, itens: [] },
      pendente: { id: 'pendente', label: 'Pendentes', count: 0, itens: [] },
      aprovado: { id: 'aprovado', label: 'Aprovados', count: 0, itens: [] },
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
      <div className="p-8">
        {/* Skeleton com o mesmo layout da Rich Row */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-4 border-b border-gray-100 animate-pulse">
             <div className="space-y-2">
                <div className="h-3 w-24 bg-gray-200 rounded"></div>
                <div className="h-4 w-64 bg-gray-200 rounded"></div>
                <div className="h-2 w-16 bg-gray-200 rounded"></div>
             </div>
             <div className="flex gap-4">
                <div className="h-6 w-20 bg-gray-200 rounded"></div>
                <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
             </div>
          </div>
        ))}
      </div>
    );
  }

  if (grupos.length === 0) return null;

  return (
    <div className="flex flex-col bg-white">
      {grupos.map((grupo) => (
        <div key={grupo.id} className="mb-4">
          
          {/* Cabeçalho de Agrupamento Estilo Linear (Elegante e espaçado) */}
          <div className="flex items-center gap-3 px-8 pt-8 pb-3 border-b border-gray-100 bg-white sticky top-0 z-10">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              {grupo.label}
            </span>
            <div className="flex-1 h-px bg-gray-100"></div>
            <span className="text-xs font-semibold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
              {grupo.count}
            </span>
          </div>
          
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
        </div>
      ))}
    </div>
  );
}