import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import WheelLoader from '@/components/ui/WheelLoader';

export default function DiagnosticoRiscosPanel({ workshopId }) {
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState(null);

  const executarDiagnostico = async () => {
    setLoading(true);
    setErro(null);
    setResultado(null);

    try {
      const res = await base44.functions.invoke('diagnosticoRiscosOportunidades', {
        workshop_id: workshopId
      });

      setResultado(res.data);
    } catch (error) {
      setErro(error.message || 'Erro ao executar diagnóstico');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">🔍 Diagnóstico de Riscos & Oportunidades</h2>
        <Button 
          onClick={executarDiagnostico} 
          disabled={loading}
          className="gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {loading ? 'Analisando...' : 'Executar Diagnóstico'}
        </Button>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <WheelLoader size="lg" text="Analisando dados do banco..." />
        </div>
      )}

      {erro && (
        <Card className="bg-red-50 border-red-300 p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-red-900">Erro na Análise</h3>
              <p className="text-sm text-red-700 mt-1">{erro}</p>
            </div>
          </div>
        </Card>
      )}

      {resultado && (
        <div className="space-y-6">
          {/* CONCLUSÃO */}
          <Card className="bg-blue-50 border-blue-300 p-6">
            <div className="flex gap-4 items-start">
              {resultado.diagnostico.conclusao.includes('CRÍTICO') ? (
                <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
              ) : resultado.diagnostico.conclusao.includes('✅') ? (
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              ) : (
                <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
              )}
              <div>
                <h3 className="text-lg font-bold text-blue-900">Conclusão do Diagnóstico</h3>
                <p className="text-blue-700 mt-2 text-base">{resultado.diagnostico.conclusao}</p>
              </div>
            </div>
          </Card>

          {/* TOTAIS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 bg-gray-50">
              <p className="text-xs text-gray-600 font-semibold">TOTAL CONTRATOS</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{resultado.totais.total_contratos}</p>
            </Card>
            <Card className="p-4 bg-gray-50">
              <p className="text-xs text-gray-600 font-semibold">TOTAL ATAs</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{resultado.totais.total_atas}</p>
            </Card>
            <Card className="p-4 bg-gray-50">
              <p className="text-xs text-gray-600 font-semibold">CRONOGRAMA</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{resultado.totais.total_cronograma}</p>
            </Card>
            <Card className="p-4 bg-gray-50">
              <p className="text-xs text-gray-600 font-semibold">ATENDIMENTOS</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{resultado.totais.total_atendimentos}</p>
            </Card>
          </div>

          {/* RISCOS IDENTIFICADOS */}
          <Card className="border-red-200 bg-red-50 p-6">
            <h3 className="text-lg font-bold text-red-900 mb-4">📊 Riscos Identificados</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded p-3 border border-red-100">
                <p className="text-sm text-gray-600">Follow-Up Atrasado</p>
                <p className="text-2xl font-bold text-red-600">{resultado.riscos.followup_atrasado}</p>
              </div>
              <div className="bg-white rounded p-3 border border-red-100">
                <p className="text-sm text-gray-600">Contracts sem ATA (2 dias)</p>
                <p className="text-2xl font-bold text-red-600">{resultado.riscos.contracts_sem_ata_2dias}</p>
              </div>
              <div className="bg-white rounded p-3 border border-red-100">
                <p className="text-sm text-gray-600">Cronograma Atrasado</p>
                <p className="text-2xl font-bold text-red-600">{resultado.riscos.cronograma_atrasado}</p>
              </div>
              <div className="bg-white rounded p-3 border border-red-100">
                <p className="text-sm text-gray-600">Atendimentos em Risco</p>
                <p className="text-2xl font-bold text-red-600">{resultado.riscos.atendimentos_risco}</p>
              </div>
            </div>
          </Card>

          {/* CONSOLIDAÇÃO */}
          <Card className="border-purple-200 bg-purple-50 p-6">
            <h3 className="text-lg font-bold text-purple-900 mb-4">📈 Consolidação</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded p-4 border border-purple-100">
                <p className="text-sm text-gray-600">Clientes em Risco</p>
                <p className="text-3xl font-bold text-purple-600">{resultado.consolidacao.clientes_com_risco}</p>
              </div>
              <div className="bg-white rounded p-4 border border-purple-100">
                <p className="text-sm text-gray-600">Clientes sem Risco</p>
                <p className="text-3xl font-bold text-green-600">{resultado.consolidacao.clientes_sem_risco}</p>
              </div>
              <div className="bg-white rounded p-4 border border-purple-100">
                <p className="text-sm text-gray-600">Taxa de Risco</p>
                <p className="text-3xl font-bold text-red-600">{resultado.consolidacao.taxa_risco_percentual}%</p>
              </div>
            </div>
          </Card>

          {/* PRÓXIMOS PASSOS */}
          <Card className="border-green-200 bg-green-50 p-6">
            <h3 className="text-lg font-bold text-green-900 mb-3">✅ Próximos Passos</h3>
            {resultado.consolidacao.clientes_com_risco === 0 ? (
              <div className="space-y-2 text-sm text-green-700">
                <p>✅ <strong>FASE 2 AUTORIZADA:</strong> Implementar a correção de código.</p>
                <p>Os dados existem, o problema é puramente lógico no backend.</p>
              </div>
            ) : (
              <div className="space-y-2 text-sm text-green-700">
                <p>✅ <strong>DADOS CONFIRMADOS:</strong> {resultado.consolidacao.clientes_com_risco} cliente(s) com risco real.</p>
                <p>Procedendo para FASE 2: implementar correção de código.</p>
                <p>Após implementação, o modal deve exibir exatamente estes números.</p>
              </div>
            )}
          </Card>

          {/* DETALHES DEBUG */}
          <details className="border rounded p-4 bg-gray-50">
            <summary className="cursor-pointer font-bold text-gray-700">📋 Detalhes para Debug</summary>
            <pre className="mt-4 bg-white p-3 rounded text-xs overflow-auto max-h-64 border">
              {JSON.stringify(resultado, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}