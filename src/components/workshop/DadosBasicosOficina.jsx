import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Save, Building2, Info, Store } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

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
    is_franchisee: false,
    franchisor_name: "",
    operates_franchise: false,
    units_count_category: "",
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
        is_franchisee: workshop.is_franchisee || false,
        franchisor_name: workshop.franchisor_name || "",
        operates_franchise: workshop.operates_franchise || false,
        units_count_category: workshop.units_count_category || "",
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

  if (!workshop) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-gray-500">Carregando dados da oficina...</p>
      </div>
    );
  }

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
                <SelectItem value="ate_20k">Até R$ 20 mil</SelectItem>
                <SelectItem value="20k_40k">R$ 20-40 mil</SelectItem>
                <SelectItem value="40k_60k">R$ 40-60 mil</SelectItem>
                <SelectItem value="60k_80k">R$ 60-80 mil</SelectItem>
                <SelectItem value="80k_100k">R$ 80-100 mil</SelectItem>
                <SelectItem value="100k_130k">R$ 100-130 mil</SelectItem>
                <SelectItem value="130k_160k">R$ 130-160 mil</SelectItem>
                <SelectItem value="160k_190k">R$ 160-190 mil</SelectItem>
                <SelectItem value="190k_220k">R$ 190-220 mil</SelectItem>
                <SelectItem value="220k_270k">R$ 220-270 mil</SelectItem>
                <SelectItem value="270k_320k">R$ 270-320 mil</SelectItem>
                <SelectItem value="320k_370k">R$ 320-370 mil</SelectItem>
                <SelectItem value="370k_420k">R$ 370-420 mil</SelectItem>
                <SelectItem value="420k_470k">R$ 420-470 mil</SelectItem>
                <SelectItem value="470k_520k">R$ 470-520 mil</SelectItem>
                <SelectItem value="520k_620k">R$ 520-620 mil</SelectItem>
                <SelectItem value="620k_720k">R$ 620-720 mil</SelectItem>
                <SelectItem value="720k_820k">R$ 720-820 mil</SelectItem>
                <SelectItem value="820k_920k">R$ 820-920 mil</SelectItem>
                <SelectItem value="920k_1020k">R$ 920-1.020 mil</SelectItem>
                <SelectItem value="acima_1m">Acima de R$ 1 milhão</SelectItem>
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
                <SelectItem value="1_5">1 a 5</SelectItem>
                <SelectItem value="6_10">6 a 10</SelectItem>
                <SelectItem value="11_20">11 a 20</SelectItem>
                <SelectItem value="21_50">21 a 50</SelectItem>
                <SelectItem value="51_100">51 a 100</SelectItem>
                <SelectItem value="acima_100">Acima de 100</SelectItem>
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
                <SelectItem value="5_10_anos">5 a 10 anos</SelectItem>
                <SelectItem value="10_20_anos">10 a 20 anos</SelectItem>
                <SelectItem value="acima_20_anos">Acima de 20 anos</SelectItem>
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

      <Card className="shadow-lg border-2 border-green-200">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Store className="w-6 h-6 text-green-600" />
            <div>
              <CardTitle>Estrutura e Franquias</CardTitle>
              <CardDescription>Informações sobre unidades e franquias</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Quantas unidades a empresa possui?</Label>
              <Select value={formData.units_count_category} onValueChange={(value) => setFormData({...formData, units_count_category: value})} disabled={!editing}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unidade_solo">1 unidade → Unidade Solo</SelectItem>
                  <SelectItem value="multiunidades">2 a 3 unidades → Multiunidades</SelectItem>
                  <SelectItem value="holding_operacional">4 a 6 unidades → Holding Operacional</SelectItem>
                  <SelectItem value="rede_estruturada">7 ou mais unidades → Rede Estruturada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-t pt-4 space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_franchisee"
                checked={formData.is_franchisee}
                onCheckedChange={(checked) => setFormData({...formData, is_franchisee: checked})}
                disabled={!editing}
              />
              <label htmlFor="is_franchisee" className="text-sm font-medium cursor-pointer">
                Sou Franqueado
              </label>
            </div>

            {formData.is_franchisee && (
              <div>
                <Label>Nome da Franqueadora</Label>
                <Input
                  value={formData.franchisor_name}
                  onChange={(e) => setFormData({...formData, franchisor_name: e.target.value})}
                  disabled={!editing}
                  placeholder="Digite o nome da franqueadora..."
                />
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="operates_franchise"
                checked={formData.operates_franchise}
                onCheckedChange={(checked) => setFormData({...formData, operates_franchise: checked})}
                disabled={!editing}
              />
              <label htmlFor="operates_franchise" className="text-sm font-medium cursor-pointer">
                Atua com franquias? (Sou Franqueadora)
              </label>
            </div>
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