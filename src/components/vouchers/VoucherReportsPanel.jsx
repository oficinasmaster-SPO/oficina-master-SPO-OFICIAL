import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, TrendingUp, Users, DollarSign, Ticket, CheckCircle2, XCircle, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { useWorkshopContext } from "@/components/hooks/useWorkshopContext";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_COLORS = {
  active: "#22c55e",
  used: "#3b82f6",
  pending_approval: "#eab308",
  approved: "#10b981",
  rejected: "#ef4444",
  expired: "#9ca3af",
  cancelled: "#6b7280",
};

const STATUS_LABELS = {
  active: "Ativos",
  used: "Utilizados",
  pending_approval: "Pendentes",
  approved: "Aprovados",
  rejected: "Rejeitados",
  expired: "Expirados",
  cancelled: "Cancelados",
};

export default function VoucherReportsPanel({ user }) {
  const { workshop } = useWorkshopContext();
  const [period, setPeriod] = useState("3");

  const { data: vouchers = [] } = useQuery({
    queryKey: ["reportVouchers", workshop?.id],
    queryFn: () => base44.entities.Voucher.filter({ workshop_id: workshop.id }, "-created_date", 1000),
    enabled: !!workshop?.id
  });

  const { data: uses = [] } = useQuery({
    queryKey: ["reportUses", workshop?.id],
    queryFn: () => base44.entities.VoucherUse.filter({ workshop_id: workshop.id }, "-created_date", 1000),
    enabled: !!workshop?.id
  });

  const months = parseInt(period);
  const cutoff = subMonths(new Date(), months);

  const filteredVouchers = vouchers.filter((v) => new Date(v.created_date) >= cutoff);
  const filteredUses = uses.filter((u) => new Date(u.created_date) >= cutoff);

  // KPIs
  const kpis = useMemo(() => {
    const totalDiscount = filteredUses.reduce((sum, u) => sum + (u.discount_applied || 0), 0);
    const totalSales = filteredUses.reduce((sum, u) => sum + (u.sale_value || 0), 0);
    const approvedUses = filteredUses.filter((u) => u.status === "approved");
    const avgDiscount = approvedUses.length > 0
      ? approvedUses.reduce((s, u) => s + (u.discount_applied || 0), 0) / approvedUses.length
      : 0;
    const uniqueSellers = new Set(filteredVouchers.map((v) => v.seller_id)).size;

    return { totalDiscount, totalSales, avgDiscount, uniqueSellers, totalVouchers: filteredVouchers.length, totalUses: filteredUses.length };
  }, [filteredVouchers, filteredUses]);

  // Status distribution for pie
  const statusData = useMemo(() => {
    const counts = {};
    filteredVouchers.forEach((v) => {
      counts[v.status] = (counts[v.status] || 0) + 1;
    });
    return Object.entries(counts).map(([status, value]) => ({
      name: STATUS_LABELS[status] || status,
      value,
      color: STATUS_COLORS[status] || "#999"
    }));
  }, [filteredVouchers]);

  // Monthly bar chart
  const monthlyData = useMemo(() => {
    const data = [];
    for (let i = months - 1; i >= 0; i--) {
      const m = subMonths(new Date(), i);
      const start = startOfMonth(m);
      const end = endOfMonth(m);
      const label = format(m, "MMM/yy", { locale: ptBR });
      const created = filteredVouchers.filter((v) => {
        const d = new Date(v.created_date);
        return d >= start && d <= end;
      }).length;
      const utilized = filteredUses.filter((u) => {
        const d = new Date(u.created_date);
        return d >= start && d <= end;
      }).length;
      data.push({ label, created, utilized });
    }
    return data;
  }, [filteredVouchers, filteredUses, months]);

  // Top sellers
  const topSellers = useMemo(() => {
    const map = {};
    filteredVouchers.forEach((v) => {
      if (!map[v.seller_id]) map[v.seller_id] = { name: v.seller_name || "—", count: 0, totalDiscount: 0 };
      map[v.seller_id].count++;
    });
    filteredUses.forEach((u) => {
      const v = vouchers.find((vv) => vv.id === u.voucher_id);
      if (v && map[v.seller_id]) {
        map[v.seller_id].totalDiscount += u.discount_applied || 0;
      }
    });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [filteredVouchers, filteredUses, vouchers]);

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Activity className="w-5 h-5 text-purple-600" />
          Relatórios de Vouchers
        </h3>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Último mês</SelectItem>
            <SelectItem value="3">3 meses</SelectItem>
            <SelectItem value="6">6 meses</SelectItem>
            <SelectItem value="12">12 meses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard icon={Ticket} label="Vouchers Criados" value={kpis.totalVouchers} color="purple" />
        <KPICard icon={CheckCircle2} label="Utilizações" value={kpis.totalUses} color="blue" />
        <KPICard icon={Users} label="Vendedores Ativos" value={kpis.uniqueSellers} color="indigo" />
        <KPICard icon={DollarSign} label="Vendas Totais" value={`R$ ${kpis.totalSales.toFixed(0)}`} color="green" />
        <KPICard icon={TrendingUp} label="Descontos Dados" value={`R$ ${kpis.totalDiscount.toFixed(0)}`} color="orange" />
        <KPICard icon={DollarSign} label="Desconto Médio" value={`R$ ${kpis.avgDiscount.toFixed(2)}`} color="amber" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Vouchers por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="created" name="Criados" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="utilized" name="Utilizados" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Distribuição por Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top sellers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="w-4 h-4" />
            Top Vendedores
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topSellers.length === 0 ? (
            <p className="text-center text-gray-400 py-4">Sem dados</p>
          ) : (
            <div className="space-y-2">
              {topSellers.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs flex items-center justify-center font-bold">
                      {i + 1}
                    </span>
                    <span className="font-medium text-sm">{s.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{s.count} vouchers</Badge>
                    <Badge variant="outline" className="bg-orange-50 text-orange-700">
                      R$ {s.totalDiscount.toFixed(2)} desc.
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KPICard({ icon: Icon, label, value, color }) {
  const colors = {
    purple: "bg-purple-50 text-purple-600",
    blue: "bg-blue-50 text-blue-600",
    indigo: "bg-indigo-50 text-indigo-600",
    green: "bg-green-50 text-green-600",
    orange: "bg-orange-50 text-orange-600",
    amber: "bg-amber-50 text-amber-600",
  };
  return (
    <Card>
      <CardContent className="p-3">
        <div className={`w-8 h-8 rounded-lg ${colors[color]} flex items-center justify-center mb-2`}>
          <Icon className="w-4 h-4" />
        </div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-lg font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}