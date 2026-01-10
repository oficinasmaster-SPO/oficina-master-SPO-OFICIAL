import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, CreditCard, Wallet, Check } from "lucide-react";
import { toast } from "sonner";

export default function CheckoutDialog({ open, onClose, plan, user, workshop }) {
  const [selectedGateway, setSelectedGateway] = useState("wifi");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCheckout = async () => {
    setIsProcessing(true);
    
    try {
      // Simular processamento
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Aqui seria a integração real com Wi-Fi ou Asas
      const checkoutUrl = selectedGateway === "wifi" 
        ? `https://wifi.eduzz.com/checkout?product=${plan.id}`
        : `https://asaas.com/checkout?product=${plan.id}`;
      
      // Abrir checkout em nova aba
      window.open(checkoutUrl, '_blank');
      
      toast.success("Redirecionando para checkout...");
      onClose();
    } catch (error) {
      toast.error("Erro ao processar: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Checkout - Plano {plan?.name}</DialogTitle>
          <p className="text-sm text-gray-600">Escolha a plataforma de pagamento</p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold">{plan?.name}</span>
              <span className="text-2xl font-bold text-blue-600">
                R$ {plan?.price?.toLocaleString('pt-BR')}
                <span className="text-sm text-gray-600">/mês</span>
              </span>
            </div>
            <div className="space-y-1 text-sm text-gray-700">
              {plan?.features?.map((feature, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <Tabs value={selectedGateway} onValueChange={setSelectedGateway}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="wifi">
                <CreditCard className="w-4 h-4 mr-2" />
                Wi-Fi
              </TabsTrigger>
              <TabsTrigger value="asas">
                <Wallet className="w-4 h-4 mr-2" />
                Asas
              </TabsTrigger>
            </TabsList>

            <TabsContent value="wifi" className="space-y-3">
              <div className="p-4 border rounded-lg">
                <p className="text-sm font-semibold mb-2">Pagamento via Wi-Fi (Eduzz)</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• Pix, Cartão de Crédito e Boleto</li>
                  <li>• Parcelamento em até 12x</li>
                  <li>• Aprovação instantânea via Pix</li>
                  <li>• Área de membros integrada</li>
                </ul>
              </div>
            </TabsContent>

            <TabsContent value="asas" className="space-y-3">
              <div className="p-4 border rounded-lg">
                <p className="text-sm font-semibold mb-2">Pagamento via Asas</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• Pix, Cartão de Crédito e Boleto</li>
                  <li>• Parcelamento em até 12x</li>
                  <li>• Cobrança recorrente automática</li>
                  <li>• Split de pagamento</li>
                </ul>
              </div>
            </TabsContent>
          </Tabs>

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