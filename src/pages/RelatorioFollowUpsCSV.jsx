import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

const FIELDS = [
  'completed_at', 'reminder_date', 'workshop_name', 'workshop_id',
  'consultor_nome', 'consultor_id', 'consultor_principal_nome', 'consultor_principal_id',
  'consultor_executor_nome', 'consultor_executor_id',
  'sequence_number', 'days_since_meeting', 'canal_origem', 'origin_type',
  'atendimento_id', 'ata_id', 'sprint_id',
  'suporte_id', 'suporte_descricao',
  'origem_tarefa_id', 'origem_pedido_id', 'origem_ata_id', 'origem_ata_titulo',
  'origem_descricao', 'origem_status', 'origem_responsavel_nome', 'origem_responsavel_id', 'origem_solicitante_nome',
  'atribuicao_automatica', 'peso_atribuicao',
  'message', 'notes',
  'consulting_firm_id', 'id',
];

const esc = (v) => {
  if (v === null || v === undefined) return '';
  const s = String(v).replace(/"/g, '""');
  return /[",\n\r]/.test(s) ? `"${s}"` : s;
};

export default function RelatorioFollowUpsCSV() {
  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const [count, setCount] = useState(0);
  const [error, setError] = useState('');

  const gerar = async () => {
    setStatus('loading');
    setError('');
    try {
      const since = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
      const reminders = await base44.entities.FollowUpReminder.filter(
        { is_completed: true }, '-completed_at', 500
      );
      const rows = reminders.filter(
        (r) => r.completed_at && new Date(r.completed_at) >= new Date(since)
      );

      const header = FIELDS.join(',');
      const lines = rows.map((r) => FIELDS.map((f) => esc(r[f])).join(','));
      const csv = [header, ...lines].join('\r\n');

      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `followups_encerrados_15dias_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setCount(rows.length);
      setStatus('done');
    } catch (e) {
      setError(e?.message || String(e));
      setStatus('error');
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <Card className="border-gray-200 shadow-sm">
        <CardContent className="p-8 space-y-5 text-center">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto">
            <Download className="w-7 h-7 text-red-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Relatório de Follow-ups Encerrados</h1>
            <p className="text-sm text-gray-500 mt-1">
              Gera um CSV com todos os follow-ups concluídos nos últimos 15 dias, incluindo todos os campos preenchidos.
            </p>
          </div>

          <Button onClick={gerar} disabled={status === 'loading'} className="w-full">
            {status === 'loading' ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando...</>
            ) : (
              <><Download className="w-4 h-4 mr-2" /> Baixar CSV</>
            )}
          </Button>

          {status === 'done' && (
            <div className="flex items-center justify-center gap-2 text-green-700 bg-green-50 rounded-lg py-2.5">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm font-medium">{count} follow-ups exportados com sucesso.</span>
            </div>
          )}
          {status === 'error' && (
            <div className="flex items-start justify-center gap-2 text-red-700 bg-red-50 rounded-lg py-2.5 px-3">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-left">{error}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}