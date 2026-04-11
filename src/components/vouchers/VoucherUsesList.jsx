import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShoppingCart, Clock, Check, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const USE_STATUS_MAP = {
  pending: { label: "Pendente", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  approved: { label: "Aprovado", color: "bg-green-100 text-green-800", icon: Check },
  rejected: { label: "Rejeitado", color: "bg-red-100 text-red-800", icon: XCircle }
};

export default function VoucherUsesList({ user, workshop }) {
  const { data: uses = [], isLoading } = useQuery({
    queryKey: ["voucherUses", user?.id, workshop?.id],
    queryFn: () => base44.entities.VoucherUse.filter({
      used_by_seller_id: user.id,
      workshop_id: workshop.id
    }, "-created_date", 100),
    enabled: !!user?.id && !!workshop?.id
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (uses.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center text-gray-500">
          <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium">Nenhuma utilização registrada</p>
          <p className="text-sm">Use a aba "Usar Voucher" para registrar uma utilização</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {uses.map((u) => {
        const status = USE_STATUS_MAP[u.status] || USE_STATUS_MAP.pending;
        const StatusIcon = status.icon;
        const deadlinePassed = u.approval_deadline && new Date(u.approval_deadline) < new Date();

        return (
          <Card key={u.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-50 p-2 rounded-lg mt-0.5">
                    <ShoppingCart className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{u.client_name}</p>
                    <p className="text-sm text-gray-500 font-mono">{u.voucher_code}</p>
                    {u.client_document && (
                      <p className="text-xs text-gray-400">Doc: {u.client_document}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right text-sm space-y-1">
                    <p className="text-gray-900">
                      <span className="text-gray-500">Venda:</span> R$ {u.sale_value?.toFixed(2)}
                    </p>
                    <p className="text-green-700">
                      <span className="text-gray-500">Desconto:</span> - R$ {u.discount_applied?.toFixed(2)}
                    </p>
                    <p className="font-semibold">
                      <span className="text-gray-500">Final:</span> R$ {u.final_value?.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className={status.color}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {status.label}
                    </Badge>
                    {u.status === "pending" && (
                      <span className={`text-xs ${deadlinePassed ? "text-red-600 font-medium" : "text-gray-400"}`}>
                        {deadlinePassed ? "Prazo expirado" : (
                          u.approval_deadline 
                            ? `Prazo: ${format(new Date(u.approval_deadline), "dd/MM HH:mm", { locale: ptBR })}`
                            : ""
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {u.negotiation_notes && (
                <p className="text-sm text-gray-600 mt-2 pl-12 italic">"{u.negotiation_notes}"</p>
              )}

              {u.status === "approved" && u.approval_notes && (
                <div className="mt-2 pl-12 bg-green-50 rounded p-2 text-sm text-green-800">
                  <strong>Aprovação:</strong> {u.approval_notes}
                  {u.approved_by_name && <span className="text-gray-500"> — por {u.approved_by_name}</span>}
                </div>
              )}

              {u.status === "rejected" && u.rejection_reason && (
                <div className="mt-2 pl-12 bg-red-50 rounded p-2 text-sm text-red-800">
                  <strong>Motivo:</strong> {u.rejection_reason}
                  {u.approved_by_name && <span className="text-gray-500"> — por {u.approved_by_name}</span>}
                </div>
              )}

              <p className="text-xs text-gray-400 mt-2 pl-12">
                {u.used_at && format(new Date(u.used_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}