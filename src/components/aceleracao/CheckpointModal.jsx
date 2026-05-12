import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, ChevronRight, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function CheckpointModal({
  isOpen,
  followUpStatus = { completed: 0, inProgress: 0, pendingCount: 0 },
  followUpContadorId,
  sprintId,
  bucketId,
  ataId,
  onSubmit,
  onCancel
}) {
  const [selectedOption, setSelectedOption] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Calcular próxima segunda-feira
  const getNextMonday = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilMonday = (1 - dayOfWeek + 7) % 7 || 7;
    const nextMonday = new Date(today);
    nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
    return nextMonday.toISOString().split('T')[0];
  };

  const nextMonday = getNextMonday();

  const handleSubmit = async () => {
    if (!selectedOption) {
      setError('Selecione uma opção para continuar');
      return;
    }

    if (selectedOption === 'in_days' && !selectedDate) {
      setError('Selecione uma data');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        followUpContador_id: followUpContadorId,
        decision: selectedOption,
        selectedDate: selectedOption === 'in_days' ? selectedDate : null,
        sprint_id: sprintId,
        bucket_id: bucketId,
        ata_id: ataId
      };

      const response = await base44.functions.invoke('processCheckpointDecision', payload);

      if (onSubmit) {
        onSubmit(selectedOption, {
          date: selectedOption === 'in_days' ? selectedDate : (selectedOption === 'next_week' ? nextMonday : null),
          followUpId: response.data?.followUpId,
          miniFollowUpId: response.data?.miniFollowUpId
        });
      }

      // Reset modal
      setSelectedOption(null);
      setSelectedDate('');
    } catch (err) {
      console.error('Error processing checkpoint:', err);
      setError(err.message || 'Erro ao processar checkpoint');
    } finally {
      setLoading(false);
    }
  };

  const getMinDate = () => {
    const today = new Date();
    today.setDate(today.getDate() + 1); // Próximo dia
    return today.toISOString().split('T')[0];
  };

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>📊 Checkpoint dessa Semana</DialogTitle>
          <DialogDescription>
            Você fez progresso! Quando você quer voltar a verificar?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Status Summary */}
          {followUpStatus.pendingCount > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-900">
                  {followUpStatus.pendingCount} demanda{followUpStatus.pendingCount !== 1 ? 's' : ''} ainda pendente{followUpStatus.pendingCount !== 1 ? 's' : ''}
                </p>
                <p className="text-amber-700 text-xs mt-1">
                  {followUpStatus.completed > 0 && `${followUpStatus.completed} concluída${followUpStatus.completed !== 1 ? 's' : ''}`}
                </p>
              </div>
            </div>
          )}

          {/* Opção 1: Próxima Semana */}
          <div
            onClick={() => setSelectedOption('next_week')}
            className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
              selectedOption === 'next_week'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-gray-900">Próxima Semana</p>
                <p className="text-sm text-gray-600 mt-1">
                  Segunda-feira, {new Date(nextMonday).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit'
                  })}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  ✓ Cria Semana 2 automática<br />
                  ✓ Herda pendências desta semana
                </p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                selectedOption === 'next_week' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
              }`}>
                {selectedOption === 'next_week' && <div className="w-2 h-2 bg-white rounded-full" />}
              </div>
            </div>
          </div>

          {/* Opção 2: Daqui X dias */}
          <div
            onClick={() => setSelectedOption('in_days')}
            className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
              selectedOption === 'in_days'
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-semibold text-gray-900">Daqui X Dias</p>
                <p className="text-sm text-gray-600 mt-1">
                  Escolha uma data específica
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  ✓ Cria mini follow-up para essa data<br />
                  ✓ Lembrete antes da semana 2
                </p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                selectedOption === 'in_days' ? 'border-green-500 bg-green-500' : 'border-gray-300'
              }`}>
                {selectedOption === 'in_days' && <div className="w-2 h-2 bg-white rounded-full" />}
              </div>
            </div>
            {selectedOption === 'in_days' && (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={getMinDate()}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Selecione a data"
              />
            )}
          </div>

          {/* Opção 3: Quando terminar tudo */}
          <div
            onClick={() => setSelectedOption('on_completion')}
            className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
              selectedOption === 'on_completion'
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-gray-900">Quando Terminar Tudo</p>
                <p className="text-sm text-gray-600 mt-1">
                  Sem data fixa
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  ✓ Mantém semana 1 aberta<br />
                  ✓ Avança para semana 2 quando 100% pronto
                </p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                selectedOption === 'on_completion' ? 'border-purple-500 bg-purple-500' : 'border-gray-300'
              }`}>
                {selectedOption === 'on_completion' && <div className="w-2 h-2 bg-white rounded-full" />}
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-4 border-t">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !selectedOption}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? 'Processando...' : 'Confirmar Checkpoint'}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}