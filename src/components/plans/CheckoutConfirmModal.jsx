import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function CheckoutConfirmModal({ 
  open, 
  onClose, 
  plan, 
  billingCycle,
  checkoutUrl 
}) {
  const handleConfirm = () => {
    if (!checkoutUrl) {
      toast.error("Link de checkout não configurado. Entre em contato com o suporte.");
      return;
    }

    toast.success("Redirecionando para pagamento...");
    window.location.href = checkoutUrl;
  };

  const getPrice = () => {
    if (billingCycle === "monthly") {
      return plan.price_display_monthly || `R$ ${(plan.price_monthly || 0).toFixed(2)}/mês`;
    }
    return plan.price_display_annual || `R$ ${(plan.price_annual || 0).toFixed(2)}/ano`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Confirmar Assinatura
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Resumo do plano */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {plan.plan_name}
            </h3>
            <div className="text-3xl font-bold text-blue-600 mb-3">
              {getPrice()}
            </div>
            <div className="text-sm text-gray-600 mb-4">
              Cobrança {billingCycle === "monthly" ? "mensal" : "anual"}
            </div>

            {/* Principais recursos */}
            {plan.features_highlights?.slice(0, 4).map((feature, idx) => (
              <div key={idx} className="flex items-center gap-2 mb-2">
                <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span className="text-sm text-gray-700">{feature}</span>
              </div>
            ))}
          </div>

          {/* Aviso */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-gray-700">
              <strong>Importante:</strong> Você será redirecionado para a plataforma de pagamento segura Kiwify para finalizar a assinatura.
            </p>
          </div>

          {/* Botões */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Voltar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!checkoutUrl}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Ir para Pagamento
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}