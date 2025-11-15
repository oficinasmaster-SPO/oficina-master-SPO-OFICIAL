import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Calculator, DollarSign, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export default function DiagnosticoProducao() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [workshop, setWorkshop] = useState(null);
  
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
    } catch (error) {
      toast.error("Você precisa estar logado");
      base44.auth.redirectToLogin(createPageUrl("DiagnosticoProducao"));
    } finally {
      setLoading(false);
    }
  };

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

    if (formData.employee_role === "tecnico" || formData.employee_role === "tecnico_lider") {
      totalProductivity = 
        parseFloat(formData.productivity_data.services_value || 0) +
        parseFloat(formData.productivity_data.parts_value || 0);
      threshold = 0.09; // 9%
    } else if (formData.employee_role === "vendas") {
      totalProductivity = parseFloat(formData.productivity_data.sales_value || 0);
      threshold = 0.04; // 4%
    }

    const costPercentage = totalProductivity > 0 ? (totalCost / totalProductivity) : 0;

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
    }

    return {
      totalCost,
      totalProductivity,
      costPercentage,
      classification,
      recommendation
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
        total_cost: calculations.totalCost,
        total_productivity: calculations.totalProductivity,
        cost_percentage: calculations.costPercentage,
        classification: calculations.classification,
        recommendation: calculations.recommendation,
        completed: true
      });

      toast.success("Diagnóstico de produtividade concluído!");
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
              <CardTitle>Informações do Colaborador</CardTitle>
              <CardDescription>Selecione o colaborador e o período de análise</CardDescription>
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
      </div>
    </div>
  );
}