import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, FileText, Plus, Trash2, DollarSign, Clock } from "lucide-react";
import { toast } from "sonner";

export default function DiagnosticoOS() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState(null);
  const [workshop, setWorkshop] = useState(null);

  const [osNumber, setOsNumber] = useState("");
  const [referenceMonth, setReferenceMonth] = useState("");
  const [productiveTechnicians, setProductiveTechnicians] = useState(1);
  const [monthlyHours, setMonthlyHours] = useState(219);
  const [operationalCosts, setOperationalCosts] = useState(0);
  const [peopleCosts, setPeopleCosts] = useState(0);
  const [prolabore, setProlabore] = useState(0);

  const [parts, setParts] = useState([
    { name: "", quantity: 1, sale_value: 0, cost_value: 0, is_commodity: false }
  ]);
  const [services, setServices] = useState([
    { name: "", estimated_time: 0, charged_value: 0, description_steps: "" }
  ]);

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
      setReferenceMonth(now.toISOString().substring(0, 7));
    } catch (error) {
      toast.error("Você precisa estar logado");
      base44.auth.redirectToLogin(createPageUrl("DiagnosticoOS"));
    } finally {
      setLoading(false);
    }
  };

  const addPart = () => {
    setParts([...parts, { name: "", quantity: 1, sale_value: 0, cost_value: 0, is_commodity: false }]);
  };

  const removePart = (index) => {
    setParts(parts.filter((_, i) => i !== index));
  };

  const updatePart = (index, field, value) => {
    const updated = [...parts];
    updated[index][field] = value;
    setParts(updated);
  };

  const addService = () => {
    setServices([...services, { name: "", estimated_time: 0, charged_value: 0, description_steps: "" }]);
  };

  const removeService = (index) => {
    setServices(services.filter((_, i) => i !== index));
  };

  const updateService = (index, field, value) => {
    const updated = [...services];
    updated[index][field] = value;
    setServices(updated);
  };

  const calculateDiagnostic = () => {
    // Calcular totais de peças
    const totalPartsSale = parts.reduce((sum, p) => sum + (p.sale_value * p.quantity), 0);
    const totalPartsCost = parts.reduce((sum, p) => sum + (p.cost_value * p.quantity), 0);
    
    // Calcular total de serviços
    const totalServices = services.reduce((sum, s) => sum + s.charged_value, 0);
    
    // Total da OS
    const totalOS = totalPartsSale + totalServices;
    
    // R70/I30
    const investmentPercentage = (totalPartsCost / totalOS) * 100;
    const revenuePercentage = (totalServices / totalOS) * 100;
    
    // TCMP² - Valor hora ideal
    const totalCosts = operationalCosts + peopleCosts + prolabore;
    const marginCosts = totalCosts * 2; // 100% de margem
    const idealHourValue = marginCosts / (monthlyHours * productiveTechnicians);
    
    // TCMP² - Valor ideal da OS
    const totalTime = services.reduce((sum, s) => sum + s.estimated_time, 0);
    const tcmp2IdealValue = (totalTime * 2) * idealHourValue;
    const tcmp2Difference = totalServices - tcmp2IdealValue;
    
    // Valor hora atual praticado
    const currentHourValue = totalTime > 0 ? totalServices / totalTime : 0;
    
    // Classificação
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
    
    if (tcmp2Difference < 0) {
      recommendations.push(`Valor da mão de obra está R$ ${Math.abs(tcmp2Difference).toFixed(2)} abaixo do ideal TCMP²`);
      recommendations.push("Ajustar preço da mão de obra para atingir valor ideal");
    }
    
    if (revenuePercentage >= 70 && investmentPercentage <= 30 && tcmp2Difference >= 0) {
      classification = "perfeita";
      recommendations.push("OS com rentabilidade perfeita! Continue assim.");
    }
    
    // Recomendações para commodities
    const hasCommodities = parts.some(p => p.is_commodity);
    if (hasCommodities) {
      recommendations.push("Conferir preços de commodities com o mercado");
      recommendations.push("Aplicar ancoragem com preços de concessionária para peças especializadas");
    }
    
    // Valor mínimo
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
      totalServices,
      totalOS,
      investmentPercentage,
      revenuePercentage,
      idealHourValue,
      currentHourValue,
      tcmp2IdealValue,
      tcmp2Difference,
      classification,
      recommendations
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!osNumber || !referenceMonth) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    if (parts.every(p => !p.name.trim()) && services.every(s => !s.name.trim())) {
      toast.error("Adicione pelo menos uma peça ou serviço");
      return;
    }

    setSubmitting(true);

    try {
      const diagnosticData = calculateDiagnostic();

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
        services: services.filter(s => s.name.trim() !== ''),
        ...diagnosticData,
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                </div>
                <div>
                  <Label>Técnicos Produtivos</Label>
                  <Input
                    type="number"
                    min="1"
                    value={productiveTechnicians}
                    onChange={(e) => setProductiveTechnicians(parseInt(e.target.value) || 1)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label>Horas/Mês por Técnico</Label>
                  <Input
                    type="number"
                    value={monthlyHours}
                    onChange={(e) => setMonthlyHours(parseFloat(e.target.value) || 219)}
                  />
                </div>
                <div>
                  <Label>Custos Operacionais (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={operationalCosts}
                    onChange={(e) => setOperationalCosts(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label>Custos com Pessoas (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={peopleCosts}
                    onChange={(e) => setPeopleCosts(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label>Pró-labore (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={prolabore}
                    onChange={(e) => setProlabore(parseFloat(e.target.value) || 0)}
                  />
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
                <div key={index} className="bg-blue-50 rounded-lg p-4 border border-blue-200">
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
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <div className="md:col-span-2">
                      <Label className="text-xs">Nome da Peça</Label>
                      <Input
                        placeholder="Ex: Filtro de óleo"
                        value={part.name}
                        onChange={(e) => updatePart(index, 'name', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Quantidade</Label>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        value={part.quantity}
                        onChange={(e) => updatePart(index, 'quantity', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Valor Venda (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={part.sale_value}
                        onChange={(e) => updatePart(index, 'sale_value', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Custo (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={part.cost_value}
                        onChange={(e) => updatePart(index, 'cost_value', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Checkbox
                      id={`commodity-${index}`}
                      checked={part.is_commodity}
                      onCheckedChange={(checked) => updatePart(index, 'is_commodity', checked)}
                    />
                    <Label htmlFor={`commodity-${index}`} className="text-xs font-normal">
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
              {services.map((service, index) => (
                <div key={index} className="bg-green-50 rounded-lg p-4 border border-green-200">
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
                      <Label className="text-xs">Nome do Serviço</Label>
                      <Input
                        placeholder="Ex: Troca de óleo"
                        value={service.name}
                        onChange={(e) => updateService(index, 'name', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Tempo Estimado (horas)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={service.estimated_time}
                        onChange={(e) => updateService(index, 'estimated_time', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Valor Cobrado (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={service.charged_value}
                        onChange={(e) => updateService(index, 'charged_value', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Descrição dos Passos (aumenta valor percebido)</Label>
                    <Input
                      placeholder="Ex: Remover parafusos, drenar óleo antigo, trocar filtro, adicionar óleo novo..."
                      value={service.description_steps}
                      onChange={(e) => updateService(index, 'description_steps', e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex justify-center">
            <Button
              type="submit"
              disabled={submitting}
              className="bg-green-600 hover:bg-green-700 text-lg px-12 py-6"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Calculando...
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5 mr-2" />
                  Gerar Diagnóstico R70/I30 + TCMP²
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}