import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Lock, Unlock, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export default function FecharMesModal({ workshopId, mes, isLocked, onToggle }) {
  const [open, setOpen] = useState(false);
  const [justificativa, setJustificativa] = useState("");
  const queryClient = useQueryClient();

  const toggleMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.functions.invoke('fecharMes', {
        workshop_id: workshopId,
        mes,
        action: data.action,
        justificativa: data.justificativa
      });
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries(['budget']);
      toast.success(response.data.mensagem);
      setOpen(false);
      setJustificativa("");
      onToggle?.();
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || "Erro ao processar solicitação");
    }
  });

  const handleSubmit = () => {
    if (!justificativa.trim() && isLocked === false) {
      toast.error("Justificativa é obrigatória para fechar mês");
      return;
    }

    toggleMutation.mutate({
      action: isLocked ? 'abrir' : 'fechar',
      justificativa
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={isLocked ? "outline" : "outline"} 
          size="sm"
          className={isLocked ? "border-amber-300 text-amber-700" : "border-green-300 text-green-700"}
        >
          {isLocked ? (
            <><Unlock className="w-4 h-4 mr-2" /> Reabrir Mês</>
          ) : (
            <><Lock className="w-4 h-4 mr-2" /> Fechar Mês</>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isLocked ? (
              <><Unlock className="w-5 h-5" /> Reabrir Mês {mes}</>
            ) : (
              <><Lock className="w-5 h-5" /> Fechar Mês {mes}</>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Card className={isLocked ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}>
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className={`w-5 h-5 ${isLocked ? 'text-green-600' : 'text-amber-600'}`} />
                <div>
                  <p className="font-semibold text-sm">
                    {isLocked ? "Mês será reaberto para edição" : "Mês será bloqueado para edição"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isLocked 
                      ? "Usuários poderão editar metas normalmente" 
                      : "Apenas administradores poderão editar com justificativa"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div>
            <Label>Justificativa (obrigatório)</Label>
            <Textarea
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder={isLocked ? "Motivo da reabertura..." : "Motivo do fechamento..."}
              className="min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Esta justificativa será registrada no histórico de auditoria
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!justificativa.trim() || toggleMutation.isPending}
              className={isLocked ? "bg-green-600 hover:bg-green-700" : "bg-amber-600 hover:bg-amber-700"}
            >
              {toggleMutation.isPending ? "Processando..." : (isLocked ? "Reabrir Mês" : "Fechar Mês")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}