import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Ticket, Copy, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const STATUS_MAP = {
  active: { label: "Ativo", color: "bg-green-100 text-green-800" },
  used: { label: "Utilizado", color: "bg-blue-100 text-blue-800" },
  pending_approval: { label: "Pendente Aprovação", color: "bg-yellow-100 text-yellow-800" },
  approved: { label: "Aprovado", color: "bg-emerald-100 text-emerald-800" },
  rejected: { label: "Rejeitado", color: "bg-red-100 text-red-800" },
  expired: { label: "Expirado", color: "bg-gray-100 text-gray-800" },
  cancelled: { label: "Cancelado", color: "bg-gray-200 text-gray-600" }
};

export default function VoucherMyList({ user, workshop }) {
  const queryClient = useQueryClient();
  const [cancelDialog, setCancelDialog] = useState(null);
  const [cancelReason, setCancelReason] = useState("");

  const { data: vouchers = [], isLoading } = useQuery({
    queryKey: ["myVouchers", user?.id, workshop?.id],
    queryFn: () => base44.entities.Voucher.filter({
      seller_id: user.id,
      workshop_id: workshop.id
    }, "-created_date", 100),
    enabled: !!user?.id && !!workshop?.id
  });

  const cancelMutation = useMutation({
    mutationFn: async ({ voucher_id, reason }) => {
      const res = await base44.functions.invoke("cancelVoucher", { voucher_id, reason });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["myVouchers"]);
      queryClient.invalidateQueries(["vouchers"]);
      setCancelDialog(null);
      setCancelReason("");
      toast.success("Voucher cancelado com sucesso");
    },
    onError: (err) => toast.error(err?.response?.data?.error || "Erro ao cancelar")
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (vouchers.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center text-gray-500">
          <Ticket className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium">Nenhum voucher gerado ainda</p>
          <p className="text-sm">Use a aba "Gerar Voucher" para criar seu primeiro voucher</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {vouchers.map((v) => {
        const status = STATUS_MAP[v.status] || STATUS_MAP.active;
        const isExpired = v.expiration_date && new Date(v.expiration_date) < new Date() && v.status === "active";
        
        return (
          <Card key={v.id} className={`border ${isExpired ? "border-gray-300 opacity-60" : ""}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-50 p-2 rounded-lg">
                    <Ticket className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-mono font-bold text-lg">{v.code}</p>
                    <p className="text-sm text-gray-500">
                      {v.discount_type === "percent"
                        ? `${v.discount_percent}% de desconto`
                        : `R$ ${v.discount_value?.toFixed(2)} de desconto`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right text-sm">
                    <p className="text-gray-500">
                      Usos: {v.uses_count || 0}/{v.max_uses}
                    </p>
                    <p className="text-gray-400">
                      {v.expiration_date && (
                        <>Validade: {format(new Date(v.expiration_date), "dd/MM/yyyy", { locale: ptBR })}</>
                      )}
                    </p>
                  </div>
                  <Badge className={isExpired ? STATUS_MAP.expired.color : status.color}>
                    {isExpired ? "Expirado" : status.label}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(v.code);
                      toast.success("Código copiado!");
                    }}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  {v.status === "active" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => setCancelDialog(v)}
                    >
                      <Ban className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
              {v.description && (
                <p className="text-sm text-gray-600 mt-2 pl-12">{v.description}</p>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Cancel Dialog */}
      <Dialog open={!!cancelDialog} onOpenChange={() => { setCancelDialog(null); setCancelReason(""); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Cancelar Voucher {cancelDialog?.code}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Motivo do cancelamento</Label>
              <Textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Informe o motivo..."
                rows={3}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setCancelDialog(null)}>Voltar</Button>
              <Button
                variant="destructive"
                disabled={cancelMutation.isPending}
                onClick={() => cancelMutation.mutate({ voucher_id: cancelDialog?.id, reason: cancelReason })}
              >
                {cancelMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Confirmar Cancelamento
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}