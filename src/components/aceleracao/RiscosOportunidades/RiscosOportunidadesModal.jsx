import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { X, TrendingDown, Lightbulb, List } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import RiscoCard from './RiscoCard';
import ClientesRiscoTabela from './ClientesRiscoTabela';
import WheelLoader from '@/components/ui/WheelLoader';

// Card de estatística com cor baseada em nível (usa classes literais, Tailwind-safe)
function StatCard({ label, valor, sublabel, nivel }) {
  const styles = nivel === 'saudavel'
    ? { wrap: 'bg-green-50 border-green-300', label: 'text-green-600', val: 'text-green-700' }
    : nivel === 'alerta'
    ? { wrap: 'bg-yellow-50 border-yellow-300', label: 'text-yellow-600', val: 'text-yellow-700' }
    : { wrap: 'bg-red-50 border-red-300', label: 'text-red-600', val: 'text-red-700' };

  return (
    <div className={`border rounded-lg p-4 ${styles.wrap}`}>
      <p className={`text-xs font-semibold uppercase tracking-wide ${styles.label}`}>{label}</p>
      <p className={`text-3xl font-bold ${styles.val}`}>{valor}%</p>
      <p className={`text-xs font-medium mt-1 ${styles.label}`}>{sublabel}</p>
    </div>
  );
}

// workshopId é opcional: se null/undefined → modo global (todos os clientes)
export default function RiscosOportunidadesModal({ isOpen, onClose, workshopId }) {
  const [activeTab, setActiveTab] = useState('riscos');
  const [viewType, setViewType] = useState('cards'); // 'cards' ou 'tabela'

  const { data: analise = { riscos: [], oportunidades: [], estatisticas: {} }, isLoading } = useQuery({
    queryKey: ['riscosOportunidades', workshopId ?? 'global'],
    queryFn: async () => {
      const payload = workshopId ? { workshop_id: workshopId } : {};
      const response = await base44.functions.invoke('getRiscosOportunidadesAnalise', payload);
      return response.data || { riscos: [], oportunidades: [], estatisticas: {} };
    },
    enabled: isOpen,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: 'always'
  });

  const handleAcao = (risco, cliente) => {
    const acoes = {
      'followup_atrasado': () => window.location.href = '/CentralFollowUp',
      'onboarding_risco': () => window.location.href = '/ControleAceleracao',
      'atendimentos_atrasados': () => window.location.href = '/ControleAceleracao',
      'proximos_passos_atrasados': () => window.location.href = '/CentralProximosPassos',
      'cronograma_atrasado': () => window.location.href = '/CronogramaImplementacao',
      'cronograma_nao_iniciado': () => window.location.href = '/CronogramaImplementacao',
      'sprints_atrasadas': () => window.location.href = '/ListagemClientesSprints'
    };

    const acao = acoes[risco.categoria];
    if (acao) acao();
  };

  // Consolidar clientes únicos com consultor extraído dos riscos de follow-up
  const clientesConsolidados = () => {
    if (!analise.consolidacao) return [];
    return Object.values(analise.consolidacao).map(cliente => {
      // Tentar extrair consultor do risco de followup
      const riscoFUP = analise.riscos?.find(r => r.categoria === 'followup_atrasado');
      const clienteFUP = riscoFUP?.clientes?.find(c => c.id === cliente.id);
      return {
        id: cliente.id,
        name: cliente.name,
        consultor: clienteFUP?.consultor_nome || '',
        riscos: cliente.riscos || []
      };
    });
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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="bg-blue-50 border border-blue-300 rounded-lg p-4">
                <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide">Oportunidades</p>
                <p className="text-3xl font-bold text-blue-700">{analise.estatisticas.total_oportunidades || 0}</p>
              </div>
              <div className="bg-red-50 border border-red-300 rounded-lg p-4">
                <p className="text-xs font-semibold text-red-500 uppercase tracking-wide">Clientes em Risco</p>
                <p className="text-3xl font-bold text-red-700">{analise.estatisticas.clientes_em_risco || 0}</p>
              </div>
              <div className="bg-purple-50 border border-purple-300 rounded-lg p-4">
                <p className="text-xs font-semibold text-purple-500 uppercase tracking-wide">Taxa de Risco</p>
                <p className="text-3xl font-bold text-purple-700">{analise.estatisticas.taxa_risco_percentual || 0}%</p>
              </div>
              {/* PP Atrasados */}
              <StatCard
                label="PP em Atraso"
                valor={analise.estatisticas?.proximos_passos?.taxa_atraso || 0}
                sublabel={`${analise.estatisticas?.proximos_passos?.clientes_atrasados || 0}/${analise.estatisticas?.proximos_passos?.total_com_pp || 0} clientes · ${analise.estatisticas?.proximos_passos?.severidade?.label || '—'}`}
                nivel={analise.estatisticas?.proximos_passos?.severidade?.nivel}
              />
              {/* Sprints Desengajamento */}
              <StatCard
                label="Sprints Sem Ação"
                valor={analise.estatisticas?.sprints?.taxa_desengajamento || 0}
                sublabel={`${analise.estatisticas?.sprints?.clientes_desengajados || 0}/${analise.estatisticas?.sprints?.total_com_sprint || 0} sem atividade +7d · ${analise.estatisticas?.sprints?.severidade?.label || '—'}`}
                nivel={analise.estatisticas?.sprints?.severidade?.nivel}
              />
            </div>

            {/* Abas */}
            <div className="flex gap-2 border-b flex-wrap">
              <Button
                variant={activeTab === 'riscos' ? 'default' : 'outline'}
                onClick={() => setActiveTab('riscos')}
                className="gap-2"
              >
                <TrendingDown className="w-4 h-4" />
                Clientes em Risco ({analise.riscos.length})
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
                  <ClientesRiscoTabela clientes={clientesConsolidados()} riscos={analise.riscos} />
                ) : analise.riscos.length > 0 ? (
                  analise.riscos.map((risco) => {
                    // Determinar métricas específicas por tipo de card
                    let engajamentoStatus = null;
                    let taxaEngajamento = null;
                    let totalBase = 0;
                    let desengajados = 0;

                    if (risco.categoria === 'proximos_passos_atrasados') {
                      const pp = analise.estatisticas?.proximos_passos;
                      engajamentoStatus = pp?.severidade;
                      taxaEngajamento = pp?.taxa_atraso;
                      totalBase = pp?.total_com_pp || 0;
                      desengajados = pp?.clientes_atrasados || 0;
                    } else if (risco.categoria === 'sprints_atrasadas') {
                      const sp = analise.estatisticas?.sprints;
                      engajamentoStatus = sp?.severidade;
                      taxaEngajamento = sp?.taxa_desengajamento;
                      totalBase = sp?.total_com_sprint || 0;
                      desengajados = sp?.clientes_desengajados || 0;
                    }

                    return (
                      <RiscoCard
                        key={risco.id}
                        risco={risco}
                        onAcao={handleAcao}
                        engajamentoStatus={engajamentoStatus}
                        taxaEngajamento={taxaEngajamento}
                        totalAtivos={totalBase}
                        desengajados={desengajados}
                      />
                    );
                  })
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