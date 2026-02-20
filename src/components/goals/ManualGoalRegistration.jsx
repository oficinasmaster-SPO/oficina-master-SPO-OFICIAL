import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Building2, User, Target, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import RevenueDistributionModal from "./RevenueDistributionModal";
import VendaAtribuicoesModal from "./VendaAtribuicoesModal";

export default function ManualGoalRegistration({ open, onClose, workshop, editingRecord, onSave }) {
  const [entityType, setEntityType] = useState("workshop");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [tcmp2Value, setTcmp2Value] = useState(0);
  const [showDistribution, setShowDistribution] = useState(false);
  const [showAtribuicoes, setShowAtribuicoes] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(false);
  const [loadedFromExisting, setLoadedFromExisting] = useState(false);
  const [existingRecordId, setExistingRecordId] = useState(null);
  const [existingAtribuicoes, setExistingAtribuicoes] = useState([]);
  const [formData, setFormData] = useState({
    reference_date: new Date().toLocaleDateString('en-CA'), // Local date YYYY-MM-DD
    month: new Date().toLocaleDateString('en-CA').substring(0, 7),
    // PREVISTO (vem do desdobramento)
    projected_total: 0,
    projected_revenue_parts: 0,
    projected_revenue_services: 0,
    projected_customer_volume: 0,
    projected_average_ticket: 0,
    projected_pave_commercial: 0,
    projected_kit_master: 0,
    projected_sales_base: 0,
    projected_sales_marketing: 0,
    projected_clients_delivered: 0,
    projected_gps_vendas: 0,
    projected_marketing: {
      leads_generated: 0,
      leads_scheduled: 0,
      leads_showed_up: 0,
      leads_sold: 0,
      cost_per_sale: 0,
      invested_value: 0,
      revenue_from_traffic: 0
    },
    // REALIZADO (preenchimento manual)
    achieved_total: 0,
    gps_vendas: 0,
    revenue_parts: 0,
    revenue_services: 0,
    customer_volume: 0,
    r70_i30: { r70: 70, i30: 30 },
    tcmp2: 0,
    pave_commercial: 0,
    kit_master: 0,
    sales_base: 0,
    sales_marketing: 0,
    clients_delivered: 0,
    clients_scheduled_base: 0,
    clients_delivered_base: 0,
    clients_scheduled_mkt: 0,
    clients_delivered_mkt: 0,
    clients_scheduled_referral: 0,
    clients_delivered_referral: 0,
    marketing_data: {
      leads_generated: 0,
      leads_scheduled: 0,
      leads_showed_up: 0,
      leads_sold: 0,
      invested_value: 0,
      revenue_from_traffic: 0
    },
    rework_count: 0,
    notes: ""
  });

  useEffect(() => {
    if (open) {
      loadEmployees();
      loadTCMP2();
      
      if (editingRecord) {
        // Forçar entityType imediatamente ao abrir edição
        const type = editingRecord.entity_type || (editingRecord.employee_id ? "employee" : "workshop");
        setEntityType(type);
        setLoadedFromExisting(true);
        setExistingRecordId(editingRecord.id);
        loadEditingData();
      } else {
        // Resetar para criação
        if (!selectedEmployee) setEntityType("workshop");
        setLoadedFromExisting(false);
        setExistingRecordId(null);
        loadProjectedGoals();
        // Apenas verificar existente se não estiver editando e já tiver data
        if (formData.reference_date) {
            checkExistingRecord(formData.reference_date);
        }
      }
    }
  }, [open, editingRecord]);

  // Effect dedicado para vincular funcionário quando a lista carregar
  useEffect(() => {
    if (open && editingRecord && (editingRecord.entity_type === 'employee' || editingRecord.employee_id) && employees.length > 0) {
      const emp = employees.find(e => e.id === editingRecord.employee_id);
      if (emp) {
        setSelectedEmployee(emp);
        // Garantir que o tipo esteja correto
        setEntityType("employee");
      }
    }
  }, [employees, editingRecord, open]);

  const checkExistingRecord = async (date) => {
    if (!date || !workshop) return;
    
    setCheckingExisting(true);
    setLoadedFromExisting(false);
    setExistingRecordId(null);
    
    try {
      // BUSCAR TODOS OS REGISTROS DESTA DATA (workshop OU employee)
      const allRecords = await base44.entities.MonthlyGoalHistory.filter({
        workshop_id: workshop.id,
        reference_date: date
      });
      
      console.log("📊 Todos os registros do dia", date, ":", allRecords);
      
      if (allRecords && allRecords.length > 0) {
        // Priorizar registro do tipo atual (workshop ou employee)
        let record = allRecords.find(r => 
          r.entity_type === entityType && 
          (entityType === "workshop" || r.employee_id === selectedEmployee?.id)
        );
        
        // Se não encontrou do tipo atual, pegar o primeiro disponível
        if (!record) {
          record = allRecords[0];
          
          // Ajustar o tipo de entidade e colaborador se necessário
          if (record.entity_type === "employee" && record.employee_id) {
            const emp = employees.find(e => e.id === record.employee_id);
            if (emp) {
              setEntityType("employee");
              setSelectedEmployee(emp);
              toast.info(
                `📋 Encontrado registro de ${emp.full_name} para esta data!`,
                { duration: 3000 }
              );
            }
          } else if (record.entity_type === "workshop") {
            setEntityType("workshop");
            setSelectedEmployee(null);
            toast.info(
              "📋 Encontrado registro da oficina para esta data!",
              { duration: 3000 }
            );
          }
        }
        
        toast.warning(
          "⚠️ Já existe registro para esta data! Carregando dados...",
          { duration: 3000 }
        );
        
        setFormData({
          reference_date: record.reference_date?.split('T')[0] || date,
          month: record.month || date.substring(0, 7),
          projected_total: record.projected_total || 0,
          projected_revenue_parts: record.projected_revenue_parts || 0,
          projected_revenue_services: record.projected_revenue_services || 0,
          projected_customer_volume: record.projected_customer_volume || 0,
          projected_average_ticket: record.projected_average_ticket || 0,
          projected_pave_commercial: record.projected_pave_commercial || 0,
          projected_kit_master: record.projected_kit_master || 0,
          projected_sales_base: record.projected_sales_base || 0,
          projected_sales_marketing: record.projected_sales_marketing || 0,
          projected_clients_delivered: record.projected_clients_delivered || 0,
          projected_gps_vendas: record.projected_gps_vendas || 0,
          projected_marketing: record.projected_marketing || {
            leads_generated: 0,
            leads_scheduled: 0,
            leads_showed_up: 0,
            leads_sold: 0,
            cost_per_sale: 0,
            invested_value: 0,
            revenue_from_traffic: 0
          },
          achieved_total: record.achieved_total || 0,
          revenue_parts: record.revenue_parts || 0,
          revenue_services: record.revenue_services || 0,
          customer_volume: record.customer_volume || 0,
          r70_i30: record.r70_i30 || { r70: 70, i30: 30 },
          tcmp2: record.tcmp2 || 0,
          pave_commercial: record.pave_commercial || 0,
          kit_master: record.kit_master || 0,
          sales_base: record.sales_base || 0,
          sales_marketing: record.sales_marketing || 0,
          clients_delivered: record.clients_delivered || 0,
          gps_vendas: record.gps_vendas || 0,
          clients_scheduled_base: record.clients_scheduled_base || 0,
          clients_delivered_base: record.clients_delivered_base || 0,
          clients_scheduled_mkt: record.clients_scheduled_mkt || 0,
          clients_delivered_mkt: record.clients_delivered_mkt || 0,
          clients_scheduled_referral: record.clients_scheduled_referral || 0,
          clients_delivered_referral: record.clients_delivered_referral || 0,
          marketing_data: record.marketing_data || {
            leads_generated: 0,
            leads_scheduled: 0,
            leads_showed_up: 0,
            leads_sold: 0,
            invested_value: 0,
            revenue_from_traffic: 0
          },
          rework_count: record.rework_count || 0,
          notes: record.notes || ""
        });
        
        setExistingRecordId(record.id);
        setLoadedFromExisting(true);
        
        setTimeout(() => {
          toast.info(
            "💡 Ao salvar, você ATUALIZARÁ este registro no banco de dados!",
            { duration: 6000 }
          );
        }, 500);
      }
    } catch (error) {
      console.error("Error checking existing record:", error);
      toast.error("Erro ao verificar registros existentes");
    } finally {
      setCheckingExisting(false);
    }
  };

  // Calcular PAVE Comercial automaticamente (soma dos agendamentos)
  useEffect(() => {
    const paveAutomatico = 
      (formData.clients_scheduled_base || 0) + 
      (formData.clients_scheduled_mkt || 0) + 
      (formData.clients_scheduled_referral || 0);
    
    if (paveAutomatico !== formData.pave_commercial) {
      setFormData(prev => ({...prev, pave_commercial: paveAutomatico}));
    }
  }, [formData.clients_scheduled_base, formData.clients_scheduled_mkt, formData.clients_scheduled_referral]);

  // Calcular Kit Master automaticamente (soma dos entregues)
  useEffect(() => {
    const kitMasterAutomatico = 
      (formData.clients_delivered_base || 0) + 
      (formData.clients_delivered_mkt || 0) + 
      (formData.clients_delivered_referral || 0);
    
    if (kitMasterAutomatico !== formData.kit_master) {
      setFormData(prev => ({...prev, kit_master: kitMasterAutomatico}));
    }
  }, [formData.clients_delivered_base, formData.clients_delivered_mkt, formData.clients_delivered_referral]);

  const loadEditingData = async () => {
    if (!editingRecord) return;
    
    // Configurar tipo base
    const type = editingRecord.entity_type || (editingRecord.employee_id ? "employee" : "workshop");
    setEntityType(type);
    
    // Garantir formatação da data para YYYY-MM-DD
    let formattedDate = editingRecord.reference_date;
    if (formattedDate && formattedDate.includes('T')) {
      formattedDate = formattedDate.split('T')[0];
    }

    setFormData(prev => ({
      ...prev,
      reference_date: formattedDate,
      month: editingRecord.month,
      
      // PREVISTO
      projected_total: Number(editingRecord.projected_total) || 0,
      projected_revenue_parts: Number(editingRecord.projected_revenue_parts) || 0,
      projected_revenue_services: Number(editingRecord.projected_revenue_services) || 0,
      projected_customer_volume: Number(editingRecord.projected_customer_volume) || 0,
      projected_average_ticket: Number(editingRecord.projected_average_ticket) || 0,
      projected_pave_commercial: Number(editingRecord.projected_pave_commercial) || 0,
      projected_kit_master: Number(editingRecord.projected_kit_master) || 0,
      projected_sales_base: Number(editingRecord.projected_sales_base) || 0,
      projected_sales_marketing: Number(editingRecord.projected_sales_marketing) || 0,
      projected_clients_delivered: Number(editingRecord.projected_clients_delivered) || 0,
      projected_gps_vendas: Number(editingRecord.projected_gps_vendas) || 0,
      projected_marketing: editingRecord.projected_marketing || {
        leads_generated: 0,
        leads_scheduled: 0,
        leads_showed_up: 0,
        leads_sold: 0,
        cost_per_sale: 0,
        invested_value: 0,
        revenue_from_traffic: 0
      },

      // REALIZADO
      achieved_total: Number(editingRecord.achieved_total) || 0,
      revenue_parts: Number(editingRecord.revenue_parts) || 0,
      revenue_services: Number(editingRecord.revenue_services) || 0,
      customer_volume: Number(editingRecord.customer_volume) || 0,
      r70_i30: editingRecord.r70_i30 || { r70: 70, i30: 30 },
      tcmp2: Number(editingRecord.tcmp2) || 0,
      pave_commercial: Number(editingRecord.pave_commercial) || 0,
      kit_master: Number(editingRecord.kit_master) || 0,
      sales_base: Number(editingRecord.sales_base) || 0,
      sales_marketing: Number(editingRecord.sales_marketing) || 0,
      clients_delivered: Number(editingRecord.clients_delivered) || 0,
      gps_vendas: Number(editingRecord.gps_vendas) || 0,
      clients_scheduled_base: Number(editingRecord.clients_scheduled_base) || 0,
      clients_delivered_base: Number(editingRecord.clients_delivered_base) || 0,
      clients_scheduled_mkt: Number(editingRecord.clients_scheduled_mkt) || 0,
      clients_delivered_mkt: Number(editingRecord.clients_delivered_mkt) || 0,
      clients_scheduled_referral: Number(editingRecord.clients_scheduled_referral) || 0,
      clients_delivered_referral: Number(editingRecord.clients_delivered_referral) || 0,
      marketing_data: editingRecord.marketing_data || {
        leads_generated: 0,
        leads_scheduled: 0,
        leads_showed_up: 0,
        leads_sold: 0,
        invested_value: 0,
        revenue_from_traffic: 0
      },
      rework_count: Number(editingRecord.rework_count) || 0,
      notes: editingRecord.notes || ""
    }));
  };

  const loadTCMP2 = async () => {
    if (!workshop) return;
    try {
      const currentMonth = new Date().toISOString().substring(0, 7);
      const dres = await base44.entities.DREMonthly.filter({ 
        workshop_id: workshop.id,
        reference_month: currentMonth
      });
      
      if (dres && dres.length > 0) {
        const latestDRE = dres[0];
        const tcmp2 = latestDRE.tcmp2_value || 0;
        setTcmp2Value(tcmp2);
        setFormData(prev => ({ ...prev, tcmp2 }));
      } else {
        setTcmp2Value(0);
        setFormData(prev => ({ ...prev, tcmp2: 0 }));
      }
    } catch (error) {
      console.error("Error loading TCMP2:", error);
    }
  };

  const loadEmployees = async () => {
    if (!workshop) return;
    try {
      const result = await base44.entities.Employee.filter({ 
        workshop_id: workshop.id,
        status: "ativo"
      });
      setEmployees(result);
    } catch (error) {
      console.error("Error loading employees:", error);
    }
  };

  const loadProjectedGoals = () => {
    if (entityType === "workshop") {
      const bestMonth = workshop?.best_month_history || {};
      const growthPercentage = workshop?.monthly_goals?.growth_percentage || 10;
      const factor = 1 + growthPercentage / 100;
      
      setFormData(prev => ({
        ...prev,
        // PREVISTO - Calculado automaticamente
        projected_total: (bestMonth.revenue_total || 0) * factor,
        projected_revenue_parts: (bestMonth.revenue_parts || 0) * factor,
        projected_revenue_services: (bestMonth.revenue_services || 0) * factor,
        projected_customer_volume: Math.round((bestMonth.customer_volume || 0) * factor),
        projected_average_ticket: (bestMonth.average_ticket || 0) * factor,
        projected_pave_commercial: (bestMonth.pave_commercial || 0) * factor,
        projected_kit_master: (bestMonth.kit_master || 0) * factor,
        projected_sales_base: (bestMonth.sales_base || 0) * factor,
        projected_sales_marketing: (bestMonth.sales_marketing || 0) * factor,
        projected_clients_delivered: Math.round((bestMonth.clients_delivered || 0) * factor),
        projected_gps_vendas: Math.round((bestMonth.gps_vendas || 0) * factor),
        projected_marketing: {
          leads_generated: Math.round((bestMonth.marketing?.leads_generated || 0) * factor),
          leads_scheduled: Math.round((bestMonth.marketing?.leads_scheduled || 0) * factor),
          leads_showed_up: Math.round((bestMonth.marketing?.leads_showed_up || 0) * factor),
          leads_sold: Math.round((bestMonth.marketing?.leads_sold || 0) * factor),
          cost_per_sale: (bestMonth.marketing?.cost_per_sale || 0) * factor,
          invested_value: (bestMonth.marketing?.invested_value || 0) * factor,
          revenue_from_traffic: (bestMonth.marketing?.revenue_from_traffic || 0) * factor
        }
      }));
    } else if (selectedEmployee) {
      const bestMonth = selectedEmployee.best_month_history || {};
      const growthPercentage = selectedEmployee.monthly_goals?.growth_percentage || 10;
      const factor = 1 + growthPercentage / 100;
      
      setFormData(prev => ({
        ...prev,
        // PREVISTO - Calculado automaticamente
        projected_total: (bestMonth.revenue_total || 0) * factor,
        projected_revenue_parts: (bestMonth.revenue_parts || 0) * factor,
        projected_revenue_services: (bestMonth.revenue_services || 0) * factor,
        projected_customer_volume: Math.round((bestMonth.customer_volume || 0) * factor),
        projected_average_ticket: (bestMonth.average_ticket || 0) * factor,
        projected_pave_commercial: (bestMonth.pave_commercial || 0) * factor,
        projected_kit_master: (bestMonth.kit_master || 0) * factor,
        projected_sales_base: (bestMonth.sales_base || 0) * factor,
        projected_sales_marketing: (bestMonth.sales_marketing || 0) * factor,
        projected_clients_delivered: Math.round((bestMonth.clients_delivered || 0) * factor),
        projected_gps_vendas: Math.round((bestMonth.gps_vendas || 0) * factor)
      }));
    }
  };

  const handleSaveAndAnalyze = async () => {
    // Abre modal de atribuições (novo modelo Fato vs Atribuição)
    // Carregar atribuições existentes se estiver editando
    if (editingRecord?.id || existingRecordId) {
      await loadExistingAtribuicoes();
    }
    setShowAtribuicoes(true);
  };

  const loadExistingAtribuicoes = async () => {
    try {
      const recordId = editingRecord?.id || existingRecordId;
      if (!recordId) return;

      // Buscar vendas associadas a este registro
      const todasVendas = await base44.entities.VendasServicos.filter({
        workshop_id: workshop.id,
        data: formData.reference_date
      });

      if (todasVendas && todasVendas.length > 0) {
        // Buscar atribuições da primeira venda deste dia
        const venda = todasVendas[0];
        const atribuicoesExistentes = await base44.entities.AtribuicoesVenda.filter({
          venda_id: venda.id
        });

        // Armazenar para passar ao modal
        setExistingAtribuicoes(atribuicoesExistentes || []);
      }
    } catch (error) {
      console.error("Erro ao carregar atribuições existentes:", error);
    }
  };

  const handleAtribuicoesConfirm = async (atribuicoes) => {
    try {
      setIsSaving(true);
      const revenue_total = formData.revenue_parts + formData.revenue_services;

      // Detectar origem e ações baseadas nas atribuições para atualizar contadores
      const hasMarketing = atribuicoes.some(a => a.equipe === 'marketing' || a.papel === 'gerou_lead');
      const hasSDR = atribuicoes.some(a => a.equipe === 'sdr_telemarketing' || a.papel === 'agendou');
      const hasSales = atribuicoes.some(a => a.papel === 'vendeu'); // Alguém vendeu

      // Preparar novos valores incrementando os existentes
      let updatedFormData = { ...formData };

      if (hasMarketing) {
        // Origem: Marketing
        if (hasSDR) updatedFormData.clients_scheduled_mkt = (updatedFormData.clients_scheduled_mkt || 0) + 1;
        if (hasSales) {
          updatedFormData.clients_delivered_mkt = (updatedFormData.clients_delivered_mkt || 0) + 1;
          // Se o valor de vendas marketing estava zerado ou desatualizado, somar este faturamento
          // Nota: Isso é uma heurística para ajudar, o usuário ainda pode editar manualmente
          if (updatedFormData.sales_marketing === 0 || updatedFormData.sales_marketing < revenue_total) {
             updatedFormData.sales_marketing = (updatedFormData.sales_marketing || 0) + revenue_total;
          }
        }
      } else {
        // Origem: Base (Padrão)
        if (hasSDR) updatedFormData.clients_scheduled_base = (updatedFormData.clients_scheduled_base || 0) + 1;
        if (hasSales) {
          updatedFormData.clients_delivered_base = (updatedFormData.clients_delivered_base || 0) + 1;
          if (updatedFormData.sales_base === 0 || updatedFormData.sales_base < revenue_total) {
             updatedFormData.sales_base = (updatedFormData.sales_base || 0) + revenue_total;
          }
        }
      }

      // Recalcular Totais Automáticos
      updatedFormData.pave_commercial = (updatedFormData.clients_scheduled_base || 0) + (updatedFormData.clients_scheduled_mkt || 0) + (updatedFormData.clients_scheduled_referral || 0);
      updatedFormData.kit_master = (updatedFormData.clients_delivered_base || 0) + (updatedFormData.clients_delivered_mkt || 0) + (updatedFormData.clients_delivered_referral || 0);
      
      // GPS Vendas (normalmente igual ao kit master/entregues)
      if (hasSales) {
        updatedFormData.gps_vendas = (updatedFormData.gps_vendas || 0) + 1;
      }

      // Atualizar o state local também para refletir na UI se o modal não fechar (mas ele fecha)
      setFormData(updatedFormData);

      // 1. Criar registro de venda (FATO)
      const origemVenda = hasMarketing ? "marketing" : "base_clientes";
      const venda = await base44.entities.VendasServicos.create({
        workshop_id: workshop.id,
        data: formData.reference_date,
        month: formData.month,
        valor_total: revenue_total,
        valor_pecas: formData.revenue_parts,
        valor_servicos: formData.revenue_services,
        categoria: "misto",
        origem: origemVenda,
        observacao: formData.notes || ""
      });

      // 2. Criar atribuições (PARTICIPAÇÃO)
      for (const atrib of atribuicoes) {
        await base44.entities.AtribuicoesVenda.create({
          venda_id: venda.id,
          workshop_id: workshop.id,
          pessoa_id: atrib.pessoa_id,
          pessoa_nome: atrib.pessoa_nome,
          equipe: atrib.equipe,
          papel: atrib.papel,
          percentual_credito: atrib.percentual_credito,
          valor_credito: atrib.valor_credito
        });
      }

      // 3. Atualizar MonthlyGoalHistory (compatibilidade com dashboards antigos)
      const marketing_cost_per_sale = updatedFormData.marketing_data.leads_sold > 0
        ? updatedFormData.marketing_data.invested_value / updatedFormData.marketing_data.leads_sold
        : 0;

      const recordData = {
        workshop_id: workshop.id,
        entity_type: entityType,
        entity_id: entityType === "workshop" ? workshop.id : selectedEmployee?.id,
        employee_id: entityType === "employee" ? selectedEmployee?.id : null,
        employee_role: entityType === "employee" ? selectedEmployee?.job_role : "geral",
        reference_date: updatedFormData.reference_date,
        month: updatedFormData.month,
        projected_total: updatedFormData.projected_total,
        achieved_total: updatedFormData.achieved_total,
        revenue_total: revenue_total,
        revenue_parts: updatedFormData.revenue_parts,
        revenue_services: updatedFormData.revenue_services,
        average_ticket: updatedFormData.customer_volume > 0 ? revenue_total / updatedFormData.customer_volume : 0,
        customer_volume: updatedFormData.customer_volume,
        r70_i30: updatedFormData.r70_i30,
        tcmp2: tcmp2Value,
        pave_commercial: updatedFormData.pave_commercial,
        kit_master: updatedFormData.kit_master,
        sales_base: updatedFormData.sales_base,
        sales_marketing: updatedFormData.sales_marketing,
        clients_delivered: updatedFormData.clients_delivered,
        gps_vendas: updatedFormData.gps_vendas,
        clients_scheduled_base: updatedFormData.clients_scheduled_base,
        clients_delivered_base: updatedFormData.clients_delivered_base,
        clients_scheduled_mkt: updatedFormData.clients_scheduled_mkt,
        clients_delivered_mkt: updatedFormData.clients_delivered_mkt,
        clients_scheduled_referral: updatedFormData.clients_scheduled_referral,
        clients_delivered_referral: updatedFormData.clients_delivered_referral,
        marketing_data: {
          ...updatedFormData.marketing_data,
          cost_per_sale: marketing_cost_per_sale
        },
        revenue_distribution: null,
        rework_count: updatedFormData.rework_count,
        notes: updatedFormData.notes
      };

      if (editingRecord || existingRecordId) {
        const idToUpdate = editingRecord?.id || existingRecordId;
        await base44.entities.MonthlyGoalHistory.update(idToUpdate, recordData);
      } else {
        await base44.entities.MonthlyGoalHistory.create(recordData);
      }

      if (editingRecord || existingRecordId) {
        const idToUpdate = editingRecord?.id || existingRecordId;
        await base44.entities.MonthlyGoalHistory.update(idToUpdate, recordData);
      } else {
        await base44.entities.MonthlyGoalHistory.create(recordData);
      }

      // 4. Sincronizar valores mensais - SOMAR TODAS AS VENDAS DO MÊS
      const todasVendasMes = await base44.entities.VendasServicos.filter({
        workshop_id: workshop.id,
        month: formData.month
      });

      const faturamentoRealMes = todasVendasMes.reduce((sum, v) => sum + (v.valor_total || 0), 0);

      // Atualizar Workshop com o valor REAL (sem duplicação)
      if (entityType === "workshop") {
        await base44.entities.Workshop.update(workshop.id, {
          monthly_goals: {
            ...workshop.monthly_goals,
            actual_revenue_achieved: faturamentoRealMes,
            month: formData.month
          }
        });
      }

      toast.success("Venda registrada e atribuições salvas!");
      setShowAtribuicoes(false);
      if (onSave) onSave();
      onClose();
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Erro ao salvar venda e atribuições");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDirect = async () => {
    try {
      setIsSaving(true);
      const revenue_total = formData.revenue_parts + formData.revenue_services;
      const average_ticket = formData.customer_volume > 0 
        ? revenue_total / formData.customer_volume 
        : 0;
      
      const marketing_cost_per_sale = formData.marketing_data.leads_sold > 0
        ? formData.marketing_data.invested_value / formData.marketing_data.leads_sold
        : 0;

      const recordData = {
        workshop_id: workshop.id,
        entity_type: entityType,
        entity_id: entityType === "workshop" ? workshop.id : selectedEmployee?.id,
        employee_id: entityType === "employee" ? selectedEmployee?.id : null,
        employee_role: entityType === "employee" ? selectedEmployee?.job_role : "geral",
        reference_date: formData.reference_date,
        month: formData.month,
        projected_total: formData.projected_total,
        achieved_total: formData.achieved_total,
        revenue_total: revenue_total,
        revenue_parts: formData.revenue_parts,
        revenue_services: formData.revenue_services,
        average_ticket: average_ticket,
        customer_volume: formData.customer_volume,
        r70_i30: formData.r70_i30,
        tcmp2: tcmp2Value,
        pave_commercial: formData.pave_commercial,
        kit_master: formData.kit_master,
        sales_base: formData.sales_base,
        sales_marketing: formData.sales_marketing,
        clients_delivered: formData.clients_delivered,
        gps_vendas: formData.gps_vendas,
        clients_scheduled_base: formData.clients_scheduled_base,
        clients_delivered_base: formData.clients_delivered_base,
        clients_scheduled_mkt: formData.clients_scheduled_mkt,
        clients_delivered_mkt: formData.clients_delivered_mkt,
        clients_scheduled_referral: formData.clients_scheduled_referral,
        clients_delivered_referral: formData.clients_delivered_referral,
        marketing_data: {
          ...formData.marketing_data,
          cost_per_sale: marketing_cost_per_sale
        },
        revenue_distribution: null,
        rework_count: formData.rework_count,
        notes: formData.notes
      };

      if (editingRecord) {
        await base44.entities.MonthlyGoalHistory.update(editingRecord.id, recordData);
      } else {
        await base44.entities.MonthlyGoalHistory.create(recordData);
      }

      // Atualizar Workshop - sincronizar valores mensais realizados
      if (entityType === "workshop") {
        const currentMonthRecords = await base44.entities.MonthlyGoalHistory.filter({
          workshop_id: workshop.id,
          month: formData.month,
          entity_type: "workshop"
        });
        
        const allRecords = Array.isArray(currentMonthRecords) ? currentMonthRecords : [];
        
        const monthlyConsolidated = {
          actual_revenue_achieved: allRecords.reduce((sum, r) => sum + (r.revenue_total || 0), 0),
          revenue_parts: allRecords.reduce((sum, r) => sum + (r.revenue_parts || 0), 0),
          revenue_services: allRecords.reduce((sum, r) => sum + (r.revenue_services || 0), 0),
          customer_volume: allRecords.reduce((sum, r) => sum + (r.customer_volume || 0), 0),
          pave_commercial: allRecords.reduce((sum, r) => sum + (r.pave_commercial || 0), 0),
          kit_master: allRecords.reduce((sum, r) => sum + (r.kit_master || 0), 0),
          gps_vendas: allRecords.reduce((sum, r) => sum + (r.gps_vendas || 0), 0),
          sales_base: allRecords.reduce((sum, r) => sum + (r.sales_base || 0), 0),
          sales_marketing: allRecords.reduce((sum, r) => sum + (r.sales_marketing || 0), 0),
          marketing: {
            leads_generated: allRecords.reduce((sum, r) => sum + (r.marketing_data?.leads_generated || 0), 0),
            leads_scheduled: allRecords.reduce((sum, r) => sum + (r.marketing_data?.leads_scheduled || 0), 0),
            leads_showed_up: allRecords.reduce((sum, r) => sum + (r.marketing_data?.leads_showed_up || 0), 0),
            leads_sold: allRecords.reduce((sum, r) => sum + (r.marketing_data?.leads_sold || 0), 0),
            invested_value: allRecords.reduce((sum, r) => sum + (r.marketing_data?.invested_value || 0), 0),
            revenue_from_traffic: allRecords.reduce((sum, r) => sum + (r.marketing_data?.revenue_from_traffic || 0), 0),
            cost_per_sale: 0
          }
        };
        
        if (monthlyConsolidated.marketing.leads_sold > 0) {
          monthlyConsolidated.marketing.cost_per_sale = 
            monthlyConsolidated.marketing.invested_value / monthlyConsolidated.marketing.leads_sold;
        }
        
        if (monthlyConsolidated.customer_volume > 0) {
          monthlyConsolidated.average_ticket = 
            monthlyConsolidated.actual_revenue_achieved / monthlyConsolidated.customer_volume;
        }

        await base44.entities.Workshop.update(workshop.id, {
          monthly_goals: {
            ...workshop.monthly_goals,
            ...monthlyConsolidated,
            month: formData.month
          }
        });
      }

      if (onSave) onSave();
      onClose();
    } catch (error) {
      console.error("Error saving record:", error);
      toast.error("Erro ao salvar registro");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDistribution = () => {
    // Força reset da distribuição quando necessário
  };

  const handleDistributionConfirm = async (distribution) => {
    try {
      setIsSaving(true);
      const revenue_total = formData.revenue_parts + formData.revenue_services;
      const average_ticket = formData.customer_volume > 0 
        ? revenue_total / formData.customer_volume 
        : 0;
      
      const marketing_cost_per_sale = formData.marketing_data.leads_sold > 0
        ? formData.marketing_data.invested_value / formData.marketing_data.leads_sold
        : 0;

      const recordData = {
        workshop_id: workshop.id,
        entity_type: entityType,
        entity_id: entityType === "workshop" ? workshop.id : selectedEmployee?.id,
        employee_id: entityType === "employee" ? selectedEmployee?.id : null,
        employee_role: entityType === "employee" ? selectedEmployee?.job_role : "geral",
        reference_date: formData.reference_date,
        month: formData.month,
        projected_total: formData.projected_total,
        achieved_total: formData.achieved_total,
        revenue_total: revenue_total,
        revenue_parts: formData.revenue_parts,
        revenue_services: formData.revenue_services,
        average_ticket: average_ticket,
        customer_volume: formData.customer_volume,
        r70_i30: formData.r70_i30,
        tcmp2: tcmp2Value,
        pave_commercial: formData.pave_commercial,
        kit_master: formData.kit_master,
        sales_base: formData.sales_base,
        sales_marketing: formData.sales_marketing,
        clients_delivered: formData.clients_delivered,
        gps_vendas: formData.gps_vendas,
        clients_scheduled_base: formData.clients_scheduled_base,
        clients_delivered_base: formData.clients_delivered_base,
        clients_scheduled_mkt: formData.clients_scheduled_mkt,
        clients_delivered_mkt: formData.clients_delivered_mkt,
        clients_scheduled_referral: formData.clients_scheduled_referral,
        clients_delivered_referral: formData.clients_delivered_referral,
        marketing_data: {
          ...formData.marketing_data,
          cost_per_sale: marketing_cost_per_sale
        },
        revenue_distribution: distribution,
        rework_count: formData.rework_count,
        notes: formData.notes
      };

      if (editingRecord || existingRecordId) {
        const idToUpdate = editingRecord?.id || existingRecordId;
        await base44.entities.MonthlyGoalHistory.update(idToUpdate, recordData);
      } else {
        await base44.entities.MonthlyGoalHistory.create(recordData);
      }

      // Atualizar colaboradores com distribuição
      const allEmployees = [
        ...distribution.vendors,
        ...distribution.marketing,
        ...distribution.technicians
      ];

      for (const emp of allEmployees) {
        const employee = employees.find(e => e.id === emp.id);
        if (employee) {
          const currentMonth = formData.month;
          const dailyEntry = {
            date: formData.reference_date,
            revenue: emp.value,
            source: "distribution"
          };

          const updatedHistory = [...(employee.daily_production_history || []), dailyEntry];
          const monthEntries = updatedHistory.filter(e => e.date.startsWith(currentMonth));
          const monthlyTotal = monthEntries.reduce((sum, e) => sum + (e.revenue || 0), 0);

          await base44.entities.Employee.update(emp.id, {
            daily_production_history: updatedHistory,
            monthly_goals: {
              ...employee.monthly_goals,
              actual_revenue_achieved: monthlyTotal
            }
          });
        }
      }

      // Atualizar Workshop - sincronizar valores mensais realizados
      if (entityType === "workshop") {
        // Buscar todos os registros do mês atual para consolidar
        const currentMonthRecords = await base44.entities.MonthlyGoalHistory.filter({
          workshop_id: workshop.id,
          month: formData.month,
          entity_type: "workshop"
        });
        
        const allRecords = Array.isArray(currentMonthRecords) ? currentMonthRecords : [];
        
        // Consolidar valores do mês
        const monthlyConsolidated = {
          actual_revenue_achieved: allRecords.reduce((sum, r) => sum + (r.revenue_total || 0), 0),
          revenue_parts: allRecords.reduce((sum, r) => sum + (r.revenue_parts || 0), 0),
          revenue_services: allRecords.reduce((sum, r) => sum + (r.revenue_services || 0), 0),
          customer_volume: allRecords.reduce((sum, r) => sum + (r.customer_volume || 0), 0),
          pave_commercial: allRecords.reduce((sum, r) => sum + (r.pave_commercial || 0), 0),
          kit_master: allRecords.reduce((sum, r) => sum + (r.kit_master || 0), 0),
          gps_vendas: allRecords.reduce((sum, r) => sum + (r.gps_vendas || 0), 0),
          sales_base: allRecords.reduce((sum, r) => sum + (r.sales_base || 0), 0),
          sales_marketing: allRecords.reduce((sum, r) => sum + (r.sales_marketing || 0), 0),
          marketing: {
            leads_generated: allRecords.reduce((sum, r) => sum + (r.marketing_data?.leads_generated || 0), 0),
            leads_scheduled: allRecords.reduce((sum, r) => sum + (r.marketing_data?.leads_scheduled || 0), 0),
            leads_showed_up: allRecords.reduce((sum, r) => sum + (r.marketing_data?.leads_showed_up || 0), 0),
            leads_sold: allRecords.reduce((sum, r) => sum + (r.marketing_data?.leads_sold || 0), 0),
            invested_value: allRecords.reduce((sum, r) => sum + (r.marketing_data?.invested_value || 0), 0),
            revenue_from_traffic: allRecords.reduce((sum, r) => sum + (r.marketing_data?.revenue_from_traffic || 0), 0),
            cost_per_sale: 0
          }
        };
        
        // Calcular custo por venda
        if (monthlyConsolidated.marketing.leads_sold > 0) {
          monthlyConsolidated.marketing.cost_per_sale = 
            monthlyConsolidated.marketing.invested_value / monthlyConsolidated.marketing.leads_sold;
        }
        
        // Calcular ticket médio
        if (monthlyConsolidated.customer_volume > 0) {
          monthlyConsolidated.average_ticket = 
            monthlyConsolidated.actual_revenue_achieved / monthlyConsolidated.customer_volume;
        }

        await base44.entities.Workshop.update(workshop.id, {
          monthly_goals: {
            ...workshop.monthly_goals,
            ...monthlyConsolidated,
            month: formData.month
          }
        });
      }

      toast.success(editingRecord ? "Registro atualizado e sincronizado!" : "Faturamento distribuído e sincronizado!");
      setShowDistribution(false);
      if (onSave) onSave();
      onClose();
    } catch (error) {
      console.error("Error saving distribution:", error);
      toast.error("Erro ao distribuir faturamento");
    } finally {
      setIsSaving(false);
    }
  };

  // Renderizar campos baseado no tipo de entidade e função
  const renderFieldsForRole = () => {
    const role = entityType === "employee" ? selectedEmployee?.job_role : "geral";

    // Campos comuns - PREVISTO x REALIZADO
    const commonFields = (
      <>
        {/* Faturamento Peças */}
        <div className="border-l-4 border-blue-500 pl-3 py-2 bg-blue-50/30">
          <Label className="text-sm font-semibold text-gray-700 mb-2 block">Faturamento Peças</Label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-blue-600">PREVISTO</Label>
              <Input
                type="number"
                value={formData.projected_revenue_parts.toFixed(2)}
                disabled
                className="bg-blue-100 font-bold text-blue-700"
              />
            </div>
            <div>
              <Label className="text-xs text-green-600">REALIZADO</Label>
              <Input
                type="number"
                value={formData.revenue_parts}
                onChange={(e) => setFormData({...formData, revenue_parts: parseFloat(e.target.value) || 0})}
                className="font-semibold"
              />
            </div>
          </div>
        </div>

        {/* Faturamento Serviços */}
        <div className="border-l-4 border-green-500 pl-3 py-2 bg-green-50/30">
          <Label className="text-sm font-semibold text-gray-700 mb-2 block">Faturamento Serviços</Label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-blue-600">PREVISTO</Label>
              <Input
                type="number"
                value={formData.projected_revenue_services.toFixed(2)}
                disabled
                className="bg-blue-100 font-bold text-blue-700"
              />
            </div>
            <div>
              <Label className="text-xs text-green-600">REALIZADO</Label>
              <Input
                type="number"
                value={formData.revenue_services}
                onChange={(e) => setFormData({...formData, revenue_services: parseFloat(e.target.value) || 0})}
                className="font-semibold"
              />
            </div>
          </div>
        </div>

        {/* Faturamento Total (Automático) */}
        <div className="border-l-4 border-purple-500 pl-3 py-2 bg-purple-50/30">
          <Label className="text-sm font-semibold text-gray-700 mb-2 block">Faturamento Total (Automático)</Label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-blue-600">PREVISTO</Label>
              <Input
                value={(formData.projected_revenue_parts + formData.projected_revenue_services).toFixed(2)}
                disabled
                className="bg-blue-100 font-bold text-blue-700"
              />
            </div>
            <div>
              <Label className="text-xs text-green-600">REALIZADO</Label>
              <Input
                value={(formData.revenue_parts + formData.revenue_services).toFixed(2)}
                disabled
                className="bg-green-100 font-bold text-green-700"
              />
            </div>
          </div>
        </div>

        {/* Clientes */}
        <div className="border-l-4 border-orange-500 pl-3 py-2 bg-orange-50/30">
          <Label className="text-sm font-semibold text-gray-700 mb-2 block">Clientes (qtd)</Label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-blue-600">PREVISTO</Label>
              <Input
                type="number"
                value={formData.projected_customer_volume}
                disabled
                className="bg-blue-100 font-bold text-blue-700"
              />
            </div>
            <div>
              <Label className="text-xs text-green-600">REALIZADO</Label>
              <Input
                type="number"
                value={formData.customer_volume}
                onChange={(e) => setFormData({...formData, customer_volume: parseInt(e.target.value) || 0})}
                className="font-semibold"
              />
            </div>
          </div>
        </div>

        {/* Ticket Médio (Automático) */}
        <div className="border-l-4 border-pink-500 pl-3 py-2 bg-pink-50/30">
          <Label className="text-sm font-semibold text-gray-700 mb-2 block">Ticket Médio (Automático)</Label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-blue-600">PREVISTO</Label>
              <Input
                value={formData.projected_average_ticket.toFixed(2)}
                disabled
                className="bg-blue-100 font-bold text-blue-700"
              />
            </div>
            <div>
              <Label className="text-xs text-green-600">REALIZADO</Label>
              <Input
                value={formData.customer_volume > 0 
                  ? ((formData.revenue_parts + formData.revenue_services) / formData.customer_volume).toFixed(2)
                  : "0.00"}
                disabled
                className="bg-green-100 font-bold text-green-700"
              />
            </div>
          </div>
        </div>

        {/* R70/I30 - Automático */}
        <div className="border-l-4 border-cyan-500 pl-3 py-2 bg-cyan-50/30">
          <Label className="text-sm font-semibold text-gray-700 mb-2 block">R70/I30 (%) - Automático</Label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-cyan-600">R70 (Renda %)</Label>
              <Input
                type="number"
                value={formData.r70_i30.r70}
                onChange={(e) => {
                  const r70 = parseFloat(e.target.value) || 0;
                  const i30 = 100 - r70;
                  setFormData({...formData, r70_i30: { r70, i30 }});
                }}
                className="font-semibold"
              />
            </div>
            <div>
              <Label className="text-xs text-cyan-600">I30 (Investimento %)</Label>
              <Input
                type="number"
                value={formData.r70_i30.i30}
                onChange={(e) => {
                  const i30 = parseFloat(e.target.value) || 0;
                  const r70 = 100 - i30;
                  setFormData({...formData, r70_i30: { r70, i30 }});
                }}
                className="font-semibold"
              />
            </div>
          </div>
          <p className="text-xs text-cyan-700 mt-1">✓ Ajuste automático: R70 + I30 = 100%</p>
        </div>

        {/* TCMP2 - Automático do DRE */}
        <div className="border-l-4 border-emerald-500 pl-3 py-2 bg-emerald-50/30">
          <Label className="text-sm font-semibold text-gray-700 mb-2 block">TCMP² (Automático - do DRE)</Label>
          <Input
            type="number"
            value={tcmp2Value.toFixed(2)}
            disabled
            className="bg-emerald-100 font-bold text-emerald-700"
            title="Valor puxado automaticamente do DRE do mês atual"
          />
          <p className="text-xs text-emerald-700 mt-1">
            {tcmp2Value > 0 ? '✓ Valor do DRE carregado' : '⚠️ Cadastre o DRE do mês atual'}
          </p>
        </div>
      </>
    );

    // Campos específicos para Vendas
    if (role === "vendas" || role === "consultor_vendas") {
      return (
        <>
          {/* SEÇÃO 1: COMERCIAL/TELEMARKETING - PROSPECÇÃO */}
          <Card className="bg-indigo-50 border-2 border-indigo-300 mt-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                📞 Comercial / Telemarketing - Prospecção de Leads
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* PAVE - Comercial (AUTOMÁTICO) */}
              <div className="border-l-4 border-indigo-500 pl-3 py-2 bg-indigo-100">
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">
                  PAVE - Comercial ✨ (Soma Automática)
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-blue-600">PREVISTO</Label>
                    <Input
                      type="number"
                      value={formData.projected_pave_commercial.toFixed(2)}
                      disabled
                      className="h-9 bg-blue-100 font-bold text-blue-700"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-green-600">REALIZADO (Auto)</Label>
                    <Input
                      type="number"
                      value={formData.pave_commercial}
                      disabled
                      className="h-9 bg-green-100 font-bold text-green-700"
                      title="Soma automática: Agendados Base + Mkt + Indicação"
                    />
                  </div>
                </div>
                <p className="text-xs text-indigo-700 mt-1 font-medium">
                  ✓ {formData.clients_scheduled_base || 0} (Base) + {formData.clients_scheduled_mkt || 0} (Mkt) + {formData.clients_scheduled_referral || 0} (Indicação)
                </p>
              </div>

              {/* Kit Master (AUTOMÁTICO) */}
              <div className="border-l-4 border-yellow-500 pl-3 py-2 bg-yellow-100">
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Kit Master ✨ (Soma Automática)
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-blue-600">PREVISTO</Label>
                    <Input
                      type="number"
                      value={formData.projected_kit_master.toFixed(0)}
                      disabled
                      className="h-9 bg-blue-100 font-bold text-blue-700"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-green-600">REALIZADO (Auto)</Label>
                    <Input
                      type="number"
                      value={formData.kit_master}
                      disabled
                      className="h-9 bg-green-100 font-bold text-green-700"
                      title="Soma automática: Entregues Base + Mkt + Indicação"
                    />
                  </div>
                </div>
                <p className="text-xs text-yellow-700 mt-1 font-medium">
                  ✓ {formData.clients_delivered_base || 0} (Base) + {formData.clients_delivered_mkt || 0} (Mkt) + {formData.clients_delivered_referral || 0} (Indicação)
                </p>
              </div>

              {/* Valor Faturado Total */}
              <div className="border-l-4 border-emerald-500 pl-3 py-2 bg-emerald-100">
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">Valor Faturado Total (Auto)</Label>
                <Input
                  value={(formData.sales_base + formData.sales_marketing).toFixed(2)}
                  disabled
                  className="h-9 bg-emerald-100 font-bold text-emerald-700"
                />
                <p className="text-xs text-gray-500 mt-1">Vendas Base + Vendas Marketing</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {/* Clientes Base */}
                <div className="border-l-4 border-blue-500 pl-3 py-2 bg-blue-50/50">
                  <Label className="text-xs font-semibold text-gray-700 mb-1 block">Agendados Base</Label>
                  <Input
                    type="number"
                    value={formData.clients_scheduled_base}
                    onChange={(e) => setFormData({...formData, clients_scheduled_base: parseInt(e.target.value) || 0})}
                    className="h-9 font-semibold text-sm"
                  />
                </div>
                <div className="border-l-4 border-blue-600 pl-3 py-2 bg-blue-50/50">
                  <Label className="text-xs font-semibold text-gray-700 mb-1 block">Entregues Base</Label>
                  <Input
                    type="number"
                    value={formData.clients_delivered_base}
                    onChange={(e) => setFormData({...formData, clients_delivered_base: parseInt(e.target.value) || 0})}
                    className="h-9 font-semibold text-sm"
                  />
                </div>
                <div className="border-l-4 border-teal-500 pl-3 py-2 bg-teal-50/50">
                  <Label className="text-xs font-semibold text-gray-700 mb-1 block">Vendas Base R$</Label>
                  <Input
                    type="number"
                    value={formData.sales_base}
                    onChange={(e) => setFormData({...formData, sales_base: parseFloat(e.target.value) || 0})}
                    className="h-9 font-semibold text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {/* Clientes Marketing */}
                <div className="border-l-4 border-pink-500 pl-3 py-2 bg-pink-50/50">
                  <Label className="text-xs font-semibold text-gray-700 mb-1 block">Agendados Mkt</Label>
                  <Input
                    type="number"
                    value={formData.clients_scheduled_mkt}
                    onChange={(e) => setFormData({...formData, clients_scheduled_mkt: parseInt(e.target.value) || 0})}
                    className="h-9 font-semibold text-sm"
                  />
                </div>
                <div className="border-l-4 border-pink-600 pl-3 py-2 bg-pink-50/50">
                  <Label className="text-xs font-semibold text-gray-700 mb-1 block">Entregues Mkt</Label>
                  <Input
                    type="number"
                    value={formData.clients_delivered_mkt}
                    onChange={(e) => setFormData({...formData, clients_delivered_mkt: parseInt(e.target.value) || 0})}
                    className="h-9 font-semibold text-sm"
                  />
                </div>
                <div className="border-l-4 border-purple-500 pl-3 py-2 bg-purple-50/50">
                  <Label className="text-xs font-semibold text-gray-700 mb-1 block">Vendas Mkt R$</Label>
                  <Input
                    type="number"
                    value={formData.sales_marketing}
                    onChange={(e) => setFormData({...formData, sales_marketing: parseFloat(e.target.value) || 0})}
                    className="h-9 font-semibold text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Clientes Indicação */}
                <div className="border-l-4 border-orange-500 pl-3 py-2 bg-orange-50/50">
                  <Label className="text-xs font-semibold text-gray-700 mb-1 block">Agendados Indicação</Label>
                  <Input
                    type="number"
                    value={formData.clients_scheduled_referral}
                    onChange={(e) => setFormData({...formData, clients_scheduled_referral: parseInt(e.target.value) || 0})}
                    className="h-9 font-semibold text-sm"
                  />
                </div>
                <div className="border-l-4 border-orange-600 pl-3 py-2 bg-orange-50/50">
                  <Label className="text-xs font-semibold text-gray-700 mb-1 block">Entregues Indicação</Label>
                  <Input
                    type="number"
                    value={formData.clients_delivered_referral}
                    onChange={(e) => setFormData({...formData, clients_delivered_referral: parseInt(e.target.value) || 0})}
                    className="h-9 font-semibold text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SEÇÃO 2: VENDAS/ATENDIMENTO - FATURAMENTO */}
          <Card className="bg-green-50 border-2 border-green-300 mt-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                💰 Vendas / Atendimento / Balconista - Faturamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {commonFields}
              
              {/* GPS de Vendas */}
              <div className="border-l-4 border-cyan-500 pl-3 py-2 bg-white">
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">GPS de Vendas (qtd)</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-blue-600">PREVISTO</Label>
                    <Input
                      type="number"
                      value={formData.projected_gps_vendas}
                      disabled
                      className="h-9 bg-blue-100 font-bold text-blue-700"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-green-600">REALIZADO</Label>
                    <Input
                      type="number"
                      value={formData.gps_vendas}
                      onChange={(e) => setFormData({...formData, gps_vendas: parseInt(e.target.value) || 0})}
                      className="h-9 font-semibold"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      );
    }

    // Campos específicos para Comercial
    if (role === "comercial") {
      return (
        <>
          {/* PAVE - Comercial (AUTOMÁTICO) */}
          <div className="border-l-4 border-indigo-500 pl-3 py-2 bg-indigo-100">
            <Label className="text-sm font-semibold text-gray-700 mb-2 block">
              PAVE - Comercial ✨ (Soma Automática)
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-blue-600">PREVISTO</Label>
                <Input
                  type="number"
                  value={formData.projected_pave_commercial.toFixed(2)}
                  disabled
                  className="bg-blue-100 font-bold text-blue-700"
                />
              </div>
              <div>
                <Label className="text-xs text-green-600">REALIZADO (Auto)</Label>
                <Input
                  type="number"
                  value={formData.pave_commercial}
                  disabled
                  className="bg-green-100 font-bold text-green-700"
                  title="Soma automática: Agendados Base + Mkt + Indicação"
                />
              </div>
            </div>
            <p className="text-xs text-indigo-700 mt-1 font-medium">
              ✓ Calculado: {formData.clients_scheduled_base || 0} (Base) + {formData.clients_scheduled_mkt || 0} (Mkt) + {formData.clients_scheduled_referral || 0} (Indicação)
            </p>
          </div>

          {/* Kit Master (AUTOMÁTICO) */}
          <div className="border-l-4 border-yellow-500 pl-3 py-2 bg-yellow-100">
            <Label className="text-sm font-semibold text-gray-700 mb-2 block">
              Kit Master ✨ (Soma Automática)
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-blue-600">PREVISTO</Label>
                <Input
                  type="number"
                  value={formData.projected_kit_master.toFixed(2)}
                  disabled
                  className="bg-blue-100 font-bold text-blue-700"
                />
              </div>
              <div>
                <Label className="text-xs text-green-600">REALIZADO (Auto)</Label>
                <Input
                  type="number"
                  value={formData.kit_master}
                  disabled
                  className="bg-green-100 font-bold text-green-700"
                  title="Soma automática: Entregues Base + Mkt + Indicação"
                />
              </div>
            </div>
            <p className="text-xs text-yellow-700 mt-1 font-medium">
              ✓ {formData.clients_delivered_base || 0} (Base) + {formData.clients_delivered_mkt || 0} (Mkt) + {formData.clients_delivered_referral || 0} (Indicação)
            </p>
          </div>

          {/* Clientes Base */}
          <div className="space-y-3">
            <div className="border-l-4 border-blue-500 pl-3 py-2 bg-blue-50/30">
              <Label className="text-sm font-semibold text-gray-700 mb-2 block">Clientes Agendados Base (qtd)</Label>
              <Input
                type="number"
                value={formData.clients_scheduled_base}
                onChange={(e) => setFormData({...formData, clients_scheduled_base: parseInt(e.target.value) || 0})}
                className="font-semibold"
              />
            </div>
            <div className="border-l-4 border-green-500 pl-3 py-2 bg-green-50/30">
              <Label className="text-sm font-semibold text-gray-700 mb-2 block">Clientes Entregues Base (qtd)</Label>
              <Input
                type="number"
                value={formData.clients_delivered_base}
                onChange={(e) => setFormData({...formData, clients_delivered_base: parseInt(e.target.value) || 0})}
                className="font-semibold"
              />
            </div>
          </div>

          {/* Vendas Base */}
          <div className="border-l-4 border-teal-500 pl-3 py-2 bg-teal-50/30">
            <Label className="text-sm font-semibold text-gray-700 mb-2 block">Vendas Clientes Base (R$)</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-blue-600">PREVISTO</Label>
                <Input
                  type="number"
                  value={formData.projected_sales_base.toFixed(2)}
                  disabled
                  className="bg-blue-100 font-bold text-blue-700"
                />
              </div>
              <div>
                <Label className="text-xs text-green-600">REALIZADO</Label>
                <Input
                  type="number"
                  value={formData.sales_base}
                  onChange={(e) => setFormData({...formData, sales_base: parseFloat(e.target.value) || 0})}
                  className="font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Clientes Marketing */}
          <div className="space-y-3">
            <div className="border-l-4 border-pink-500 pl-3 py-2 bg-pink-50/30">
              <Label className="text-sm font-semibold text-gray-700 mb-2 block">Clientes Agendados Marketing (qtd)</Label>
              <Input
                type="number"
                value={formData.clients_scheduled_mkt}
                onChange={(e) => setFormData({...formData, clients_scheduled_mkt: parseInt(e.target.value) || 0})}
                className="font-semibold"
              />
            </div>
            <div className="border-l-4 border-purple-500 pl-3 py-2 bg-purple-50/30">
              <Label className="text-sm font-semibold text-gray-700 mb-2 block">Clientes Entregues Marketing (qtd)</Label>
              <Input
                type="number"
                value={formData.clients_delivered_mkt}
                onChange={(e) => setFormData({...formData, clients_delivered_mkt: parseInt(e.target.value) || 0})}
                className="font-semibold"
              />
            </div>
          </div>

          {/* Clientes Agendados Marketing */}
          <div className="border-l-4 border-pink-400 pl-3 py-2 bg-pink-50/30">
            <Label className="text-sm font-semibold text-gray-700 mb-2 block">Clientes Agendados Marketing (qtd)</Label>
            <Input
              type="number"
              value={formData.clients_scheduled_mkt}
              onChange={(e) => setFormData({...formData, clients_scheduled_mkt: parseInt(e.target.value) || 0})}
              className="font-semibold"
            />
          </div>

          {/* Clientes Entregues Marketing */}
          <div className="border-l-4 border-pink-600 pl-3 py-2 bg-pink-50/30">
            <Label className="text-sm font-semibold text-gray-700 mb-2 block">Clientes Entregues Marketing (qtd)</Label>
            <Input
              type="number"
              value={formData.clients_delivered_mkt}
              onChange={(e) => setFormData({...formData, clients_delivered_mkt: parseInt(e.target.value) || 0})}
              className="font-semibold"
            />
          </div>

          {/* Vendas Lead Marketing */}
          <div className="border-l-4 border-fuchsia-500 pl-3 py-2 bg-fuchsia-50/30">
            <Label className="text-sm font-semibold text-gray-700 mb-2 block">Vendas Lead Marketing (R$)</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-blue-600">PREVISTO</Label>
                <Input
                  type="number"
                  value={formData.projected_sales_marketing.toFixed(2)}
                  disabled
                  className="bg-blue-100 font-bold text-blue-700"
                />
              </div>
              <div>
                <Label className="text-xs text-green-600">REALIZADO</Label>
                <Input
                  type="number"
                  value={formData.sales_marketing}
                  onChange={(e) => setFormData({...formData, sales_marketing: parseFloat(e.target.value) || 0})}
                  className="font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Clientes Agendados Indicação */}
          <div className="border-l-4 border-orange-400 pl-3 py-2 bg-orange-50/30">
            <Label className="text-sm font-semibold text-gray-700 mb-2 block">Clientes Agendados Indicação (qtd)</Label>
              <Input
                type="number"
                value={formData.clients_scheduled_referral}
                onChange={(e) => setFormData({...formData, clients_scheduled_referral: parseInt(e.target.value) || 0})}
                className="font-semibold"
              />
            </div>

          {/* Clientes Entregues Indicação */}
          <div className="border-l-4 border-orange-600 pl-3 py-2 bg-orange-50/30">
            <Label className="text-sm font-semibold text-gray-700 mb-2 block">Clientes Entregues Indicação (qtd)</Label>
            <Input
              type="number"
              value={formData.clients_delivered_referral}
              onChange={(e) => setFormData({...formData, clients_delivered_referral: parseInt(e.target.value) || 0})}
              className="font-semibold"
            />
          </div>

          {/* Vendas Clientes Base */}
          <div className="border-l-4 border-teal-500 pl-3 py-2 bg-teal-50/30">
            <Label className="text-sm font-semibold text-gray-700 mb-2 block">Vendas Clientes Base (R$)</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-blue-600">PREVISTO</Label>
                <Input
                  type="number"
                  value={formData.projected_sales_base.toFixed(2)}
                  disabled
                  className="bg-blue-100 font-bold text-blue-700"
                />
              </div>
              <div>
                <Label className="text-xs text-green-600">REALIZADO</Label>
                <Input
                  type="number"
                  value={formData.sales_base}
                  onChange={(e) => setFormData({...formData, sales_base: parseFloat(e.target.value) || 0})}
                  className="font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Valor Faturado Total */}
          <div className="border-l-4 border-emerald-500 pl-3 py-2 bg-emerald-50/30">
            <Label className="text-sm font-semibold text-gray-700 mb-2 block">Valor Faturado Total (Auto)</Label>
            <Input
              value={(formData.sales_base + formData.sales_marketing).toFixed(2)}
              disabled
              className="bg-emerald-100 font-bold text-emerald-700"
            />
            <p className="text-xs text-gray-500 mt-1">Vendas Base + Vendas Marketing</p>
          </div>

          {/* Marketing Section for Comercial - PREVISTO x REALIZADO */}
          <Card className="bg-purple-50 border-2 border-purple-300">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold">📣 Marketing - Indicadores (Previsto x Realizado)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Lead Recebidos/Gerados */}
              <div className="border-l-4 border-purple-500 pl-3 py-2 bg-white">
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">Lead Recebidos (qtd)</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-blue-600">PREVISTO</Label>
                    <Input
                      type="number"
                      value={formData.projected_marketing.leads_generated}
                      disabled
                      className="h-9 bg-blue-100 font-bold text-blue-700"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-green-600">REALIZADO</Label>
                    <Input
                      type="number"
                      value={formData.marketing_data.leads_generated}
                      onChange={(e) => setFormData({
                        ...formData,
                        marketing_data: {...formData.marketing_data, leads_generated: parseInt(e.target.value) || 0}
                      })}
                      className="h-9 font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Lead Agendados */}
              <div className="border-l-4 border-indigo-500 pl-3 py-2 bg-white">
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">Lead Agendados (qtd)</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-blue-600">PREVISTO</Label>
                    <Input
                      type="number"
                      value={formData.projected_marketing.leads_scheduled}
                      disabled
                      className="h-9 bg-blue-100 font-bold text-blue-700"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-green-600">REALIZADO</Label>
                    <Input
                      type="number"
                      value={formData.marketing_data.leads_scheduled}
                      onChange={(e) => setFormData({
                        ...formData,
                        marketing_data: {...formData.marketing_data, leads_scheduled: parseInt(e.target.value) || 0}
                      })}
                      className="h-9 font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Comparecimentos */}
              <div className="border-l-4 border-yellow-500 pl-3 py-2 bg-white">
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">Comparecimentos (qtd)</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-blue-600">PREVISTO</Label>
                    <Input
                      type="number"
                      value={formData.projected_marketing.leads_showed_up}
                      disabled
                      className="h-9 bg-blue-100 font-bold text-blue-700"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-green-600">REALIZADO</Label>
                    <Input
                      type="number"
                      value={formData.marketing_data.leads_showed_up}
                      onChange={(e) => setFormData({
                        ...formData,
                        marketing_data: {...formData.marketing_data, leads_showed_up: parseInt(e.target.value) || 0}
                      })}
                      className="h-9 font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Lead Vendas */}
              <div className="border-l-4 border-green-500 pl-3 py-2 bg-white">
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">Lead Vendas (qtd)</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-blue-600">PREVISTO</Label>
                    <Input
                      type="number"
                      value={formData.projected_marketing.leads_sold}
                      disabled
                      className="h-9 bg-blue-100 font-bold text-blue-700"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-green-600">REALIZADO</Label>
                    <Input
                      type="number"
                      value={formData.marketing_data.leads_sold}
                      onChange={(e) => setFormData({
                        ...formData,
                        marketing_data: {...formData.marketing_data, leads_sold: parseInt(e.target.value) || 0}
                      })}
                      className="h-9 font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Valor Investido */}
              <div className="border-l-4 border-orange-500 pl-3 py-2 bg-white">
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">Valor Investido (R$)</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-blue-600">PREVISTO</Label>
                    <Input
                      type="number"
                      value={formData.projected_marketing.invested_value.toFixed(2)}
                      disabled
                      className="h-9 bg-blue-100 font-bold text-blue-700"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-green-600">REALIZADO</Label>
                    <Input
                      type="number"
                      value={formData.marketing_data.invested_value}
                      onChange={(e) => setFormData({
                        ...formData,
                        marketing_data: {...formData.marketing_data, invested_value: parseFloat(e.target.value) || 0}
                      })}
                      className="h-9 font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Custo por Venda - AUTOMÁTICO */}
              <div className="border-l-4 border-red-500 pl-3 py-2 bg-red-50/30">
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">Custo por Venda (Auto)</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-blue-600">PREVISTO</Label>
                    <Input
                      value={formData.projected_marketing.cost_per_sale.toFixed(2)}
                      disabled
                      className="h-9 bg-blue-100 font-bold text-blue-700"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-green-600">REALIZADO</Label>
                    <Input
                      value={(formData.marketing_data.leads_sold > 0 
                        ? formData.marketing_data.invested_value / formData.marketing_data.leads_sold 
                        : 0).toFixed(2)}
                      disabled
                      className="h-9 bg-green-100 font-bold text-green-700"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      );
    }

    // Campos específicos para Técnico
    if (role === "tecnico" || role === "lider_tecnico") {
      return (
        <>
          {commonFields}
          
          {/* Retrabalho */}
          <div className="border-l-4 border-red-500 pl-3 py-2 bg-red-50/30">
            <Label className="text-sm font-semibold text-gray-700 mb-2 block">Retrabalho (qtd)</Label>
            <Input
              type="number"
              value={formData.rework_count}
              onChange={(e) => setFormData({...formData, rework_count: parseInt(e.target.value) || 0})}
              className="font-semibold"
            />
          </div>
        </>
      );
    }

    // Campos para Marketing
    if (role === "marketing") {
      return (
        <>
          <Card className="bg-purple-50 border-purple-200">
            <CardHeader>
              <CardTitle className="text-sm">Marketing - Indicadores</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Lead Gerados (qtd)</Label>
                  <Input
                    type="number"
                    value={formData.marketing_data.leads_generated}
                    onChange={(e) => setFormData({
                      ...formData,
                      marketing_data: {...formData.marketing_data, leads_generated: parseInt(e.target.value) || 0}
                    })}
                  />
                </div>
                <div>
                  <Label>Lead Agendados (qtd)</Label>
                  <Input
                    type="number"
                    value={formData.marketing_data.leads_scheduled}
                    onChange={(e) => setFormData({
                      ...formData,
                      marketing_data: {...formData.marketing_data, leads_scheduled: parseInt(e.target.value) || 0}
                    })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Comparecimentos (qtd)</Label>
                  <Input
                    type="number"
                    value={formData.marketing_data.leads_showed_up}
                    onChange={(e) => setFormData({
                      ...formData,
                      marketing_data: {...formData.marketing_data, leads_showed_up: parseInt(e.target.value) || 0}
                    })}
                  />
                </div>
                <div>
                  <Label>Lead Vendas (qtd)</Label>
                  <Input
                    type="number"
                    value={formData.marketing_data.leads_sold}
                    onChange={(e) => setFormData({
                      ...formData,
                      marketing_data: {...formData.marketing_data, leads_sold: parseInt(e.target.value) || 0}
                    })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Valor Investido (Tráfego) R$</Label>
                  <Input
                    type="number"
                    value={formData.marketing_data.invested_value}
                    onChange={(e) => setFormData({
                      ...formData,
                      marketing_data: {...formData.marketing_data, invested_value: parseFloat(e.target.value) || 0}
                    })}
                  />
                </div>
                <div>
                  <Label>Valor Faturado Lead Tráfego (R$)</Label>
                  <Input
                    type="number"
                    value={formData.marketing_data.revenue_from_traffic}
                    onChange={(e) => setFormData({
                      ...formData,
                      marketing_data: {...formData.marketing_data, revenue_from_traffic: parseFloat(e.target.value) || 0}
                    })}
                  />
                </div>
              </div>
              <div>
                <Label>Custo por Venda (Auto)</Label>
                <Input
                  value={(formData.marketing_data.leads_sold > 0 
                    ? formData.marketing_data.invested_value / formData.marketing_data.leads_sold 
                    : 0).toFixed(2)}
                  disabled
                  className="bg-gray-100 font-bold"
                />
              </div>
            </CardContent>
          </Card>
        </>
      );
    }

    // Campos para Oficina Geral
    if (entityType === "workshop") {
      return (
        <>
          {/* SEÇÃO 1: COMERCIAL/TELEMARKETING - PROSPECÇÃO */}
          <Card className="bg-indigo-50 border-2 border-indigo-300 mt-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                📞 Comercial / Telemarketing - Prospecção de Leads
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* PAVE - Comercial (AUTOMÁTICO) */}
              <div className="border-l-4 border-indigo-500 pl-3 py-2 bg-indigo-100">
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">
                  PAVE - Comercial ✨ (Soma Automática)
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-blue-600">PREVISTO</Label>
                    <Input
                      type="number"
                      value={formData.projected_pave_commercial.toFixed(2)}
                      disabled
                      className="h-9 bg-blue-100 font-bold text-blue-700"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-green-600">REALIZADO (Auto)</Label>
                    <Input
                      type="number"
                      value={formData.pave_commercial}
                      disabled
                      className="h-9 bg-green-100 font-bold text-green-700"
                      title="Soma automática: Agendados Base + Mkt + Indicação"
                    />
                  </div>
                </div>
                <p className="text-xs text-indigo-700 mt-1 font-medium">
                  ✓ {formData.clients_scheduled_base || 0} (Base) + {formData.clients_scheduled_mkt || 0} (Mkt) + {formData.clients_scheduled_referral || 0} (Indicação)
                </p>
              </div>

              {/* Kit Master (AUTOMÁTICO) */}
              <div className="border-l-4 border-yellow-500 pl-3 py-2 bg-yellow-100">
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Kit Master ✨ (Soma Automática)
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-blue-600">PREVISTO</Label>
                    <Input
                      type="number"
                      value={formData.projected_kit_master.toFixed(0)}
                      disabled
                      className="h-9 bg-blue-100 font-bold text-blue-700"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-green-600">REALIZADO (Auto)</Label>
                    <Input
                      type="number"
                      value={formData.kit_master}
                      disabled
                      className="h-9 bg-green-100 font-bold text-green-700"
                      title="Soma automática: Entregues Base + Mkt + Indicação"
                    />
                  </div>
                </div>
                <p className="text-xs text-yellow-700 mt-1 font-medium">
                  ✓ {formData.clients_delivered_base || 0} (Base) + {formData.clients_delivered_mkt || 0} (Mkt) + {formData.clients_delivered_referral || 0} (Indicação)
                </p>
              </div>

              {/* Valor Faturado Total */}
              <div className="border-l-4 border-emerald-500 pl-3 py-2 bg-emerald-100">
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">Valor Faturado Total (Auto)</Label>
                <Input
                  value={(formData.sales_base + formData.sales_marketing).toFixed(2)}
                  disabled
                  className="h-9 bg-emerald-100 font-bold text-emerald-700"
                />
                <p className="text-xs text-gray-500 mt-1">Vendas Base + Vendas Marketing</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {/* Clientes Base */}
                <div className="border-l-4 border-blue-500 pl-3 py-2 bg-blue-50/50">
                  <Label className="text-xs font-semibold text-gray-700 mb-1 block">Agendados Base</Label>
                  <Input
                    type="number"
                    value={formData.clients_scheduled_base}
                    onChange={(e) => setFormData({...formData, clients_scheduled_base: parseInt(e.target.value) || 0})}
                    className="h-9 font-semibold text-sm"
                  />
                </div>
                <div className="border-l-4 border-blue-600 pl-3 py-2 bg-blue-50/50">
                  <Label className="text-xs font-semibold text-gray-700 mb-1 block">Entregues Base</Label>
                  <Input
                    type="number"
                    value={formData.clients_delivered_base}
                    onChange={(e) => setFormData({...formData, clients_delivered_base: parseInt(e.target.value) || 0})}
                    className="h-9 font-semibold text-sm"
                  />
                </div>
                <div className="border-l-4 border-teal-500 pl-3 py-2 bg-teal-50/50">
                  <Label className="text-xs font-semibold text-gray-700 mb-1 block">Vendas Base R$</Label>
                  <Input
                    type="number"
                    value={formData.sales_base}
                    onChange={(e) => setFormData({...formData, sales_base: parseFloat(e.target.value) || 0})}
                    className="h-9 font-semibold text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {/* Clientes Marketing */}
                <div className="border-l-4 border-pink-500 pl-3 py-2 bg-pink-50/50">
                  <Label className="text-xs font-semibold text-gray-700 mb-1 block">Agendados Mkt</Label>
                  <Input
                    type="number"
                    value={formData.clients_scheduled_mkt}
                    onChange={(e) => setFormData({...formData, clients_scheduled_mkt: parseInt(e.target.value) || 0})}
                    className="h-9 font-semibold text-sm"
                  />
                </div>
                <div className="border-l-4 border-pink-600 pl-3 py-2 bg-pink-50/50">
                  <Label className="text-xs font-semibold text-gray-700 mb-1 block">Entregues Mkt</Label>
                  <Input
                    type="number"
                    value={formData.clients_delivered_mkt}
                    onChange={(e) => setFormData({...formData, clients_delivered_mkt: parseInt(e.target.value) || 0})}
                    className="h-9 font-semibold text-sm"
                  />
                </div>
                <div className="border-l-4 border-purple-500 pl-3 py-2 bg-purple-50/50">
                  <Label className="text-xs font-semibold text-gray-700 mb-1 block">Vendas Mkt R$</Label>
                  <Input
                    type="number"
                    value={formData.sales_marketing}
                    onChange={(e) => setFormData({...formData, sales_marketing: parseFloat(e.target.value) || 0})}
                    className="h-9 font-semibold text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Clientes Indicação */}
                <div className="border-l-4 border-orange-500 pl-3 py-2 bg-orange-50/50">
                  <Label className="text-xs font-semibold text-gray-700 mb-1 block">Agendados Indicação</Label>
                  <Input
                    type="number"
                    value={formData.clients_scheduled_referral}
                    onChange={(e) => setFormData({...formData, clients_scheduled_referral: parseInt(e.target.value) || 0})}
                    className="h-9 font-semibold text-sm"
                  />
                </div>
                <div className="border-l-4 border-orange-600 pl-3 py-2 bg-orange-50/50">
                  <Label className="text-xs font-semibold text-gray-700 mb-1 block">Entregues Indicação</Label>
                  <Input
                    type="number"
                    value={formData.clients_delivered_referral}
                    onChange={(e) => setFormData({...formData, clients_delivered_referral: parseInt(e.target.value) || 0})}
                    className="h-9 font-semibold text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SEÇÃO 2: VENDAS/ATENDIMENTO - FATURAMENTO */}
          <Card className="bg-green-50 border-2 border-green-300 mt-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                💰 Vendas / Atendimento / Balconista - Faturamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {commonFields}
              
              {/* GPS de Vendas */}
              <div className="border-l-4 border-cyan-500 pl-3 py-2 bg-white">
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">GPS de Vendas (qtd)</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-blue-600">PREVISTO</Label>
                    <Input
                      type="number"
                      value={formData.projected_gps_vendas}
                      disabled
                      className="h-9 bg-blue-100 font-bold text-blue-700"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-green-600">REALIZADO</Label>
                    <Input
                      type="number"
                      value={formData.gps_vendas}
                      onChange={(e) => setFormData({...formData, gps_vendas: parseInt(e.target.value) || 0})}
                      className="h-9 font-semibold"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SEÇÃO 3: MARKETING */}
          <Card className="bg-purple-50 border-2 border-purple-300 mt-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold">📣 Marketing - Indicadores (Previsto x Realizado)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Lead Gerados */}
              <div className="border-l-4 border-purple-500 pl-3 py-2 bg-white">
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">Lead Gerados (qtd)</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-blue-600">PREVISTO</Label>
                    <Input
                      type="number"
                      value={formData.projected_marketing.leads_generated}
                      disabled
                      className="h-9 bg-blue-100 font-bold text-blue-700"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-green-600">REALIZADO</Label>
                    <Input
                      type="number"
                      value={formData.marketing_data.leads_generated}
                      onChange={(e) => setFormData({
                        ...formData,
                        marketing_data: {...formData.marketing_data, leads_generated: parseInt(e.target.value) || 0}
                      })}
                      className="h-9 font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Lead Agendados */}
              <div className="border-l-4 border-indigo-500 pl-3 py-2 bg-white">
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">Lead Agendados (qtd)</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-blue-600">PREVISTO</Label>
                    <Input
                      type="number"
                      value={formData.projected_marketing.leads_scheduled}
                      disabled
                      className="h-9 bg-blue-100 font-bold text-blue-700"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-green-600">REALIZADO</Label>
                    <Input
                      type="number"
                      value={formData.marketing_data.leads_scheduled}
                      onChange={(e) => setFormData({
                        ...formData,
                        marketing_data: {...formData.marketing_data, leads_scheduled: parseInt(e.target.value) || 0}
                      })}
                      className="h-9 font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Comparecimentos */}
              <div className="border-l-4 border-yellow-500 pl-3 py-2 bg-white">
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">Comparecimentos (qtd)</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-blue-600">PREVISTO</Label>
                    <Input
                      type="number"
                      value={formData.projected_marketing.leads_showed_up}
                      disabled
                      className="h-9 bg-blue-100 font-bold text-blue-700"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-green-600">REALIZADO</Label>
                    <Input
                      type="number"
                      value={formData.marketing_data.leads_showed_up}
                      onChange={(e) => setFormData({
                        ...formData,
                        marketing_data: {...formData.marketing_data, leads_showed_up: parseInt(e.target.value) || 0}
                      })}
                      className="h-9 font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Lead Vendas */}
              <div className="border-l-4 border-green-500 pl-3 py-2 bg-white">
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">Lead Vendas (qtd)</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-blue-600">PREVISTO</Label>
                    <Input
                      type="number"
                      value={formData.projected_marketing.leads_sold}
                      disabled
                      className="h-9 bg-blue-100 font-bold text-blue-700"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-green-600">REALIZADO</Label>
                    <Input
                      type="number"
                      value={formData.marketing_data.leads_sold}
                      onChange={(e) => setFormData({
                        ...formData,
                        marketing_data: {...formData.marketing_data, leads_sold: parseInt(e.target.value) || 0}
                      })}
                      className="h-9 font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Valor Investido */}
              <div className="border-l-4 border-orange-500 pl-3 py-2 bg-white">
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">Valor Investido (Tráfego) R$</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-blue-600">PREVISTO</Label>
                    <Input
                      type="number"
                      value={formData.projected_marketing.invested_value.toFixed(2)}
                      disabled
                      className="h-9 bg-blue-100 font-bold text-blue-700"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-green-600">REALIZADO</Label>
                    <Input
                      type="number"
                      value={formData.marketing_data.invested_value}
                      onChange={(e) => setFormData({
                        ...formData,
                        marketing_data: {...formData.marketing_data, invested_value: parseFloat(e.target.value) || 0}
                      })}
                      className="h-9 font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Valor Faturado Tráfego */}
              <div className="border-l-4 border-pink-500 pl-3 py-2 bg-white">
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">Valor Faturado Lead Tráfego (R$)</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-blue-600">PREVISTO</Label>
                    <Input
                      type="number"
                      value={formData.projected_marketing.revenue_from_traffic.toFixed(2)}
                      disabled
                      className="h-9 bg-blue-100 font-bold text-blue-700"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-green-600">REALIZADO</Label>
                    <Input
                      type="number"
                      value={formData.marketing_data.revenue_from_traffic}
                      onChange={(e) => setFormData({
                        ...formData,
                        marketing_data: {...formData.marketing_data, revenue_from_traffic: parseFloat(e.target.value) || 0}
                      })}
                      className="h-9 font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Custo por Venda - AUTOMÁTICO */}
              <div className="border-l-4 border-red-500 pl-3 py-2 bg-red-50/30">
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">Custo por Venda (Auto)</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-blue-600">PREVISTO</Label>
                    <Input
                      value={formData.projected_marketing.cost_per_sale.toFixed(2)}
                      disabled
                      className="h-9 bg-blue-100 font-bold text-blue-700"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-green-600">REALIZADO</Label>
                    <Input
                      value={(formData.marketing_data.leads_sold > 0 
                        ? formData.marketing_data.invested_value / formData.marketing_data.leads_sold 
                        : 0).toFixed(2)}
                      disabled
                      className="h-9 bg-green-100 font-bold text-green-700"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      );
    }

    return commonFields;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            {editingRecord ? "Editar Registro de Resultados" : "Registrar Resultados Mensal"}
          </DialogTitle>
          <DialogDescription>
            {editingRecord 
              ? "Atualize os dados realizados do período. As alterações sincronizarão automaticamente com os indicadores."
              : "Preencha os dados realizados do período. O campo 'Previsto' vem automaticamente do Desdobramento de Metas."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Entidade fixa: Oficina */}
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm font-semibold text-gray-900">{workshop?.name || 'Oficina'}</p>
                <p className="text-xs text-gray-600">Registro para a oficina (distribuição feita em "Salvar e Distribuir")</p>
              </div>
            </div>
          </div>

          {/* Data e Período */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Dia/Mês/Ano</Label>
              <Input
                type="date"
                value={formData.reference_date}
                onChange={(e) => {
                  const newDate = e.target.value;
                  setFormData({...formData, reference_date: newDate, month: newDate.substring(0, 7)});
                  setLoadedFromExisting(false);
                  checkExistingRecord(newDate);
                }}
                disabled={checkingExisting}
              />
              {checkingExisting && (
                <p className="text-xs text-blue-600 mt-1">
                  🔍 Verificando registros existentes...
                </p>
              )}
              {loadedFromExisting && (
                <p className="text-xs text-orange-600 font-semibold mt-1 bg-orange-50 p-2 rounded">
                  ⚠️ Registro existente carregado! Ao salvar você atualizará este registro.
                </p>
              )}
            </div>
            <div>
              <Label>Mês/Ano Referência</Label>
              <Input
                type="month"
                value={formData.month}
                onChange={(e) => setFormData({...formData, month: e.target.value})}
              />
            </div>
          </div>

          {/* Meta e Realizado */}
          <Card className="bg-green-50 border-2 border-green-200">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-green-600" />
                    PREVISTO (Meta) - R$
                  </Label>
                  <Input
                    type="number"
                    value={formData.projected_total}
                    disabled
                    className="bg-green-100 font-bold text-green-700 text-lg"
                    title="Puxado automaticamente do desdobramento de metas"
                  />
                  <p className="text-xs text-green-700 mt-1">
                    ✓ Do desdobramento + crescimento
                  </p>
                </div>
                <div>
                  <Label className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-purple-600" />
                    REALIZADO - R$
                  </Label>
                  <Input
                    type="number"
                    value={formData.achieved_total}
                    onChange={(e) => setFormData({...formData, achieved_total: parseFloat(e.target.value) || 0})}
                    className="font-bold text-lg"
                    placeholder="Digite o valor realizado..."
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Valor efetivamente faturado
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Campos específicos por tipo */}
          {(entityType === "workshop" || selectedEmployee) && (
            <div className="space-y-4">
              {renderFieldsForRole()}
            </div>
          )}

          {/* Observações */}
          <div>
            <Label>Observações</Label>
            <Input
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="Notas ou comentários sobre o período..."
            />
          </div>

          {/* Botões de ação */}
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveAndAnalyze} 
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              disabled={isSaving}
            >
              <Save className="w-4 h-4 mr-2" />
              Salvar e Distribuir
            </Button>
          </div>
          </div>
          </DialogContent>

          <RevenueDistributionModal
          open={showDistribution}
          onClose={() => setShowDistribution(false)}
          revenue={formData.revenue_parts + formData.revenue_services}
          employees={employees}
          onConfirm={handleDistributionConfirm}
          isLoading={isSaving}
          onOpenEmployeeRegistration={(employeeId) => {
            const emp = employees.find(e => e.id === employeeId);
            if (emp) {
              setShowDistribution(false);
              setEntityType("employee");
              setSelectedEmployee(emp);
            }
          }}
          />

          <VendaAtribuicoesModal
            open={showAtribuicoes}
            onClose={() => setShowAtribuicoes(false)}
            valorTotal={formData.revenue_parts + formData.revenue_services}
            valorPecas={formData.revenue_parts}
            valorServicos={formData.revenue_services}
            employees={employees}
            onConfirm={handleAtribuicoesConfirm}
            existingAtribuicoes={existingAtribuicoes}
          />
          </Dialog>
          );
          }