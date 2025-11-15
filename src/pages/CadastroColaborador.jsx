import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, UserPlus } from "lucide-react";
import { toast } from "sonner";

export default function CadastroColaborador() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  
  const [formData, setFormData] = useState({
    workshop_id: "",
    full_name: "",
    position: "",
    email: "",
    phone: "",
    hire_date: "",
    salary: 0,
    commission: 0,
    bonus: 0,
    benefits: {
      meal_voucher: 0,
      transport_voucher: 0,
      health_insurance: 0
    },
    production_parts: 0,
    production_services: 0,
    status: "ativo"
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
      
      if (userWorkshop) {
        setWorkshop(userWorkshop);
        setFormData(prev => ({ ...prev, workshop_id: userWorkshop.id }));
      }
    } catch (error) {
      toast.error("Você precisa estar logado");
      base44.auth.redirectToLogin(createPageUrl("CadastroColaborador"));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.full_name || !formData.position) {
      toast.error("Preencha nome e cargo");
      return;
    }

    setSubmitting(true);

    try {
      const totalCost = formData.salary + formData.commission + formData.bonus + 
        formData.benefits.meal_voucher + formData.benefits.transport_voucher + formData.benefits.health_insurance;
      
      const totalProduction = formData.production_parts + formData.production_services;
      const productionPercentage = totalCost > 0 ? (totalProduction / totalCost) * 100 : 0;

      await base44.entities.Employee.create({
        ...formData,
        production_percentage: productionPercentage
      });

      toast.success("Colaborador cadastrado!");
      navigate(createPageUrl("Colaboradores"));
    } catch (error) {
      console.error(error);
      toast.error("Erro ao cadastrar");
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <UserPlus className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Cadastrar Colaborador
          </h1>
          <p className="text-gray-600">
            Preencha os dados do novo colaborador
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dados Pessoais */}
          <Card>
            <CardHeader>
              <CardTitle>Dados Pessoais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nome Completo *</Label>
                  <Input
                    value={formData.full_name}
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label>Cargo/Função *</Label>
                  <Input
                    value={formData.position}
                    onChange={(e) => setFormData({...formData, position: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Data de Contratação</Label>
                  <Input
                    type="date"
                    value={formData.hire_date}
                    onChange={(e) => setFormData({...formData, hire_date: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="inativo">Inativo</SelectItem>
                      <SelectItem value="ferias">Férias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Remuneração */}
          <Card>
            <CardHeader>
              <CardTitle>Remuneração</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Salário Fixo (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.salary}
                    onChange={(e) => setFormData({...formData, salary: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <Label>Comissão Mensal (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.commission}
                    onChange={(e) => setFormData({...formData, commission: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <Label>Bonificação/Prêmio (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.bonus}
                    onChange={(e) => setFormData({...formData, bonus: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Vale Alimentação (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.benefits.meal_voucher}
                    onChange={(e) => setFormData({
                      ...formData, 
                      benefits: {...formData.benefits, meal_voucher: parseFloat(e.target.value) || 0}
                    })}
                  />
                </div>
                <div>
                  <Label>Vale Transporte (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.benefits.transport_voucher}
                    onChange={(e) => setFormData({
                      ...formData, 
                      benefits: {...formData.benefits, transport_voucher: parseFloat(e.target.value) || 0}
                    })}
                  />
                </div>
                <div>
                  <Label>Plano de Saúde (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.benefits.health_insurance}
                    onChange={(e) => setFormData({
                      ...formData, 
                      benefits: {...formData.benefits, health_insurance: parseFloat(e.target.value) || 0}
                    })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Produção */}
          <Card>
            <CardHeader>
              <CardTitle>Produção</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Produção Peças (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.production_parts}
                    onChange={(e) => setFormData({...formData, production_parts: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <Label>Produção Serviços (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.production_services}
                    onChange={(e) => setFormData({...formData, production_services: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-center gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(createPageUrl("Colaboradores"))}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 px-8"
            >
              {submitting ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Salvando...</>
              ) : (
                <><Save className="w-5 h-5 mr-2" /> Cadastrar Colaborador</>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}