import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useResultadoDISCData } from "@/components/disc/useResultadoDISCData";
import ResultadoDISCContent from "@/components/disc/ResultadoDISCContent";

/**
 * Modal de Resultado DISC - Usado via HistoricoDISC (aberto in-place).
 * A rota /ResultadoDISC?id= agora usa a página dedicada, que reaproveita
 * o mesmo hook e o mesmo conteúdo.
 *
 * Props:
 * - open: boolean
 * - onOpenChange: (open: boolean) => void
 * - diagnosticId: string
 */
export default function ResultadoDISCModal({ open, onOpenChange, diagnosticId }) {
  const { loading, diagnostic, employee, teamComparison, notFound, accessDenied } = useResultadoDISCData(diagnosticId, open);

  const handleClose = () => onOpenChange(false);

  useEffect(() => {
    if (notFound && open) {
      toast.error("Diagnóstico não encontrado");
      handleClose();
    }
  }, [notFound, open]);

  if (!open) return null;

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={() => handleClose()}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!diagnostic) return null;

  if (accessDenied) {
    return (
      <Dialog open={open} onOpenChange={() => handleClose()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Acesso Restrito</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center text-center py-8">
            <h2 className="text-xl font-bold text-red-900 mb-2">Acesso Restrito</h2>
            <p className="text-red-700">Você não tem permissão para ver o resultado de outros colaboradores.</p>
            <Button onClick={handleClose} className="mt-4">Fechar</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={() => handleClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0">
        <ResultadoDISCContent
          diagnostic={diagnostic}
          employee={employee}
          teamComparison={teamComparison}
          onClose={handleClose}
        />
      </DialogContent>
    </Dialog>
  );
}