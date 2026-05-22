import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertCircle, DollarSign, Calendar, CreditCard, Banknote, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import InputMoeda from "@/components/ui/InputMoeda";

export default function ModalRegistrarPagamento({ 
  contaReceber, 
  open, 
  onOpenChange,
  onSuccess 
}) {
  const [loading, setLoading] = useState(false);
  const [dataPagamento, setDataPagamento] = useState('');
  const [valorRecebido, setValorRecebido] = useState(0);
  const [formaPagamento, setFormaPagamento] = useState('');
  const [bancoDestino, setBancoDestino] = useState('');
  const [descontoConcedido, setDescontoConcedido] = useState(0);
  const [jurosRecebido, setJurosRecebido] = useState(0);
  const [multaRecebida, setMultaRecebida] = useState(0);
  const [observacoes, setObservacoes] = useState('');

  // Reset quando modal abre
  useEffect(() => {
    if (open && contaReceber) {
      setDataPagamento('');
      setValorRecebido(contaReceber.valor_aberto || contaReceber.valor_original || 0);
      setFormaPagamento('');
      setBancoDestino('');
      setDescontoConcedido(0);
      setJurosRecebido(0);
      setMultaRecebida(0);
      setObservacoes('');
    }
  }, [open, contaReceber]);

  // Calcula valor líquido
  const valorLiquido = valorRecebido - descontoConcedido + jurosRecebido + multaRecebida;
  const valorAberto = contaReceber?.valor_aberto || contaReceber?.valor_original || 0;
  const ehParcial = valorRecebido < valorAberto - 0.01;

  const handleSalvar = async () => {
    // Validações
    if (!dataPagamento) {
      toast.error('Data de pagamento é obrigatória');
      return;
    }

    if (!formaPagamento) {
      toast.error('Forma de pagamento é obrigatória');
      return;
    }

    if (valorRecebido <= 0) {
      toast.error('Valor recebido deve ser maior que zero');
      return;
    }

    if (valorRecebido > valorAberto + 0.01) {
      toast.error(`Valor não pode exceder o saldo aberto (R$ ${valorAberto.toFixed(2)})`);
      return;
    }

    const dataPag = new Date(dataPagamento);
    const dataHoje = new Date();
    if (dataPag > dataHoje) {
      toast.warning('Data de pagamento é futura - isso é permitido para recebimentos antecipados');
    }

    setLoading(true);

    try {
      const response = await base44.functions.invoke('registrarPagamento', {
        conta_receber_id: contaReceber.id,
        data_pagamento: dataPagamento,
        valor_recebido: valorRecebido,
        forma_pagamento: formaPagamento,
        banco_destino: bancoDestino,
        desconto_concedido: descontoConcedido,
        juros_recebido: jurosRecebido,
        multa_recebida: multaRecebida,
        observacoes: observacoes
      });

      if (response.data.success) {
        toast.success(ehParcial ? 'Pagamento parcial registrado com sucesso!' : 'Pagamento registrado com sucesso!');
        onSuccess?.(response.data);
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Erro ao registrar pagamento:', error);
      toast.error(error.response?.data?.error || 'Erro ao registrar pagamento');
    } finally {
      setLoading(false);
    }
  };

  const handleLimpar = () => {
    setDataPagamento('');
    setValorRecebido(0);
    setFormaPagamento('');
    setBancoDestino('');
    setDescontoConcedido(0);
    setJurosRecebido(0);
    setMultaRecebida(0);
    setObservacoes('');
  };

  if (!contaReceber) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            Registrar Dados de Pagamento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações da Conta */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase">Lançamento</p>
                <p className="font-medium text-gray-900">{contaReceber.cliente_nome || 'Cliente'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Valor Original</p>
                <p className="font-medium text-gray-900">
                  R$ {(contaReceber.valor_original || 0).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Já Pago</p>
                <p className="font-medium text-gray-900">
                  R$ {(contaReceber.valor_pago || 0).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Saldo Aberto</p>
                <p className="font-medium text-green-600">
                  R$ {(contaReceber.valor_aberto || contaReceber.valor_original || 0).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Status</p>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  contaReceber.status === 'pago' ? 'bg-green-100 text-green-800' :
                  contaReceber.status === 'parcial' ? 'bg-yellow-100 text-yellow-800' :
                  contaReceber.status === 'vencido' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {contaReceber.status?.toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Vencimento</p>
                <p className="font-medium text-gray-900">
                  {contaReceber.data_vencimento 
                    ? format(new Date(contaReceber.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })
                    : 'Não informado'}
                </p>
              </div>
            </div>
          </div>

          {/* Dados do Pagamento */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dataPagamento" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Data de Pagamento *
                </Label>
                <Input
                  id="dataPagamento"
                  type="date"
                  value={dataPagamento}
                  onChange={(e) => setDataPagamento(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="formaPagamento" className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Forma de Pagamento *
                </Label>
                <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="ted">TED/DOC</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                    <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="bancoDestino">Banco/Destino</Label>
              <Select value={bancoDestino} onValueChange={setBancoDestino}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione o banco de destino" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Nubank">Nubank</SelectItem>
                  <SelectItem value="Itaú">Itaú</SelectItem>
                  <SelectItem value="Bradesco">Bradesco</SelectItem>
                  <SelectItem value="Santander">Santander</SelectItem>
                  <SelectItem value="Caixa">Caixa</SelectItem>
                  <SelectItem value="Banco do Brasil">Banco do Brasil</SelectItem>
                  <SelectItem value="Inter">Inter</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Valores */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 space-y-3">
              <div>
                <Label htmlFor="valorRecebido" className="flex items-center gap-2">
                  <Banknote className="w-4 h-4" />
                  Valor Recebido/Pago *
                </Label>
                <InputMoeda
                  id="valorRecebido"
                  value={valorRecebido}
                  onChange={(valor) => setValorRecebido(valor)}
                  className="mt-1"
                  placeholder="0,00"
                />
                {ehParcial && (
                  <Alert className="mt-2 bg-yellow-50 border-yellow-200">
                    <AlertCircle className="w-4 h-4 text-yellow-600" />
                    <AlertDescription className="text-xs text-yellow-700">
                      Pagamento parcial: R$ {valorRecebido.toFixed(2)} de R$ {valorAberto.toFixed(2)}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="desconto">Descontos</Label>
                  <InputMoeda
                    id="desconto"
                    value={descontoConcedido}
                    onChange={(valor) => setDescontoConcedido(valor)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="juros">Juros</Label>
                  <InputMoeda
                    id="juros"
                    value={jurosRecebido}
                    onChange={(valor) => setJurosRecebido(valor)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="multa">Multa</Label>
                  <InputMoeda
                    id="multa"
                    value={multaRecebida}
                    onChange={(valor) => setMultaRecebida(valor)}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="border-t border-blue-200 pt-3">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-blue-900">Valor Líquido:</span>
                  <span className="text-xl font-bold text-green-600">
                    R$ {valorLiquido.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="observacoes">Observações</Label>
              <textarea
                id="observacoes"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="w-full mt-1 p-2 border border-gray-300 rounded-md text-sm"
                rows={3}
                placeholder="Observações sobre o pagamento..."
              />
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="outline" onClick={handleLimpar}>
            <X className="w-4 h-4 mr-2" />
            Limpar
          </Button>
          <Button 
            onClick={handleSalvar} 
            disabled={loading}
            className={ehParcial ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'}
          >
            {loading ? 'Registrando...' : ehParcial ? 'Salvar Pagamento Parcial' : 'Salvar Pagamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}