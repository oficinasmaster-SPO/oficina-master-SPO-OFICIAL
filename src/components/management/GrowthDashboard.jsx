import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, RefreshCw, TrendingUp, Target, Calendar } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/components/utils/formatters";
import { format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function GrowthDashboard({ workshop }) {
    const queryClient = useQueryClient();
    const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
    const [formData, setFormData] = useState({});

    // Fetch Monthly History for selected month
    const { data: monthlyData, isLoading, refetch } = useQuery({
        queryKey: ['monthly-history', workshop?.id, selectedMonth],
        queryFn: async () => {
            if (!workshop?.id) return null;
            const res = await base44.entities.MonthlyGoalHistory.filter({
                workshop_id: workshop.id,
                month: selectedMonth
            });
            return res && res.length > 0 ? res[0] : null;
        },
        enabled: !!workshop?.id,
    });

    // Fetch Diagnostics for auto-calculation
    const { data: diagnostics } = useQuery({
        queryKey: ['diagnostics-aggregate', workshop?.id, selectedMonth],
        queryFn: async () => {
            if (!workshop?.id) return null;
            // Fetch batch and calculate client-side
            const res = await base44.entities.ServiceOrderDiagnostic.filter({
                workshop_id: workshop.id,
            }, '-created_date', 100);
            
            const monthDiagnostics = res.filter(d => d.reference_month === selectedMonth || d.created_date.startsWith(selectedMonth));
            
            // Calculate Aggregates
            const totalRevenue = monthDiagnostics.reduce((acc, curr) => acc + (curr.total_os || 0), 0);
            const totalParts = monthDiagnostics.reduce((acc, curr) => acc + (curr.total_parts_sale || 0), 0);
            const totalServices = monthDiagnostics.reduce((acc, curr) => acc + (curr.total_services || 0), 0);
            const customerCount = new Set(monthDiagnostics.map(d => d.os_number)).size; // Approx unique OS as customers
            const avgTicket = customerCount > 0 ? totalRevenue / customerCount : 0;
            
            // Calculate TCMP2 Average
            const validTcmp2 = monthDiagnostics.filter(d => d.ideal_hour_value > 0);
            const avgTcmp2 = validTcmp2.length > 0 
                ? validTcmp2.reduce((acc, curr) => acc + curr.ideal_hour_value, 0) / validTcmp2.length
                : 0;

            return {
                totalRevenue,
                totalParts,
                totalServices,
                customerCount,
                avgTicket,
                avgTcmp2
            };
        },
        enabled: !!workshop?.id
    });

    useEffect(() => {
        if (monthlyData) {
            // Map entity fields to form state
            setFormData({
                ...monthlyData,
                // Map Targets
                target_revenue_total: monthlyData.projected_total || 0,
                target_revenue_parts: monthlyData.target_revenue_parts || workshop?.monthly_goals?.revenue_parts || 0,
                target_revenue_services: monthlyData.target_revenue_services || workshop?.monthly_goals?.revenue_services || 0,
                target_customer_volume: monthlyData.target_customer_volume || workshop?.monthly_goals?.customer_volume || 0,
                target_average_ticket: monthlyData.target_average_ticket || workshop?.monthly_goals?.average_ticket || 0,
                target_r70_i30_score: monthlyData.target_r70_i30_score || 70,
                target_tcmp2_value: monthlyData.target_tcmp2_value || workshop?.tcmp2_value || 0,
                target_sales_gps_score: monthlyData.target_sales_gps_score || 100,
                target_kit_master_score: monthlyData.target_kit_master_score || 100,
                
                // Map Actuals (support legacy fields)
                actual_revenue_total: monthlyData.revenue_total || monthlyData.achieved_total || 0,
                actual_revenue_parts: monthlyData.revenue_parts || monthlyData.actual_revenue_parts || 0,
                actual_revenue_services: monthlyData.revenue_services || monthlyData.actual_revenue_services || 0,
                actual_customer_volume: monthlyData.customer_volume || monthlyData.actual_customer_volume || 0,
                actual_average_ticket: monthlyData.average_ticket || monthlyData.actual_average_ticket || 0,
                actual_r70_i30_score: monthlyData.actual_r70_i30_score || 0,
                actual_tcmp2_value: monthlyData.tcmp2 || monthlyData.actual_tcmp2_value || 0,
                actual_sales_gps_score: monthlyData.actual_sales_gps_score || 0,
                actual_kit_master_score: monthlyData.actual_kit_master_score || 0
            });
        } else {
            // Initialize with Workshop Goals if no history exists
            setFormData({
                workshop_id: workshop?.id,
                month: selectedMonth,
                target_revenue_total: workshop?.monthly_goals?.projected_revenue || 0,
                target_revenue_parts: workshop?.monthly_goals?.revenue_parts || 0,
                target_revenue_services: workshop?.monthly_goals?.revenue_services || 0,
                target_customer_volume: workshop?.monthly_goals?.customer_volume || 0,
                target_average_ticket: workshop?.monthly_goals?.average_ticket || 0,
                // Defaults for new metrics
                target_r70_i30_score: 70, // Example default
                target_tcmp2_value: workshop?.tcmp2_value || 0,
                target_sales_gps_score: 100,
                target_kit_master_score: 100,
                // Actuals
                actual_revenue_total: 0,
                actual_revenue_parts: 0,
                actual_revenue_services: 0,
                actual_customer_volume: 0,
                actual_average_ticket: 0,
                actual_r70_i30_score: 0,
                actual_tcmp2_value: 0,
                actual_sales_gps_score: 0,
                actual_kit_master_score: 0
            });
        }
    }, [monthlyData, workshop, selectedMonth]);

    const saveMutation = useMutation({
        mutationFn: async (dataToSave) => {
            // Map form data back to entity schema
            const entityData = {
                ...dataToSave,
                entity_type: 'workshop',
                entity_id: workshop.id,
                reference_date: `${selectedMonth}-01`,
                
                // Map Targets
                projected_total: dataToSave.target_revenue_total,
                target_revenue_parts: dataToSave.target_revenue_parts,
                target_revenue_services: dataToSave.target_revenue_services,
                target_customer_volume: dataToSave.target_customer_volume,
                target_average_ticket: dataToSave.target_average_ticket,
                target_r70_i30_score: dataToSave.target_r70_i30_score,
                target_tcmp2_value: dataToSave.target_tcmp2_value,
                target_sales_gps_score: dataToSave.target_sales_gps_score,
                target_kit_master_score: dataToSave.target_kit_master_score,

                // Map Actuals
                revenue_total: dataToSave.actual_revenue_total,
                achieved_total: dataToSave.actual_revenue_total, // redundancy for safety
                revenue_parts: dataToSave.actual_revenue_parts,
                revenue_services: dataToSave.actual_revenue_services,
                customer_volume: dataToSave.actual_customer_volume,
                average_ticket: dataToSave.actual_average_ticket,
                tcmp2: dataToSave.actual_tcmp2_value,
                actual_r70_i30_score: dataToSave.actual_r70_i30_score,
                actual_sales_gps_score: dataToSave.actual_sales_gps_score,
                actual_kit_master_score: dataToSave.actual_kit_master_score
            };

            if (monthlyData?.id) {
                return await base44.entities.MonthlyGoalHistory.update(monthlyData.id, entityData);
            } else {
                return await base44.entities.MonthlyGoalHistory.create(entityData);
            }
        },
        onSuccess: async (data) => {
            toast.success("Resultados sincronizados com sucesso!");
            
            // Check for milestones
            if (data) {
                const revenueTotal = Number(data.revenue_total || 0);
                try {
                    await base44.functions.invoke('checkMilestones', {
                        workshop_id: workshop.id,
                        revenue_total: revenueTotal,
                    });
                } catch (e) {
                    console.error("Error checking milestones:", e);
                }
            }

            refetch();
            queryClient.invalidateQueries(['monthly-history']);
            queryClient.invalidateQueries(['workshop-milestones']);
        },
        onError: (err) => toast.error("Erro ao sincronizar: " + err.message)
    });

    const handleSync = () => {
        if (!diagnostics) {
            toast.warning("Aguarde o carregamento dos dados do sistema.");
            return;
        }
        
        const syncData = {
            ...formData,
            // Force update actuals from System
            actual_revenue_parts: diagnostics.totalParts || 0,
            actual_revenue_services: diagnostics.totalServices || 0,
            actual_customer_volume: diagnostics.customerCount || 0,
            actual_average_ticket: diagnostics.avgTicket || 0,
            actual_tcmp2_value: diagnostics.avgTcmp2 || 0,
            actual_revenue_total: (diagnostics.totalParts || 0) + (diagnostics.totalServices || 0)
        };

        saveMutation.mutate(syncData);
    };
    
    const renderMetricRow = (label, targetKey, actualKey, type = 'currency', suffix = '') => {
        const target = formData[targetKey] || 0;
        const actual = formData[actualKey] || 0;
        const progress = target > 0 ? (actual / target) * 100 : 0;
        const isGood = progress >= 100;

        const formatValue = (val) => {
            if (type === 'currency') return formatCurrency(val);
            if (type === 'percent') return `${Number(val).toFixed(1)}%`;
            return val;
        };

        return (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center py-4 border-b last:border-0">
                <div className="md:col-span-1">
                    <p className="font-medium text-gray-700">{label}</p>
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-xs text-gray-500">Meta</span>
                    <span className="font-medium text-gray-900">{formatValue(target)}{suffix}</span>
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-xs text-gray-500">Realizado</span>
                    <span className={`font-bold ${isGood ? 'text-green-600' : 'text-blue-600'}`}>
                        {formatValue(actual)}{suffix}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                            className={`h-full rounded-full ${isGood ? 'bg-green-500' : 'bg-blue-500'}`}
                            style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                    </div>
                    <span className={`text-xs font-bold ${isGood ? 'text-green-600' : 'text-gray-600'}`}>
                        {progress.toFixed(0)}%
                    </span>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <TrendingUp className="w-8 h-8 text-green-600" />
                        Crescimento Empresarial
                    </h2>
                    <p className="text-gray-500">Acompanhe a evolução e metas da sua oficina</p>
                </div>
                
                <div className="flex items-center gap-3 bg-white p-2 rounded-lg shadow-sm border">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger className="w-[180px] border-none shadow-none focus:ring-0">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {Array.from({ length: 12 }).map((_, i) => {
                                const d = subMonths(new Date(), i);
                                const value = format(d, 'yyyy-MM');
                                const label = format(d, 'MMMM yyyy', { locale: ptBR });
                                return <SelectItem key={value} value={value} className="capitalize">{label}</SelectItem>;
                            })}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Card className="border-t-4 border-t-green-500 shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                        <CardTitle>Indicadores de Crescimento</CardTitle>
                        <CardDescription>Resultados acumulados de {format(new Date(selectedMonth + '-01'), 'MMMM yyyy', { locale: ptBR })}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button 
                            onClick={handleSync} 
                            disabled={saveMutation.isPending}
                            variant="outline" 
                            className="border-green-200 hover:bg-green-50 text-green-700"
                        >
                            {saveMutation.isPending ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <RefreshCw className="w-4 h-4 mr-2" />
                            )}
                            Atualizar Resultados
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="py-12 flex justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-green-600" />
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {renderMetricRow("Faturamento (Peças + Serviços)", "target_revenue_total", "actual_revenue_total", "currency")} 
                            
                            {renderMetricRow("Faturamento Peças", "target_revenue_parts", "actual_revenue_parts", "currency")}
                            {renderMetricRow("Faturamento Serviços", "target_revenue_services", "actual_revenue_services", "currency")}
                            {renderMetricRow("Número de Clientes", "target_customer_volume", "actual_customer_volume", "number")}
                            {renderMetricRow("Ticket Médio", "target_average_ticket", "actual_average_ticket", "currency")}
                            
                            <div className="my-6 border-t border-gray-200"></div>
                            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Indicadores de Qualidade & Gestão</h3>
                            
                            {renderMetricRow("R70 / I30 / TCMP2 (Score)", "target_r70_i30_score", "actual_r70_i30_score", "number")}
                            {renderMetricRow("TCMP2 (Valor Real)", "target_tcmp2_value", "actual_tcmp2_value", "currency")}
                            {renderMetricRow("GPS de Vendas", "target_sales_gps_score", "actual_sales_gps_score", "number", " pts")}
                            {renderMetricRow("Kit Master", "target_kit_master_score", "actual_kit_master_score", "number", " pts")}
                        </div>
                    )}
                </CardContent>
            </Card>
            
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                <div className="flex gap-3">
                    <Target className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-bold text-blue-800 text-sm">Por que acompanhar o Crescimento?</h4>
                        <p className="text-sm text-blue-700 mt-1">
                            Manter os indicadores atualizados permite que a IA da plataforma sugira planos de ação mais assertivos e identifique gargalos na operação da oficina.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}