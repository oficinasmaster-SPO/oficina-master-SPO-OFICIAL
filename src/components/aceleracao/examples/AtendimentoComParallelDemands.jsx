/**
 * EXEMPLO DE INTEGRAÇÃO: Modal de Atendimento com Demandas Paralelas
 * 
 * Copiar este padrão para RegistrarAtendimentoModal ou similar
 */

import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import ParallelDemandsPanel from '@/components/aceleracao/ParallelDemandsPanel';
import DemandToast from '@/components/aceleracao/DemandToast';
import CheckpointModal from '@/components/aceleracao/CheckpointModal';
import { useClientDemands } from '@/components/aceleracao/hooks/useClientDemands';
import { useToastQueue, useSmartToastDispatcher } from '@/components/aceleracao/hooks/useToastQueue';
import { useDemandAnalytics } from '@/components/aceleracao/hooks/useDemandAnalytics';

export default function AtendimentoComParallelDemands({
  isOpen,
  workshopId,
  ataId,
  followUpContadorId,
  sprintId,
  bucketId,
  onClose,
  onSave
}) {
  // ==== DEMANDAS PARALELAS ====
  const { demands, loading: demandsLoading } = useClientDemands(workshopId);

  // ==== TOAST QUEUE ====
  const { visibleToasts, removeToast, addToast } = useToastQueue();

  // ==== ANALYTICS ====
  const { logAlertShown, logDemandClicked, logCheckpointDecision } = useDemandAnalytics();

  // ==== AUTO-DISPATCH TOASTS ====
  useSmartToastDispatcher(demands, addToast, logAlertShown);

  // ==== CHECKPOINT MODAL ====
  const [checkpointOpen, setCheckpointOpen] = useState(false);
  const [followUpStatus, setFollowUpStatus] = useState({
    completed: 0,
    inProgress: 0,
    pendingCount: 3 // exemplo: 3 pendências
  });

  // ==== ATENDIMENTO FORM STATE ====
  const [formData, setFormData] = useState({
    canal: '',
    resultado: '',
    observacoes: '',
    proxData: ''
  });

  // Handle demand click
  const handleDemandClick = useCallback((demandType, demandId) => {
    logDemandClicked(demandType, demandId);
    // Aqui você pode:
    // - Scrollar para seção de demanda
    // - Abrir drawer de detalhe
    // - Expandir item na panel
  }, [logDemandClicked]);

  // Handle save attendance
  const handleSaveAttendance = async () => {
    try {
      // 1. Salvar dados do atendimento
      await onSave?.(formData);

      // 2. Abrir Checkpoint Modal
      setCheckpointOpen(true);
    } catch (error) {
      console.error('Error saving attendance:', error);
    }
  };

  // Handle checkpoint decision
  const handleCheckpointSubmit = async (decision, metadata) => {
    console.log('✅ Checkpoint salvo:', decision, metadata);

    // Log event
    logCheckpointDecision(decision, metadata);

    // Fechar modals
    setCheckpointOpen(false);
    onClose?.();

    // Callback para atualizar parent
    // onCheckpointComplete?.(decision, metadata);
  };

  return (
    <>
      {/* MAIN DIALOG */}
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* FORM AREA (left 3 cols) */}
            <div className="lg:col-span-3">
              <h2 className="text-2xl font-bold mb-6">Registrar Atendimento</h2>

              {/* Form fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Canal</label>
                  <select
                    value={formData.canal}
                    onChange={(e) => setFormData({ ...formData, canal: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="">Selecione...</option>
                    <option value="ligacao">Ligação</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">Email</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Resultado</label>
                  <select
                    value={formData.resultado}
                    onChange={(e) => setFormData({ ...formData, resultado: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="">Selecione...</option>
                    <option value="atendeu">Atendeu</option>
                    <option value="retornar">Retornar</option>
                    <option value="agendou">Agendou</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Observações</label>
                  <textarea
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md h-24"
                    placeholder="Anotações do atendimento..."
                  />
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={onClose}
                    className="flex-1 px-4 py-2 border rounded-md hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveAttendance}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    💾 Salvar Atendimento
                  </button>
                </div>
              </div>
            </div>

            {/* PARALLEL DEMANDS PANEL (right 1 col) - FIXED */}
            <div className="hidden lg:block">
              <div className="sticky top-0">
                <ParallelDemandsPanel
                  demands={demands}
                  isOpen={true}
                  onDemandClick={handleDemandClick}
                />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* TOAST STACK - top-right (outside dialog) */}
      <div className="fixed top-4 right-4 space-y-2 z-50 pointer-events-none">
        {visibleToasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <DemandToast
              demand={toast.demand}
              onDismiss={() => removeToast(toast.id)}
              onView={() => {
                logDemandClicked(toast.demand.demandType, toast.demand.id);
                console.log('View demand:', toast.demand);
              }}
            />
          </div>
        ))}
      </div>

      {/* CHECKPOINT MODAL */}
      <CheckpointModal
        isOpen={checkpointOpen}
        followUpStatus={followUpStatus}
        followUpContadorId={followUpContadorId}
        sprintId={sprintId}
        bucketId={bucketId}
        ataId={ataId}
        onSubmit={handleCheckpointSubmit}
        onCancel={() => setCheckpointOpen(false)}
      />
    </>
  );
}

/**
 * EXEMPLO DE USO:
 * 
 * <AtendimentoComParallelDemands
 *   isOpen={modalOpen}
 *   workshopId="ws123"
 *   ataId="ata456"
 *   followUpContadorId="fc789"
 *   sprintId="sp111"
 *   bucketId="bk222"
 *   onClose={() => setModalOpen(false)}
 *   onSave={async (formData) => {
 *     await base44.entities.ConsultoriaAtendimento.create({
 *       ...formData,
 *       workshop_id: 'ws123',
 *       status: 'realizado'
 *     });
 *   }}
 * />
 */