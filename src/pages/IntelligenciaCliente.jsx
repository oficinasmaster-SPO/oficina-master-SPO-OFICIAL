import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, HelpCircle, Star, AlertTriangle, CheckCircle, BarChart3, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import CreditosPerformanceEquipe from "@/components/inteligencia/CreditosPerformanceEquipe";

export default function IntelligenciaCliente() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      // Get workshop
      const ownedWorkshops = await base44.entities.Workshop.filter({ owner_id: currentUser.id });
      if (ownedWorkshops && ownedWorkshops.length > 0) {
        setWorkshop(ownedWorkshops[0]);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  // Fetch intelligence items by type
  const { data: dorasAtivas = [] } = useQuery({
    queryKey: ["intelligence", workshop?.id, "dor"],
    queryFn: () => base44.entities.ClientIntelligence.filter({
      workshop_id: workshop?.id,
      type: "dor",
      status: "ativo"
    }),
    enabled: !!workshop?.id,
  });

  const { data: duvidasFrequentes = [] } = useQuery({
    queryKey: ["intelligence", workshop?.id, "duvida"],
    queryFn: () => base44.entities.ClientIntelligence.filter({
      workshop_id: workshop?.id,
      type: "duvida",
      status: "ativo"
    }),
    enabled: !!workshop?.id,
  });

  const { data: desejosEstrategicos = [] } = useQuery({
    queryKey: ["intelligence", workshop?.id, "desejo"],
    queryFn: () => base44.entities.ClientIntelligence.filter({
      workshop_id: workshop?.id,
      type: "desejo",
      status: "ativo"
    }),
    enabled: !!workshop?.id,
  });

  const { data: riscosMapeados = [] } = useQuery({
    queryKey: ["intelligence", workshop?.id, "risco"],
    queryFn: () => base44.entities.ClientIntelligence.filter({
      workshop_id: workshop?.id,
      type: "risco",
      status: "ativo"
    }),
    enabled: !!workshop?.id,
  });

  const { data: evolucoesConquistadas = [] } = useQuery({
    queryKey: ["intelligence", workshop?.id, "evolucao"],
    queryFn: () => base44.entities.ClientIntelligence.filter({
      workshop_id: workshop?.id,
      type: "evolucao",
      status: "ativo"
    }),
    enabled: !!workshop?.id,
  });

  // Fetch and consolidate credits data
  const { data: creditosConsolidados = null } = useQuery({
    queryKey: ["creditos-consolidados", workshop?.id],
    queryFn: async () => {
      const currentDate = new Date();
      const monthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
      
      try {
        // Buscar vendas do mês atual
        const vendas = await base44.entities.VendasServicos.filter({
          workshop_id: workshop?.id,
          month: monthStr
        });
        
        if (!vendas || vendas.length === 0) return null;
        
        // Buscar todas as atribuições
        const atribuicoes = await base44.entities.AtribuicoesVenda.filter({
          workshop_id: workshop?.id
        });
        
        // Filtrar atribuições para vendas do mês
        const vendasIds = vendas.map(v => v.id);
        const atribuicoesMes = atribuicoes.filter(a => vendasIds.includes(a.venda_id));
        
        if (atribuicoesMes.length === 0) return null;
        
        // Calcular totais de faturamento
        const faturamentoTotal = vendas.reduce((sum, v) => sum + (v.valor_total || 0), 0);
        
        // Consolidar créditos por equipe
        const creditoMarketing = atribuicoesMes
          .filter(a => a.equipe === "marketing")
          .reduce((sum, a) => sum + (a.valor_credito_atribuido || 0), 0);
        
        const creditoComercial = atribuicoesMes
          .filter(a => a.equipe === "sdr_telemarketing" || a.equipe === "comercial_vendas")
          .reduce((sum, a) => sum + (a.valor_credito_atribuido || 0), 0);
        
        const creditoVendas = atribuicoesMes
          .filter(a => a.equipe === "vendas")
          .reduce((sum, a) => sum + (a.valor_credito_atribuido || 0), 0);
        
        const creditoTecnico = atribuicoesMes
          .filter(a => a.equipe === "tecnico")
          .reduce((sum, a) => sum + (a.valor_credito_atribuido || 0), 0);
        
        // Consolidar pessoas por equipe
        const pessoasMarketing = [...new Set(atribuicoesMes.filter(a => a.equipe === "marketing").map(a => a.pessoa_id))].length;
        const pessoasComercial = [...new Set(atribuicoesMes.filter(a => a.equipe === "sdr_telemarketing" || a.equipe === "comercial_vendas").map(a => a.pessoa_id))].length;
        const pessoasVendas = [...new Set(atribuicoesMes.filter(a => a.equipe === "vendas").map(a => a.pessoa_id))].length;
        const pessoasTecnico = [...new Set(atribuicoesMes.filter(a => a.equipe === "tecnico").map(a => a.pessoa_id))].length;
        
        // Calcular percentuais
        const percentualMarketing = faturamentoTotal > 0 ? (creditoMarketing / faturamentoTotal) * 100 : 0;
        const percentualComercial = faturamentoTotal > 0 ? (creditoComercial / faturamentoTotal) * 100 : 0;
        const percentualVendas = faturamentoTotal > 0 ? (creditoVendas / faturamentoTotal) * 100 : 0;
        const percentualTecnico = faturamentoTotal > 0 ? (creditoTecnico / faturamentoTotal) * 100 : 0;
        
        return {
          creditoMarketing,
          creditoComercial,
          creditoVendas,
          creditoTecnico,
          pessoasMarketing,
          pessoasComercial,
          pessoasVendas,
          pessoasTecnico,
          percentualMarketing,
          percentualComercial,
          percentualVendas,
          percentualTecnico
        };
      } catch (error) {
        console.error("Erro ao consolidar créditos:", error);
        return null;
      }
    },
    enabled: !!workshop?.id,
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!workshop) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Nenhuma oficina encontrada</p>
      </div>
    );
  }

  const typeIcons = {
    dor: <AlertCircle className="w-5 h-5 text-red-600" />,
    duvida: <HelpCircle className="w-5 h-5 text-yellow-600" />,
    desejo: <Star className="w-5 h-5 text-blue-600" />,
    risco: <AlertTriangle className="w-5 h-5 text-orange-600" />,
    evolucao: <CheckCircle className="w-5 h-5 text-green-600" />,
  };

  const TabContent = ({ items, icon, title, description }) => (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        {icon}
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Nenhum item registrado ainda</p>
          <p className="text-sm text-gray-400">As informações aqui são extraídas das atas de consultoria</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {items.map((item) => (
            <Card key={item.id} className="border-l-4 border-l-blue-600">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">{item.subcategory}</p>
                  </div>
                  {item.is_recurring && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                      Recorrente
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {item.description && (
                  <p className="text-sm text-gray-700">{item.description}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${item.gravity === 'alta' ? 'bg-red-100 text-red-800' : item.gravity === 'critica' ? 'bg-red-200 text-red-900' : 'bg-blue-100 text-blue-800'}`}>
                    {item.gravity === 'alta' ? 'Gravidade Alta' : item.gravity === 'critica' ? 'Crítico' : 'Gravidade Média'}
                  </span>
                  {item.action_defined && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      ✓ Ação Definida
                    </span>
                  )}
                </div>
                {item.action_description && (
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <p className="font-semibold text-gray-700">Ação:</p>
                    <p className="text-gray-600">{item.action_description}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Inteligência do Cliente</h1>
              <p className="text-lg text-gray-600 mt-2">{workshop.name}</p>
              <p className="text-sm text-gray-500 mt-2">
                Nada é conversa solta. Tudo vira dado. Todo dado vira decisão.
              </p>
            </div>
            <BarChart3 className="w-12 h-12 text-blue-600 opacity-20" />
          </div>
        </div>

        {/* Seção de Créditos */}
        {consolidadoMesAtual && (
          <div className="mb-6">
            <CreditosPerformanceEquipe data={consolidadoMesAtual} />
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="dores" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 bg-white shadow-md">
            <TabsTrigger value="dores">
              <AlertCircle className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Dores</span>
            </TabsTrigger>
            <TabsTrigger value="duvidas">
              <HelpCircle className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Dúvidas</span>
            </TabsTrigger>
            <TabsTrigger value="desejos">
              <Star className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Desejos</span>
            </TabsTrigger>
            <TabsTrigger value="riscos">
              <AlertTriangle className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Riscos</span>
            </TabsTrigger>
            <TabsTrigger value="evolucoes">
              <CheckCircle className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Evoluções</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dores">
            <TabContent
              items={dorasAtivas}
              icon={<AlertCircle className="w-8 h-8 text-red-600" />}
              title="Dores Ativas"
              description="Problemas identificados que requerem atenção"
            />
          </TabsContent>

          <TabsContent value="duvidas">
            <TabContent
              items={duvidasFrequentes}
              icon={<HelpCircle className="w-8 h-8 text-yellow-600" />}
              title="Dúvidas Frequentes"
              description="Falta de clareza em processos e decisões"
            />
          </TabsContent>

          <TabsContent value="desejos">
            <TabContent
              items={desejosEstrategicos}
              icon={<Star className="w-8 h-8 text-blue-600" />}
              title="Desejos Estratégicos"
              description="Objetivos e aspirações declaradas"
            />
          </TabsContent>

          <TabsContent value="riscos">
            <TabContent
              items={riscosMapeados}
              icon={<AlertTriangle className="w-8 h-8 text-orange-600" />}
              title="Riscos Mapeados"
              description="Potenciais problemas futuros identificados"
            />
          </TabsContent>

          <TabsContent value="evolucoes">
            <TabContent
              items={evolucoesConquistadas}
              icon={<CheckCircle className="w-8 h-8 text-green-600" />}
              title="Evoluções Conquistadas"
              description="Melhorias e progresso realizados"
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}