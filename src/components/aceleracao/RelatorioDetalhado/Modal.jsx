import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import KPIBar from './KPIBar';
import Tabela from './Tabela';
import Filtros from './Filtros';

export default function RelatorioDetalhado({ isOpen, onClose, tipo, periodo, data }) {
  const { user } = useAuth();
  const [metricas, setMetricas] = useState({});
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({
    consultor: '',
    tipo: '',
    status: '',
  });
  const [pagina, setPagina] = useState(1);
  const ITENS_POR_PAGINA = 15;

  useEffect(() => {
    if (isOpen) {
      buscarDados();
    }
  }, [isOpen, tipo, periodo, data, filtros]);

  const buscarDados = async () => {
    setLoading(true);
    try {
      // Buscar métricas
      const metricsResponse = await base44.functions.invoke('getRelatorioFollowUpMetricas', {
        tipo: periodo,
        data,
      });

      if (metricsResponse.data) {
        setMetricas(metricsResponse.data);
      }

      // Buscar dados detalhados
      const dadosResponse = await base44.entities.FollowUpConcluido.filter(
        { consultor_id: user.id },
        '-completedAt',
        100
      );

      // Filtrar por data se for diário
      let filtered = dadosResponse;
      if (periodo === 'diario') {
        filtered = filtered.filter(d => d.completedAt?.startsWith(data));
      }

      // Aplicar filtros
      if (filtros.consultor) {
        filtered = filtered.filter(d => d.consultor_id === filtros.consultor);
      }
      if (filtros.tipo) {
        filtered = filtered.filter(d => d.tipo === filtros.tipo);
      }

      setDados(filtered);
      setPagina(1);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast.error('Erro ao carregar relatório');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const dadosPaginados = dados.slice(
    (pagina - 1) * ITENS_POR_PAGINA,
    pagina * ITENS_POR_PAGINA
  );
  const totalPaginas = Math.ceil(dados.length / ITENS_POR_PAGINA);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-gray-50 to-gray-100 border-b p-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Relatório Detalhado - {tipo === 'riscos' ? '⚠️ Riscos & Oportunidades' : `📊 ${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`}
            </h2>
            <p className="text-xs text-gray-600 mt-1">Período: {periodo} | Data: {data}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* KPI Bar */}
              <KPIBar metricas={metricas} />

              {/* Filtros */}
              <Filtros filtros={filtros} onFiltrosChange={setFiltros} />

              {/* Tabela */}
              <Tabela dados={dadosPaginados} />

              {/* Paginação */}
              {totalPaginas > 1 && (
                <div className="flex items-center justify-between border-t pt-4">
                  <p className="text-sm text-gray-600">
                    Página {pagina} de {totalPaginas} ({dados.length} registros)
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPagina(p => Math.max(1, p - 1))}
                      disabled={pagina === 1}
                      className="px-3 py-1 text-sm border rounded disabled:opacity-50"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                      disabled={pagina === totalPaginas}
                      className="px-3 py-1 text-sm border rounded disabled:opacity-50"
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}