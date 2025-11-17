import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Save, Building2, FileText, Package, Users } from "lucide-react";
import { toast } from "sonner";

export default function CadastroOficinaCompleto() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workshop, setWorkshop] = useState(null);
  const [formData, setFormData] = useState({
    // Dados Básicos
    razao_social: "",
    nome_fantasia: "",
    cnpj: "",
    endereco_completo: "",
    responsaveis: [],
    tipo_empresa: "",
    tipo_oficina: "",
    quantidade_funcionarios: "",
    tamanho_estrutura: "",
    capacidade_atendimento_dia: 0,
    tempo_medio_servico: 0,
    horario_funcionamento: {
      abertura: "",
      fechamento: "",
      dias_semana: []
    },
    
    // Já existentes
    name: "",
    city: "",
    state: "",
    segment: "",
    
    // Observações
    observacoes_gerais: "",
    notas_autocenter: false,
    notas_manuais: ""
  });

  useEffect(() => {
    loadWorkshop();
  }, []);

  const loadWorkshop = async () => {
    try {
      const user = await base44.auth.me();
      const workshops = await base44.entities.Workshop.list();
      const userWorkshop = workshops.find(w => w.owner_id === user.id);

      if (userWorkshop) {
        setWorkshop(userWorkshop);
        setFormData({
          ...formData,
          ...userWorkshop
        });
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar oficina");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const user = await base44.auth.me();
      
      if (workshop) {
        await base44.entities.Workshop.update(workshop.id, formData);
        toast.success("Oficina atualizada com sucesso!");
      } else {
        await base44.entities.Workshop.create({
          ...formData,
          owner_id: user.id
        });
        toast.success("Oficina cadastrada com sucesso!");
      }
      
      navigate(createPageUrl("Home"));
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar oficina");
    } finally {
      setSaving(false);
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
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {workshop ? "Editar Cadastro da Oficina" : "Cadastro Completo da Oficina"}
          </h1>
          <p className="text-gray-600">Preencha todos os dados da sua oficina para uma análise completa</p>
        </div>

        <Tabs defaultValue="basicos" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white shadow-md">
            <TabsTrigger value="basicos">
              <Building2 className="w-4 h-4 mr-2" />
              Dados Básicos
            </TabsTrigger>
            <TabsTrigger value="operacional">
              <Package className="w-4 h-4 mr-2" />
              Operacional
            </TabsTrigger>
            <TabsTrigger value="estrutura">
              <Users className="w-4 h-4 mr-2" />
              Estrutura
            </TabsTrigger>
            <TabsTrigger value="observacoes">
              <FileText className="w-4 h-4 mr-2" />
              Observações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basicos">
            <Card>
              <CardHeader>
                <CardTitle>Informações Básicas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Razão Social *</Label>
                    <Input
                      value={formData.razao_social}
                      onChange={(e) => setFormData({...formData, razao_social: e.target.value})}
                      placeholder="Razão Social da Empresa"
                    />
                  </div>
                  <div>
                    <Label>Nome Fantasia *</Label>
                    <Input
                      value={formData.nome_fantasia || formData.name}
                      onChange={(e) => setFormData({...formData, nome_fantasia: e.target.value, name: e.target.value})}
                      placeholder="Nome Fantasia"
                    />
                  </div>
                  <div>
                    <Label>CNPJ</Label>
                    <Input
                      value={formData.cnpj}
                      onChange={(e) => setFormData({...formData, cnpj: e.target.value})}
                      placeholder="00.000.000/0000-00"
                    />
                  </div>
                  <div>
                    <Label>Tipo de Empresa</Label>
                    <Input
                      value={formData.tipo_empresa}
                      onChange={(e) => setFormData({...formData, tipo_empresa: e.target.value})}
                      placeholder="MEI, Simples, etc."
                    />
                  </div>
                  <div>
                    <Label>Cidade *</Label>
                    <Input
                      value={formData.city}
                      onChange={(e) => setFormData({...formData, city: e.target.value})}
                      placeholder="Cidade"
                    />
                  </div>
                  <div>
                    <Label>Estado *</Label>
                    <Input
                      value={formData.state}
                      onChange={(e) => setFormData({...formData, state: e.target.value})}
                      placeholder="UF"
                      maxLength={2}
                    />
                  </div>
                </div>
                <div>
                  <Label>Endereço Completo</Label>
                  <Textarea
                    value={formData.endereco_completo}
                    onChange={(e) => setFormData({...formData, endereco_completo: e.target.value})}
                    placeholder="Rua, Número, Bairro, CEP"
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="operacional">
            <Card>
              <CardHeader>
                <CardTitle>Dados Operacionais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Tipo de Oficina</Label>
                    <Input
                      value={formData.tipo_oficina}
                      onChange={(e) => setFormData({...formData, tipo_oficina: e.target.value})}
                      placeholder="Mecânica, Elétrica, Geral..."
                    />
                  </div>
                  <div>
                    <Label>Segmento Principal *</Label>
                    <Input
                      value={formData.segment}
                      onChange={(e) => setFormData({...formData, segment: e.target.value})}
                      placeholder="Mecânica leve, pesada, etc."
                    />
                  </div>
                  <div>
                    <Label>Capacidade de Atendimento/Dia</Label>
                    <Input
                      type="number"
                      value={formData.capacidade_atendimento_dia}
                      onChange={(e) => setFormData({...formData, capacidade_atendimento_dia: parseInt(e.target.value) || 0})}
                      placeholder="Ex: 10 veículos/dia"
                    />
                  </div>
                  <div>
                    <Label>Tempo Médio de Serviço (horas)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={formData.tempo_medio_servico}
                      onChange={(e) => setFormData({...formData, tempo_medio_servico: parseFloat(e.target.value) || 0})}
                      placeholder="Ex: 2.5"
                    />
                  </div>
                  <div>
                    <Label>Horário de Abertura</Label>
                    <Input
                      type="time"
                      value={formData.horario_funcionamento?.abertura || ""}
                      onChange={(e) => setFormData({
                        ...formData, 
                        horario_funcionamento: {...formData.horario_funcionamento, abertura: e.target.value}
                      })}
                    />
                  </div>
                  <div>
                    <Label>Horário de Fechamento</Label>
                    <Input
                      type="time"
                      value={formData.horario_funcionamento?.fechamento || ""}
                      onChange={(e) => setFormData({
                        ...formData, 
                        horario_funcionamento: {...formData.horario_funcionamento, fechamento: e.target.value}
                      })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="estrutura">
            <Card>
              <CardHeader>
                <CardTitle>Estrutura e Equipe</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Quantidade de Funcionários</Label>
                    <Input
                      value={formData.quantidade_funcionarios}
                      onChange={(e) => setFormData({...formData, quantidade_funcionarios: e.target.value})}
                      placeholder="Ex: 5-10"
                    />
                  </div>
                  <div>
                    <Label>Tamanho da Estrutura</Label>
                    <Input
                      value={formData.tamanho_estrutura}
                      onChange={(e) => setFormData({...formData, tamanho_estrutura: e.target.value})}
                      placeholder="Ex: 200m²"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="observacoes">
            <Card>
              <CardHeader>
                <CardTitle>Observações e Notas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Observações Gerais</Label>
                  <Textarea
                    value={formData.observacoes_gerais}
                    onChange={(e) => setFormData({...formData, observacoes_gerais: e.target.value})}
                    placeholder="Anotações gerais sobre a oficina..."
                    rows={4}
                  />
                </div>
                <div>
                  <Label>Notas Manuais</Label>
                  <Textarea
                    value={formData.notas_manuais}
                    onChange={(e) => setFormData({...formData, notas_manuais: e.target.value})}
                    placeholder="Suas anotações e observações..."
                    rows={4}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="autocenter"
                    checked={formData.notas_autocenter}
                    onChange={(e) => setFormData({...formData, notas_autocenter: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="autocenter" className="cursor-pointer">
                    Considerar como AutoCenter
                  </Label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-6 flex justify-end gap-4">
          <Button variant="outline" onClick={() => navigate(createPageUrl("Home"))}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar Cadastro
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}