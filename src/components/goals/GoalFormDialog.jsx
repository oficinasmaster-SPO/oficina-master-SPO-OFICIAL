import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Save, Users, Target, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function GoalFormDialog({ open, onClose, goal, employees, onSave }) {
  const [formData, setFormData] = useState({
    periodo: "mensal",
    periodo_mes_ano: "",
    data_inicio: "",
    data_fim: "",
    area: "geral",
    meta_areas: [],
    meta_areas_manual_override: false,
    responsible_employee_ids: [],
    involved_employee_ids: [],
    metricas: {
      volume_clientes: { meta: 0, realizado: 0 },
      faturamento_pecas: { meta: 0, realizado: 0 },
      faturamento_servicos: { meta: 0, realizado: 0 },
      rentabilidade: { meta: 0, realizado: 0 },
      lucro: { meta: 0, realizado: 0 },
      ticket_medio_pecas: { meta: 0, realizado: 0 },
      ticket_medio_servicos: { meta: 0, realizado: 0 }
    },
    observacoes: "",
    status: "ativa"
  });

  const [showAreasConfirmation, setShowAreasConfirmation] = useState(false);
  const [pendingAreaUpdate, setPendingAreaUpdate] = useState(null);

  useEffect(() => {
    if (open && goal) {
      // Editando meta existente
      setFormData({
        periodo: goal.periodo || "mensal",
        periodo_mes_ano: goal.periodo_mes_ano || "",
        data_inicio: goal.data_inicio || "",
        data_fim: goal.data_fim || "",
        area: goal.area || "geral",
        meta_areas: goal.meta_areas || [],
        meta_areas_manual_override: goal.meta_areas_manual_override || false,
        responsible_employee_ids: goal.responsible_employee_ids || [],
        involved_employee_ids: goal.involved_employee_ids || [],
        metricas: goal.metricas || {
          volume_clientes: { meta: 0, realizado: 0 },
          faturamento_pecas: { meta: 0, realizado: 0 },
          faturamento_servicos: { meta: 0, realizado: 0 },
          rentabilidade: { meta: 0, realizado: 0 },
          lucro: { meta: 0, realizado: 0 },
          ticket_medio_pecas: { meta: 0, realizado: 0 },
          ticket_medio_servicos: { meta: 0, realizado: 0 }
        },
        observacoes: goal.observacoes || "",
        status: goal.status || "ativa"
      });
    } else if (open) {
      // Nova meta - inicializar com mês atual
      const today = new Date();
      const currentMonth = today.toISOString().substring(0, 7);
      setFormData({
        periodo: "mensal",
        periodo_mes_ano: currentMonth,
        data_inicio: "",
        data_fim: "",
        area: "geral",
        meta_areas: [],
        meta_areas_manual_override: false,
        responsible_employee_ids: [],
        involved_employee_ids: [],
        metricas: {
          volume_clientes: { meta: 0, realizado: 0 },
          faturamento_pecas: { meta: 0, realizado: 0 },
          faturamento_servicos: { meta: 0, realizado: 0 },
          rentabilidade: { meta: 0, realizado: 0 },
          lucro: { meta: 0, realizado: 0 },
          ticket_medio_pecas: { meta: 0, realizado: 0 },
          ticket_medio_servicos: { meta: 0, realizado: 0 }
        },
        observacoes: "",
        status: "ativa"
      });
    }
  }, [open, goal]);

  // Auto-preenchimento de áreas quando colaboradores mudam
  useEffect(() => {
    if (!open) return;
    
    const allEmployeeIds = [
      ...formData.responsible_employee_ids,
      ...formData.involved_employee_ids
    ];

    if (allEmployeeIds.length === 0) {
      // Sem colaboradores, limpar áreas
      if (formData.meta_areas.length > 0 && !formData.meta_areas_manual_override) {
        setFormData(prev => ({ ...prev, meta_areas: [] }));
      }
      return;
    }

    const calculatedAreas = calculateAreas(allEmployeeIds);
    
    // Verificar se áreas mudaram
    const areasChanged = JSON.stringify(calculatedAreas.sort()) !== JSON.stringify(formData.meta_areas.sort());
    
    if (areasChanged) {
      // Se já foi editado manualmente, pedir confirmação
      if (formData.meta_areas_manual_override && formData.meta_areas.length > 0) {
        setPendingAreaUpdate(calculatedAreas);
        setShowAreasConfirmation(true);
      } else {
        // Atualizar automaticamente
        setFormData(prev => ({ 
          ...prev, 
          meta_areas: calculatedAreas,
          meta_areas_manual_override: false 
        }));
      }
    }
  }, [formData.responsible_employee_ids, formData.involved_employee_ids, open]);

  const calculateAreas = (employeeIds) => {
    const areas = new Set();
    
    employeeIds.forEach(empId => {
      const employee = employees.find(e => e.id === empId);
      if (employee?.area) {
        areas.add(employee.area);
      }
    });
    
    return Array.from(areas);
  };

  const handleConfirmAreasUpdate = (confirm) => {
    if (confirm && pendingAreaUpdate) {
      setFormData(prev => ({ 
        ...prev, 
        meta_areas: pendingAreaUpdate,
        meta_areas_manual_override: false 
      }));
      toast.success("Áreas atualizadas automaticamente!");
    } else {
      // Manter áreas manuais
      toast.info("Áreas manuais mantidas.");
    }
    setShowAreasConfirmation(false);
    setPendingAreaUpdate(null);
  };

  const toggleEmployee = (type, employeeId) => {
    const field = type === 'responsible' ? 'responsible_employee_ids' : 'involved_employee_ids';
    const current = formData[field];
    
    if (current.includes(employeeId)) {
      setFormData({
        ...formData,
        [field]: current.filter(id => id !== employeeId)
      });
    } else {
      setFormData({
        ...formData,
        [field]: [...current, employeeId]
      });
    }
  };

  const handleManualAreasEdit = (areaValue, isChecked) => {
    const newAreas = isChecked 
      ? [...formData.meta_areas, areaValue]
      : formData.meta_areas.filter(a => a !== areaValue);
    
    setFormData({ 
      ...formData, 
      meta_areas: newAreas,
      meta_areas_manual_override: true 
    });
  };

  const handleSubmit = async () => {
    // Auto-preencher datas se período mensal e não informado
    let finalData = { ...formData };
    
    if (formData.periodo === "mensal" && formData.periodo_mes_ano) {
      if (!formData.data_inicio || !formData.data_fim) {
        const [year, month] = formData.periodo_mes_ano.split('-');
        const firstDay = `${year}-${month}-01`;
        const lastDay = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];
        
        finalData.data_inicio = formData.data_inicio || firstDay;
        finalData.data_fim = formData.data_fim || lastDay;
        
        toast.info("Datas preenchidas automaticamente para o mês selecionado!");
      }
    }
    
    // Validação obrigatória
    if (!finalData.data_inicio || !finalData.data_fim) {
      toast.error("Preencha as datas de início e fim");
      return;
    }

    if (finalData.responsible_employee_ids.length === 0) {
      toast.error("Selecione pelo menos um responsável");
      return;
    }

    // Auto-preencher periodo_mes_ano a partir de data_inicio
    if (finalData.data_inicio) {
      finalData.periodo_mes_ano = finalData.data_inicio.substring(0, 7);
    }

    try {
      await onSave(finalData);
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar meta");
    }
  };

  const areaOptions = [
    { value: 'vendas', label: 'Vendas' },
    { value: 'comercial', label: 'Comercial' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'tecnico', label: 'Técnico' },
    { value: 'pateo', label: 'Páteo' },
    { value: 'financeiro', label: 'Financeiro' },
    { value: 'lideranca', label: 'Liderança' },
    { value: 'geral', label: 'Geral' }
  ];

  const getEmployeeName = (id) => {
    const emp = employees.find(e => e.id === id);
    return emp ? emp.full_name : 'Desconhecido';
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              {goal ? "Editar Meta" : "Nova Meta"}
            </DialogTitle>
            <DialogDescription>
              Configure responsáveis, envolvidos e métricas. As áreas serão preenchidas automaticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Período e Datas */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Período *</Label>
                <Select value={formData.periodo} onValueChange={(val) => setFormData({...formData, periodo: val})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="diario">Diário</SelectItem>
                    <SelectItem value="semanal">Semanal</SelectItem>
                    <SelectItem value="mensal">Mensal</SelectItem>
                    <SelectItem value="anual">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.periodo === "mensal" && (
                <div>
                  <Label>Mês/Ano</Label>
                  <Input
                    type="month"
                    value={formData.periodo_mes_ano}
                    onChange={(e) => {
                      const mesAno = e.target.value;
                      const [year, month] = mesAno.split('-');
                      const firstDay = `${year}-${month}-01`;
                      const lastDay = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];
                      setFormData({
                        ...formData, 
                        periodo_mes_ano: mesAno,
                        data_inicio: firstDay,
                        data_fim: lastDay
                      });
                    }}
                  />
                </div>
              )}
              <div>
                <Label>Data Início *</Label>
                <Input
                  type="date"
                  value={formData.data_inicio}
                  onChange={(e) => setFormData({...formData, data_inicio: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label>Data Fim *</Label>
                <Input
                  type="date"
                  value={formData.data_fim}
                  onChange={(e) => setFormData({...formData, data_fim: e.target.value})}
                  required
                />
              </div>
            </div>
            
            {formData.periodo === "mensal" && !formData.data_inicio && (
              <Alert className="bg-blue-50 border-blue-200">
                <AlertDescription className="text-sm text-blue-800">
                  💡 Selecione o Mês/Ano acima para preencher as datas automaticamente
                </AlertDescription>
              </Alert>
            )}

            {/* Responsáveis pela Meta */}
            <div className="border-l-4 border-blue-500 pl-4 py-3 bg-blue-50/50">
              <Label className="text-base font-semibold mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                Responsáveis pela Meta *
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-48 overflow-y-auto">
                {employees.map(emp => (
                  <div key={emp.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`resp-${emp.id}`}
                      checked={formData.responsible_employee_ids.includes(emp.id)}
                      onCheckedChange={() => toggleEmployee('responsible', emp.id)}
                    />
                    <label htmlFor={`resp-${emp.id}`} className="text-sm cursor-pointer">
                      {emp.full_name}
                      {emp.area && <span className="text-xs text-gray-500 ml-1">({emp.area})</span>}
                    </label>
                  </div>
                ))}
              </div>
              {formData.responsible_employee_ids.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {formData.responsible_employee_ids.map(id => (
                    <Badge key={id} variant="secondary" className="bg-blue-100 text-blue-800">
                      {getEmployeeName(id)}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Envolvidos/Impactados */}
            <div className="border-l-4 border-purple-500 pl-4 py-3 bg-purple-50/50">
              <Label className="text-base font-semibold mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600" />
                Envolvidos / Impactados (Opcional)
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-48 overflow-y-auto">
                {employees.map(emp => (
                  <div key={emp.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`inv-${emp.id}`}
                      checked={formData.involved_employee_ids.includes(emp.id)}
                      onCheckedChange={() => toggleEmployee('involved', emp.id)}
                    />
                    <label htmlFor={`inv-${emp.id}`} className="text-sm cursor-pointer">
                      {emp.full_name}
                      {emp.area && <span className="text-xs text-gray-500 ml-1">({emp.area})</span>}
                    </label>
                  </div>
                ))}
              </div>
              {formData.involved_employee_ids.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {formData.involved_employee_ids.map(id => (
                    <Badge key={id} variant="secondary" className="bg-purple-100 text-purple-800">
                      {getEmployeeName(id)}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Áreas (Automático) */}
            <div className="border-l-4 border-green-500 pl-4 py-3 bg-green-50/50">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Target className="w-4 h-4 text-green-600" />
                  Áreas Impactadas {formData.meta_areas_manual_override ? "(Manual)" : "(Automático)"}
                </Label>
                {formData.meta_areas_manual_override && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const calculated = calculateAreas([
                        ...formData.responsible_employee_ids,
                        ...formData.involved_employee_ids
                      ]);
                      setFormData({
                        ...formData,
                        meta_areas: calculated,
                        meta_areas_manual_override: false
                      });
                      toast.success("Áreas recalculadas automaticamente!");
                    }}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Recalcular
                  </Button>
                )}
              </div>

              {formData.meta_areas.length === 0 ? (
                <p className="text-sm text-gray-500 italic">
                  Selecione colaboradores responsáveis/envolvidos para preencher automaticamente
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {formData.meta_areas.map(area => (
                    <Badge key={area} className="bg-green-100 text-green-800 text-sm px-3 py-1.5">
                      {areaOptions.find(a => a.value === area)?.label || area}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Edição Manual (Avançado) */}
              <details className="mt-3">
                <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-900">
                  Editar áreas manualmente (avançado)
                </summary>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 p-3 bg-white rounded border">
                  {areaOptions.map(option => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`area-${option.value}`}
                        checked={formData.meta_areas.includes(option.value)}
                        onCheckedChange={(checked) => handleManualAreasEdit(option.value, checked)}
                      />
                      <label htmlFor={`area-${option.value}`} className="text-xs cursor-pointer">
                        {option.label}
                      </label>
                    </div>
                  ))}
                </div>
                {formData.meta_areas_manual_override && (
                  <p className="text-xs text-orange-600 mt-1">
                    ⚠️ Áreas editadas manualmente. Mudanças nos colaboradores pedirão confirmação.
                  </p>
                )}
              </details>
            </div>

            {/* Métricas */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Métricas da Meta</Label>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Volume de Clientes (Meta)</Label>
                  <Input
                    type="number"
                    value={formData.metricas.volume_clientes.meta}
                    onChange={(e) => setFormData({
                      ...formData,
                      metricas: {
                        ...formData.metricas,
                        volume_clientes: { ...formData.metricas.volume_clientes, meta: parseFloat(e.target.value) || 0 }
                      }
                    })}
                  />
                </div>
                <div>
                  <Label className="text-sm">Faturamento Peças (R$)</Label>
                  <Input
                    type="number"
                    value={formData.metricas.faturamento_pecas.meta}
                    onChange={(e) => setFormData({
                      ...formData,
                      metricas: {
                        ...formData.metricas,
                        faturamento_pecas: { ...formData.metricas.faturamento_pecas, meta: parseFloat(e.target.value) || 0 }
                      }
                    })}
                  />
                </div>
                <div>
                  <Label className="text-sm">Faturamento Serviços (R$)</Label>
                  <Input
                    type="number"
                    value={formData.metricas.faturamento_servicos.meta}
                    onChange={(e) => setFormData({
                      ...formData,
                      metricas: {
                        ...formData.metricas,
                        faturamento_servicos: { ...formData.metricas.faturamento_servicos, meta: parseFloat(e.target.value) || 0 }
                      }
                    })}
                  />
                </div>
                <div>
                  <Label className="text-sm">Rentabilidade (%)</Label>
                  <Input
                    type="number"
                    value={formData.metricas.rentabilidade.meta}
                    onChange={(e) => setFormData({
                      ...formData,
                      metricas: {
                        ...formData.metricas,
                        rentabilidade: { ...formData.metricas.rentabilidade, meta: parseFloat(e.target.value) || 0 }
                      }
                    })}
                  />
                </div>
              </div>
            </div>

            {/* Observações */}
            <div>
              <Label>Observações</Label>
              <Textarea
                value={formData.observacoes}
                onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                placeholder="Notas adicionais sobre a meta..."
                rows={3}
              />
            </div>

            {/* Status */}
            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(val) => setFormData({...formData, status: val})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativa">Ativa</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Botões */}
            <div className="flex gap-3 pt-4 border-t">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleSubmit} className="flex-1 bg-blue-600 hover:bg-blue-700">
                <Save className="w-4 h-4 mr-2" />
                {goal ? "Atualizar Meta" : "Criar Meta"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Áreas */}
      <Dialog open={showAreasConfirmation} onOpenChange={(open) => !open && handleConfirmAreasUpdate(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              Atualizar Áreas?
            </DialogTitle>
          </DialogHeader>
          <Alert className="bg-orange-50 border-orange-200">
            <AlertDescription className="text-sm">
              <p className="mb-3">Você alterou os colaboradores responsáveis/envolvidos.</p>
              <p className="font-semibold mb-2">Áreas calculadas automaticamente:</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {pendingAreaUpdate?.map(area => (
                  <Badge key={area} className="bg-green-100 text-green-800">
                    {areaOptions.find(a => a.value === area)?.label}
                  </Badge>
                ))}
              </div>
              <p className="text-orange-800 font-medium">
                Deseja atualizar as áreas automaticamente com base nos colaboradores selecionados?
              </p>
            </AlertDescription>
          </Alert>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => handleConfirmAreasUpdate(false)} className="flex-1">
              Não, manter áreas manuais
            </Button>
            <Button onClick={() => handleConfirmAreasUpdate(true)} className="flex-1 bg-green-600 hover:bg-green-700">
              Sim, atualizar automaticamente
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}