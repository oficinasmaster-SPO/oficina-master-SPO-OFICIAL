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

    // Carregar métricas padrão predefinidas
    const handleLoadDefaultMetrics = async () => {
        toast.info("Carregando métricas padrão do sistema...");
        
        const defaultMetrics = [
            // Gestão
            { code: "g01", name: "Agenda Programada", category: "gestao", data_type: "boolean", description: "Cumprimento das tarefas da agenda programada" },
            
            // Vendas
            { code: "v01", name: "N.º Orçamentos", category: "vendas", data_type: "number", description: "Quantidade de orçamentos realizados" },
            { code: "v02", name: "N.º O.S. Abertas", category: "vendas", data_type: "number", description: "Quantidade de O.S. abertas" },
            { code: "v03", name: "Perdidos", category: "vendas", data_type: "number", description: "Quantidade de orçamentos perdidos" },
            { code: "v04", name: "Fechados", category: "vendas", data_type: "number", description: "Quantidade de orçamentos fechados" },
            { code: "v05", name: "Faturado (Peças + Serviços)", category: "vendas", data_type: "currency", description: "Valor total faturado" },
            { code: "v06", name: "Motivo Perda", category: "vendas", data_type: "text", description: "Motivo principal das perdas" },
            { code: "v07", name: "Custos (Peças + Terceiros)", category: "vendas", data_type: "currency", description: "Custos operacionais diretos" },
            { code: "v08", name: "Foto GPS", category: "vendas", data_type: "boolean", description: "Evidência do GPS (Guia de Processo Simplificado)", requires_evidence: true },
            { code: "v09", name: "Print SFV", category: "vendas", data_type: "boolean", description: "Print do Sistema de Força de Vendas", requires_evidence: true },
            { code: "v10", name: "TCMP2", category: "vendas", data_type: "number", description: "Tempo x 2 x Valor Hora" },
            { code: "v11", name: "Tempo Técnico", category: "vendas", data_type: "number", description: "Tempo técnico estimado" },
            { code: "v12", name: "Comissão/Bonificação", category: "vendas", data_type: "percentage", description: "Percentual de comissão" },

            // Comercial
            { code: "c01", name: "N.º Ligações", category: "comercial", data_type: "number", description: "Quantidade de ligações realizadas" },
            { code: "c02", name: "N.º Mensagens", category: "comercial", data_type: "number", description: "Quantidade de mensagens enviadas" },
            { code: "c03", name: "N.º Qualificados", category: "comercial", data_type: "number", description: "Leads qualificados" },
            { code: "c04", name: "N.º Agendamentos", category: "comercial", data_type: "number", description: "Agendamentos realizados" },
            { code: "c05", name: "N.º Comparecimentos", category: "comercial", data_type: "number", description: "Clientes que compareceram" },
            { code: "c06", name: "N.º Vendas", category: "comercial", data_type: "number", description: "Vendas efetivadas" },
            { code: "c07", name: "Faturado", category: "comercial", data_type: "currency", description: "Valor faturado pelo comercial" },
            { code: "c08", name: "Motivo", category: "comercial", data_type: "text", description: "Observações sobre o resultado" },
            { code: "c09", name: "Kit Master", category: "comercial", data_type: "number", description: "Venda de Kit Master" },
            { code: "c10", name: "Comissão/Bonificação", category: "comercial", data_type: "percentage", description: "Percentual de comissão" },

            // Técnico
            { code: "t01", name: "N.º Orç/O.S", category: "tecnico", data_type: "number", description: "Quantidade de O.S. atendidas" },
            { code: "t02", name: "Perdido", category: "tecnico", data_type: "number", description: "Serviços não aprovados" },
            { code: "t03", name: "Fechado", category: "tecnico", data_type: "number", description: "Serviços aprovados" },
            { code: "t04", name: "Faturado", category: "tecnico", data_type: "currency", description: "Valor produzido" },
            { code: "t05", name: "Custos Peças + Terceiro", category: "tecnico", data_type: "currency", description: "Custo de insumos" },
            { code: "t06", name: "Foto GPS", category: "tecnico", data_type: "boolean", description: "Evidência GPS", requires_evidence: true },
            { code: "t07", name: "Print SFV", category: "tecnico", data_type: "boolean", description: "Evidência SFV", requires_evidence: true },
            { code: "t08", name: "N.º Peças", category: "tecnico", data_type: "number", description: "Total de peças manuseadas" },
            { code: "t09", name: "Peças Aguardando", category: "tecnico", data_type: "number", description: "Peças em espera" },
            { code: "t10", name: "Peças Finalizadas", category: "tecnico", data_type: "number", description: "Peças instaladas/concluídas" },
            { code: "t11", name: "Retrabalho", category: "tecnico", data_type: "number", description: "Retrabalhos realizados" },
            { code: "t12", name: "Comissão/Bonificação", category: "tecnico", data_type: "percentage", description: "Percentual de comissão" },

            // Estoque
            { code: "e01", name: "Itens Atualizados", category: "estoque", data_type: "number", description: "N.º de itens atualizados no sistema" },
            { code: "e02", name: "Auditado", category: "estoque", data_type: "boolean", description: "Estoque auditado hoje?" },
            { code: "e03", name: "Motivo Divergência", category: "estoque", data_type: "text", description: "Justificativa para divergências" },

            // Financeiro
            { code: "f01", name: "Cobranças", category: "financeiro", data_type: "number", description: "N.º de cobranças realizadas" },
            { code: "f02", name: "Faturado", category: "financeiro", data_type: "currency", description: "Total faturado no dia" },
            { code: "f03", name: "Motivo", category: "financeiro", data_type: "text", description: "Observações financeiras" },

            // RH
            { code: "r01", name: "Aculturamento", category: "rh", data_type: "boolean", description: "Ações de cultura realizadas" },
            { code: "r02", name: "Treinamento", category: "rh", data_type: "boolean", description: "Treinamentos realizados" },
            { code: "r03", name: "One on One", category: "rh", data_type: "boolean", description: "Reuniões 1:1 realizadas" },
            { code: "r04", name: "RPM", category: "rh", data_type: "text", description: "Registro de Ponto/Meta" },
            { code: "r05", name: "RL", category: "rh", data_type: "text", description: "Relatório" },
            { code: "r06", name: "Motivo", category: "rh", data_type: "text", description: "Observações RH" },

            // Zeladoria
            { code: "z01", name: "Organização", category: "zeladoria", data_type: "boolean", description: "Ambiente organizado?" },
            { code: "z02", name: "Limpeza", category: "zeladoria", data_type: "boolean", description: "Limpeza realizada?" },
            { code: "z03", name: "Pintura", category: "zeladoria", data_type: "boolean", description: "Manutenção de pintura necessária?" },

            // Lava Jato
            { code: "l01", name: "N.º Atendimentos", category: "lava_jato", data_type: "number", description: "Veículos lavados" },
            { code: "l02", name: "Retrabalho", category: "lava_jato", data_type: "number", description: "Lavagens refeitas" },
            { code: "l03", name: "Kit Master", category: "lava_jato", data_type: "number", description: "Venda de Kit Master no lavador" },
            { code: "l04", name: "Faturado", category: "lava_jato", data_type: "currency", description: "Receita do lava jato" },
            { code: "l05", name: "Motivo", category: "lava_jato", data_type: "text", description: "Observações" },

            // --- NOVAS MÉTRICAS PADRÃO (Solicitadas) ---
            // Geral / Cross-Functional
            { code: "g_ticket_medio_pecas", name: "Ticket Médio (Peças)", category: "gestao", data_type: "currency", aggregation_type: "avg", description: "Valor médio de peças por venda/OS" },
            { code: "g_ticket_medio_servicos", name: "Ticket Médio (Serviços)", category: "gestao", data_type: "currency", aggregation_type: "avg", description: "Valor médio de serviços por venda/OS" },
            
            // Vendas (Específicas por tipo de veículo)
            { code: "v_faturamento_moto", name: "Faturamento (Motos)", category: "vendas", data_type: "currency", vehicle_category_filter: "moto", description: "Faturamento exclusivo de motos" },
            { code: "v_faturamento_carro", name: "Faturamento (Carros)", category: "vendas", data_type: "currency", vehicle_category_filter: "car", description: "Faturamento exclusivo de carros/leves" },
            { code: "v_faturamento_truck", name: "Faturamento (Truck)", category: "vendas", data_type: "currency", vehicle_category_filter: "truck", description: "Faturamento exclusivo de caminhões/pesados" },

            // Funilaria e Pintura (Técnico Específico)
            { code: "t_pecas_pintadas", name: "Peças Pintadas", category: "tecnico", data_type: "number", description: "Quantidade de peças pintadas" },
            { code: "t_pecas_polidas", name: "Peças Polidas", category: "tecnico", data_type: "number", description: "Quantidade de peças polidas" },
            { code: "t_pecas_desmontadas", name: "Peças Desmontadas", category: "tecnico", data_type: "number", description: "Quantidade de peças desmontadas" },
            { code: "t_pecas_chapeadas", name: "Peças Chapeadas/Funilaria", category: "tecnico", data_type: "number", description: "Quantidade de peças trabalhadas na funilaria" },

            // Qualidade (Negativas)
            { code: "q_reclamacoes", name: "Reclamações de Cliente", category: "qualidade", data_type: "number", optimization_direction: "lower_is_better", description: "Número de reclamações recebidas" },
            { code: "q_retrabalho_geral", name: "Retrabalho Geral", category: "qualidade", data_type: "number", optimization_direction: "lower_is_better", description: "Total de retrabalhos registrados" }
        ];

        try {
            let count = 0;
            for (const m of defaultMetrics) {
                // Verifica duplicatas pelo código e categoria para evitar recriação
                const exists = metrics.some(ex => ex.code === m.code && ex.category === m.category);
                if (!exists) {
                    await base44.entities.ProductivityMetric.create(m);
                    count++;
                }
            }
            
            if (count > 0) {
                queryClient.invalidateQueries(['productivity-metrics']);
                toast.success(`${count} métricas padrão foram adicionadas com sucesso!`);
            } else {
                toast.info("Todas as métricas padrão já estão cadastradas.");
            }
        } catch (e) {
            console.error(e);
            toast.error("Erro ao carregar métricas padrão");
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
                        <Button variant="outline" onClick={handleLoadDefaultMetrics} className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100">
                            <Sparkles className="w-4 h-4 mr-2" />
                            Carregar Padrões
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