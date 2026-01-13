import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export function useSyncData() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);

  const syncMonthlyData = async (workshop_id, month) => {
    try {
      setIsSyncing(true);
      setSyncError(null);
      
      const result = await base44.functions.invoke('syncMonthlyData', {
        workshop_id,
        month
      });

      if (result.data.discrepancies && result.data.discrepancies.length > 0) {
        setSyncError({
          type: 'discrepancy',
          discrepancies: result.data.discrepancies,
          message: result.data.message
        });
        toast.warning(result.data.message);
        return { success: true, hasDiscrepancies: true, ...result.data };
      }

      toast.success('Dados sincronizados com sucesso');
      return { success: true, hasDiscrepancies: false, ...result.data };
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message;
      setSyncError({ type: 'error', message: errorMsg });
      toast.error(`Erro ao sincronizar: ${errorMsg}`);
      return { success: false, error: errorMsg };
    } finally {
      setIsSyncing(false);
    }
  };

  const syncDRETOMetas = async (dre_id, workshop_id, month) => {
    try {
      setIsSyncing(true);
      setSyncError(null);
      
      const result = await base44.functions.invoke('syncDRETOMetas', {
        dre_id,
        workshop_id,
        month
      });

      if (result.data.requires_confirmation) {
        setSyncError({
          type: 'confirmation',
          discrepancies: result.data.discrepancies,
          message: result.data.message
        });
        toast.warning(result.data.message);
        return { success: false, requiresConfirmation: true, ...result.data };
      }

      toast.success('Metas atualizadas com valores do DRE');
      return { success: true, requiresConfirmation: false, ...result.data };
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message;
      setSyncError({ type: 'error', message: errorMsg });
      toast.error(`Erro ao sincronizar DRE: ${errorMsg}`);
      return { success: false, error: errorMsg };
    } finally {
      setIsSyncing(false);
    }
  };

  const resolveDiscrepancy = async (workshop_id, month, use_source, dre_id = null, confirm_values = null) => {
    try {
      setIsSyncing(true);
      
      const result = await base44.functions.invoke('resolveSyncDiscrepancy', {
        workshop_id,
        month,
        use_source,
        dre_id,
        confirm_values
      });

      setSyncError(null);
      toast.success(result.data.message);
      return { success: true, ...result.data };
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message;
      toast.error(`Erro ao resolver discrepância: ${errorMsg}`);
      return { success: false, error: errorMsg };
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    syncMonthlyData,
    syncDRETOMetas,
    resolveDiscrepancy,
    isSyncing,
    syncError,
    clearError: () => setSyncError(null)
  };
}