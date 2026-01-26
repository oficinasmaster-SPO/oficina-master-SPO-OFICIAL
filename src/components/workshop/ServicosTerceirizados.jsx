import React, { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const ServicosTerceirizados = forwardRef(({ workshop, onUpdate, onEditingChange }, ref) => {
  const [editing, setEditing] = useState(false);
  
  useEffect(() => {
    if (onEditingChange) {
      onEditingChange(editing);
    }
  }, [editing, onEditingChange]);
  const [formData, setFormData] = useState({
    third_party_services: []
  });

  // Sincroniza formData quando workshop muda
  useEffect(() => {
    if (workshop) {
      setFormData({
        third_party_services: Array.isArray(workshop.third_party_services) ? workshop.third_party_services : []
      });
    }
  }, [workshop]);

  const handleSave = async () => {
    try {
      await onUpdate(formData);
      toast.success("Serviços terceirizados salvos!");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar serviços");
    } finally {
      setEditing(false);
    }
  };

  const addService = () => {
    setFormData({
      ...formData,
      third_party_services: [...formData.third_party_services, { name: "", type: "", value: 0, phone: "", contact_person: "" }]
    });
  };

  const removeService = (index) => {
    const newServices = formData.third_party_services.filter((_, i) => i !== index);
    setFormData({ ...formData, third_party_services: newServices });
  };

  const updateService = (index, field, value) => {
    const newServices = [...formData.third_party_services];
    newServices[index][field] = field === 'value' ? parseFloat(value) || 0 : value;
    setFormData({ ...formData, third_party_services: newServices });
  };

  // Expor função saveCurrentData para componente pai
  useImperativeHandle(ref, () => ({
    saveCurrentData: async () => {
      try {
        await onUpdate(formData);
        return true;
      } catch (error) {
        console.error("Erro ao salvar:", error);
        toast.error("Erro ao salvar serviços");
        return false;
      }
    }
  }));

  if (!workshop) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-gray-500">Carregando dados...</p>
      </div>
    );
  }

  const totalCost = formData.third_party_services.reduce((sum, s) => sum + (s.value || 0), 0);

  const serviceTypes = [
    { value: "marketing", label: "Marketing/Tráfego Pago" },
    { value: "software_gestao", label: "Software Gestão" },
    { value: "consultoria_financeira", label: "Consultoria Financeira" },
    { value: "treinamento_tecnico", label: "Treinamento Técnico" },
    { value: "empresa_contratacao", label: "Empresa Contratação" },
    { value: "contabilidade", label: "Contabilidade" },
    { value: "advocacia", label: "Advocacia" },
    { value: "seguranca_trabalho", label: "Segurança Trabalho" },
    { value: "seguranca_predial", label: "Segurança Predial" },
    { value: "seguro_incendio", label: "Seguro Incêndio" },
    { value: "seguro_percurso", label: "Seguro Percurso" },
    { value: "seguro_batidas", label: "Seguro Batidas" },
    { value: "seguro_roubo_furto", label: "Seguro Roubo/Furto" },
    { value: "seguro_vida", label: "Seguro Vida" },
    { value: "aposentadoria_privada", label: "Aposentadoria Privada" },
    { value: "maquina_cartao", label: "Máquina Cartão" },
    { value: "bancos", label: "Bancos" },
    { value: "outros", label: "Outros" }
  ];

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Serviços Terceirizados</CardTitle>
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
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Gerencie todos os custos com serviços terceirizados da oficina
          </p>
          {editing && (
            <Button size="sm" onClick={addService}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar
            </Button>
          )}
        </div>

        {formData.third_party_services.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Nenhum serviço terceirizado cadastrado</p>
        ) : (
          <div className="space-y-4">
            {formData.third_party_services.map((service, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs text-gray-600">Nome do Serviço</Label>
                    <Input
                      placeholder="Ex: Contabilidade XYZ"
                      value={service.name}
                      onChange={(e) => updateService(index, 'name', e.target.value)}
                      disabled={!editing}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Tipo</Label>
                    <Select
                      value={service.type}
                      onValueChange={(value) => updateService(index, 'type', value)}
                      disabled={!editing}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {serviceTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Valor Mensal (R$)</Label>
                    <Input
                      type="number"
                      placeholder="0,00"
                      value={service.value}
                      onChange={(e) => updateService(index, 'value', e.target.value)}
                      disabled={!editing}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Contato (Nome)</Label>
                    <Input
                      placeholder="Nome do responsável"
                      value={service.contact_person || ''}
                      onChange={(e) => updateService(index, 'contact_person', e.target.value)}
                      disabled={!editing}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Telefone</Label>
                    <Input
                      placeholder="(00) 00000-0000"
                      value={service.phone || ''}
                      onChange={(e) => updateService(index, 'phone', e.target.value)}
                      disabled={!editing}
                    />
                  </div>
                  <div className="flex items-end">
                    {editing && (
                      <Button size="sm" variant="destructive" onClick={() => removeService(index)} className="w-full">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remover
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="pt-4 border-t bg-blue-50 rounded-lg p-4">
          <p className="text-sm font-semibold text-blue-900">Custo Total Mensal</p>
          <p className="text-2xl font-bold text-blue-600">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalCost)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
});

ServicosTerceirizados.displayName = "ServicosTerceirizados";

export default ServicosTerceirizados;