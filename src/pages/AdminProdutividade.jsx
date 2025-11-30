import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Sparkles, Brain } from "lucide-react";
import { toast } from "sonner";
import MetricForm from "@/components/admin/productivity/MetricForm";
import MetricList from "@/components/admin/productivity/MetricList";

export default function AdminProdutividade() {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingMetric, setEditingMetric] = useState(null);
    const queryClient = useQueryClient();

    // Fetch Metrics
    const { data: metrics = [], isLoading } = useQuery({
        queryKey: ['productivity-metrics'],
        queryFn: async () => {
            try {
                const result = await base44.entities.ProductivityMetric.list();
                return Array.isArray(result) ? result : [];
            } catch (e) {
                console.error(e);
                return [];
            }
        }
    });

    // Create/Update Mutation
    const saveMutation = useMutation({
        mutationFn: async (data) => {
            if (editingMetric) {
                return await base44.entities.ProductivityMetric.update(editingMetric.id, data);
            } else {
                return await base44.entities.ProductivityMetric.create(data);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['productivity-metrics']);
            setIsDialogOpen(false);
            setEditingMetric(null);
            toast.success("Métrica salva com sucesso!");
        },
        onError: () => toast.error("Erro ao salvar métrica")
    });

    // Delete Mutation
    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.ProductivityMetric.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries(['productivity-metrics']);
            toast.success("Métrica removida!");
        }
    });

    // AI Suggestion Mock (Backend Function integration would go here)
    const handleGenerateAISuggestions = async () => {
        toast.info("IA analisando perfil das empresas para sugerir métricas...");
        
        // Exemplo de métricas sugeridas que seriam retornadas pela IA
        const suggestions = [
            { code: "v01", name: "N.º Orçamentos", category: "vendas", data_type: "number", description: "Quantidade total de orçamentos abertos no dia" },
            { code: "v02", name: "Taxa de Conversão", category: "vendas", data_type: "percentage", description: "Percentual de orçamentos fechados sobre abertos" },
            { code: "t01", name: "Peças Trocadas", category: "tecnico", data_type: "number", description: "Quantidade de itens substituídos" }
        ];

        try {
            // Em produção, isso chamaria base44.functions.invoke('generateMetrics')
            // Aqui vamos simular a criação
            for (const m of suggestions) {
                // Check duplicates simply by code for mock
                if (!metrics.find(ex => ex.code === m.code)) {
                    await base44.entities.ProductivityMetric.create(m);
                }
            }
            queryClient.invalidateQueries(['productivity-metrics']);
            toast.success("3 novas métricas sugeridas pela IA foram adicionadas!");
        } catch (e) {
            toast.error("Erro ao gerar sugestões");
        }
    };

    const handleEdit = (metric) => {
        setEditingMetric(metric);
        setIsDialogOpen(true);
    };

    const handleAddNew = () => {
        setEditingMetric(null);
        setIsDialogOpen(true);
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Configuração de Produtividade (Admin)</h1>
                        <p className="text-gray-600">Defina as métricas que serão mapeadas na operação de todo o Brasil</p>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={handleGenerateAISuggestions} className="bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100">
                            <Brain className="w-4 h-4 mr-2" />
                            Sugestões IA
                        </Button>
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Nova Métrica
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-lg">
                                <DialogHeader>
                                    <DialogTitle>{editingMetric ? 'Editar Métrica' : 'Criar Nova Métrica'}</DialogTitle>
                                </DialogHeader>
                                <MetricForm 
                                    metric={editingMetric} 
                                    onSave={(data) => saveMutation.mutate(data)}
                                    onCancel={() => setIsDialogOpen(false)}
                                    isSaving={saveMutation.isPending}
                                />
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                <Tabs defaultValue="vendas" className="w-full">
                    <TabsList className="flex flex-wrap h-auto bg-white p-1 shadow-sm mb-6 justify-start">
                        {["vendas", "comercial", "tecnico", "estoque", "financeiro", "rh", "zeladoria", "lava_jato", "gestao"].map(cat => (
                            <TabsTrigger key={cat} value={cat} className="capitalize px-4 py-2">
                                {cat.replace('_', ' ')}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {["vendas", "comercial", "tecnico", "estoque", "financeiro", "rh", "zeladoria", "lava_jato", "gestao"].map(cat => (
                        <TabsContent key={cat} value={cat}>
                            <MetricList 
                                metrics={metrics.filter(m => m.category === cat)} 
                                onEdit={handleEdit}
                                onDelete={(id) => deleteMutation.mutate(id)}
                            />
                        </TabsContent>
                    ))}
                </Tabs>
            </div>
        </div>
    );
}