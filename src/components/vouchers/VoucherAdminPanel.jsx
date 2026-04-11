import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ShieldCheck, Clock, Check, XCircle, AlertTriangle, Inbox } from "lucide-react";
import VoucherApprovalCard from "./VoucherApprovalCard";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const HISTORY_STATUS_MAP = {
  approved: { label: "Aprovado", color: "bg-green-100 text-green-800", icon: Check },
  rejected: { label: "Rejeitado", color: "bg-red-100 text-red-800", icon: XCircle }
};

export default function VoucherAdminPanel({ user }) {
  const [historyTab, setHistoryTab] = useState("all");

  // Buscar usos pendentes
  const { data: pendingUses = [], isLoading: loadingPending } = useQuery({
    queryKey: ["pendingUses"],
    queryFn: () => base44.entities.VoucherUse.filter({ status: "pending" }, "-created_date", 100),
    enabled: user?.role === "admin"
  });

  // Buscar histórico de aprovações
  const { data: allUses = [], isLoading: loadingHistory } = useQuery({
    queryKey: ["allVoucherUses"],
    queryFn: () => base44.entities.VoucherUse.filter({}, "-updated_date", 200),
    enabled: user?.role === "admin"
  });

  const historyUses = allUses.filter((u) => {
    if (historyTab === "all") return u.status !== "pending";
    return u.status === historyTab;
  });

  const expiredCount = pendingUses.filter(
    (u) => u.approval_deadline && new Date(u.approval_deadline) < new Date()
  ).length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-yellow-100 p-2 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-700" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingUses.length}</p>
              <p className="text-xs text-gray-500">Pendentes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-red-100 p-2 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-700" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-700">{expiredCount}</p>
              <p className="text-xs text-gray-500">Prazo expirado</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-green-100 p-2 rounded-lg">
              <Check className="w-5 h-5 text-green-700" />
            </div>
            <div>
              <p className="text-2xl font-bold">{allUses.filter((u) => u.status === "approved").length}</p>
              <p className="text-xs text-gray-500">Aprovados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-gray-100 p-2 rounded-lg">
              <XCircle className="w-5 h-5 text-gray-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{allUses.filter((u) => u.status === "rejected").length}</p>
              <p className="text-xs text-gray-500">Rejeitados</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="w-4 h-4" />
            Pendentes ({pendingUses.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <ShieldCheck className="w-4 h-4" />
            Histórico
          </TabsTrigger>
        </TabsList>

        {/* Pendentes */}
        <TabsContent value="pending">
          {loadingPending ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : pendingUses.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-gray-500">
                <Inbox className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">Nenhum voucher pendente</p>
                <p className="text-sm">Todos os vouchers foram processados</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingUses.map((u) => (
                <VoucherApprovalCard key={u.id} use={u} adminUser={user} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Histórico */}
        <TabsContent value="history">
          <div className="space-y-4">
            <div className="flex gap-2">
              {[
                { key: "all", label: "Todos" },
                { key: "approved", label: "Aprovados" },
                { key: "rejected", label: "Rejeitados" }
              ].map((tab) => (
                <Button
                  key={tab.key}
                  variant={historyTab === tab.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setHistoryTab(tab.key)}
                >
                  {tab.label}
                </Button>
              ))}
            </div>

            {loadingHistory ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : historyUses.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-gray-400">
                  Nenhum registro encontrado
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {historyUses.map((u) => {
                  const st = HISTORY_STATUS_MAP[u.status];
                  if (!st) return null;
                  const StIcon = st.icon;

                  return (
                    <Card key={u.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge className="font-mono bg-gray-100 text-gray-800">{u.voucher_code}</Badge>
                              <Badge className={st.color}>
                                <StIcon className="w-3 h-3 mr-1" />
                                {st.label}
                              </Badge>
                            </div>
                            <p className="text-sm">
                              <span className="text-gray-500">Cliente:</span>{" "}
                              <span className="font-medium">{u.client_name}</span>
                            </p>
                            <p className="text-sm text-gray-500">
                              Vendedor: {u.used_by_seller_name} · Venda R$ {u.sale_value?.toFixed(2)} · Final R$ {u.final_value?.toFixed(2)}
                            </p>
                          </div>
                          <div className="text-right text-sm space-y-1">
                            <p className="text-gray-500">
                              {u.approved_by_name && (
                                <>Por: <span className="font-medium text-gray-700">{u.approved_by_name}</span></>
                              )}
                            </p>
                            <p className="text-xs text-gray-400">
                              {u.approved_at && format(new Date(u.approved_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </div>

                        {u.approval_notes && (
                          <div className="mt-2 bg-green-50 rounded p-2 text-sm text-green-800">
                            <strong>Obs:</strong> {u.approval_notes}
                          </div>
                        )}
                        {u.rejection_reason && (
                          <div className="mt-2 bg-red-50 rounded p-2 text-sm text-red-800">
                            <strong>Motivo:</strong> {u.rejection_reason}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}