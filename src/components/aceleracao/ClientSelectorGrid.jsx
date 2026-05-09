import React, { useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { X, Search, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

const PLANO_COLORS = {
  'MILLIONS': 'bg-purple-100 text-purple-700 border-purple-300',
  'IOM': 'bg-blue-100 text-blue-700 border-blue-300',
  'GOLD': 'bg-yellow-100 text-yellow-700 border-yellow-300',
  'PRATA': 'bg-slate-100 text-slate-700 border-slate-300',
  'BRONZE': 'bg-orange-100 text-orange-700 border-orange-300',
  'START': 'bg-green-100 text-green-700 border-green-300',
  'FREE': 'bg-gray-100 text-gray-700 border-gray-300',
  'SEM PLANO': 'bg-red-100 text-red-700 border-red-300',
};

export default function ClientSelectorGrid({ onSelect, onClose }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyActive, setShowOnlyActive] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('all');

  // Buscar clientes com retry
  const { data = { clients: [] }, isLoading, error } = useQuery({
    queryKey: ['clientsWithPlans'],
    queryFn: async () => {
      try {
        const res = await base44.functions.invoke('getClientsWithPlans', {});
        return res?.data || { clients: [] };
      } catch (err) {
        console.error('Erro ao buscar clientes:', err);
        return { clients: [] };
      }
    },
    staleTime: 2 * 60 * 1000,
    retry: 2,
  });

  // Filtrar
  const filtered = useMemo(() => {
    return data.clients.filter(c => {
      const matchSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchActive = !showOnlyActive || c.status === 'ativo';
      const matchPlan = selectedPlan === 'all' || c.plano === selectedPlan;
      return matchSearch && matchActive && matchPlan;
    });
  }, [data.clients, searchTerm, showOnlyActive, selectedPlan]);

  const uniquePlans = useMemo(() => {
    return ['all', ...new Set(data.clients.map(c => c.plano))];
  }, [data.clients]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    }
  };

  const content = (
    <div 
      className="fixed inset-0 bg-black/40 flex items-center justify-center pointer-events-auto" 
      style={{ zIndex: 99999 }}
      role="dialog"
      onMouseDown={handleBackdropClick}
    >
      <div 
        className="bg-white rounded-lg shadow-2xl w-[90vw] max-w-4xl max-h-[85vh] flex flex-col pointer-events-auto"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-bold text-gray-900">Selecionar Cliente</h2>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape' || e.key === 'Enter') {
                e.preventDefault();
                onClose();
              }
            }}
            className="w-8 h-8 rounded flex items-center justify-center text-gray-400 hover:bg-gray-100 active:bg-gray-200 transition-colors"
            title="Fechar"
            aria-label="Fechar seletor de clientes"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controles */}
        <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0 space-y-3">
          <div className="flex items-center gap-3">
            <Input
              type="text"
              placeholder="🔍 Buscar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
              autoFocus
              aria-label="Buscar cliente"
            />
            <label className="flex items-center gap-2 px-3 py-2 rounded border border-gray-200 cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors select-none">
              <input
                type="checkbox"
                checked={showOnlyActive}
                onChange={(e) => {
                  e.preventDefault();
                  setShowOnlyActive(e.target.checked);
                }}
                className="w-4 h-4 cursor-pointer"
              />
              <span className="text-sm text-gray-700">Apenas ativos</span>
            </label>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-gray-600">Plano:</span>
            {uniquePlans.map(plan => (
              <button
                type="button"
                key={plan}
                onClick={(e) => {
                  e.preventDefault();
                  setSelectedPlan(plan);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  selectedPlan === plan
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                }`}
              >
                {plan === 'all' ? 'Todos' : plan}
              </button>
            ))}
          </div>
        </div>

        {/* Grid de Clientes */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full text-center">
            <div>
              <p className="text-red-500 font-medium">⚠️ Erro ao carregar clientes</p>
              <p className="text-xs text-gray-400 mt-1">Verifique sua conexão e tente novamente</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <div>
              <p className="text-gray-500 font-medium">Nenhum cliente encontrado</p>
              <p className="text-xs text-gray-400 mt-1">Tente outro filtro ou busca</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.map(client => (
                <button
                  key={client.id}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onSelect(client);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelect(client);
                    }
                  }}
                  className="p-4 rounded-lg border border-gray-200 bg-white hover:shadow-lg hover:border-red-300 transition-all group text-left cursor-pointer"
                >
                  {/* Plano */}
                  <Badge className={`${PLANO_COLORS[client.plano] || PLANO_COLORS['FREE']} text-[10px] mb-2`}>
                    {client.plano}
                  </Badge>

                  {/* Nome */}
                  <p className="font-semibold text-sm text-gray-900 truncate group-hover:text-red-600">
                    🏢 {client.name}
                  </p>

                  {/* Status */}
                  <div className="flex items-center gap-1 mt-1.5 mb-3">
                    <span className={`w-2 h-2 rounded-full ${client.status === 'ativo' ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-[10px] text-gray-600">
                      {client.status === 'ativo' ? '✓ Ativo' : '✗ Inativo'}
                    </span>
                  </div>

                  {/* Métricas */}
                  <div className="space-y-1 pt-2 border-t border-gray-100">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-600">Follow-ups:</span>
                      <span className="font-semibold text-gray-900">{client.followUpsCount}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-600">Backlog:</span>
                      <span className="font-semibold text-gray-900">{client.backlogCount}</span>
                    </div>
                  </div>

                  {/* Localização (opcional) */}
                  {client.city && (
                    <p className="text-[10px] text-gray-400 mt-2 truncate">📍 {client.city}</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(content, document.body);
}