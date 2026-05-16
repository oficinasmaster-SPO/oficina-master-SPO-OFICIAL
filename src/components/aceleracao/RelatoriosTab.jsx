import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Eye, Loader2, Calendar, Mail } from 'lucide-react';
import { toast } from 'sonner';
import EnviarEmailModal from './EnviarEmailModal';
import RelatorioDetalhado from './RelatorioDetalhado/Modal';
import RiscosOportunidadesModal from './RiscosOportunidades/RiscosOportunidadesModal';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function RelatoriosTab() {
  const { user } = useAuth();
  const [loadingPdf, setLoadingPdf] = useState(null);
  const [pdfPreview, setPdfPreview] = useState({ tipo: null, url: null });
  const [periodoSelecionado, setPeriodoSelecionado] = useState('mensal');
  const [dataSelecionada, setDataSelecionada] = useState(new Date().toISOString().split('T')[0]);
  const [metricas, setMetricas] = useState({});
  const [loadingMetricas, setLoadingMetricas] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailModalTipo, setEmailModalTipo] = useState(null);
  const [relatorioDetalhado, setRelatorioDetalhado] = useState({ isOpen: false, tipo: null });
  const [riscosOportunidadesOpen, setRiscosOportunidadesOpen] = useState(false);
  const [riscosData, setRiscosData] = useState({
    total_clientes_ativos: 0,
    clientes_em_risco: 0,
    taxa_risco_percentual: 0
  });
  const [loadingRiscos, setLoadingRiscos] = useState(false);

  // Datas calculadas uma vez, com timezone BR correto
  const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD no fuso local
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // domingo da semana atual
  const weekStartStr = weekStart.toLocaleDateString('en-CA');

  const [metricasDiarias, setMetricasDiarias] = useState({});
  const [metricasSemanais, setMetricasSemanais] = useState({});

  // Buscar métricas quando alterar período ou data — 3 chamadas independentes
  useEffect(() => {
    const buscarMetricas = async () => {
      setLoadingMetricas(true);
      try {
        const [resDiario, resSemanal, resMensal] = await Promise.all([
          // Diário: data selecionada (não hardcoded today)
          base44.functions.invoke('getRelatorioFollowUpMetricas', {
            tipo: 'diario',
            data: dataSelecionada,
          }),
          // Semanal: semana que contém a data selecionada
          base44.functions.invoke('getRelatorioFollowUpMetricas', {
            tipo: 'semanal',
            data: dataSelecionada,
          }),
          // Mensal: período selecionado
          base44.functions.invoke('getRelatorioFollowUpMetricas', {
            tipo: 'mensal',
            data: dataSelecionada,
            periodo: periodoSelecionado,
          }),
        ]);

        if (resDiario.data?.metricas) {
          setMetricasDiarias(resDiario.data.metricas);
        }
        if (resSemanal.data?.metricas) {
          setMetricasSemanais(resSemanal.data.metricas);
        }
        if (resMensal.data?.metricas) {
          setMetricas({ ...resMensal.data.metricas, _followups: resMensal.data.followups || [] });
        }
      } catch (error) {
        console.error('Erro ao buscar métricas:', error);
        toast.error('Erro ao carregar métricas');
      } finally {
        setLoadingMetricas(false);
      }
    };

    buscarMetricas();
  }, [periodoSelecionado, dataSelecionada]);

  // Buscar dados de riscos quando modal abrir — modo GLOBAL
  useEffect(() => {
    if (riscosOportunidadesOpen) {
      const buscarRiscos = async () => {
        setLoadingRiscos(true);
        try {
          const response = await base44.functions.invoke('getRiscosOportunidadesAnalise', {});
          if (response.data?.estatisticas) {
            setRiscosData(response.data.estatisticas);
          }
        } catch (error) {
          console.error('Erro ao buscar riscos:', error);
        } finally {
          setLoadingRiscos(false);
        }
      };
      buscarRiscos();
    }
  }, [riscosOportunidadesOpen]);

  // Feriados nacionais fixos brasileiros (MM-DD)
  const FERIADOS_NACIONAIS_FIXOS = [
    '01-01', // Ano Novo
    '04-21', // Tiradentes
    '05-01', // Dia do Trabalho
    '09-07', // Independência
    '10-12', // Nossa Senhora Aparecida
    '11-02', // Finados
    '11-15', // Proclamação da República
    '11-20', // Consciência Negra
    '12-25', // Natal
  ];

  const isFeriadoNacional = (ano, mes, dia) => {
    const mmdd = `${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    return FERIADOS_NACIONAIS_FIXOS.includes(mmdd);
  };

  const isDiaUtil = (ano, mes, dia) => {
    const dow = new Date(ano, mes, dia).getDay();
    if (dow === 0 || dow === 6) return false; // fim de semana
    if (isFeriadoNacional(ano, mes, dia)) return false; // feriado
    return true;
  };

  // Badge de saúde baseado em ritmo: realizados vs esperado até hoje (por dias úteis passados, excluindo feriados)
  const getSaudeBadgeMensal = (followupsGerados, realizados) => {
    if (!followupsGerados || followupsGerados === 0) return null;

    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = hoje.getMonth();
    const totalDiasNoMes = new Date(ano, mes + 1, 0).getDate();

    // Dias úteis totais do mês (excluindo feriados)
    let diasUteisMes = 0;
    for (let d = 1; d <= totalDiasNoMes; d++) {
      if (isDiaUtil(ano, mes, d)) diasUteisMes++;
    }

    // Dias úteis já passados até hoje exclusive (hoje é domingo = não conta)
    let diasUteisPassados = 0;
    for (let d = 1; d < hoje.getDate(); d++) {
      if (isDiaUtil(ano, mes, d)) diasUteisPassados++;
    }
    // Se hoje é dia útil, conta também
    if (isDiaUtil(ano, mes, hoje.getDate())) diasUteisPassados++;

    if (diasUteisMes === 0 || diasUteisPassados === 0) return null;

    // média diária × dias úteis passados = esperado até hoje
    const mediaDiaria = followupsGerados / diasUteisMes;
    const esperadoAteHoje = mediaDiaria * diasUteisPassados;

    if (esperadoAteHoje === 0) return null;

    const indiceRitmo = realizados / esperadoAteHoje;

    if (indiceRitmo >= 1.0) return { label: 'Excelente', bg: 'bg-green-100 text-green-700' };
    if (indiceRitmo >= 0.9) return { label: 'Saudável', bg: 'bg-blue-100 text-blue-700' };
    if (indiceRitmo >= 0.7) return { label: 'Atenção', bg: 'bg-yellow-100 text-yellow-700' };
    return { label: 'Crítico', bg: 'bg-red-100 text-red-700' };
  };

  // Badge original para diário/semanal (mantém lógica anterior)
  const getSaudeBadge = (taxaAtraso) => {
    if (taxaAtraso === undefined || taxaAtraso === null) return null;
    if (taxaAtraso <= 5) return { label: 'Excelente', bg: 'bg-green-100 text-green-700' };
    if (taxaAtraso <= 10) return { label: 'Saudável', bg: 'bg-blue-100 text-blue-700' };
    if (taxaAtraso <= 20) return { label: 'Atenção', bg: 'bg-yellow-100 text-yellow-700' };
    return { label: 'Crítico', bg: 'bg-red-100 text-red-700' };
  };

  const followups = metricas._followups || [];
  const totalGeral = (metricas.realizados || 0) + (metricas.pendentes || 0);

  // Follow-ups gerados no período: usa o valor direto do backend (fonte da verdade)
  const followupsGeradosMes = metricas.totalGeradosPeriodo ?? 0;

  // Taxa mensal: índice de ritmo = realizados / esperado_até_hoje × 100
  const realizadosMes = metricas.realizados || 0;

  const calcIndiceRitmoMensal = (followupsGerados, realizados) => {
    if (!followupsGerados || followupsGerados === 0) return 0;
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = hoje.getMonth();
    const totalDiasNoMes = new Date(ano, mes + 1, 0).getDate();
    let diasUteisMes = 0;
    for (let d = 1; d <= totalDiasNoMes; d++) {
      if (isDiaUtil(ano, mes, d)) diasUteisMes++;
    }
    let diasUteisPassados = 0;
    for (let d = 1; d <= hoje.getDate(); d++) {
      if (isDiaUtil(ano, mes, d)) diasUteisPassados++;
    }
    if (diasUteisMes === 0 || diasUteisPassados === 0) return 0;
    const esperadoAteHoje = (followupsGerados / diasUteisMes) * diasUteisPassados;
    if (esperadoAteHoje === 0) return 0;
    return Math.round((realizados / esperadoAteHoje) * 100);
  };

  const taxaMensalNova = calcIndiceRitmoMensal(followupsGeradosMes, realizadosMes);

  // Badge mensal com nova lógica de ritmo
  const badgeMensal = getSaudeBadgeMensal(followupsGeradosMes, realizadosMes);

  const relatorios = [
    {
      id: 'diario',
      titulo: '📊 Relatório Diário',
      data: today,
      descricao: `Dia ${new Date(dataSelecionada + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })}`,
      metricas: [
        { label: 'Realizados hoje', valor: metricasDiarias.realizados, tipo: 'realizados' },
        { label: 'Pendentes', valor: metricasDiarias.pendentes, tipo: 'pendentes' },
        { label: 'Taxa realização', valor: metricasDiarias.taxaRealizacao, tipo: 'taxa', taxaAtraso: metricasDiarias.taxaAtraso },
      ],
    },
    {
      id: 'semanal',
      titulo: '📅 Relatório Semanal',
      data: weekStartStr,
      descricao: `Semana de ${weekStartStr} → ${dataSelecionada}`,
      metricas: [
        { label: 'Realizados semana', valor: metricasSemanais.realizados, tipo: 'realizados' },
        { label: 'Pendentes semana', valor: metricasSemanais.pendentes, tipo: 'pendentes' },
        { label: 'Taxa semana', valor: metricasSemanais.taxaRealizacao, tipo: 'taxa', taxaAtraso: metricasSemanais.taxaAtraso },
      ],
    },
    {
      id: 'mensal',
      titulo: '🗓️ Relatório Mensal',
      data: `${today.substring(0, 7)}-01`,
      descricao: 'Mês completo',
      metricas: [
        { label: 'Total mês', valor: metricas.realizados, tipo: 'realizados' },
        { label: 'Followups gerados', valor: followupsGeradosMes, tipo: 'neutro' },
        { label: 'Taxa mensal', valor: taxaMensalNova, tipo: 'taxa_mensal', badgeMensal },
      ],
    },
    {
      id: 'riscos',
      titulo: '⚠️ Riscos & Oportunidades',
      data: today,
      descricao: 'Análise de performance',
      metricas: [
        { label: 'Clientes Ativos', valor: riscosData.total_clientes_ativos, tipo: 'neutro' },
        { label: 'Em Risco', valor: riscosData.clientes_em_risco, tipo: 'pendentes' },
        { label: 'Taxa de Risco', valor: riscosData.taxa_risco_percentual, tipo: 'taxa', taxaAtraso: riscosData.taxa_risco_percentual },
      ],
      isRiscos: true
    },
  ];

  const handleGerarPDF = async (tipo) => {
    setLoadingPdf(tipo);
    try {
      const payload = {
        tipo,
        data: dataSelecionada,
      };

      // Adicionar período para relatórios que suportam (mensal, trimestral, semestral, anual)
      if ((tipo === 'mensal' || tipo === 'riscos') && periodoSelecionado) {
        payload.periodo = periodoSelecionado;
      }

      const response = await base44.functions.invoke('gerarRelatorioFollowUpPDF', payload);

      if (response.data) {
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `relatorio-followup-${tipo}-${dataSelecionada}.pdf`;
        a.click();
        toast.success('PDF baixado com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setLoadingPdf(null);
    }
  };



  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Relatórios de Follow-up</h2>
        
        {/* Seletores de Período e Data */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-gray-700 block mb-2 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" />
                Período
              </label>
              <Select value={periodoSelecionado} onValueChange={setPeriodoSelecionado}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="trimestral">Trimestral</SelectItem>
                  <SelectItem value="semestral">Semestral</SelectItem>
                  <SelectItem value="anual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-gray-700 block mb-2">Data de Referência</label>
              <input
                type="date"
                value={dataSelecionada}
                onChange={(e) => setDataSelecionada(e.target.value)}
                className="w-full h-9 px-3 border border-gray-300 rounded text-sm"
              />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Selecione o período e a data para gerar relatórios com filtros específicos
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {relatorios.map(rel => (
            <Card key={rel.id} className="border-gray-200 hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">{rel.titulo}</h3>
                    <p className="text-xs text-gray-500 mt-1">{rel.descricao}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {rel.metricas.map((m, idx) => {
                      const isLoading = rel.isRiscos ? loadingRiscos : loadingMetricas;
                      const display = m.valor !== undefined && m.valor !== null
                        ? (m.tipo === 'taxa' || m.tipo === 'taxa_mensal' ? `${m.valor}%` : m.valor)
                        : '—';
                      const badge = m.tipo === 'taxa_mensal' ? m.badgeMensal : (m.tipo === 'taxa' ? getSaudeBadge(m.taxaAtraso) : null);

                      let bgClass = 'bg-gray-50';
                      let textClass = 'text-gray-900';
                      if (m.tipo === 'realizados') { bgClass = 'bg-green-50'; textClass = 'text-green-700'; }
                      if (m.tipo === 'pendentes') { bgClass = 'bg-orange-50'; textClass = 'text-orange-600'; }
                      if (m.tipo === 'taxa' && badge) { bgClass = 'bg-gray-50'; }

                      return (
                        <div key={idx} className={`${bgClass} rounded p-2 text-center`}>
                          <p className="text-xs text-gray-600">{m.label}</p>
                          <p className={`text-sm font-semibold mt-1 ${isLoading ? 'text-gray-400' : textClass}`}>
                            {isLoading ? '...' : display}
                          </p>
                          {!isLoading && badge && (
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium mt-1 inline-block ${badge.bg}`}>
                              {badge.label}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-8 text-xs gap-1.5"
                      onClick={() => handleGerarPDF(rel.id)}
                      disabled={loadingPdf === rel.id}
                    >
                      {loadingPdf === rel.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Download className="w-3 h-3" />
                      )}
                      PDF
                    </Button>
                    <Button
                       size="sm"
                       className={`flex-1 h-8 text-xs gap-1.5 ${rel.id === 'riscos' ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:bg-primary/90'}`}
                       onClick={() => rel.id === 'riscos' ? setRiscosOportunidadesOpen(true) : setRelatorioDetalhado({ isOpen: true, tipo: rel.id })}
                     >
                       <Eye className="w-3 h-3" />
                       Ver
                     </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-8 text-xs gap-1.5"
                      onClick={() => {
                        setEmailModalTipo(rel.id);
                        setEmailModalOpen(true);
                      }}
                    >
                      <Mail className="w-3 h-3" />
                      Email
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {pdfPreview.url && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-gray-50 border-b p-4 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Visualizar Relatório {pdfPreview.tipo}</h3>
              <button
                onClick={() => setPdfPreview({ tipo: null, url: null })}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <iframe
                src={pdfPreview.url}
                className="w-full h-[70vh] border border-gray-300 rounded"
                title="PDF Preview"
              />
            </div>
          </div>
        </div>
      )}

      <EnviarEmailModal
        isOpen={emailModalOpen}
        onClose={() => {
          setEmailModalOpen(false);
          setEmailModalTipo(null);
        }}
        tipoRelatorio={emailModalTipo}
        data={dataSelecionada}
      />

      <RelatorioDetalhado
        isOpen={relatorioDetalhado.isOpen}
        onClose={() => setRelatorioDetalhado({ isOpen: false, tipo: null })}
        tipo={relatorioDetalhado.tipo || 'diario'}
        periodo={periodoSelecionado}
        data={dataSelecionada}
      />

      <RiscosOportunidadesModal
        isOpen={riscosOportunidadesOpen}
        onClose={() => setRiscosOportunidadesOpen(false)}
        workshopId={null}
      />
    </div>
  );
}