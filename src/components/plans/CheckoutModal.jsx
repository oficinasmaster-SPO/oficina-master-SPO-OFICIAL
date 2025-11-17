import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CreditCard, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function CheckoutModal({ open, onClose, plan, workshop }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [paymentMethod, setPaymentMethod] = useState("credit_card");
  const [cardData, setCardData] = useState({
    number: "",
    name: "",
    expiry: "",
    cvv: ""
  });

  const checkoutMutation = useMutation({
    mutationFn: async (data) => {
      // TODO: Aqui virá a integração com gateway de pagamento
      // Por enquanto, simula o processo
      
      // Simula delay de processamento
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Atualiza o workshop com novo plano
      const updatedWorkshop = await base44.entities.Workshop.update(workshop.id, {
        planoAtual: plan.nome,
        dataAssinatura: new Date().toISOString(),
        dataRenovacao: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });

      // Cria registro de pagamento
      const payment = await base44.entities.PaymentHistory.create({
        workshop_id: workshop.id,
        plan_name: plan.nome,
        amount: plan.preco || 0,
        payment_method: data.paymentMethod,
        payment_status: "approved",
        payment_date: new Date().toISOString(),
        billing_period_start: new Date().toISOString(),
        billing_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });

      return { updatedWorkshop, payment };
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['workshops']);
      queryClient.invalidateQueries(['payment-history']);
      toast.success("Plano atualizado com sucesso!");
      onClose();
      navigate(createPageUrl("MeuPlano"));
    },
    onError: (error) => {
      toast.error("Erro ao processar pagamento. Tente novamente.");
      console.error(error);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!plan || !workshop) {
      toast.error("Dados incompletos");
      return;
    }

    // Validação básica
    if (paymentMethod === "credit_card") {
      if (!cardData.number || !cardData.name || !cardData.expiry || !cardData.cvv) {
        toast.error("Preencha todos os dados do cartão");
        return;
      }
    }

    checkoutMutation.mutate({ paymentMethod, cardData });
  };

  if (!plan) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Finalizar Assinatura</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
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

              {/* Aviso sobre Backend Functions */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <AlertCircle className="w-5 h-5 text-orange-600 mb-2" />
                <p className="text-sm text-gray-700 font-medium mb-1">
                  ⚠️ Integração de Pagamento em Desenvolvimento
                </p>
                <p className="text-xs text-gray-600">
                  As funcionalidades de pagamento serão ativadas em breve. Por enquanto, este é um ambiente de demonstração.
                </p>
              </div>

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