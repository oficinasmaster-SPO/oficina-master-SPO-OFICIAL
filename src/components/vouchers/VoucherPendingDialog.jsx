import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, ShieldCheck, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function VoucherPendingDialog({ user }) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = React.useState(false);

  const { data: pendingUses = [] } = useQuery({
    queryKey: ["voucherPendingAlert", user?.id],
    queryFn: () => base44.entities.VoucherUse.filter({ status: "pending" }, "-created_date", 50),
    enabled: !!user?.id && user?.role === "admin",
    staleTime: 60 * 1000,
  });

  if (!user || user.role !== "admin" || pendingUses.length === 0 || dismissed) {
    return null;
  }

  const expiredCount = pendingUses.filter(
    (u) => u.approval_deadline && new Date(u.approval_deadline) < new Date()
  ).length;

  const urgentCount = pendingUses.filter((u) => {
    if (!u.approval_deadline) return false;
    const hours = (new Date(u.approval_deadline) - new Date()) / (1000 * 60 * 60);
    return hours > 0 && hours <= 6;
  }).length;

  const handleGoToVouchers = () => {
    setDismissed(true);
    navigate("/GerenciarPlanos");
  };

  return (
    <Dialog open={true} onOpenChange={() => setDismissed(true)}>
      <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-700">
            <ShieldCheck className="w-6 h-6" />
            Vouchers Pendentes
          </DialogTitle>
          <DialogDescription>
            Existem vouchers aguardando sua aprovação
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Resumo */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-amber-700">Total pendentes</span>
              <Badge className="bg-amber-100 text-amber-800 text-lg px-3">
                {pendingUses.length}
              </Badge>
            </div>

            {expiredCount > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-red-700 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  Prazo expirado
                </span>
                <Badge className="bg-red-100 text-red-800 text-lg px-3">
                  {expiredCount}
                </Badge>
              </div>
            )}

            {urgentCount > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-orange-700 flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Expirando em breve
                </span>
                <Badge className="bg-orange-100 text-orange-800 text-lg px-3">
                  {urgentCount}
                </Badge>
              </div>
            )}
          </div>

          {/* Lista resumida */}
          <div className="max-h-48 overflow-y-auto space-y-2">
            {pendingUses.slice(0, 5).map((u) => {
              const deadlinePassed = u.approval_deadline && new Date(u.approval_deadline) < new Date();
              return (
                <div
                  key={u.id}
                  className={`flex items-center justify-between p-2 rounded-lg text-sm ${
                    deadlinePassed ? "bg-red-50 border border-red-200" : "bg-gray-50"
                  }`}
                >
                  <div>
                    <span className="font-mono text-xs text-gray-500">{u.voucher_code}</span>
                    <span className="mx-1">·</span>
                    <span className="font-medium">{u.client_name}</span>
                  </div>
                  <span className="text-gray-500">R$ {u.sale_value?.toFixed(2)}</span>
                </div>
              );
            })}
            {pendingUses.length > 5 && (
              <p className="text-xs text-gray-400 text-center">
                + {pendingUses.length - 5} outros...
              </p>
            )}
          </div>

          <Button
            onClick={handleGoToVouchers}
            className="w-full bg-amber-600 hover:bg-amber-700"
            size="lg"
          >
            <ShieldCheck className="w-4 h-4 mr-2" />
            Ir para Aprovação de Vouchers
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>

          <button
            onClick={() => setDismissed(true)}
            className="w-full text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Lembrar mais tarde
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}