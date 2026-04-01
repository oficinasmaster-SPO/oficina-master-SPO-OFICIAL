import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Search, History, Filter, FileText, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useWorkshopContext } from "@/components/hooks/useWorkshopContext";
import VoucherTimelineItem from "./VoucherTimelineItem";

export default function VoucherAuditHistory({ user }) {
  const { workshop } = useWorkshopContext();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedVoucher, setSelectedVoucher] = useState(null);

  const { data: vouchers = [], isLoading: loadingVouchers } = useQuery({
    queryKey: ["auditVouchers", workshop?.id],
    queryFn: () => base44.entities.Voucher.filter(
      { workshop_id: workshop.id }, "-created_date", 500
    ),
    enabled: !!workshop?.id
  });

  const { data: voucherUses = [], isLoading: loadingUses } = useQuery({
    queryKey: ["auditVoucherUses", workshop?.id],
    queryFn: () => base44.entities.VoucherUse.filter(
      { workshop_id: workshop.id }, "-created_date", 500
    ),
    enabled: !!workshop?.id
  });

  const { data: voucherFiles = [] } = useQuery({
    queryKey: ["auditVoucherFiles", workshop?.id],
    queryFn: () => base44.entities.VoucherFile.filter(
      { workshop_id: workshop.id }, "-created_date", 500
    ),
    enabled: !!workshop?.id
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ["auditVoucherNotifs", workshop?.id],
    queryFn: () => base44.entities.VoucherNotification.filter(
      { workshop_id: workshop.id }, "-created_date", 500
    ),
    enabled: !!workshop?.id
  });

  // Build enriched timeline per voucher
  const enrichedVouchers = useMemo(() => {
    return vouchers.map((v) => {
      const uses = voucherUses.filter((u) => u.voucher_id === v.id);
      const files = voucherFiles.filter((f) => f.voucher_id === v.id);
      const notifs = notifications.filter((n) => n.voucher_id === v.id);
      return { ...v, uses, files, notifs };
    });
  }, [vouchers, voucherUses, voucherFiles, notifications]);

  const filtered = useMemo(() => {
    return enrichedVouchers.filter((v) => {
      if (statusFilter !== "all" && v.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const matchCode = v.code?.toLowerCase().includes(q);
        const matchSeller = v.seller_name?.toLowerCase().includes(q);
        const matchClient = v.uses.some((u) => u.client_name?.toLowerCase().includes(q));
        if (!matchCode && !matchSeller && !matchClient) return false;
      }
      return true;
    });
  }, [enrichedVouchers, statusFilter, search]);

  const isLoading = loadingVouchers || loadingUses;

  const stats = useMemo(() => ({
    total: vouchers.length,
    active: vouchers.filter((v) => v.status === "active").length,
    used: vouchers.filter((v) => ["used", "pending_approval", "approved"].includes(v.status)).length,
    expired: vouchers.filter((v) => v.status === "expired").length,
    rejected: vouchers.filter((v) => v.status === "rejected").length,
    cancelled: vouchers.filter((v) => v.status === "cancelled").length,
  }), [vouchers]);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard label="Total" value={stats.total} color="gray" />
        <StatCard label="Ativos" value={stats.active} color="green" />
        <StatCard label="Utilizados" value={stats.used} color="blue" />
        <StatCard label="Expirados" value={stats.expired} color="yellow" />
        <StatCard label="Rejeitados" value={stats.rejected} color="red" />
        <StatCard label="Cancelados" value={stats.cancelled} color="gray" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar por código, vendedor ou cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="used">Utilizados</SelectItem>
            <SelectItem value="pending_approval">Pendente Aprovação</SelectItem>
            <SelectItem value="approved">Aprovados</SelectItem>
            <SelectItem value="rejected">Rejeitados</SelectItem>
            <SelectItem value="expired">Expirados</SelectItem>
            <SelectItem value="cancelled">Cancelados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-400">
            <History className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>Nenhum voucher encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((v) => (
            <VoucherAuditCard
              key={v.id}
              voucher={v}
              onViewDetails={() => setSelectedVoucher(v)}
            />
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedVoucher && (
        <VoucherDetailModal
          voucher={selectedVoucher}
          open={!!selectedVoucher}
          onClose={() => setSelectedVoucher(null)}
        />
      )}
    </div>
  );
}

const STATUS_MAP = {
  active: { label: "Ativo", color: "bg-green-100 text-green-800" },
  used: { label: "Utilizado", color: "bg-blue-100 text-blue-800" },
  pending_approval: { label: "Pendente", color: "bg-yellow-100 text-yellow-800" },
  approved: { label: "Aprovado", color: "bg-emerald-100 text-emerald-800" },
  rejected: { label: "Rejeitado", color: "bg-red-100 text-red-800" },
  expired: { label: "Expirado", color: "bg-gray-100 text-gray-600" },
  cancelled: { label: "Cancelado", color: "bg-gray-200 text-gray-600" },
};

function StatCard({ label, value, color }) {
  const colors = {
    gray: "bg-gray-50 border-gray-200",
    green: "bg-green-50 border-green-200",
    blue: "bg-blue-50 border-blue-200",
    yellow: "bg-yellow-50 border-yellow-200",
    red: "bg-red-50 border-red-200",
  };
  return (
    <Card className={`${colors[color]} border`}>
      <CardContent className="p-3 text-center">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function VoucherAuditCard({ voucher, onViewDetails }) {
  const status = STATUS_MAP[voucher.status] || STATUS_MAP.active;
  const discountText = voucher.discount_type === "percent"
    ? `${voucher.discount_percent}%`
    : `R$ ${voucher.discount_value?.toFixed(2)}`;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 rounded-lg p-2">
              <History className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-lg">{voucher.code}</span>
                <Badge className={status.color}>{status.label}</Badge>
              </div>
              <p className="text-sm text-gray-500">
                Criado por <span className="font-medium">{voucher.seller_name || voucher.created_by}</span>
                {" · "}
                {voucher.created_date && format(new Date(voucher.created_date), "dd/MM/yy HH:mm", { locale: ptBR })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="outline">Desconto: {discountText}</Badge>
            <Badge variant="outline">Usos: {voucher.uses_count || 0}/{voucher.max_uses || 1}</Badge>
            {voucher.uses.length > 0 && (
              <Badge variant="outline" className="bg-blue-50">
                {voucher.uses.length} utilização(ões)
              </Badge>
            )}
            {voucher.files.length > 0 && (
              <Badge variant="outline" className="bg-amber-50">
                <FileText className="w-3 h-3 mr-1" />
                {voucher.files.length} doc(s)
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={onViewDetails}>
              <ExternalLink className="w-3 h-3 mr-1" />
              Detalhes
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function VoucherDetailModal({ voucher, open, onClose }) {
  const timeline = buildTimeline(voucher);

  const discountText = voucher.discount_type === "percent"
    ? `${voucher.discount_percent}%`
    : `R$ ${voucher.discount_value?.toFixed(2)}`;
  const status = STATUS_MAP[voucher.status] || STATUS_MAP.active;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="font-mono text-xl">{voucher.code}</span>
            <Badge className={status.color}>{status.label}</Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Resumo */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <InfoCell label="Desconto" value={discountText} />
          <InfoCell label="Usos" value={`${voucher.uses_count || 0} / ${voucher.max_uses || 1}`} />
          <InfoCell label="Vendedor" value={voucher.seller_name || "-"} />
          <InfoCell label="Validade" value={
            voucher.expiration_date
              ? format(new Date(voucher.expiration_date), "dd/MM/yyyy", { locale: ptBR })
              : "30 dias"
          } />
        </div>

        {voucher.description && (
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <p className="text-xs text-gray-500 mb-1">Descrição</p>
            <p className="text-sm">{voucher.description}</p>
          </div>
        )}

        {/* Timeline completo */}
        <div>
          <h4 className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-2">
            <History className="w-4 h-4" />
            Linha do Tempo Completa ({timeline.length} eventos)
          </h4>
          <div className="space-y-0">
            {timeline.map((item, idx) => (
              <VoucherTimelineItem key={idx} item={item} isLast={idx === timeline.length - 1} />
            ))}
          </div>
        </div>

        {/* Documentos */}
        {voucher.files.length > 0 && (
          <div className="mt-4">
            <h4 className="font-semibold text-sm text-gray-700 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Documentos Anexados ({voucher.files.length})
            </h4>
            <div className="space-y-2">
              {voucher.files.map((f) => (
                <a
                  key={f.id}
                  href={f.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-sm"
                >
                  <FileText className="w-4 h-4 text-blue-500" />
                  <span className="flex-1 truncate">{f.file_name || "Documento"}</span>
                  <Badge variant="outline" className="text-xs">{f.file_type}</Badge>
                  <span className="text-xs text-gray-400">
                    {f.created_date && format(new Date(f.created_date), "dd/MM/yy", { locale: ptBR })}
                  </span>
                  <ExternalLink className="w-3 h-3 text-gray-400" />
                </a>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InfoCell({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-lg p-2">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-medium text-sm truncate">{value}</p>
    </div>
  );
}

function buildTimeline(voucher) {
  const events = [];

  // 1. Criação
  events.push({
    type: "created",
    date: voucher.created_date,
    actor: voucher.seller_name || voucher.created_by,
    description: `Voucher criado com desconto de ${
      voucher.discount_type === "percent" ? `${voucher.discount_percent}%` : `R$ ${voucher.discount_value?.toFixed(2)}`
    }`,
  });

  // 2. Utilizações
  voucher.uses.forEach((use) => {
    events.push({
      type: "used",
      date: use.used_at || use.created_date,
      actor: use.used_by_seller_name || use.created_by,
      description: `Utilizado por cliente "${use.client_name}" — Venda: R$ ${use.sale_value?.toFixed(2)} → Final: R$ ${use.final_value?.toFixed(2)}`,
      extra: {
        discount_applied: use.discount_applied,
        negotiation_notes: use.negotiation_notes,
      },
    });

    // 3. Aprovação/Rejeição
    if (use.status === "approved") {
      events.push({
        type: "approved",
        date: use.approved_at || use.updated_date,
        actor: use.approved_by_name || "Admin",
        description: `Uso aprovado${use.approval_notes ? `: ${use.approval_notes}` : ""}`,
      });
    } else if (use.status === "rejected") {
      events.push({
        type: "rejected",
        date: use.approved_at || use.updated_date,
        actor: use.approved_by_name || "Admin",
        description: `Uso rejeitado${use.rejection_reason ? `: ${use.rejection_reason}` : ""}`,
      });
    }
  });

  // 4. Notificações relevantes
  voucher.notifs.forEach((n) => {
    if (["expired", "approval_deadline_warning"].includes(n.type)) {
      events.push({
        type: n.type === "expired" ? "expired" : "warning",
        date: n.created_date,
        actor: "Sistema",
        description: n.message || n.title,
      });
    }
  });

  // 5. Expiração
  if (voucher.status === "expired" && !events.some((e) => e.type === "expired")) {
    events.push({
      type: "expired",
      date: voucher.updated_date,
      actor: "Sistema",
      description: "Voucher expirado automaticamente",
    });
  }

  // 6. Cancelamento
  if (voucher.status === "cancelled") {
    events.push({
      type: "cancelled",
      date: voucher.cancelled_at || voucher.updated_date,
      actor: voucher.cancelled_by_name || "Usuário",
      description: `Voucher cancelado${voucher.cancellation_reason ? ": " + voucher.cancellation_reason : ""}`,
    });
  }

  return events.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
}