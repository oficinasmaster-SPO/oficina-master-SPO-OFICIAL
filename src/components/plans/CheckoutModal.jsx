import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function CheckoutModal({ open, onClose, plan, workshop }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [gateway, setGateway] = useState("stripe");
  const [paymentMethod, setPaymentMethod] = useState("credit_card");
  const [cardData, setCardData] = useState({
    number: "",
    name: "",
    expiry: "",
    cvv: ""
  });

  const checkoutMutation = useMutation({
    mutationFn: async (data) => {
      // Verificar se backend functions está habilitado
      const backendFunctionsEnabled = false; // TODO: Verificar no ambiente
      
      if (!backendFunctionsEnabled) {
        // Modo simulação
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        await base44.entities.Workshop.update(workshop.id, {
          planoAtual: plan.nome,
          dataAssinatura: new Date().toISOString(),
          dataRenovacao: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });

        await base44.entities.PaymentHistory.create({
          workshop_id: workshop.id,
          plan_name: plan.nome,
          amount: plan.preco || 0,
          payment_method: data.paymentMethod,
          payment_status: "approved",
          gateway: data.gateway,
          payment_date: new Date().toISOString(),
          billing_period_start: new Date().toISOString(),
          billing_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });

        return { success: true, mode: 'simulation' };
      }

      // Modo real com backend functions
      const result = await base44.functions.createSubscription({
        workshopId: workshop.id,
        planId: plan.id,
        paymentData: {
          gateway: data.gateway,
          paymentMethod: data.paymentMethod,
          cardData: data.cardData,
          customerEmail: workshop.owner_email,
          customerName: workshop.owner_name
        },
        userId: workshop.owner_id
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries(['workshops']);
      queryClient.invalidateQueries(['payment-history']);
      
      if (result.mode === 'simulation') {
        toast.success("Plano atualizado (modo demonstração)");
      } else {
        toast.success("Plano atualizado com sucesso!");
      }
      
      onClose();
      navigate(createPageUrl("MeuPlano"));
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao processar pagamento");
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!plan || !workshop) {
      toast.error("Dados incompletos");
      return;
    }

    if (paymentMethod === "credit_card" && plan.preco > 0) {
      if (!cardData.number || !cardData.name || !cardData.expiry || !cardData.cvv) {
        toast.error("Preencha todos os dados do cartão");
        return;
      }
    }

    checkoutMutation.mutate({ gateway, paymentMethod, cardData });
  };

  if (!plan) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Finalizar Assinatura</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Aviso Backend Functions */}
          <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-orange-900 mb-1">
                  ⚠️ Backend Functions Necessário
                </p>
                <p className="text-xs text-orange-800 mb-2">
                  Para processar pagamentos reais, você precisa habilitar <strong>Backend Functions</strong> em:
                </p>
                <p className="text-xs text-orange-800 font-mono bg-orange-100 px-2 py-1 rounded">
                  Dashboard → Settings → Backend Functions → Habilitar
                </p>
                <p className="text-xs text-orange-700 mt-2">
                  Após habilitar, configure as chaves de API dos gateways nas variáveis de ambiente.
                </p>
              </div>
            </div>
          </div>

          {/* Resumo do Plano */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Plano {plan.nome}</h3>
                <p className="text-gray-600">{plan.descricao}</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-blue-600">
                  {plan.preco ? `R$ ${plan.preco.toFixed(2)}` : 'Grátis'}
                </div>
                {plan.preco && <div className="text-gray-600">por mês</div>}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>{plan.limites.diagnosticosMes === -1 ? 'Diagnósticos Ilimitados' : `${plan.limites.diagnosticosMes} Diagnósticos/mês`}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>{plan.limites.colaboradores === -1 ? 'Colaboradores Ilimitados' : `${plan.limites.colaboradores} Colaboradores`}</span>
              </div>
            </div>
          </div>

          {plan.preco > 0 && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Gateway de Pagamento */}
              <div>
                <Label className="text-lg font-semibold mb-3 block">Gateway de Pagamento</Label>
                <Select value={gateway} onValueChange={setGateway}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stripe">Stripe</SelectItem>
                    <SelectItem value="mercadopago">Mercado Pago</SelectItem>
                    <SelectItem value="pagarme">Pagar.me</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Método de Pagamento */}
              <div>
                <Label className="text-lg font-semibold mb-3 block">Método de Pagamento</Label>
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                  <div className="flex items-center space-x-2 border rounded-lg p-4 hover:bg-gray-50 cursor-pointer">
                    <RadioGroupItem value="credit_card" id="credit_card" />
                    <Label htmlFor="credit_card" className="flex items-center gap-2 cursor-pointer flex-1">
                      <CreditCard className="w-5 h-5" />
                      Cartão de Crédito
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-lg p-4 hover:bg-gray-50 cursor-pointer">
                    <RadioGroupItem value="pix" id="pix" />
                    <Label htmlFor="pix" className="cursor-pointer flex-1">PIX</Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-lg p-4 hover:bg-gray-50 cursor-pointer">
                    <RadioGroupItem value="boleto" id="boleto" />
                    <Label htmlFor="boleto" className="cursor-pointer flex-1">Boleto Bancário</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Dados do Cartão */}
              {paymentMethod === "credit_card" && (
                <div className="space-y-4">
                  <div>
                    <Label>Número do Cartão</Label>
                    <Input
                      placeholder="0000 0000 0000 0000"
                      value={cardData.number}
                      onChange={(e) => setCardData({...cardData, number: e.target.value})}
                      maxLength={19}
                    />
                  </div>
                  <div>
                    <Label>Nome no Cartão</Label>
                    <Input
                      placeholder="Nome como está no cartão"
                      value={cardData.name}
                      onChange={(e) => setCardData({...cardData, name: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Validade</Label>
                      <Input
                        placeholder="MM/AA"
                        value={cardData.expiry}
                        onChange={(e) => setCardData({...cardData, expiry: e.target.value})}
                        maxLength={5}
                      />
                    </div>
                    <div>
                      <Label>CVV</Label>
                      <Input
                        placeholder="000"
                        value={cardData.cvv}
                        onChange={(e) => setCardData({...cardData, cvv: e.target.value})}
                        maxLength={4}
                        type="password"
                      />
                    </div>
                  </div>
                </div>
              )}

              {paymentMethod === "pix" && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mb-2" />
                  <p className="text-sm text-gray-700">
                    Após confirmar, você receberá um código PIX para realizar o pagamento.
                  </p>
                </div>
              )}

              {paymentMethod === "boleto" && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mb-2" />
                  <p className="text-sm text-gray-700">
                    O boleto será gerado e enviado para seu e-mail. Prazo de compensação: até 2 dias úteis.
                  </p>
                </div>
              )}

              {/* Botões */}
              <div className="flex gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onClose}
                  className="flex-1"
                  disabled={checkoutMutation.isPending}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  disabled={checkoutMutation.isPending}
                >
                  {checkoutMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    'Confirmar Assinatura'
                  )}
                </Button>
              </div>
            </form>
          )}

          {plan.preco === 0 && (
            <Button 
              onClick={handleSubmit}
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={checkoutMutation.isPending}
            >
              {checkoutMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Ativando...
                </>
              ) : (
                'Ativar Plano Gratuito'
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}