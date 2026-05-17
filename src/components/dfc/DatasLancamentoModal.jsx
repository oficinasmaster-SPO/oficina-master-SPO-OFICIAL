import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { format, parse } from 'date-fns';
import { Calendar } from 'lucide-react';

export default function DatasLancamentoModal({ isOpen, onClose, lancamento, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [dataVencimento, setDataVencimento] = useState(
    lancamento?.data_vencimento ? format(new Date(lancamento.data_vencimento), 'dd/MM/yyyy') : ''
  );
  const [dataPagamento, setDataPagamento] = useState(
    lancamento?.data_pagamento ? format(new Date(lancamento.data_pagamento), 'dd/MM/yyyy') : ''
  );

  const handleSave = async () => {
    try {
      setLoading(true);

      // Parse datas
      let vencimentoDate = null;
      let pagamentoDate = null;

      if (dataVencimento) {
        vencimentoDate = parse(dataVencimento, 'dd/MM/yyyy', new Date());
      }

      if (dataPagamento) {
        pagamentoDate = parse(dataPagamento, 'dd/MM/yyyy', new Date());
      }

      // Update
      await base44.entities.DFCLancamento.update(lancamento.id, {
        data_vencimento: vencimentoDate,
        data_pagamento: pagamentoDate,
      });

      onSaved?.();
      onClose();
    } catch (error) {
      console.error('Erro ao salvar datas:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!lancamento) return null;

  const formatValue = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Datas do Lançamento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info do Lançamento */}
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <p className="text-sm font-medium text-gray-900">{lancamento.descricao}</p>
            <p className={`text-lg font-bold ${lancamento.tipo === 'saida' ? 'text-red-600' : 'text-green-600'}`}>
              {lancamento.tipo === 'saida' ? '-' : '+'}{formatValue(lancamento.valor)}
            </p>
          </div>

          {/* Data Vencimento */}
          <div>
            <Label htmlFor="vencimento" className="text-sm mb-2 block">
              Data de Vencimento <span className="text-gray-500">(opcional)</span>
            </Label>
            <Input
              id="vencimento"
              type="date"
              value={dataVencimento ? format(parse(dataVencimento, 'dd/MM/yyyy', new Date()), 'yyyy-MM-dd') : ''}
              onChange={(e) => {
                if (e.target.value) {
                  setDataVencimento(format(new Date(e.target.value), 'dd/MM/yyyy'));
                } else {
                  setDataVencimento('');
                }
              }}
              placeholder="dd/mm/yyyy"
            />
          </div>

          {/* Data Pagamento */}
          <div>
            <Label htmlFor="pagamento" className="text-sm mb-2 block">
              Data de Pagamento <span className="text-gray-500">(preencha quando pago)</span>
            </Label>
            <Input
              id="pagamento"
              type="date"
              value={dataPagamento ? format(parse(dataPagamento, 'dd/MM/yyyy', new Date()), 'yyyy-MM-dd') : ''}
              onChange={(e) => {
                if (e.target.value) {
                  setDataPagamento(format(new Date(e.target.value), 'dd/MM/yyyy'));
                } else {
                  setDataPagamento('');
                }
              }}
              placeholder="dd/mm/yyyy"
            />
            {dataPagamento && (
              <p className="text-xs text-green-600 mt-1">✓ Marcado como pago</p>
            )}
          </div>

          {/* Status */}
          {dataPagamento && (
            <div className="bg-green-50 p-2 rounded border border-green-200">
              <p className="text-xs text-green-700">
                <strong>Pago em:</strong> {dataPagamento}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading} className="bg-black text-white hover:bg-gray-800">
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}