import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, CreditCard, Wallet, Check } from "lucide-react";
import { toast } from "sonner";

export default function CheckoutDialog({ open, onClose, plan, user, workshop }) {
  const [selectedGateway, setSelectedGateway] = useState("kiwify");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCheckout = async () => {
    setIsProcessing(true);
    
    try {
      // Verificar se o link de checkout existe
      if (!plan.kiwify_checkout_url) {
        toast.error("Plano sem link de checkout configurado. Entre em contato com o suporte.");
        setIsProcessing(false);
        return;
      }

      // Log para debug
      console.log("[Checkout] planId=", plan.plan_id, "url=", plan.kiwify_checkout_url);
      
      toast.success("Redirecionando para pagamento...");
      
      // Redirecionar para checkout Kiwify
      window.location.href = plan.kiwify_checkout_url;
      
      onClose();
    } catch (error) {
      console.error("[Checkout Error]", error);
      toast.error("Erro ao processar: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Checkout - Plano {plan?.plan_name}</DialogTitle>
          <p className="text-sm text-gray-600">Confirme sua escolha</p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold">{plan?.plan_name}</span>
              <span className="text-2xl font-bold text-blue-600">
                {plan?.price}
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              Você será redirecionado para a plataforma de pagamento Kiwify.
            </p>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button 
              onClick={handleCheckout} 
              disabled={isProcessing}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  Ir para Checkout
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}