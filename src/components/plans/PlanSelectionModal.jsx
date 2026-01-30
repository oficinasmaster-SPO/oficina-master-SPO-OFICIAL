import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Grid3x3, Table } from "lucide-react";
import PlanCardView from "./PlanCardView";
import PlanComparisonTable from "./PlanComparisonTable";

export default function PlanSelectionModal({ 
  open, 
  onClose, 
  plans = [],
  currentPlan,
  user,
  workshop,
  onSelectPlan
}) {
  const [viewMode, setViewMode] = useState("cards");
  const [billingCycle, setBillingCycle] = useState("monthly");

  // Filtrar planos ativos e ordenados
  const activePlans = useMemo(() => {
    return plans
      .filter(p => p.active)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [plans]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="text-2xl font-bold text-center">
            Escolha o Plano Ideal para sua Oficina
          </DialogTitle>
          
          {/* Controles superiores */}
          <div className="flex items-center justify-between mt-4">
            {/* Toggle Mensal/Anual */}
            <div className="flex items-center gap-4">
              <Label className="text-sm font-medium">
                Mensal
              </Label>
              <Switch
                checked={billingCycle === "annual"}
                onCheckedChange={(checked) => setBillingCycle(checked ? "annual" : "monthly")}
              />
              <Label className="text-sm font-medium">
                Anual <span className="text-green-600 text-xs">(Economize até 20%)</span>
              </Label>
            </div>

            {/* Toggle Cards/Tabela */}
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode("cards")}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                  viewMode === "cards" 
                    ? "bg-white shadow-sm text-blue-600" 
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Grid3x3 className="w-4 h-4" />
                Visualizar Cards
              </button>
              <button
                onClick={() => setViewMode("comparison")}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                  viewMode === "comparison" 
                    ? "bg-white shadow-sm text-blue-600" 
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Table className="w-4 h-4" />
                Comparar Planos
              </button>
            </div>
          </div>
        </DialogHeader>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto py-6">
          {viewMode === "cards" ? (
            <PlanCardView
              plans={activePlans}
              billingCycle={billingCycle}
              currentPlan={currentPlan}
              onSelectPlan={onSelectPlan}
            />
          ) : (
            <PlanComparisonTable
              plans={activePlans}
              billingCycle={billingCycle}
              currentPlan={currentPlan}
              onSelectPlan={onSelectPlan}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}