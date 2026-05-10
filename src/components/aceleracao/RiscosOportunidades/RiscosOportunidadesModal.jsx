import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { X, TrendingDown, Lightbulb, List } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import RiscoCard from './RiscoCard';
import ClientesRiscoTabela from './ClientesRiscoTabela';
import WheelLoader from '@/components/ui/WheelLoader';

// workshopId é opcional: se null/undefined → modo global (todos os clientes)
export default function RiscosOportunidadesModal({ isOpen, onClose, workshopId }) {
  const [activeTab, setActiveTab] = useState('riscos');
  const [viewType, setViewType] = useState('cards'); // 'cards' ou 'tabela'

  const { data: analise = { riscos: [], oportunidades: [], estatisticas: {} }, isLoading } = useQuery({
    queryKey: ['riscosOportunidades', workshopId ?? 'global'],
    queryFn: async () => {
      if (!isOpen) return { riscos: [], oportunidades: [], estatisticas: {} };
      
      try {
        // Se workshopId ausente → envia sem workshop_id → backend entra em modo global
        const payload = workshopId ? { workshop_id: workshopId } : {};
        const response = await base44.functions.invoke('getRiscosOportunidadesAnalise', payload);
        return response.data || { riscos: [], oportunidades: [], estatisticas: {} };
      } catch (error) {
        console.error('Erro ao carregar análise:', error);
        return { riscos: [], oportunidades: [], estatisticas: {} };
      }
    },
    enabled: isOpen,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true
  });

  const handleAcao = (risco, cliente) => {
    const acoes = {
      'followup_atrasado': () => window.location.href = '/CentralFollowUp',
      'onboarding_risco': () => window.location.href = '/ControleAceleracao',
      'atendimentos_atrasados': () => window.location.href = '/ControleAceleracao',
      'proximos_passos_atrasados': () => window.location.href = '/CentralProximosPassos',
      'cronograma_atrasado': () => window.location.href = '/CronogramaImplementacao',
      'cronograma_nao_iniciado': () => window.location.href = '/CronogramaImplementacao'
    };

    const acao = acoes[risco.categoria];
    if (acao) acao();
  };

  // Consolidar todos os clientes em risco com detalhes
  const clientesConsolidados = () => {
    const map = {};
    if (analise.consolidacao) {
      Object.values(analise.consolidacao).forEach(cliente => {
        if (!map[cliente.id]) {
          map[cliente.id] = {
            id: cliente.id,
            name: cliente.name,
            riscos: cliente.riscos || []
          };
        }
      });
      return Object.values(map);
    }
    return [];
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex items-center justify-between pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
            <TrendingDown className="w-6 h-6 text-red-600" />
            ⚠️ Riscos & Oportunidades
          </DialogTitle>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <WheelLoader size="lg" text="Analisando riscos..." />
          </div>
        ) : (
          <div className="space-y-6 p-4">
            {/* Estatísticas */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 border border-blue-300 rounded-lg p-4">
                <p className="text-sm text-gray-600">Oportunidades</p>
                <p className="text-3xl font-bold text-blue-700">{analise.estatisticas.total_oportunidades || 0}</p>
              </div>
              <div className="bg-red-50 border border-red-300 rounded-lg p-4">
                <p className="text-sm text-gray-600">Em Risco</p>
                <p className="text-3xl font-bold text-red-700">{analise.estatisticas.clientes_em_risco || 0}</p>
              </div>
              <div className="bg-purple-50 border border-purple-300 rounded-lg p-4">
                <p className="text-sm text-gray-600">Taxa de Risco</p>
                <p className="text-3xl font-bold text-purple-700">{analise.estatisticas.taxa_risco_percentual || 0}%</p>
              </div>
            </div>

            {/* Abas */}
            <div className="flex gap-2 border-b flex-wrap">
              <Button
                variant={activeTab === 'riscos' ? 'default' : 'outline'}
                onClick={() => setActiveTab('riscos')}
                className="gap-2"
              >
                <TrendingDown className="w-4 h-4" />
                Riscos ({analise.riscos.length})
              </Button>
              <Button
                variant={activeTab === 'oportunidades' ? 'default' : 'outline'}
                onClick={() => setActiveTab('oportunidades')}
                className="gap-2"
              >
                <Lightbulb className="w-4 h-4" />
                Oportunidades ({analise.oportunidades.length})
              </Button>
              
              {activeTab === 'riscos' && (
                <div className="ml-auto flex gap-2">
                  <Button
                    size="sm"
                    variant={viewType === 'cards' ? 'default' : 'outline'}
                    onClick={() => setViewType('cards')}
                  >
                    Cards
                  </Button>
                  <Button
                    size="sm"
                    variant={viewType === 'tabela' ? 'default' : 'outline'}
                    onClick={() => setViewType('tabela')}
                    className="gap-1"
                  >
                    <List className="w-4 h-4" />
                    Tabela Detalhada
                  </Button>
                </div>
              )}
            </div>

            {/* Conteúdo */}
            <div className="space-y-4">
              {activeTab === 'riscos' ? (
                viewType === 'tabela' ? (
                  <ClientesRiscoTabela clientes={clientesConsolidados()} />
                ) : analise.riscos.length > 0 ? (
                  analise.riscos.map((risco) => (
                    <RiscoCard
                      key={risco.id}
                      risco={risco}
                      onAcao={handleAcao}
                    />
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500 border rounded-lg bg-green-50">
                    ✅ Nenhum risco identificado. Situação controlada!
                  </div>
                )
              ) : (
                analise.oportunidades.length > 0 ? (
                  analise.oportunidades.map((oport, idx) => (
                    <div key={idx} className="bg-blue-50 border border-blue-300 rounded-lg p-4">
                      <h3 className="font-bold text-blue-700">💡 {oport.titulo}</h3>
                      <p className="text-sm text-gray-600 mt-1">{oport.descricao}</p>
                      <p className="text-sm text-blue-600 mt-2 font-semibold">{oport.acao}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500 border rounded-lg bg-gray-50">
                    Nenhuma oportunidade identificada no momento.
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}