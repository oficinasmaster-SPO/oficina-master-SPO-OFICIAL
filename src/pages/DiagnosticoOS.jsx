import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, FileText, Plus, Trash2, DollarSign, Clock, History } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "../components/utils/formatters";

export default function DiagnosticoOS() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState(null);
  const [workshop, setWorkshop] = useState(null);

  const [osNumber, setOsNumber] = useState("");
  const [referenceMonth, setReferenceMonth] = useState("");
  const [parts, setParts] = useState([
    { name: "", sale_value: 0, cost_value: 0, is_commodity: false }
  ]);
  const [services, setServices] = useState([
    { name: "", charged_value: 0, description_steps: "" }
  ]);
  const [thirdPartyServices, setThirdPartyServices] = useState([
    { name: "", cost: 0 }
  ]);

  // State for history filters
  const [historyFilterOsNumber, setHistoryFilterOsNumber] = useState("");
  const [historyFilterMonth, setHistoryFilterMonth] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      const workshops = await base44.entities.Workshop.list();
      const userWorkshop = workshops.find(w => w.owner_id === currentUser.id);
      setWorkshop(userWorkshop);

      const now = new Date();
      const currentMonth = now.toISOString().substring(0, 7);
      setReferenceMonth(currentMonth);
      setHistoryFilterMonth(currentMonth);
    } catch (error) {
      toast.error("Você precisa estar logado");
      base44.auth.redirectToLogin(createPageUrl("DiagnosticoOS"));
    } finally {
      setLoading(false);
    }
  };

  // Fetch DREMonthly to get TCMP2 value and other costs
  const { data: dreMonthlyData } = useQuery({
    queryKey: ['dre-monthly', workshop?.id, referenceMonth],
    queryFn: async () => {
      if (!workshop?.id || !referenceMonth) return null;
      const dreList = await base44.entities.DREMonthly.filter(
        { workshop_id: workshop.id, month: referenceMonth }
      );
      return dreList[0] || null;
    },
    enabled: !!workshop?.id && !!referenceMonth,
  });

  // Extract TCMP2 from DREMonthly
  const tcmp2Value = dreMonthlyData?.calculated?.tcmp2_value || 0;
  const productiveTechnicians = dreMonthlyData?.productive_technicians || 1;
  const monthlyHours = dreMonthlyData?.monthly_hours || 219;
  const operationalCosts = dreMonthlyData?.costs_tcmp2?.operational || 0;
  const peopleCosts = dreMonthlyData?.costs_tcmp2?.people || 0;
  const prolabore = dreMonthlyData?.costs_tcmp2?.prolabore || 0;

  // Fetch historical OS diagnostics
  const { data: pastDiagnostics = [] } = useQuery({
    queryKey: ['past-os-diagnostics', workshop?.id, historyFilterOsNumber, historyFilterMonth],
    queryFn: async () => {
      if (!workshop?.id) return [];
      const query = { workshop_id: workshop.id };
      if (historyFilterOsNumber) {
        query.os_number = historyFilterOsNumber;
      }
      if (historyFilterMonth) {
        query.reference_month = historyFilterMonth;
      }
      const result = await base44.entities.ServiceOrderDiagnostic.filter(
        query, '-created_date', 10 // Get last 10 for performance
      );
      return Array.isArray(result) ? result : [];
    },
    enabled: !!workshop?.id,
  });

  const addPart = () => {
    setParts([...parts, { name: "", sale_value: 0, cost_value: 0, is_commodity: false }]);
  };

  const removePart = (index) => {
    setParts(parts.filter((_, i) => i !== index));
  };

  const updatePart = (index, field, value) => {
    const updated = [...parts];
    if (field === 'sale_value' || field === 'cost_value') {
      updated[index][field] = parseFloat(value) || 0;
    } else {
      updated[index][field] = value;
    }
    setParts(updated);
  };

  const addService = () => {
    setServices([...services, { name: "", charged_value: 0, description_steps: "" }]);
  };

  const removeService = (index) => {
    setServices(services.filter((_, i) => i !== index));
  };

  const updateService = (index, field, value) => {
    const updated = [...services];
    if (field === 'charged_value') {
      updated[index][field] = parseFloat(value) || 0;
    } else {
      updated[index][field] = value;
    }
    setServices(updated);
  };

  const addThirdPartyService = () => {
    setThirdPartyServices([...thirdPartyServices, { name: "", cost: 0 }]);
  };

  const removeThirdPartyService = (index) => {
    setThirdPartyServices(thirdPartyServices.filter((_, i) => i !== index));
  };

  const updateThirdPartyService = (index, field, value) => {
    const updated = [...thirdPartyServices];
    if (field === 'cost') {
      updated[index][field] = parseFloat(value) || 0;
    } else {
      updated[index][field] = value;
    }
    setThirdPartyServices(updated);
  };

  const calculateDiagnostic = useMemo(() => {
    // Calcular totais de peças
    const totalPartsSale = parts.reduce((sum, p) => sum + (p.sale_value || 0), 0);
    const totalPartsCost = parts.reduce((sum, p) => sum + (p.cost_value || 0), 0);
    
    // Calcular total de serviços
    const totalServicesValue = services.reduce((sum, s) => sum + (s.charged_value || 0), 0);
    
    // Calcular total de serviços de terceiros
    const totalThirdPartyCosts = thirdPartyServices.reduce((sum, s) => sum + (s.cost || 0), 0);

    // Total da OS
    const totalOS = totalPartsSale + totalServicesValue; // Terceiros normalmente já estão inclusos no valor cobrado ou repassados? Assumindo estrutura padrão onde serviços é valor cobrado
    
    // R70/I30
    // Os custos de peças usadas para R70/I30 são o totalPartsCost
    const r70Base = totalOS - totalPartsCost;
    const revenuePercentage = totalOS > 0 ? (r70Base / totalOS) * 100 : 0;
    const investmentPercentage = totalOS > 0 ? (totalPartsCost / totalOS) * 100 : 0;
    
    // TCMP² - Valor hora ideal (puxado do DRE Mensal)
    const idealHourValue = tcmp2Value; 

    // Calcular tempo estimado para cada serviço
    const servicesWithEstimatedTime = services.map(s => {
        let estimatedTime = 0;
        if (idealHourValue > 0) {
            // (Valor total do serviço - TCMP2 = / 2 = Tempo que pode ser gasto naquele serviço )
            // Rearranjando para fórmula: (Valor Serviço / 2) / TCMP2 = Tempo
            // Ou conforme pedido: (Valor Total - TCMP2) / 2 -> Isso parece estranho dimensionalmente (R$ - R$/h).
            // A interpretação correta da metodologia TCMP2 geralmente é: Preço = (Tempo * 2 * ValorHora)
            // Logo, Tempo = Preço / (2 * ValorHora)
            estimatedTime = (s.charged_value || 0) / (2 * idealHourValue);
        }
        return { ...s, estimated_time: estimatedTime };
    });
    const totalEstimatedTime = servicesWithEstimatedTime.reduce((sum, s) => sum + s.estimated_time, 0);

    // TCMP² - Valor ideal da OS (baseado no tempo estimado total e valor hora ideal)
    // Idealmente, o valor cobrado deveria ser o dobro do custo da hora técnica
    const tcmp2IdealValue = (totalEstimatedTime * 2) * idealHourValue; 
    
    // Diferença do valor cobrado para o ideal TCMP2
    const tcmp2Difference = totalServicesValue - tcmp2IdealValue;
    
    // Valor hora atual praticado (só para referência)
    const currentHourValue = totalEstimatedTime > 0 ? totalServicesValue / totalEstimatedTime : 0;

    // Classificação e recomendações
    let classification = "aprovada";
    const recommendations = [];
    
    if (revenuePercentage < 70) {
      classification = "alerta_renda";
      recommendations.push("Renda abaixo de 70% - Aumentar valor da mão de obra");
      recommendations.push("Descrever cada passo da mão de obra para aumentar valor percebido");
    }
    
    if (investmentPercentage > 30) {
      if (classification === "alerta_renda") {
        classification = "reprovada";
      } else {
        classification = "alerta_investimento";
      }
      recommendations.push("Investimento acima de 30% - Reduzir dependência de peças de alto custo");
      recommendations.push("Quando peças não permitem margem, aumentar itens de mão de obra");
      recommendations.push("Reavaliar fornecedores das peças");
    }
    
    // Verificar diferença com tolerância pequena
    if (tcmp2Difference < -1) {
      recommendations.push(`Valor da mão de obra está R$ ${Math.abs(tcmp2Difference).toFixed(2)} abaixo do ideal TCMP²`);
      recommendations.push("Ajustar preço da mão de obra para atingir valor ideal");
    }
    
    if (revenuePercentage >= 70 && investmentPercentage <= 30 && tcmp2Difference >= -1) {
      classification = "perfeita";
      recommendations.push("OS com rentabilidade perfeita! Continue assim.");
    }
    
    const hasCommodities = parts.some(p => p.is_commodity);
    if (hasCommodities) {
      recommendations.push("Conferir preços de commodities com o mercado");
      recommendations.push("Aplicar ancoragem com preços de concessionária para peças especializadas");
    }

    if (totalOS < 600) {
      recommendations.push("OS abaixo de R$ 600 - Pode ser negociada por WhatsApp");
    } else if (totalOS <= 2000) {
      recommendations.push("OS entre R$ 600-2000 - Ligação obrigatória após SFV");
    } else {
      recommendations.push("OS acima de R$ 2000 - Cliente deve comparecer na loja após receber fotos/vídeos SFV");
    }

    return {
      totalPartsSale,
      totalPartsCost,
      totalServicesValue,
      totalThirdPartyCosts,
      totalOS,
      investmentPercentage,
      revenuePercentage,
      idealHourValue,
      currentHourValue,
      tcmp2IdealValue,
      tcmp2Difference,
      classification,
      recommendations,
      servicesWithEstimatedTime 
    };
  }, [parts, services, thirdPartyServices, tcmp2Value]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!osNumber || !referenceMonth) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    if (parts.every(p => !p.name.trim()) && services.every(s => !s.name.trim()) && thirdPartyServices.every(s => !s.name.trim())) {
      toast.error("Adicione pelo menos uma peça, serviço ou serviço de terceiro");
      return;
    }

    setSubmitting(true);

    try {
      const diagnosticResult = calculateDiagnostic;

      const diagnostic = await base44.entities.ServiceOrderDiagnostic.create({
        workshop_id: workshop?.id || null,
        evaluator_id: user.id,
        os_number: osNumber,
        reference_month: referenceMonth,
        productive_technicians: productiveTechnicians,
        monthly_hours: monthlyHours,
        operational_costs: operationalCosts,
        people_costs: peopleCosts,
        prolabore: prolabore,
        parts: parts.filter(p => p.name.trim() !== ''),
        services: diagnosticResult.servicesWithEstimatedTime.filter(s => s.name.trim() !== ''), 
        third_party_services: thirdPartyServices.filter(s => s.name.trim() !== ''),
        total_parts_sale: diagnosticResult.totalPartsSale,
        total_parts_cost: diagnosticResult.totalPartsCost,
        total_services: diagnosticResult.totalServicesValue,
        total_third_party_costs: diagnosticResult.totalThirdPartyCosts,
        total_os: diagnosticResult.totalOS,
        investment_percentage: diagnosticResult.investmentPercentage,
        revenue_percentage: diagnosticResult.revenuePercentage,
        ideal_hour_value: diagnosticResult.idealHourValue,
        current_hour_value: diagnosticResult.currentHourValue,
        tcmp2_ideal_value: diagnosticResult.tcmp2IdealValue,
        tcmp2_difference: diagnosticResult.tcmp2Difference,
        classification: diagnosticResult.classification,
        recommendations: diagnosticResult.recommendations,
        completed: true
      });

      toast.success("Diagnóstico OS concluído!");
      navigate(createPageUrl("ResultadoOS") + `?id=${diagnostic.id}`);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar diagnóstico");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !workshop) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return {
        value: date.toISOString().substring(0, 7),
        label: date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    };
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <FileText className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Diagnóstico OS – R70/I30 + TCMP²
          </h1>
          <p className="text-lg text-gray-600">
            Análise completa de rentabilidade e precificação de Ordem de Serviço
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dados Gerais */}
          <Card>
            <CardHeader>
              <CardTitle>Dados Gerais da OS</CardTitle>
              <CardDescription>Informações básicas da ordem de serviço</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nº da OS *</Label>
                  <Input
                    value={osNumber}
                    onChange={(e) => setOsNumber(e.target.value)}
                    placeholder="Ex: OS-2025-001"
                    required
                  />
                </div>
                <div>
                  <Label>Mês de Referência *</Label>
                  <Input
                    type="month"
                    value={referenceMonth}
                    onChange={(e) => setReferenceMonth(e.target.value)}
                    required
                  />
                  {tcmp2Value > 0 ? (
                    <p className="text-sm text-green-600 mt-2 font-medium flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      TCMP² do mês: {formatCurrency(tcmp2Value)}
                    </p>
                  ) : (
                    referenceMonth && !dreMonthlyData && (
                     <p className="text-sm text-red-600 mt-2 flex items-center">
                       <History className="w-4 h-4 mr-1" />
                       Nenhum DRE encontrado para este mês. TCMP² indisponível.
                     </p>
                    )
                  )}
                </div>
              </div>
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex justify-between items-center">
                    <p className="text-sm text-blue-700 font-medium">Total da OS (Peças + Serviços)</p>
                    <p className="text-3xl font-bold text-blue-900">{formatCurrency(calculateDiagnostic.totalOS)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Peças */}
          <Card className="border-2 border-blue-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-blue-600" />
                    Peças da OS
                  </CardTitle>
                  <CardDescription>Adicione todas as peças utilizadas</CardDescription>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addPart}>
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar Peça
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {parts.map((part, index) => (
                <div key={index} className="bg-blue-50 rounded-lg p-4 border border-blue-200 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-sm font-semibold text-blue-900">Peça {index + 1}</span>
                    {parts.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removePart(index)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-1">
                      <Label className="text-xs text-gray-600">Nome da Peça</Label>
                      <Input
                        placeholder="Ex: Filtro de óleo"
                        value={part.name}
                        onChange={(e) => updatePart(index, 'name', e.target.value)}
                        className="bg-white"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Valor total das peças vendidas (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={part.sale_value}
                        onChange={(e) => updatePart(index, 'sale_value', e.target.value)}
                        className="bg-white"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Valor total dos custos das peças (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={part.cost_value}
                        onChange={(e) => updatePart(index, 'cost_value', e.target.value)}
                        className="bg-white"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Checkbox
                      id={`commodity-${index}`}
                      checked={part.is_commodity}
                      onCheckedChange={(checked) => updatePart(index, 'is_commodity', checked)}
                    />
                    <Label htmlFor={`commodity-${index}`} className="text-xs font-normal cursor-pointer">
                      É commodity? (pneu, óleo, filtros, pastilhas, etc.)
                    </Label>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Serviços */}
          <Card className="border-2 border-green-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-green-600" />
                    Serviços da OS
                  </CardTitle>
                  <CardDescription>Adicione todos os serviços executados</CardDescription>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addService}>
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar Serviço
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {calculateDiagnostic.servicesWithEstimatedTime.map((service, index) => (
                <div key={index} className="bg-green-50 rounded-lg p-4 border border-green-200 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-sm font-semibold text-green-900">Serviço {index + 1}</span>
                    {services.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeService(index)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                    <div>
                      <Label className="text-xs text-gray-600">Nome do Serviço</Label>
                      <Input
                        placeholder="Ex: Troca de óleo"
                        value={service.name}
                        onChange={(e) => updateService(index, 'name', e.target.value)}
                        className="bg-white"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Valor total cobrado (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={service.charged_value}
                        onChange={(e) => updateService(index, 'charged_value', e.target.value)}
                        className="bg-white"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Tempo Estimado (horas)</Label>
                      <Input
                        value={service.estimated_time.toFixed(2)}
                        readOnly
                        className="bg-gray-100 italic text-gray-600 cursor-not-allowed"
                        title="Calculado automaticamente: Valor / (2 * TCMP²)"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Descrição dos Passos (aumenta valor percebido)</Label>
                    <Input
                      placeholder="Ex: Remover parafusos, drenar óleo antigo..."
                      value={service.description_steps}
                      onChange={(e) => updateService(index, 'description_steps', e.target.value)}
                      className="bg-white"
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Serviços de Terceiros */}
          <Card className="border-2 border-orange-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="w-5 h-5 text-orange-600" />
                    Serviços de Terceiros (Retífica, etc.)
                  </CardTitle>
                  <CardDescription>Custos com serviços externos</CardDescription>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addThirdPartyService}>
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {thirdPartyServices.map((service, index) => (
                <div key={index} className="bg-orange-50 rounded-lg p-4 border border-orange-200 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-sm font-semibold text-orange-900">Terceiro {index + 1}</span>
                    {thirdPartyServices.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeThirdPartyService(index)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-gray-600">Nome do Serviço</Label>
                      <Input
                        placeholder="Ex: Retífica de motor"
                        value={service.name}
                        onChange={(e) => updateThirdPartyService(index, 'name', e.target.value)}
                        className="bg-white"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Custo (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={service.cost}
                        onChange={(e) => updateThirdPartyService(index, 'cost', e.target.value)}
                        className="bg-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
              <div className="mt-4 p-4 bg-orange-100 rounded-lg border border-orange-200">
                <div className="flex justify-between items-center">
                    <p className="text-sm text-orange-700 font-medium">Total Custos de Terceiros</p>
                    <p className="text-2xl font-bold text-orange-900">{formatCurrency(calculateDiagnostic.totalThirdPartyCosts)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-center pt-6">
            <Button
              type="submit"
              disabled={submitting || (tcmp2Value === 0 && !dreMonthlyData)}
              className="bg-green-600 hover:bg-green-700 text-lg px-12 py-6 shadow-lg hover:shadow-xl transition-all"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Calculando...
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5 mr-2" />
                  Gerar Diagnóstico
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Histórico de Diagnósticos da OS */}
        <Card className="mt-16 shadow-lg border-t-4 border-blue-600">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <History className="w-6 h-6 text-blue-600" />
              Histórico de Diagnósticos
            </CardTitle>
            <CardDescription>Consulte diagnósticos anteriores filtrando por OS ou Mês.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 p-6 bg-gray-50 rounded-xl">
                <div>
                  <Label className="mb-2 block">Filtrar por Nº da OS</Label>
                  <Input
                    value={historyFilterOsNumber}
                    onChange={(e) => setHistoryFilterOsNumber(e.target.value)}
                    placeholder="Digite o Nº da OS..."
                    className="bg-white"
                  />
                </div>
                <div>
                  <Label className="mb-2 block">Filtrar por Mês</Label>
                  <select
                    value={historyFilterMonth}
                    onChange={(e) => setHistoryFilterMonth(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">Todos os meses</option>
                    {monthOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
            </div>
            
            {pastDiagnostics.length === 0 ? (
              <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                  <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>Nenhum diagnóstico encontrado para os filtros selecionados.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {pastDiagnostics.map((diag) => (
                  <div key={diag.id} className="flex flex-col md:flex-row justify-between items-center p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex-1 mb-4 md:mb-0">
                        <div className="flex items-center gap-3 mb-1">
                            <span className="font-bold text-lg text-gray-900">OS #{diag.os_number}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                diag.classification === 'perfeita' || diag.classification === 'aprovada' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                                {diag.classification?.replace('_', ' ').toUpperCase()}
                            </span>
                        </div>
                        <div className="text-sm text-gray-500 flex gap-4">
                            <span>📅 {new Date(diag.created_date).toLocaleDateString('pt-BR')}</span>
                            <span>💰 Total: {formatCurrency(diag.total_os)}</span>
                        </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="w-full md:w-auto"
                      onClick={() => navigate(createPageUrl("ResultadoOS") + `?id=${diag.id}`)}
                    >
                      Ver Detalhes
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}