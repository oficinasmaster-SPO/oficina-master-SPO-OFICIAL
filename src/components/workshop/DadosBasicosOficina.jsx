import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Save, Building2, Info } from "lucide-react";

export default function DadosBasicosOficina({ workshop, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    razao_social: "",
    cnpj: "",
    city: "",
    state: "",
    endereco_completo: "",
    segment: "",
    tax_regime: "",
    monthly_revenue: "",
    employees_count: "",
    years_in_business: "",
    observacoes_gerais: "",
    notas_manuais: "",
    capacidade_atendimento_dia: 0,
    tempo_medio_servico: 0,
    horario_funcionamento: { abertura: "", fechamento: "", dias_semana: [] }
  });

  // Sincroniza formData quando workshop muda
  useEffect(() => {
    if (workshop) {
      setFormData({
        name: workshop.name || "",
        razao_social: workshop.razao_social || "",
        cnpj: workshop.cnpj || "",
        city: workshop.city || "",
        state: workshop.state || "",
        endereco_completo: workshop.endereco_completo || "",
        segment: workshop.segment || "",
        tax_regime: workshop.tax_regime || "",
        monthly_revenue: workshop.monthly_revenue || "",
        employees_count: workshop.employees_count || "",
        years_in_business: workshop.years_in_business || "",
        observacoes_gerais: workshop.observacoes_gerais || "",
        notas_manuais: workshop.notas_manuais || "",
        capacidade_atendimento_dia: workshop.capacidade_atendimento_dia || 0,
        tempo_medio_servico: workshop.tempo_medio_servico || 0,
        horario_funcionamento: workshop.horario_funcionamento || { abertura: "", fechamento: "", dias_semana: [] }
      });
    }
  }, [workshop]);

  const handleSave = async () => {
    await onUpdate(formData);
    setEditing(false);
  };

  const diasSemana = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="w-6 h-6 text-blue-600" />
              <div>
                <CardTitle>Dados Básicos da Oficina</CardTitle>
                <CardDescription>Informações cadastrais e identificação</CardDescription>
              </div>
            </div>
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
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Nome Fantasia *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                disabled={!editing}
              />
            </div>
            <div>
              <Label>Razão Social</Label>
              <Input
                value={formData.razao_social}
                onChange={(e) => setFormData({...formData, razao_social: e.target.value})}
                disabled={!editing}
              />
            </div>
            <div>
              <Label>CNPJ</Label>
              <Input
                value={formData.cnpj}
                onChange={(e) => setFormData({...formData, cnpj: e.target.value})}
                disabled={!editing}
                placeholder="00.000.000/0000-00"
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
              <Label>Estado (UF) *</Label>
              <Input
                value={formData.state}
                onChange={(e) => setFormData({...formData, state: e.target.value.toUpperCase()})}
                disabled={!editing}
                maxLength={2}
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

          <div>
            <Label>Endereço Completo</Label>
            <Textarea
              value={formData.endereco_completo}
              onChange={(e) => setFormData({...formData, endereco_completo: e.target.value})}
              disabled={!editing}
              placeholder="Rua, número, bairro, CEP..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Info className="w-6 h-6 text-purple-600" />
            <div>
              <CardTitle>Capacidade Operacional</CardTitle>
              <CardDescription>Capacidade de atendimento e horários</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Capacidade de Atendimento/Dia</Label>
              <Input
                type="number"
                min="0"
                value={formData.capacidade_atendimento_dia}
                onChange={(e) => setFormData({...formData, capacidade_atendimento_dia: parseInt(e.target.value) || 0})}
                disabled={!editing}
                placeholder="Ex: 10"
              />
            </div>
            <div>
              <Label>Tempo Médio de Serviço (horas)</Label>
              <Input
                type="number"
                step="0.5"
                min="0"
                value={formData.tempo_medio_servico}
                onChange={(e) => setFormData({...formData, tempo_medio_servico: parseFloat(e.target.value) || 0})}
                disabled={!editing}
                placeholder="Ex: 2.5"
              />
            </div>
            <div>
              <Label>Horário de Abertura</Label>
              <Input
                type="time"
                value={formData.horario_funcionamento.abertura}
                onChange={(e) => setFormData({
                  ...formData,
                  horario_funcionamento: { ...formData.horario_funcionamento, abertura: e.target.value }
                })}
                disabled={!editing}
              />
            </div>
            <div>
              <Label>Horário de Fechamento</Label>
              <Input
                type="time"
                value={formData.horario_funcionamento.fechamento}
                onChange={(e) => setFormData({
                  ...formData,
                  horario_funcionamento: { ...formData.horario_funcionamento, fechamento: e.target.value }
                })}
                disabled={!editing}
              />
            </div>
          </div>
          <div>
            <Label className="mb-3 block">Dias de Funcionamento</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {diasSemana.map((dia) => (
                <label key={dia} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(formData.horario_funcionamento.dias_semana || []).includes(dia)}
                    onChange={(e) => {
                      const dias = formData.horario_funcionamento.dias_semana || [];
                      const newDias = e.target.checked
                        ? [...dias, dia]
                        : dias.filter(d => d !== dia);
                      setFormData({
                        ...formData,
                        horario_funcionamento: { ...formData.horario_funcionamento, dias_semana: newDias }
                      });
                    }}
                    disabled={!editing}
                    className="rounded"
                  />
                  <span className="text-sm">{dia}</span>
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200">
        <CardHeader>
          <CardTitle className="text-amber-900">Observações e Anotações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Observações Gerais</Label>
            <Textarea
              value={formData.observacoes_gerais}
              onChange={(e) => setFormData({...formData, observacoes_gerais: e.target.value})}
              disabled={!editing}
              placeholder="Observações sobre a oficina..."
              rows={3}
            />
          </div>
          <div>
            <Label>Notas Internas do Proprietário</Label>
            <Textarea
              value={formData.notas_manuais}
              onChange={(e) => setFormData({...formData, notas_manuais: e.target.value})}
              disabled={!editing}
              placeholder="Suas anotações pessoais..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {workshop.sugestoes_ia && workshop.sugestoes_ia.length > 0 && (
        <Card className="shadow-lg bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200">
          <CardHeader>
            <CardTitle className="text-purple-900">✨ Recomendações Inteligentes</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {workshop.sugestoes_ia.map((sugestao, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-purple-600 font-bold mt-0.5">•</span>
                  <span className="text-sm text-gray-700">{sugestao}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}