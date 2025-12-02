import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Calculator, DollarSign, TrendingUp, History, Search, RefreshCw } from "lucide-react";
import { formatCurrency } from "@/components/utils/formatters";
import { toast } from "sonner";

export default function DiagnosticoProducao() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [workshop, setWorkshop] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyFilters, setHistoryFilters] = useState({ employee_id: "all", month: "all" });
  const [dreData, setDreData] = useState(null);
  
  const [formData, setFormData] = useState({
    employee_id: "",
    employee_role: "",
    period_month: "",
    salary_base: "",
    commission: "0",
    benefits: {
      meal_voucher: "0",
      transport_voucher: "0",
      health_insurance: "0",
      other_benefits: "0"
    },
    productivity_data: {
      services_value: "0",
      parts_value: "0",
      sales_value: "0"
    }
  });

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

      const allEmployees = await base44.entities.Employee.list();
      const activeEmployees = allEmployees.filter(e => 
        e.status === "ativo" && (!userWorkshop || e.workshop_id === userWorkshop.id)
      );
      setEmployees(activeEmployees);

      // Set default month to current month
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      setFormData(prev => ({ ...prev, period_month: currentMonth }));
      
      // Load history initially
      loadHistory(userWorkshop?.id);
    } catch (error) {
      toast.error("Você precisa estar logado");
      base44.auth.redirectToLogin(createPageUrl("DiagnosticoProducao"));
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async (workshopId) => {
    if (!workshopId) return;
    try {
      const diagnostics = await base44.entities.ProductivityDiagnostic.filter({ 
        workshop_id: workshopId 
      }, "-created_date", 50);
      setHistory(Array.isArray(diagnostics) ? diagnostics : []);
    } catch (error) {
      console.error("Error loading history:", error);
    }
  };

  // Fetch DRE when month or workshop changes
  useEffect(() => {
    const fetchDRE = async () => {
      if (workshop?.id && formData.period_month) {
        try {
          const dreList = await base44.entities.DREMonthly.filter({
            workshop_id: workshop.id,
            month: formData.period_month
          });
          if (dreList && dreList.length > 0) {
            setDreData(dreList[0]);
          } else {
            setDreData(null);
          }
        } catch (error) {
          console.error("Error fetching DRE:", error);
        }
      }
    };
    fetchDRE();
  }, [workshop?.id, formData.period_month]);

  // Helper to load employee data
  const loadEmployeeData = (employeeId = formData.employee_id, month = formData.period_month) => {
    if (!employeeId || employees.length === 0) return;

    const emp = employees.find(e => e.id === employeeId);
    if (emp) {
      // Map role
      let role = "";
      if (emp.job_role === "tecnico") role = "tecnico";
      else if (emp.job_role === "lider_tecnico") role = "tecnico_lider";
      else if (emp.job_role === "consultor_vendas" || emp.area === "vendas") role = "vendas";
      else if (emp.job_role === "comercial" || emp.area === "comercial") role = "comercial";
      else role = "outros";

      // Map benefits
      let meal = 0, transport = 0, health = 0, other = 0;
      if (emp.benefits && Array.isArray(emp.benefits)) {
        emp.benefits.forEach(b => {
          const name = b.nome?.toLowerCase() || "";
          const val = parseFloat(b.valor || 0);
          if (name.includes("alimenta") || name.includes("refei")) meal += val;
          else if (name.includes("transporte") || name.includes("combust")) transport += val;
          else if (name.includes("saude") || name.includes("saúde") || name.includes("odonto") || name.includes("médico")) health += val;
          else other += val;
        });
      }

      setFormData(prev => ({
        ...prev,
        employee_role: role,
        salary_base: emp.salary || "",
        commission: emp.commission || "0",
        benefits: {
          meal_voucher: meal,
          transport_voucher: transport,
          health_insurance: health,
          other_benefits: other
        }
      }));

      // Try to load productivity
      loadProductivityFromHistory(emp, month);
    }
  };

  const loadProductivityFromHistory = (emp, month) => {
    if (!emp || !emp.production_history || !Array.isArray(emp.production_history)) {
      return false;
    }

    const historyItem = emp.production_history.find(h => h.month === month);
    if (historyItem) {
      setFormData(prev => ({
        ...prev,
        productivity_data: {
          parts_value: historyItem.parts || 0,
          services_value: historyItem.services || 0,
          sales_value: historyItem.total || 0
        }
      }));
      toast.success("Dados de produtividade carregados do histórico!");
      return true;
    }
    return false;
  };

  const handleManualProductivityLoad = () => {
    const emp = employees.find(e => e.id === formData.employee_id);
    if (emp) {
      const found = loadProductivityFromHistory(emp, formData.period_month);
      if (!found) {
        toast.info("Nenhum registro de produtividade encontrado para este mês.");
      }
    }
  };

  // Auto-fill employee data on change
  useEffect(() => {
    if (formData.employee_id) {
      loadEmployeeData(formData.employee_id, formData.period_month);
    }
  }, [formData.employee_id, formData.period_month]);

  const calculateDiagnostic = () => {
    const totalBenefits = 
      parseFloat(formData.benefits.meal_voucher || 0) +
      parseFloat(formData.benefits.transport_voucher || 0) +
      parseFloat(formData.benefits.health_insurance || 0) +
      parseFloat(formData.benefits.other_benefits || 0);

    const totalCost = 
      parseFloat(formData.salary_base || 0) +
      parseFloat(formData.commission || 0) +
      totalBenefits;

    let totalProductivity = 0;
    let threshold = 0;
    let costPercentage = 0;
    let tcmp2Costs = 0;

    // Calculate Total Workshop Costs (TCMP2 base) for "outros" roles
    if (dreData && dreData.costs_tcmp2) {
      tcmp2Costs = (dreData.costs_tcmp2.operational || 0) + (dreData.costs_tcmp2.people || 0) + (dreData.costs_tcmp2.prolabore || 0);
    }

    if (formData.employee_role === "tecnico" || formData.employee_role === "tecnico_lider") {
      totalProductivity = 
        parseFloat(formData.productivity_data.services_value || 0) +
        parseFloat(formData.productivity_data.parts_value || 0);
      threshold = 0.09; // 9%
      costPercentage = totalProductivity > 0 ? (totalCost / totalProductivity) : 0;
    } else if (formData.employee_role === "vendas") {
      totalProductivity = parseFloat(formData.productivity_data.sales_value || 0);
      threshold = 0.04; // 4%
      costPercentage = totalProductivity > 0 ? (totalCost / totalProductivity) : 0;
    } else {
      // Comercial e Outros
      // Cálculo sobre os custos do TCMP2
      if (tcmp2Costs > 0) {
        totalProductivity = tcmp2Costs; // Base is the total workshop cost
        costPercentage = totalCost / tcmp2Costs;
        threshold = 0.15; // Example threshold for overhead impact, can be adjusted
      } else {
        totalProductivity = 0;
        costPercentage = 0;
      }
    }

    let classification = "";
    let recommendation = "";

    if (formData.employee_role === "tecnico") {
      if (costPercentage < threshold) {
        classification = "ideal";
        recommendation = "Excelente! O custo do colaborador está dentro do padrão saudável para o setor. Continue monitorando para manter este nível de eficiência.";
      } else if (costPercentage === threshold) {
        classification = "limite";
        recommendation = "Atenção: O colaborador está exatamente no limite permitido de 9%. Monitore de perto para evitar ultrapassar o threshold.";
      } else {
        classification = "acima_aceitavel";
        recommendation = "O custo do colaborador ultrapassa o limite recomendado de 9%. Recomendações: Avaliar metas de produtividade, revisar processos de trabalho, verificar se há desperdício de materiais, ou considerar readequação de função.";
      }
    } else if (formData.employee_role === "tecnico_lider") {
      if (costPercentage < threshold) {
        classification = "ideal";
        recommendation = "Excelente! O custo do líder técnico está dentro do padrão saudável. Continue investindo no desenvolvimento da equipe.";
      } else if (costPercentage === threshold) {
        classification = "limite";
        recommendation = "Atenção: O líder técnico está no limite de 9%. Monitore a produtividade da equipe sob sua gestão.";
      } else {
        classification = "aceitavel";
        recommendation = "Para líderes técnicos, custos acima de 9% ainda são aceitáveis devido às responsabilidades de gestão. Continue desenvolvendo a equipe para aumentar a produtividade geral.";
      }
    } else if (formData.employee_role === "vendas") {
      if (costPercentage < threshold) {
        classification = "ideal";
        recommendation = "Excelente! O custo do vendedor está dentro do padrão saudável de 4%. Continue incentivando o alto desempenho em vendas.";
      } else if (costPercentage === threshold) {
        classification = "limite";
        recommendation = "Atenção: O vendedor está no limite permitido de 4%. Monitore de perto e estabeleça metas de crescimento.";
      } else {
        classification = "acima_aceitavel";
        recommendation = "O custo do vendedor ultrapassa o limite recomendado de 4%. Recomendações: Revisar metas de vendas, treinar técnicas de fechamento, avaliar estratégias de prospecção, ou considerar ajustes na estrutura de comissionamento.";
      }
    } else {
      // Comercial e Outros
      const percent = (costPercentage * 100).toFixed(2);
      recommendation = `Este colaborador representa ${percent}% dos custos totais da oficina (Base TCMP²). `;
      
      if (costPercentage < 0.05) {
        classification = "ideal";
        recommendation += "Impacto baixo nos custos fixos.";
      } else if (costPercentage < 0.10) {
        classification = "aceitavel";
        recommendation += "Impacto moderado nos custos fixos.";
      } else {
        classification = "acima_aceitavel";
        recommendation += "Impacto alto nos custos fixos. Avalie a necessidade e o retorno trazido por esta função.";
      }
    }

    return {
      totalCost,
      totalProductivity,
      costPercentage,
      classification,
      recommendation,
      tcmp2Costs
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.employee_id || !formData.employee_role || !formData.salary_base) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setSubmitting(true);

    try {
      const calculations = calculateDiagnostic();

      const diagnostic = await base44.entities.ProductivityDiagnostic.create({
        employee_id: formData.employee_id,
        evaluator_id: user.id,
        workshop_id: workshop?.id || null,
        period_month: formData.period_month,
        employee_role: formData.employee_role,
        salary_base: parseFloat(formData.salary_base),
        commission: parseFloat(formData.commission || 0),
        benefits: {
          meal_voucher: parseFloat(formData.benefits.meal_voucher || 0),
          transport_voucher: parseFloat(formData.benefits.transport_voucher || 0),
          health_insurance: parseFloat(formData.benefits.health_insurance || 0),
          other_benefits: parseFloat(formData.benefits.other_benefits || 0)
        },
        productivity_data: {
          services_value: parseFloat(formData.productivity_data.services_value || 0),
          parts_value: parseFloat(formData.productivity_data.parts_value || 0),
          sales_value: parseFloat(formData.productivity_data.sales_value || 0)
        },
        tcmp2_data: {
          tcmp2_value: dreData?.calculated?.tcmp2_value || 0,
          total_operational_costs: dreData?.costs_tcmp2?.operational || 0,
          total_people_costs: dreData?.costs_tcmp2?.people || 0,
          total_prolabore: dreData?.costs_tcmp2?.prolabore || 0,
          total_workshop_costs: calculations.tcmp2Costs || 0
        },
        total_cost: calculations.totalCost,
        total_productivity: calculations.totalProductivity,
        cost_percentage: calculations.costPercentage,
        classification: calculations.classification,
        recommendation: calculations.recommendation,
        completed: true
      });

      // Update Employee with new diagnostic ID
      try {
        const emp = employees.find(e => e.id === formData.employee_id);
        if (emp) {
          const currentDiagnostics = emp.performance_diagnostics || [];
          await base44.entities.Employee.update(emp.id, {
            performance_diagnostics: [...currentDiagnostics, diagnostic.id]
          });
        }
      } catch (err) {
        console.error("Failed to link diagnostic to employee", err);
      }

      toast.success("Diagnóstico de produtividade concluído!");
      loadHistory(workshop?.id); // Refresh history
      // navigate(createPageUrl("ResultadoProducao") + `?id=${diagnostic.id}`); // Stay on page or navigate? User implies "history", maybe stay and show in history? 
      // Let's stick to navigation as per original flow, or maybe just clear form? 
      // User said "Deve gerar registro na cadastro do colaborador... historico de analise".
      // I'll navigate for now as it shows the result nicely.
      navigate(createPageUrl("ResultadoProducao") + `?id=${diagnostic.id}`);
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
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <Calculator className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Diagnóstico Produção vs Salário
          </h1>
          <p className="text-lg text-gray-600">
            Analise a relação custo x produtividade dos colaboradores
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                   <CardTitle>Informações do Colaborador</CardTitle>
                   <CardDescription>Selecione o colaborador e o período de análise</CardDescription>
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => loadEmployeeData()}
                  title="Recarregar dados do cadastro"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Recarregar Cadastro
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="employee_id">Colaborador *</Label>
                <Select 
                  value={formData.employee_id} 
                  onValueChange={(value) => setFormData({...formData, employee_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o colaborador" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.full_name} - {emp.position}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="employee_role">Função *</Label>
                  <Select 
                    value={formData.employee_role} 
                    onValueChange={(value) => setFormData({...formData, employee_role: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a função" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tecnico">Técnico</SelectItem>
                      <SelectItem value="tecnico_lider">Técnico Líder</SelectItem>
                      <SelectItem value="vendas">Vendas</SelectItem>
                      <SelectItem value="comercial">Comercial</SelectItem>
                      <SelectItem value="outros">Outros (Administrativo/Financeiro)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="period_month">Mês de Referência *</Label>
                  <Input
                    type="month"
                    value={formData.period_month}
                    onChange={(e) => setFormData({...formData, period_month: e.target.value})}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Custos */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <DollarSign className="w-6 h-6 text-red-600" />
                <div>
                  <CardTitle>Custos do Colaborador</CardTitle>
                  <CardDescription>Informe todos os custos do período</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="salary_base">Salário Base *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.salary_base}
                    onChange={(e) => setFormData({...formData, salary_base: e.target.value})}
                    placeholder="R$ 0,00"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="commission">Comissão</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.commission}
                    onChange={(e) => setFormData({...formData, commission: e.target.value})}
                    placeholder="R$ 0,00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="meal_voucher">Vale Alimentação</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.benefits.meal_voucher}
                    onChange={(e) => setFormData({
                      ...formData, 
                      benefits: {...formData.benefits, meal_voucher: e.target.value}
                    })}
                    placeholder="R$ 0,00"
                  />
                </div>

                <div>
                  <Label htmlFor="transport_voucher">Vale Transporte</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.benefits.transport_voucher}
                    onChange={(e) => setFormData({
                      ...formData, 
                      benefits: {...formData.benefits, transport_voucher: e.target.value}
                    })}
                    placeholder="R$ 0,00"
                  />
                </div>

                <div>
                  <Label htmlFor="health_insurance">Plano de Saúde</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.benefits.health_insurance}
                    onChange={(e) => setFormData({
                      ...formData, 
                      benefits: {...formData.benefits, health_insurance: e.target.value}
                    })}
                    placeholder="R$ 0,00"
                  />
                </div>

                <div>
                  <Label htmlFor="other_benefits">Outros Benefícios</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.benefits.other_benefits}
                    onChange={(e) => setFormData({
                      ...formData, 
                      benefits: {...formData.benefits, other_benefits: e.target.value}
                    })}
                    placeholder="R$ 0,00"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Produtividade */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                  <div>
                    <CardTitle>Dados de Produtividade</CardTitle>
                    <CardDescription>
                      {formData.employee_role === "vendas" 
                        ? "Informe o valor total de vendas realizadas"
                        : "Informe os valores de serviços e peças"}
                    </CardDescription>
                  </div>
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={handleManualProductivityLoad}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Buscar Produção
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {(formData.employee_role === "tecnico" || formData.employee_role === "tecnico_lider") && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="services_value">Valor de Serviços *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.productivity_data.services_value}
                      onChange={(e) => setFormData({
                        ...formData, 
                        productivity_data: {...formData.productivity_data, services_value: e.target.value}
                      })}
                      placeholder="R$ 0,00"
                      required={formData.employee_role === "tecnico" || formData.employee_role === "tecnico_lider"}
                    />
                  </div>

                  <div>
                    <Label htmlFor="parts_value">Valor de Peças *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.productivity_data.parts_value}
                      onChange={(e) => setFormData({
                        ...formData, 
                        productivity_data: {...formData.productivity_data, parts_value: e.target.value}
                      })}
                      placeholder="R$ 0,00"
                      required={formData.employee_role === "tecnico" || formData.employee_role === "tecnico_lider"}
                    />
                  </div>
                </div>
              )}

              {formData.employee_role === "vendas" && (
                <div>
                  <Label htmlFor="sales_value">Valor de Vendas *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.productivity_data.sales_value}
                    onChange={(e) => setFormData({
                      ...formData, 
                      productivity_data: {...formData.productivity_data, sales_value: e.target.value}
                    })}
                    placeholder="R$ 0,00"
                    required={formData.employee_role === "vendas"}
                  />
                </div>
              )}
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
                  <Calculator className="w-5 h-5 mr-2" />
                  Calcular Diagnóstico
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Histórico */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <History className="w-6 h-6 text-gray-600" />
              Histórico de Análises
            </h2>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <div>
                 <Label>Filtrar por Colaborador</Label>
                 <Select 
                    value={historyFilters.employee_id} 
                    onValueChange={(val) => setHistoryFilters({...historyFilters, employee_id: val})}
                 >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {employees.map(e => (
                        <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                 </Select>
               </div>
               <div>
                 <Label>Filtrar por Mês</Label>
                 <Input 
                    type="month" 
                    value={historyFilters.month === "all" ? "" : historyFilters.month}
                    onChange={(e) => setHistoryFilters({...historyFilters, month: e.target.value || "all"})}
                 />
               </div>
               <div className="flex items-end">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => {
                      setHistoryFilters({ employee_id: "all", month: "all" });
                    }}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Limpar Filtros
                  </Button>
               </div>
            </div>
          </div>

          <div className="grid gap-4">
            {history
              .filter(h => {
                if (historyFilters.employee_id !== "all" && h.employee_id !== historyFilters.employee_id) return false;
                if (historyFilters.month !== "all" && h.period_month !== historyFilters.month) return false;
                return true;
              })
              .map((diag) => {
                const emp = employees.find(e => e.id === diag.employee_id);
                return (
                  <div key={diag.id} className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-all flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">{emp?.full_name || "Colaborador Removido"}</h3>
                      <p className="text-sm text-gray-500 capitalize">{diag.employee_role.replace("_", " ")} • {diag.period_month}</p>
                    </div>
                    <div className="flex items-center gap-6">
                       <div className="text-right">
                          <p className="text-xs text-gray-500">Custo Total</p>
                          <p className="font-medium text-red-600">{formatCurrency(diag.total_cost)}</p>
                       </div>
                       <div className="text-right">
                          <p className="text-xs text-gray-500">Resultado</p>
                          <p className="font-medium text-green-600">{(diag.cost_percentage * 100).toFixed(1)}%</p>
                       </div>
                       <div className={`px-3 py-1 rounded-full text-xs font-bold
                          ${diag.classification === 'ideal' ? 'bg-green-100 text-green-800' : 
                            diag.classification === 'limite' ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-red-100 text-red-800'}`}>
                          {diag.classification.toUpperCase().replace("_", " ")}
                       </div>
                       <Button size="sm" variant="ghost" onClick={() => navigate(createPageUrl("ResultadoProducao") + `?id=${diag.id}`)}>
                          <Search className="w-4 h-4" />
                       </Button>
                    </div>
                  </div>
                );
              })}
              {history.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                   Nenhum histórico encontrado.
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}