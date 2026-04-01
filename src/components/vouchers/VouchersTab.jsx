import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Ticket, PlusCircle, List, ShieldCheck, BarChart3 } from "lucide-react";
import { useWorkshopContext } from "@/components/hooks/useWorkshopContext";
import VoucherGenerateForm from "./VoucherGenerateForm";
import VoucherMyList from "./VoucherMyList";

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
        <TabsList>
          <TabsTrigger value="generate" className="gap-2">
            <PlusCircle className="w-4 h-4" />
            Gerar Voucher
          </TabsTrigger>
          <TabsTrigger value="my-vouchers" className="gap-2">
            <List className="w-4 h-4" />
            Meus Vouchers
          </TabsTrigger>
          {isAdmin && (
            <>
              <TabsTrigger value="admin" className="gap-2">
                <ShieldCheck className="w-4 h-4" />
                Administração
              </TabsTrigger>
              <TabsTrigger value="reports" className="gap-2">
                <BarChart3 className="w-4 h-4" />
                Relatórios
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="generate">
          <VoucherGenerateForm user={user} workshop={workshop} />
        </TabsContent>

        <TabsContent value="my-vouchers">
          <VoucherMyList user={user} workshop={workshop} />
        </TabsContent>

        {isAdmin && (
          <>
            <TabsContent value="admin">
              <div className="text-center py-12 text-gray-400">
                Administração de Vouchers — em construção
              </div>
            </TabsContent>
            <TabsContent value="reports">
              <div className="text-center py-12 text-gray-400">
                Relatórios — em construção
              </div>
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}