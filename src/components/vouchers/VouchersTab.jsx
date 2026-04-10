import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Ticket, PlusCircle, List, ShoppingCart, ClipboardList, ShieldCheck, Activity, Settings, History } from "lucide-react";
import { useWorkshopContext } from "@/components/hooks/useWorkshopContext";
import VoucherGenerateForm from "./VoucherGenerateForm";
import VoucherMyList from "./VoucherMyList";
import VoucherUseForm from "./VoucherUseForm";
import VoucherUsesList from "./VoucherUsesList";
import VoucherAdminPanel from "./VoucherAdminPanel";
import VoucherSellerRulesPanel from "./VoucherSellerRulesPanel";
import VoucherAuditHistory from "./VoucherAuditHistory";
import VoucherReportsPanel from "./VoucherReportsPanel";

export default function VouchersTab() {
  const [user, setUser] = useState(null);
  const { workshop } = useWorkshopContext();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const isAdmin = user?.role === "admin";

  if (!user || !workshop) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <Ticket className="w-6 h-6 text-purple-600" />
        <div>
          <h2 className="text-xl font-bold text-gray-900">Vouchers e Promoções</h2>
          <p className="text-sm text-gray-500">Gerencie vouchers de desconto para clientes</p>
        </div>
      </div>

      <Tabs defaultValue="generate" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="generate" className="gap-2">
            <PlusCircle className="w-4 h-4" />
            Gerar Voucher
          </TabsTrigger>
          <TabsTrigger value="use-voucher" className="gap-2">
            <ShoppingCart className="w-4 h-4" />
            Usar Voucher
          </TabsTrigger>
          <TabsTrigger value="my-vouchers" className="gap-2">
            <List className="w-4 h-4" />
            Meus Vouchers
          </TabsTrigger>
          <TabsTrigger value="my-uses" className="gap-2">
            <ClipboardList className="w-4 h-4" />
            Minhas Utilizações
          </TabsTrigger>
          {isAdmin && (
            <>
              <TabsTrigger value="admin" className="gap-2">
                <ShieldCheck className="w-4 h-4" />
                Administração
              </TabsTrigger>
              <TabsTrigger value="seller-rules" className="gap-2">
                <Settings className="w-4 h-4" />
                Regras Vendedores
              </TabsTrigger>
              <TabsTrigger value="audit" className="gap-2">
                <History className="w-4 h-4" />
                Histórico
              </TabsTrigger>
              <TabsTrigger value="reports" className="gap-2">
                <Activity className="w-4 h-4" />
                Relatórios
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="generate">
          <VoucherGenerateForm user={user} workshop={workshop} />
        </TabsContent>

        <TabsContent value="use-voucher">
          <VoucherUseForm user={user} workshop={workshop} />
        </TabsContent>

        <TabsContent value="my-vouchers">
          <VoucherMyList user={user} workshop={workshop} />
        </TabsContent>

        <TabsContent value="my-uses">
          <VoucherUsesList user={user} workshop={workshop} />
        </TabsContent>

        {isAdmin && (
          <>
            <TabsContent value="admin">
              <VoucherAdminPanel user={user} />
            </TabsContent>
            <TabsContent value="seller-rules">
              <VoucherSellerRulesPanel user={user} />
            </TabsContent>
            <TabsContent value="audit">
              <VoucherAuditHistory user={user} />
            </TabsContent>
            <TabsContent value="reports">
              <VoucherReportsPanel user={user} />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}