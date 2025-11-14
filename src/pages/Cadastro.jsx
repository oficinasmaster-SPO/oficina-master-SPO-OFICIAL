import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Building2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function Cadastro() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [existingWorkshop, setExistingWorkshop] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    city: "",
    state: "",
    segment: "",
    monthly_revenue: "",
    employees_count: "",
    years_in_business: ""
  });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      const workshops = await base44.entities.Workshop.list();
      const userWorkshop = workshops.find(w => w.owner_id === currentUser.id);
      
      if (userWorkshop) {
        setExistingWorkshop(userWorkshop);
        setFormData({
          name: userWorkshop.name || "",
          city: userWorkshop.city || "",
          state: userWorkshop.state || "",
          segment: userWorkshop.segment || "",
          monthly_revenue: userWorkshop.monthly_revenue || "",
          employees_count: userWorkshop.employees_count || "",
          years_in_business: userWorkshop.years_in_business || ""
        });
      }
    } catch (error) {
      console.error("Erro ao carregar usuário:", error);
      toast.error("Você precisa estar logado para cadastrar uma oficina");
      base44.auth.redirectToLogin(createPageUrl("Cadastro"));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.city || !formData.state || !formData.segment || 
        !formData.monthly_revenue || !formData.employees_count || !formData.years_in_business) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setLoading(true);

    try {
      const workshopData = {
        name: formData.name,
        city: formData.city,
        state: formData.state,
        segment: formData.segment,
        monthly_revenue: formData.monthly_revenue,
        employees_count: formData.employees_count,
        years_in_business: formData.years_in_business,
        owner_id: user.id
      };

      if (existingWorkshop) {
        await base44.entities.Workshop.update(existingWorkshop.id, workshopData);
        toast.success("Dados da oficina atualizados!");
      } else {
        await base44.entities.Workshop.create(workshopData);
        toast.success("Oficina cadastrada com sucesso!");
      }

      setTimeout(() => {
        navigate(createPageUrl("Questionario"));
      }, 500);

    } catch (error) {
      console.error("Erro ao salvar oficina:", error);
      toast.error("Erro ao salvar dados. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            {existingWorkshop ? "Atualize os dados da sua oficina" : "Cadastre sua oficina"}
          </h1>
          <p className="text-lg text-gray-600">
            Preencha as informações básicas para personalizar seu diagnóstico
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle>Informações da Oficina</CardTitle>
                  <CardDescription>Dados essenciais para o diagnóstico</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Nome da Oficina *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Ex: Auto Center Silva"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">Cidade *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    placeholder="Ex: São Paulo"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="state">Estado (UF) *</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({...formData, state: e.target.value.toUpperCase()})}
                    placeholder="SP"
                    maxLength={2}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="segment">Segmento Principal *</Label>
                <Select value={formData.segment} onValueChange={(value) => setFormData({...formData, segment: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o segmento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mecanica_leve">Mecânica Leve</SelectItem>
                    <SelectItem value="mecanica_pesada">Mecânica Pesada / Caminhões</SelectItem>
                    <SelectItem value="motos">Motos</SelectItem>
                    <SelectItem value="centro_automotivo">Centro Automotivo</SelectItem>
                    <SelectItem value="premium">Premium / Alta Performance</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="monthly_revenue">Faturamento Médio Mensal *</Label>
                <Select value={formData.monthly_revenue} onValueChange={(value) => setFormData({...formData, monthly_revenue: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a faixa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ate_50k">Até R$ 50.000</SelectItem>
                    <SelectItem value="50k_100k">De R$ 50.001 a R$ 100.000</SelectItem>
                    <SelectItem value="100k_200k">De R$ 100.001 a R$ 200.000</SelectItem>
                    <SelectItem value="acima_200k">Acima de R$ 200.000</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="employees_count">Quantidade de Colaboradores *</Label>
                <Select value={formData.employees_count} onValueChange={(value) => setFormData({...formData, employees_count: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ate_3">Até 3</SelectItem>
                    <SelectItem value="4_7">De 4 a 7</SelectItem>
                    <SelectItem value="8_15">De 8 a 15</SelectItem>
                    <SelectItem value="acima_15">Acima de 15</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="years_in_business">Tempo de Mercado *</Label>
                <Select value={formData.years_in_business} onValueChange={(value) => setFormData({...formData, years_in_business: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="menos_1_ano">Menos de 1 ano</SelectItem>
                    <SelectItem value="1_3_anos">De 1 a 3 anos</SelectItem>
                    <SelectItem value="3_5_anos">De 3 a 5 anos</SelectItem>
                    <SelectItem value="acima_5_anos">Acima de 5 anos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-center">
            <Button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-lg px-12 py-6 rounded-full shadow-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  {existingWorkshop ? "Atualizar e continuar" : "Continuar para o diagnóstico"}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}