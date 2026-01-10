import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Copy, Save } from "lucide-react";
import { toast } from "sonner";

export default function ContractForm({ contract, user, onSuccess }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    workshop_id: "",
    plan_type: "BRONZE",
    contract_value: 0,
    monthly_value: 0,
    contract_duration_months: 12,
    payment_method: "asas",
    contract_template: "",
    custom_clauses: [],
    internal_notes: ""
  });

  const { data: workshops = [] } = useQuery({
    queryKey: ['workshops-list'],
    queryFn: async () => {
      const result = await base44.entities.Workshop.list();
      return Array.isArray(result) ? result : [];
    }
  });

  useEffect(() => {
    if (contract) {
      setFormData({
        workshop_id: contract.workshop_id || "",
        plan_type: contract.plan_type || "BRONZE",
        contract_value: contract.contract_value || 0,
        monthly_value: contract.monthly_value || 0,
        contract_duration_months: contract.contract_duration_months || 12,
        payment_method: contract.payment_method || "asas",
        contract_template: contract.contract_template || "",
        custom_clauses: contract.custom_clauses || [],
        internal_notes: contract.internal_notes || ""
      });
    }
  }, [contract]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const workshop = workshops.find(w => w.id === data.workshop_id);
      
      const contractNumber = `CT${String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0')}`;
      const contractLink = `${window.location.origin}/contrato/${contractNumber}`;

      return await base44.entities.Contract.create({
        ...data,
        workshop_name: workshop?.name || "",
        contract_number: contractNumber,
        consultor_id: user.id,
        consultor_nome: user.full_name,
        contract_link: contractLink,
        status: "rascunho",
        completion_percentage: 0,
        timeline: [{
          date: new Date().toISOString(),
          action: "criado",
          description: "Contrato criado",
          user: user.full_name
        }]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['contracts']);
      toast.success("Contrato criado com sucesso!");
      onSuccess();
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.Contract.update(contract.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['contracts']);
      toast.success("Contrato atualizado!");
      onSuccess();
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (contract) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleSendContract = async () => {
    if (contract) {
      await updateMutation.mutateAsync({
        ...formData,
        status: "enviado",
        sent_at: new Date().toISOString(),
        completion_percentage: 20
      });
      toast.success("Contrato enviado!");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{contract ? 'Editar Contrato' : 'Novo Contrato'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Oficina Cliente *</Label>
              <Select
                value={formData.workshop_id}
                onValueChange={(value) => setFormData({ ...formData, workshop_id: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar oficina..." />
                </SelectTrigger>
                <SelectContent>
                  {workshops.map((workshop) => (
                    <SelectItem key={workshop.id} value={workshop.id}>
                      {workshop.name} - {workshop.city}/{workshop.state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Plano *</Label>
              <Select
                value={formData.plan_type}
                onValueChange={(value) => setFormData({ ...formData, plan_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="START">START</SelectItem>
                  <SelectItem value="BRONZE">BRONZE</SelectItem>
                  <SelectItem value="PRATA">PRATA</SelectItem>
                  <SelectItem value="GOLD">GOLD</SelectItem>
                  <SelectItem value="IOM">IOM</SelectItem>
                  <SelectItem value="MILLIONS">MILLIONS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Valor do Contrato *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.contract_value}
                onChange={(e) => setFormData({ ...formData, contract_value: parseFloat(e.target.value) })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Valor Mensal</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.monthly_value}
                onChange={(e) => setFormData({ ...formData, monthly_value: parseFloat(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label>Duração (meses)</Label>
              <Input
                type="number"
                value={formData.contract_duration_months}
                onChange={(e) => setFormData({ ...formData, contract_duration_months: parseInt(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label>Método de Pagamento</Label>
              <Select
                value={formData.payment_method}
                onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asas">Asas</SelectItem>
                  <SelectItem value="prefi">Prefi</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="cartao">Cartão</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Template do Contrato</Label>
            <Textarea
              value={formData.contract_template}
              onChange={(e) => setFormData({ ...formData, contract_template: e.target.value })}
              placeholder="Cole ou escreva o template do contrato aqui..."
              className="min-h-[200px] font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label>Observações Internas</Label>
            <Textarea
              value={formData.internal_notes}
              onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
              placeholder="Anotações internas sobre este contrato..."
              className="min-h-[100px]"
            />
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {contract ? 'Atualizar' : 'Criar'} Contrato
            </Button>

            {contract && contract.status === 'rascunho' && (
              <Button
                type="button"
                variant="outline"
                onClick={handleSendContract}
                className="border-blue-600 text-blue-600"
              >
                <Send className="w-4 h-4 mr-2" />
                Enviar para Cliente
              </Button>
            )}

            {contract && contract.contract_link && (
              <Button
                type="button"
                variant="outline"
                onClick={() => copyLink(contract)}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copiar Link
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}