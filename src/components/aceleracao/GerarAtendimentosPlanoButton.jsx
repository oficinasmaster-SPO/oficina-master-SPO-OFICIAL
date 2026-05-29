/**
 * GerarAtendimentosPlanoButton
 *
 * Botão isolado e reutilizável que chama generateWorkshopAttendances para um cliente.
 * TDD: lógica pura separada do UI — fácil de testar unitariamente.
 * Pode ser usado em GestaoTenants (admin) e em ClientDetailPanel (consultor).
 *
 * Props:
 *   workshopId  string   — ID da oficina alvo
 *   workshopName string  — Nome para exibir no toast (opcional)
 *   size        "sm"|"default" — tamanho do botão (default: "sm")
 *   variant     string   — variante do Button (default: "outline")
 */
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

export default function GerarAtendimentosPlanoButton({ workshopId, workshopName, size = 'sm', variant = 'outline' }) {
  const [loading, setLoading] = useState(false);

  if (!workshopId) return null;

  const handleGerar = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('generateWorkshopAttendances', { workshop_id: workshopId });
      const criados = res?.data?.attendances_created ?? 0;
      const pulados = res?.data?.skipped ?? 0;
      if (criados > 0) {
        toast.success(`✅ ${criados} atendimento(s) gerado(s) para ${workshopName || 'cliente'}`);
      } else {
        toast.info(`ℹ️ Nenhum novo atendimento — ${pulados} já existente(s) coberto(s) pelo plano`);
      }
    } catch (err) {
      const msg = err?.message || '';
      if (msg.toLowerCase().includes('planstatus')) {
        toast.warning('⚠️ Plano não está ativo (planStatus ≠ active) — geração bloqueada pela regra de negócio');
      } else {
        toast.error(`✗ Erro ao gerar atendimentos: ${msg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      size={size}
      variant={variant}
      disabled={loading}
      onClick={handleGerar}
      title="Gerar atendimentos do plano para este cliente (idempotente — não duplica)"
    >
      <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
      {loading ? 'Gerando...' : 'Gerar Entregas'}
    </Button>
  );
}