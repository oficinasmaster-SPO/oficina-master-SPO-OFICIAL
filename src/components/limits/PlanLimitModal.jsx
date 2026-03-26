import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Rocket, AlertTriangle } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function PlanLimitModal() {
  const [open, setOpen] = useState(false);
  const [limitData, setLimitData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleLimitExceeded = (event) => {
      setLimitData(event.detail);
      setOpen(true);
    };

    window.addEventListener('PLAN_LIMIT_EXCEEDED', handleLimitExceeded);
    
    return () => {
      window.removeEventListener('PLAN_LIMIT_EXCEEDED', handleLimitExceeded);
    };
  }, []);

  const handleUpgrade = () => {
    setOpen(false);
    navigate(createPageUrl("Planos"));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-amber-600" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">
            {limitData?.message || "Limite do Plano Atingido"}
          </DialogTitle>
          <DialogDescription className="text-center text-gray-600 pt-2">
            Você atingiu o limite de uso do seu plano atual. Para continuar crescendo e utilizando este recurso sem interrupções, faça um upgrade agora.
            {limitData?.details && (
              <span className="block mt-2 font-medium text-amber-700 bg-amber-50 p-2 rounded-md">
                {limitData.details}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:justify-center gap-2 mt-4">
          <Button 
            className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
            onClick={handleUpgrade}
          >
            <Rocket className="w-5 h-5" />
            Fazer Upgrade do Plano
          </Button>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => setOpen(false)}
          >
            Entendi, talvez depois
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}