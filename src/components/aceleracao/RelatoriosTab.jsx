import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Eye, Loader2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import jsPDF from 'npm:jspdf@2.5.2';

export default function RelatoriosTab() {
  const { user } = useAuth();
  const [loadingPdf, setLoadingPdf] = useState(null);
  const [pdfPreview, setPdfPreview] = useState(null);
  const [periodoSelecionado, setPeriodoSelecionado] = useState('mensal');
  const [dataSelecionada, setDataSelecionada] = useState(new Date().toISOString().split('T')[0]);
  const [metricas, setMetricas] = useState({});
  const [loadingMetricas, setLoadingMetricas] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  // Buscar métricas quando alterar período ou data
  React.useEffect(() => {
    const buscarMetricas = async () => {
      setLoadingMetricas(true);
      try {
        const response = await base44.functions.invoke('getRelatorioFollowUpMetricas', {
          tipo: 'mensal',
          data: dataSelecionada,
          periodo: periodoSelecionado,
        });

        if (response.data) {
          setMetricas(response.data);
        }
      } catch (error) {
        console.error('Erro ao buscar métricas:', error);
      } finally {
        setLoadingMetricas(false);
      }
    };

    buscarMetricas();
  }, [periodoSelecionado, dataSelecionada]);

  const relatorios = [
    {
      id: 'diario',
      titulo: '📊 Relatório Diário',
      data: today,
      descricao: 'Resumo do dia',
      metricasLabels: ['Realizados', 'Pendentes', 'Taxa de realização'],
      metricasChave: ['realizados', 'pendentes', 'taxaRealizacao'],
    },
    {
      id: 'semanal',
      titulo: '📊 Relatório Semanal',
      data: weekStart.toISOString().split('T')[0],
      descricao: `Semana ${Math.ceil((new Date().getDate()) / 7)}`,
      metricasLabels: ['Total semana', 'Comparativo dias', 'Taxa média'],
      metricasChave: ['total', 'realizados', 'taxaRealizacao'],
    },
    {
      id: 'mensal',
      titulo: '📊 Relatório Mensal',
      data: `${today.substring(0, 7)}-01`,
      descricao: 'Mês completo',
      metricasLabels: ['Total mês', 'Evolução semanal', 'Taxa mensal'],
      metricasChave: ['total', 'realizados', 'taxaRealizacao'],
    },
    {
      id: 'riscos',
      titulo: '⚠️ Riscos & Oportunidades',
      data: today,
      descricao: 'Análise de performance',
      metricasLabels: ['Atrasados', 'Taxa baixa', 'Em risco'],
      metricasChave: ['pendentes', 'taxaRealizacao', 'total'],
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

  const handleVerPDF = (tipo) => {
    // Simula visualização — em produção, abrir modal com PDFViewer
    toast.info(`Abrindo visualização do relatório ${tipo}...`);
    setPdfPreview(tipo);
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
                    {rel.metricasLabels.map((metrica, idx) => {
                      const chave = rel.metricasChave[idx];
                      const valor = metricas[chave];
                      const display = valor !== undefined ? (chave === 'taxaRealizacao' ? `${valor}%` : valor) : '—';
                      return (
                        <div key={idx} className="bg-gray-50 rounded p-2 text-center">
                          <p className="text-xs text-gray-600">{metrica}</p>
                          <p className={`text-sm font-semibold mt-1 ${loadingMetricas ? 'text-gray-400' : 'text-gray-900'}`}>
                            {loadingMetricas ? '...' : display}
                          </p>
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
                      className="flex-1 h-8 text-xs gap-1.5 bg-red-600 hover:bg-red-700"
                      onClick={() => handleVerPDF(rel.id)}
                    >
                      <Eye className="w-3 h-3" />
                      Ver
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {pdfPreview && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-gray-50 border-b p-4 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Visualizar Relatório</h3>
              <button
                onClick={() => setPdfPreview(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <p className="text-gray-600 text-sm">
                Relatório {pdfPreview} — Implementação do PDFViewer em produção
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}