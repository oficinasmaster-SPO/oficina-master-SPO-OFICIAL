import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save } from "lucide-react";

export default function DadosBasicosOficina({ workshop, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: workshop.name || "",
    city: workshop.city || "",
    state: workshop.state || "",
    segment: workshop.segment || "",
    tax_regime: workshop.tax_regime || "",
    monthly_revenue: workshop.monthly_revenue || "",
    employees_count: workshop.employees_count || "",
    years_in_business: workshop.years_in_business || ""
  });

  const handleSave = async () => {
    await onUpdate(formData);
    setEditing(false);
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Dados Básicos da Oficina</CardTitle>
          {!editing ? (
            <Button onClick={() => setEditing(true)}>Editar</Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
              <Button onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Salvar
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Nome da Oficina *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              disabled={!editing}
            />
          </div>
          <div>
            <Label>Cidade *</Label>
            <Input
              value={formData.city}
              onChange={(e) => setFormData({...formData, city: e.target.value})}
              disabled={!editing}
            />
          </div>
          <div>
            <Label>Estado *</Label>
            <Input
              value={formData.state}
              onChange={(e) => setFormData({...formData, state: e.target.value})}
              disabled={!editing}
            />
          </div>
          <div>
            <Label>Segmento</Label>
            <Select value={formData.segment} onValueChange={(value) => setFormData({...formData, segment: value})} disabled={!editing}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mecanica_leve">Mecânica Leve</SelectItem>
                <SelectItem value="mecanica_pesada">Mecânica Pesada</SelectItem>
                <SelectItem value="motos">Motos</SelectItem>
                <SelectItem value="centro_automotivo">Centro Automotivo</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Enquadramento Tributário</Label>
            <Select value={formData.tax_regime} onValueChange={(value) => setFormData({...formData, tax_regime: value})} disabled={!editing}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mei">MEI</SelectItem>
                <SelectItem value="simples_nacional">Simples Nacional</SelectItem>
                <SelectItem value="lucro_presumido">Lucro Presumido</SelectItem>
                <SelectItem value="lucro_real">Lucro Real</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Faturamento Mensal</Label>
            <Select value={formData.monthly_revenue} onValueChange={(value) => setFormData({...formData, monthly_revenue: value})} disabled={!editing}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ate_50k">Até R$ 50 mil</SelectItem>
                <SelectItem value="50k_100k">R$ 50-100 mil</SelectItem>
                <SelectItem value="100k_200k">R$ 100-200 mil</SelectItem>
                <SelectItem value="acima_200k">Acima de R$ 200 mil</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Quantidade de Funcionários</Label>
            <Select value={formData.employees_count} onValueChange={(value) => setFormData({...formData, employees_count: value})} disabled={!editing}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ate_3">Até 3</SelectItem>
                <SelectItem value="4_7">4 a 7</SelectItem>
                <SelectItem value="8_15">8 a 15</SelectItem>
                <SelectItem value="acima_15">Acima de 15</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tempo de Atuação</Label>
            <Select value={formData.years_in_business} onValueChange={(value) => setFormData({...formData, years_in_business: value})} disabled={!editing}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="menos_1_ano">Menos de 1 ano</SelectItem>
                <SelectItem value="1_3_anos">1 a 3 anos</SelectItem>
                <SelectItem value="3_5_anos">3 a 5 anos</SelectItem>
                <SelectItem value="acima_5_anos">Acima de 5 anos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}