import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, BarChart4, Calendar, Plus, Trash2, Users, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export default function DiagnosticoCarga() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [revenueTotal, setRevenueTotal] = useState(0);
  const [revenueDesired, setRevenueDesired] = useState(0);
  
  // Estrutura conforme organograma
  const [socios, setSocios] = useState([{ name: "", presence_percentage: 0, delivery_value: 0 }]);
  const [gerentes, setGerentes] = useState([
    { area: "Gerente Geral", employees: [{ name: "", presence_percentage: 0 }] },
    { area: "Financeiro", employees: [{ name: "", presence_percentage: 0 }] },
    { area: "Estoque", employees: [{ name: "", presence_percentage: 0 }] }
  ]);
  const [vendas, setVendas] = useState([{ name: "", delivery_value: 0, presence_percentage: 0 }]);
  const [comercial, setComercial] = useState([{ name: "", delivery_value: 0, presence_percentage: 0 }]);
  const [marketing, setMarketing] = useState([{ name: "", delivery_value: 0, presence_percentage: 0 }]);
  const [tecnicos, setTecnicos] = useState([{ name: "", delivery_value: 0, presence_percentage: 0 }]);
  const [auxiliares, setAuxiliares] = useState([{ name: "", delivery_value: 0, presence_percentage: 0 }]);

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

      // Definir período padrão (último mês)
      const now = new Date();
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      setPeriodStart(monthAgo.toISOString().split('T')[0]);
      setPeriodEnd(now.toISOString().split('T')[0]);
    } catch (error) {
      toast.error("Você precisa estar logado");
      base44.auth.redirectToLogin(createPageUrl("DiagnosticoCarga"));
    } finally {
      setLoading(false);
    }
  };

  const addItem = (setter, currentItems) => {
    setter([...currentItems, { name: "", delivery_value: 0, presence_percentage: 0 }]);
  };

  const removeItem = (setter, currentItems, index) => {
    const updated = currentItems.filter((_, i) => i !== index);
    setter(updated);
  };

  const updateItem = (setter, currentItems, index, field, value) => {
    const updated = [...currentItems];
    updated[index][field] = value;
    setter(updated);
  };

  const updateGerenteEmployee = (gerenteIndex, empIndex, field, value) => {
    const updated = [...gerentes];
    updated[gerenteIndex].employees[empIndex][field] = value;
    setGerentes(updated);
  };

  const addGerenteEmployee = (gerenteIndex) => {
    const updated = [...gerentes];
    updated[gerenteIndex].employees.push({ name: "", presence_percentage: 0 });
    setGerentes(updated);
  };

  const removeGerenteEmployee = (gerenteIndex, empIndex) => {
    const updated = [...gerentes];
    updated[gerenteIndex].employees = updated[gerenteIndex].employees.filter((_, i) => i !== empIndex);
    setGerentes(updated);
  };

  const analyzeWorkload = () => {
    // Análise simplificada baseada em presença e entrega
    const allEmployees = [
      ...socios.map(s => ({ ...s, role: 'socio' })),
      ...gerentes.flatMap(g => g.employees.map(e => ({ ...e, role: 'gerente', area: g.area }))),
      ...vendas.map(v => ({ ...v, role: 'vendas' })),
      ...comercial.map(c => ({ ...c, role: 'comercial' })),
      ...marketing.map(m => ({ ...m, role: 'marketing' })),
      ...tecnicos.map(t => ({ ...t, role: 'tecnico' })),
      ...auxiliares.map(a => ({ ...a, role: 'auxiliar' }))
    ].filter(emp => emp.name.trim() !== '');

    const overloaded = [];
    const underutilized = [];

    allEmployees.forEach(emp => {
      if (emp.presence_percentage > 100) {
        overloaded.push({
          employee_id: emp.name,
          overload_percentage: emp.presence_percentage - 100,
          recommendation: `${emp.name} está com ${emp.presence_percentage}% de presença, acima do esperado. Revisar distribuição de responsabilidades.`
        });
      } else if (emp.presence_percentage < 70 && emp.presence_percentage > 0) {
        underutilized.push({
          employee_id: emp.name,
          utilization_percentage: emp.presence_percentage,
          recommendation: `${emp.name} está com apenas ${emp.presence_percentage}% de presença. Considere aumentar participação ou revisar função.`
        });
      }
    });

    let overallHealth = "excelente";
    if (overloaded.length > 0) {
      overallHealth = overloaded.length > 2 ? "critico" : "atencao";
    } else if (underutilized.length > 2) {
      overallHealth = "bom";
    }

    return {
      overloaded_employees: overloaded,
      underutilized_employees: underutilized,
      redistribution_suggestions: [],
      overall_health: overallHealth
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!periodStart || !periodEnd) {
      toast.error("Defina o período de avaliação");
      return;
    }

    setSubmitting(true);

    try {
      const analysisResults = analyzeWorkload();

      const diagnostic = await base44.entities.WorkloadDiagnostic.create({
        workshop_id: workshop?.id || null,
        evaluator_id: user.id,
        period_start: periodStart,
        period_end: periodEnd,
        revenue_total: revenueTotal,
        revenue_desired: revenueDesired,
        areas_data: {
          socios,
          gerentes,
          operacional: { vendas, comercial, marketing },
          tecnicos,
          auxiliares
        },
        analysis_results: analysisResults,
        overall_health: analysisResults.overall_health,
        completed: true
      });

      toast.success("Diagnóstico de carga concluído!");
      navigate(createPageUrl("ResultadoCarga") + `?id=${diagnostic.id}`);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
            <BarChart4 className="w-8 h-8 text-orange-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Diagnóstico Gerencial das Áreas da Empresa
          </h1>
          <p className="text-lg text-gray-600">
            Mapeie o organograma, presença e entrega de cada colaborador por área
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Período e Receita */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Calendar className="w-6 h-6 text-orange-600" />
                <div>
                  <CardTitle>Período e Resultados</CardTitle>
                  <CardDescription>Defina período e metas financeiras</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Data Início *</Label>
                  <Input
                    type="date"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label>Data Fim *</Label>
                  <Input
                    type="date"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>R/M Total (Receita Mensal Total)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={revenueTotal}
                    onChange={(e) => setRevenueTotal(parseFloat(e.target.value) || 0)}
                    placeholder="R$ 0,00"
                  />
                </div>
                <div>
                  <Label>R/Desejada (Receita Desejada)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={revenueDesired}
                    onChange={(e) => setRevenueDesired(parseFloat(e.target.value) || 0)}
                    placeholder="R$ 0,00"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 1º Nível - Sócios */}
          <Card className="border-2 border-blue-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                  <div>
                    <CardTitle>1º Nível - Sócios</CardTitle>
                    <CardDescription>Presença e entrega dos sócios</CardDescription>
                  </div>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => addItem(setSocios, socios)}>
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar Sócio
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {socios.map((socio, index) => (
                <div key={index} className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-sm font-semibold text-blue-900">Sócio {index + 1}</span>
                    {socios.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(setSocios, socios, index)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Nome</Label>
                      <Input
                        placeholder="Nome do sócio"
                        value={socio.name}
                        onChange={(e) => updateItem(setSocios, socios, index, 'name', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Presença (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={socio.presence_percentage}
                        onChange={(e) => updateItem(setSocios, socios, index, 'presence_percentage', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Entrega (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={socio.delivery_value}
                        onChange={(e) => updateItem(setSocios, socios, index, 'delivery_value', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 2º Nível - Gerentes */}
          <Card className="border-2 border-purple-200">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Users className="w-6 h-6 text-purple-600" />
                <div>
                  <CardTitle>2º Nível - Gerentes e Terceiros/Assessoria</CardTitle>
                  <CardDescription>Gerente, Financeiro e Estoque</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {gerentes.map((gerente, gIndex) => (
                <div key={gIndex} className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-purple-900">{gerente.area}</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addGerenteEmployee(gIndex)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Adicionar
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {gerente.employees.map((emp, eIndex) => (
                      <div key={eIndex} className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white rounded p-3">
                        <div className="md:col-span-2">
                          <Label className="text-xs">Nome</Label>
                          <Input
                            placeholder={`Nome do ${gerente.area}`}
                            value={emp.name}
                            onChange={(e) => updateGerenteEmployee(gIndex, eIndex, 'name', e.target.value)}
                          />
                        </div>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <Label className="text-xs">Presença (%)</Label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={emp.presence_percentage}
                              onChange={(e) => updateGerenteEmployee(gIndex, eIndex, 'presence_percentage', parseFloat(e.target.value) || 0)}
                            />
                          </div>
                          {gerente.employees.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="mt-5"
                              onClick={() => removeGerenteEmployee(gIndex, eIndex)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Nível Operacional - Vendas/Comercial/Marketing */}
          <Card className="border-2 border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-green-600" />
                Áreas Operacionais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Vendas */}
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-green-900">2º C/Vendas</h3>
                  <Button type="button" variant="outline" size="sm" onClick={() => addItem(setVendas, vendas)}>
                    <Plus className="w-4 h-4 mr-1" />
                    Adicionar
                  </Button>
                </div>
                <div className="space-y-3">
                  {vendas.map((v, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white rounded p-3">
                      <div>
                        <Label className="text-xs">Nome</Label>
                        <Input
                          placeholder="Nome"
                          value={v.name}
                          onChange={(e) => updateItem(setVendas, vendas, index, 'name', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Entrega (R$)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={v.delivery_value}
                          onChange={(e) => updateItem(setVendas, vendas, index, 'delivery_value', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Presença (%)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={v.presence_percentage}
                          onChange={(e) => updateItem(setVendas, vendas, index, 'presence_percentage', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="flex items-end">
                        {vendas.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(setVendas, vendas, index)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Comercial */}
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-green-900">2º Comercial</h3>
                  <Button type="button" variant="outline" size="sm" onClick={() => addItem(setComercial, comercial)}>
                    <Plus className="w-4 h-4 mr-1" />
                    Adicionar
                  </Button>
                </div>
                <div className="space-y-3">
                  {comercial.map((c, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white rounded p-3">
                      <div>
                        <Label className="text-xs">Nome</Label>
                        <Input
                          placeholder="Nome"
                          value={c.name}
                          onChange={(e) => updateItem(setComercial, comercial, index, 'name', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Entrega (R$)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={c.delivery_value}
                          onChange={(e) => updateItem(setComercial, comercial, index, 'delivery_value', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Presença (%)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={c.presence_percentage}
                          onChange={(e) => updateItem(setComercial, comercial, index, 'presence_percentage', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="flex items-end">
                        {comercial.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(setComercial, comercial, index)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Marketing Digital */}
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-green-900">2º Marketing Digital</h3>
                  <Button type="button" variant="outline" size="sm" onClick={() => addItem(setMarketing, marketing)}>
                    <Plus className="w-4 h-4 mr-1" />
                    Adicionar
                  </Button>
                </div>
                <div className="space-y-3">
                  {marketing.map((m, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white rounded p-3">
                      <div>
                        <Label className="text-xs">Nome</Label>
                        <Input
                          placeholder="Nome"
                          value={m.name}
                          onChange={(e) => updateItem(setMarketing, marketing, index, 'name', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Entrega (R$)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={m.delivery_value}
                          onChange={(e) => updateItem(setMarketing, marketing, index, 'delivery_value', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Presença (%)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={m.presence_percentage}
                          onChange={(e) => updateItem(setMarketing, marketing, index, 'presence_percentage', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="flex items-end">
                        {marketing.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(setMarketing, marketing, index)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 3º Nível - Técnicos */}
          <Card className="border-2 border-amber-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>3º Técnico/Eletricista/Mecânico/Funileiro</CardTitle>
                  <CardDescription>Equipe técnica</CardDescription>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => addItem(setTecnicos, tecnicos)}>
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {tecnicos.map((t, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-amber-50 rounded p-3 border border-amber-200">
                  <div>
                    <Label className="text-xs">Nome</Label>
                    <Input
                      placeholder="Nome do técnico"
                      value={t.name}
                      onChange={(e) => updateItem(setTecnicos, tecnicos, index, 'name', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Entrega (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={t.delivery_value}
                      onChange={(e) => updateItem(setTecnicos, tecnicos, index, 'delivery_value', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Presença (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={t.presence_percentage}
                      onChange={(e) => updateItem(setTecnicos, tecnicos, index, 'presence_percentage', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="flex items-end">
                    {tecnicos.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(setTecnicos, tecnicos, index)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 3º Nível - Auxiliares */}
          <Card className="border-2 border-cyan-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>3º Auxiliar/M.Boy/Limpeza</CardTitle>
                  <CardDescription>Equipe de apoio</CardDescription>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => addItem(setAuxiliares, auxiliares)}>
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {auxiliares.map((a, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-cyan-50 rounded p-3 border border-cyan-200">
                  <div>
                    <Label className="text-xs">Nome</Label>
                    <Input
                      placeholder="Nome do auxiliar"
                      value={a.name}
                      onChange={(e) => updateItem(setAuxiliares, auxiliares, index, 'name', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Entrega (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={a.delivery_value}
                      onChange={(e) => updateItem(setAuxiliares, auxiliares, index, 'delivery_value', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Presença (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={a.presence_percentage}
                      onChange={(e) => updateItem(setAuxiliares, auxiliares, index, 'presence_percentage', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="flex items-end">
                    {auxiliares.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(setAuxiliares, auxiliares, index)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex justify-center">
            <Button
              type="submit"
              disabled={submitting}
              className="bg-orange-600 hover:bg-orange-700 text-lg px-12 py-6"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <BarChart4 className="w-5 h-5 mr-2" />
                  Gerar Diagnóstico
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}