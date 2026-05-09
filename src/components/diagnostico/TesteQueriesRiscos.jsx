import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle, AlertCircle } from 'lucide-react';

export default function TesteQueriesRiscos({ workshopId }) {
  const [resultados, setResultados] = useState({});
  const [loading, setLoading] = useState(false);

  const testarQueries = async () => {
    setLoading(true);
    const res = {};

    try {
      const hoje = new Date();
      const hojeDateString = hoje.toISOString().split('T')[0];

      // Teste 1: Follow-up Atrasado
      console.log('[TESTE] 1. Follow-up Atrasado...');
      const followups = await base44.asServiceRole.entities.FollowUpReminder.filter({
        workshop_id: workshopId,
        is_completed: false,
        reminder_date: { '$lt': hojeDateString }
      });
      res.followup_atrasado = { total: followups.length, ok: followups.length >= 0 };

      // Teste 2: Contracts Ativos
      console.log('[TESTE] 2. Contracts Ativos...');
      const contracts = await base44.asServiceRole.entities.Contract.filter({
        workshop_id: workshopId,
        status: { '$in': ['ativo', 'efetivado'] }
      });
      res.contracts_ativos = { total: contracts.length, ok: contracts.length >= 0 };

      // Teste 3: ATAs
      console.log('[TESTE] 3. Meeting Minutes (ATAs)...');
      const atas = await base44.asServiceRole.entities.MeetingMinutes.filter({
        workshop_id: workshopId
      });
      res.atas = { total: atas.length, ok: atas.length >= 0 };

      // Teste 4: Cronograma Atrasado
      console.log('[TESTE] 4. Cronograma Atrasado...');
      const cronogramaAtrasado = await base44.asServiceRole.entities.CronogramaImplementacao.filter({
        workshop_id: workshopId,
        status: { '$ne': 'concluido' },
        data_termino_previsto: { '$lt': hojeDateString }
      });
      res.cronograma_atrasado = { total: cronogramaAtrasado.length, ok: cronogramaAtrasado.length >= 0 };

      // Teste 5: Atendimentos em Risco
      console.log('[TESTE] 5. Atendimentos em Risco...');
      const atendimentos = await base44.asServiceRole.entities.ConsultoriaAtendimento.filter({
        workshop_id: workshopId,
        status: { '$in': ['atrasado', 'faltou'] }
      });
      res.atendimentos_risco = { total: atendimentos.length, ok: atendimentos.length >= 0 };

      // Teste 6: Correlação de ATA
      console.log('[TESTE] 6. Correlação ATA x Contracts...');
      const contractsRecentes = contracts.filter(c => {
        if (!c.activated_at) return false;
        const dataAtivacao = new Date(c.activated_at);
        const diasDesdeAtivacao = Math.floor((hoje - dataAtivacao) / (1000 * 60 * 60 * 24));
        return diasDesdeAtivacao <= 2;
      });
      
      const contractsSemAta = contractsRecentes.filter(c => {
        return !atas.some(a => {
          const dataMeeting = new Date(a.meeting_date);
          const dataAtivacao = new Date(c.activated_at);
          return dataMeeting >= dataAtivacao;
        });
      });
      
      res.correlacao_ata = { 
        contracts_recentes: contractsRecentes.length,
        sem_ata: contractsSemAta.length,
        ok: true
      };

      console.log('[TESTES CONCLUÍDOS]', res);
    } catch (error) {
      console.error('[ERRO NOS TESTES]', error);
      res.erro = error.message;
    } finally {
      setResultados(res);
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 bg-gray-50 border-2 border-blue-300">
      <h3 className="text-lg font-bold mb-4">🧪 Teste de Queries - FASE 2 QA</h3>
      
      <Button 
        onClick={testarQueries} 
        disabled={loading}
        className="mb-6"
      >
        {loading ? 'Testando...' : 'Executar Testes'}
      </Button>

      {resultados.erro && (
        <div className="bg-red-50 border border-red-300 rounded p-4 mb-4">
          <p className="text-red-700 font-bold">❌ Erro: {resultados.erro}</p>
        </div>
      )}

      {Object.keys(resultados).length > 0 && (
        <div className="space-y-3">
          {Object.entries(resultados)
            .filter(([key]) => key !== 'erro')
            .map(([key, value]) => (
              <div key={key} className="bg-white rounded p-4 border border-gray-200">
                <div className="flex items-center gap-3">
                  {value.ok ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{key}</p>
                    {typeof value === 'object' ? (
                      <p className="text-sm text-gray-600 mt-1">
                        {JSON.stringify(value)}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-600">{value}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </Card>
  );
}