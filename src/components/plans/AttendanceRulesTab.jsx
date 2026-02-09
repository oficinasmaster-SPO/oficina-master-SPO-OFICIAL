import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Clock, Calendar, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AttendanceRulesTab({ planId, planName }) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    attendance_type_id: "",
    total_allowed: 1,
    scheduling_type: "frequency",
    frequency_days: 30,
    start_from_contract_date: true,
    allow_anticipation: true
  });

  // Carregar tipos de atendimento disponíveis
  const { data: attendanceTypes = [], isLoading: loadingTypes } = useQuery({
    queryKey: ['attendance-types'],
    queryFn: () => base44.entities.AttendanceType.filter({ is_active: true })
  });

  // Carregar regras do plano atual
  const { data: planRules = [], isLoading: loadingRules } = useQuery({
    queryKey: ['plan-attendance-rules', planId],
    queryFn: () => base44.entities.PlanAttendanceRule.filter({ plan_id: planId, is_active: true })
  });

  // Mutation para criar regra
  const createRuleMutation = useMutation({
    mutationFn: (data) => base44.entities.PlanAttendanceRule.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['plan-attendance-rules', planId]);
      toast.success("Regra adicionada com sucesso!");
      resetForm();
    },
    onError: (error) => {
      toast.error("Erro ao criar regra: " + error.message);
    }
  });

  // Mutation para atualizar regra
  const updateRuleMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PlanAttendanceRule.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['plan-attendance-rules', planId]);
      toast.success("Regra atualizada!");
      resetForm();
    },
    onError: (error) => {
      toast.error("Erro ao atualizar: " + error.message);
    }
  });

  // Mutation para remover regra (soft delete)
  const deleteRuleMutation = useMutation({
    mutationFn: (id) => base44.entities.PlanAttendanceRule.update(id, { is_active: false }),
    onSuccess: () => {
      queryClient.invalidateQueries(['plan-attendance-rules', planId]);
      toast.success("Regra removida!");
    }
  });

  const resetForm = () => {
    setFormData({
      attendance_type_id: "",
      total_allowed: 1,
      scheduling_type: "frequency",
      frequency_days: 30,
      start_from_contract_date: true,
      allow_anticipation: true
    });
    setEditingRule(null);
    setDialogOpen(false);
  };

  const handleEdit = (rule) => {
    setEditingRule(rule);
    setFormData({
      attendance_type_id: rule.attendance_type_id,
      total_allowed: rule.total_allowed,
      scheduling_type: rule.scheduling_type || "frequency",
      frequency_days: rule.frequency_days || 30,
      start_from_contract_date: rule.start_from_contract_date !== undefined ? rule.start_from_contract_date : true,
      allow_anticipation: rule.allow_anticipation
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validações
    if (!formData.attendance_type_id) {
      toast.error("Selecione um tipo de atendimento");
      return;
    }

    if (formData.total_allowed <= 0) {
      toast.error("Quantidade deve ser maior que zero");
      return;
    }

    if (formData.frequency_days <= 0) {
      toast.error("Frequência deve ser maior que zero");
      return;
    }

    // Verificar duplicação (só se não estiver editando)
    if (!editingRule && planRules.find(r => r.attendance_type_id === formData.attendance_type_id)) {
      toast.error("Este tipo já está configurado neste plano");
      return;
    }

    const attendanceType = attendanceTypes.find(t => t.id === formData.attendance_type_id);

    const ruleData = {
      plan_id: planId,
      attendance_type_id: formData.attendance_type_id,
      attendance_type_name: attendanceType?.name || "",
      total_allowed: formData.total_allowed,
      scheduling_type: formData.scheduling_type,
      frequency_days: formData.scheduling_type === "frequency" ? formData.frequency_days : null,
      start_from_contract_date: formData.start_from_contract_date,
      allow_anticipation: formData.allow_anticipation,
      is_active: true
    };

    if (editingRule) {
      updateRuleMutation.mutate({ id: editingRule.id, data: ruleData });
    } else {
      createRuleMutation.mutate(ruleData);
    }
  };

  const frequencyPresets = [
    { value: 7, label: "Semanal (7 dias)" },
    { value: 15, label: "Quinzenal (15 dias)" },
    { value: 30, label: "Mensal (30 dias)" },
    { value: 60, label: "Bimestral (60 dias)" },
    { value: 90, label: "Trimestral (90 dias)" }
  ];

  if (loadingTypes || loadingRules) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Atendimentos do Plano {planName}</h3>
          <p className="text-sm text-gray-600 mt-1">
            Configure quais tipos de atendimento estão inclusos e suas frequências
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => {
              resetForm();
              setDialogOpen(true);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Tipo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingRule ? "Editar Regra de Atendimento" : "Adicionar Tipo de Atendimento"}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <Label>Tipo de Atendimento *</Label>
                <Select
                  value={formData.attendance_type_id}
                  onValueChange={(value) => setFormData({ ...formData, attendance_type_id: value })}
                  disabled={!!editingRule}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {attendanceTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name} ({type.default_duration_minutes}min)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Tipo de Agendamento *</Label>
                <Select
                  value={formData.scheduling_type}
                  onValueChange={(value) => setFormData({ ...formData, scheduling_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="frequency">Por Frequência (ex: mensal, quinzenal)</SelectItem>
                    <SelectItem value="event_based">Baseado em Calendário de Eventos</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.scheduling_type === "frequency" 
                    ? "Atendimentos distribuídos por frequência a partir do contrato"
                    : "Atendimentos puxados automaticamente do Calendário Anual de Eventos"}
                </p>
              </div>

              <div>
                <Label>Quantidade Permitida *</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.total_allowed}
                  onChange={(e) => setFormData({ ...formData, total_allowed: parseInt(e.target.value) })}
                  placeholder="Ex: 12"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.scheduling_type === "event_based"
                    ? "Quantos eventos futuros serão vinculados automaticamente"
                    : "Quantos atendimentos deste tipo o cliente terá acesso"}
                </p>
              </div>

              {formData.scheduling_type === "frequency" && (
                <div>
                  <Label>Frequência (Cadência) *</Label>
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      {frequencyPresets.map((preset) => (
                        <Button
                          key={preset.value}
                          type="button"
                          variant={formData.frequency_days === preset.value ? "default" : "outline"}
                          size="sm"
                          onClick={() => setFormData({ ...formData, frequency_days: preset.value })}
                          className={formData.frequency_days === preset.value ? "bg-blue-600" : ""}
                        >
                          {preset.label.split(' ')[0]}
                        </Button>
                      ))}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        value={formData.frequency_days}
                        onChange={(e) => setFormData({ ...formData, frequency_days: parseInt(e.target.value) })}
                        placeholder="Dias"
                        className="w-24"
                      />
                      <span className="text-sm text-gray-600">dias entre atendimentos</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 border rounded-lg p-3 mt-3">
                    <Checkbox
                      checked={formData.start_from_contract_date}
                      onCheckedChange={(checked) => setFormData({ ...formData, start_from_contract_date: checked })}
                    />
                    <div>
                      <label className="text-sm font-medium cursor-pointer">
                        Iniciar a partir da data de ativação do contrato
                      </label>
                      <p className="text-xs text-gray-500">
                        Se marcado, o 1º atendimento será na data do contrato + frequência
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {formData.scheduling_type === "event_based" && (
                <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
                  <div className="flex items-start gap-2">
                    <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">
                        Eventos do Calendário Anual
                      </p>
                      <p className="text-xs text-blue-700 mt-1">
                        Os {formData.total_allowed} próximos eventos deste tipo serão automaticamente vinculados ao contrato.
                        Para configurar os eventos do ano, acesse: <strong>Gestão de Planos → Calendário de Eventos</strong>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-2 border rounded-lg p-3">
                <Checkbox
                  checked={formData.allow_anticipation}
                  onCheckedChange={(checked) => setFormData({ ...formData, allow_anticipation: checked })}
                />
                <div>
                  <label className="text-sm font-medium cursor-pointer">
                    Permitir antecipação de atendimentos
                  </label>
                  <p className="text-xs text-gray-500">Cliente pode consumir antes do prazo previsto</p>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createRuleMutation.isPending || updateRuleMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {(createRuleMutation.isPending || updateRuleMutation.isPending) ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    editingRule ? "Atualizar" : "Adicionar"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de Regras */}
      {planRules.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">Nenhum tipo de atendimento configurado</p>
            <p className="text-sm text-gray-500">
              Adicione tipos de atendimento para definir o que este plano oferece
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {planRules.map((rule) => {
            const attendanceType = attendanceTypes.find(t => t.id === rule.attendance_type_id);
            
            return (
              <Card key={rule.id} className="border-l-4 border-l-blue-500">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        {rule.attendance_type_name || attendanceType?.name}
                        <Badge variant="outline" className="ml-2">
                          {rule.total_allowed}x
                        </Badge>
                      </CardTitle>
                      <p className="text-sm text-gray-600">
                        {attendanceType?.description || "Sem descrição"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(rule)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Remover "${rule.attendance_type_name}" do plano?`)) {
                            deleteRuleMutation.mutate(rule.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {rule.scheduling_type === "frequency" ? (
                    <>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-blue-600" />
                          <div>
                            <p className="font-medium">Frequência</p>
                            <p className="text-gray-600">A cada {rule.frequency_days} dias</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-blue-600" />
                          <div>
                            <p className="font-medium">Quantidade</p>
                            <p className="text-gray-600">{rule.total_allowed} atendimentos</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {rule.allow_anticipation ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-orange-600" />
                          )}
                          <div>
                            <p className="font-medium">Antecipação</p>
                            <p className="text-gray-600">
                              {rule.allow_anticipation ? "Permitida" : "Bloqueada"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-xs font-medium text-blue-900 mb-1">📅 Previsão de duração</p>
                        <p className="text-xs text-blue-700">
                          Com {rule.total_allowed} atendimentos a cada {rule.frequency_days} dias = {" "}
                          <strong>{rule.total_allowed * rule.frequency_days} dias</strong> ({Math.ceil((rule.total_allowed * rule.frequency_days) / 30)} meses aprox.)
                        </p>
                        {rule.start_from_contract_date && (
                          <p className="text-xs text-blue-600 mt-1">
                            ✓ Inicia a partir da data de ativação do contrato
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    <div>
                      <div className="mb-3">
                        <Badge variant="outline" className="bg-blue-50 text-blue-800">
                          Baseado em Calendário ({rule.total_allowed} eventos)
                        </Badge>
                      </div>
                      <div className="text-sm text-blue-700 border-l-2 border-blue-500 pl-3">
                        <p className="font-medium">📅 Eventos Automáticos</p>
                        <p className="text-xs mt-1">
                          Os {rule.total_allowed} próximos eventos de "{rule.attendance_type_name}" do Calendário Anual 
                          serão automaticamente vinculados ao contrato quando ativado.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Resumo */}
      {planRules.length > 0 && (
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-base">📊 Resumo do Plano</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p className="font-medium text-gray-900">
                Total de tipos configurados: <span className="text-blue-600">{planRules.length}</span>
              </p>
              <p className="font-medium text-gray-900">
                Total de atendimentos no plano: {" "}
                <span className="text-blue-600">
                  {planRules.reduce((sum, rule) => sum + rule.total_allowed, 0)}
                </span>
              </p>
              <p className="text-xs text-gray-600 mt-3">
                ⚡ Ao ativar um contrato com este plano, os atendimentos serão gerados automaticamente
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}