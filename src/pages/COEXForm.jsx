import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Download, FileText, Plus, X, AlertTriangle, Printer } from "lucide-react";
import { differenceInMonths, addMonths, format } from "date-fns";
import { toast } from "sonner";
import GuidedTour from "../components/help/GuidedTour";
import HelpButton from "../components/help/HelpButton";

export default function COEXForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const employeeId = searchParams.get('employee_id');
  const contractId = searchParams.get('id');

  const [user, setUser] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  const [coexRestriction, setCoexRestriction] = useState({ restricted: false, nextDate: null });
  const [formData, setFormData] = useState({
    employee_id: employeeId || "",
    gestor_id: "",
    department: "",
    start_date: "",
    end_date: "",
    deliverables_goals: [""],
    behavior_attitude: [""],
    next_alignment_date: "",
    employee_signature: "",
    gestor_signature: ""
  });

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        const ownedWorkshops = await base44.entities.Workshop.filter({ owner_id: currentUser.id });
        const userWorkshop = ownedWorkshops && ownedWorkshops.length > 0 ? ownedWorkshops[0] : null;
        setWorkshop(userWorkshop);

        setFormData(prev => ({ ...prev, gestor_id: currentUser.id }));

        // Check restrictions
        if (employeeId && !contractId) {
          const contracts = await base44.entities.COEXContract.filter({ employee_id: employeeId });
          if (contracts && contracts.length > 0) {
            // Sort by creation date descending
            const sortedContracts = contracts.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
            const lastContract = sortedContracts[0];
            const lastDate = new Date(lastContract.created_date);
            const monthsDiff = differenceInMonths(new Date(), lastDate);
            
            if (monthsDiff < 6) {
              const nextAllowedDate = addMonths(lastDate, 6);
              setCoexRestriction({ restricted: true, nextDate: nextAllowedDate });
            }
          }
        }

      } catch (error) {
        console.error("Erro ao carregar dados iniciais:", error);
        toast.error("Erro ao carregar dados do usuário ou oficina.");
      }
    };
    loadInitialData();
  }, [employeeId, contractId]);

  const { data: employee, isLoading: loadingEmployee } = useQuery({
    queryKey: ['employee', employeeId],
    queryFn: () => base44.entities.Employee.filter({ id: employeeId }),
    enabled: !!employeeId,
    select: (data) => data[0]
  });

  const { data: contract, isLoading: loadingContract } = useQuery({
    queryKey: ['coex-contract', contractId],
    queryFn: () => base44.entities.COEXContract.filter({ id: contractId }),
    enabled: !!contractId,
    select: (data) => data[0]
  });

  useEffect(() => {
    if (contract) {
      setFormData(contract);
    }
  }, [contract]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      let contractResult;
      if (contractId) {
        contractResult = await base44.entities.COEXContract.update(contractId, data);
      } else {
        contractResult = await base44.entities.COEXContract.create(data);
      }

      // Atualizar o funcionário para marcar o COEX como completo
      if (employeeId) {
        await base44.entities.Employee.update(employeeId, { coex_completed: true });
      }

      // Criar lembretes mensais de feedback se for um novo contrato
      if (!contractId && data.start_date && data.end_date && workshop) {
        try {
          const start = new Date(data.start_date);
          const end = new Date(data.end_date);
          const months = differenceInMonths(end, start);
          
          const reminders = [];
          for (let i = 1; i <= months; i++) {
            const reminderDate = addMonths(start, i);
            reminders.push({
              contract_id: contractResult.id,
              employee_id: employeeId,
              workshop_id: workshop.id,
              due_date: format(reminderDate, 'yyyy-MM-dd'),
              month_reference: format(reminderDate, 'yyyy-MM'),
              status: 'pending',
              target_roles: ['admin', 'rh', 'gestor']
            });
          }
          
          // Parallel creation of reminders
          await Promise.all(reminders.map(r => base44.entities.COEXFeedbackReminder.create(r)));
        } catch (e) {
          console.error("Erro ao criar lembretes de feedback:", e);
        }
      }

      return contractResult;
    },
    onSuccess: async () => {
      // Track engagement
      try {
        await base44.functions.invoke('trackEngagement', {
          activityType: 'form_submission',
          details: { form: 'COEX', employeeId, contractId },
          workshopId: workshop?.id
        });
      } catch (err) {
        console.error("Failed to track engagement", err);
      }

      queryClient.invalidateQueries(['coex-contracts']);
      queryClient.invalidateQueries(['employee', employeeId]);
      toast.success("COEX salvo com sucesso! +50 XP");
      navigate(createPageUrl("DetalhesColaborador") + `?id=${employeeId}`);
    },
    onError: (error) => {
      console.error(error);
      toast.error("Erro ao salvar COEX");
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const addDeliverable = () => {
    setFormData({
      ...formData,
      deliverables_goals: [...formData.deliverables_goals, ""]
    });
  };

  const removeDeliverable = (index) => {
    const newDeliverables = formData.deliverables_goals.filter((_, i) => i !== index);
    setFormData({ ...formData, deliverables_goals: newDeliverables });
  };

  const updateDeliverable = (index, value) => {
    const newDeliverables = [...formData.deliverables_goals];
    newDeliverables[index] = value;
    setFormData({ ...formData, deliverables_goals: newDeliverables });
  };

  const addBehavior = () => {
    setFormData({
      ...formData,
      behavior_attitude: [...formData.behavior_attitude, ""]
    });
  };

  const removeBehavior = (index) => {
    const newBehaviors = formData.behavior_attitude.filter((_, i) => i !== index);
    setFormData({ ...formData, behavior_attitude: newBehaviors });
  };

  const updateBehavior = (index, value) => {
    const newBehaviors = [...formData.behavior_attitude];
    newBehaviors[index] = value;
    setFormData({ ...formData, behavior_attitude: newBehaviors });
  };

  const handleExportPDF = () => {
    if (!workshop || !user) {
      toast.error("Dados da oficina ou usuário não carregados para impressão.");
      return;
    }
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>COEX - ${employee?.full_name}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
          .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #E31837; padding-bottom: 20px; }
          .logo-container { display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 15px; }
          .logo-img { max-height: 80px; object-fit: contain; }
          .workshop-name { font-size: 24px; font-weight: bold; color: #333; text-transform: uppercase; }
          .slogan { font-size: 14px; color: #666; margin-bottom: 20px; font-style: italic; }
          h1 { color: #E31837; font-size: 28px; margin-bottom: 20px; border-bottom: 2px solid #E31837; padding-bottom: 10px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px; margin-bottom: 30px; }
          .info-item { border: 1px solid #ddd; padding: 10px; background: #f9f9f9; border-radius: 4px; }
          .info-item label { font-size: 11px; color: #666; display: block; text-transform: uppercase; }
          .info-item div { font-weight: bold; margin-top: 5px; font-size: 14px; }
          .columns { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
          .column { border: 2px solid #E31837; border-radius: 8px; overflow: hidden; }
          .column-header { background: #E31837; color: white; padding: 15px; font-weight: bold; text-align: center; text-transform: uppercase; letter-spacing: 1px; }
          .column-content { padding: 20px; background: #fff; }
          .item { margin-bottom: 12px; line-height: 1.6; position: relative; padding-left: 15px; }
          .item:before { content: "•"; position: absolute; left: 0; color: #E31837; }
          .footer-text { background: #f5f5f5; padding: 20px; border: 1px solid #ddd; margin-bottom: 30px; font-size: 13px; line-height: 1.8; border-radius: 4px; text-align: justify; }
          .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; margin-top: 60px; }
          .signature { text-align: center; }
          .signature-line { border-top: 1px solid #000; margin-top: 60px; padding-top: 15px; width: 80%; margin-left: auto; margin-right: auto; }
          @media print { 
            body { padding: 0; } 
            .column { break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo-container">
            ${workshop.logo_url ? `<img src="${workshop.logo_url}" alt="Logo da Oficina" class="logo-img"/>` : ''}
            ${!workshop.logo_url ? `<div class="workshop-name">${workshop.name}</div>` : ''}
          </div>
          ${workshop.logo_url ? `<div class="workshop-name" style="font-size: 18px; margin-top: 5px;">${workshop.name}</div>` : ''}
          <div class="slogan">Oficinas Master Educação Empresarial</div>
          <h1 style="margin-top: 20px; font-size: 26px; color: #E31837;">Contrato de Expectativa</h1>
        </div>
        
        <div class="info-grid">
          <div class="info-item">
            <label>Colaborador:</label>
            <div>${employee?.full_name || '-'}</div>
          </div>
          <div class="info-item">
            <label>Gestor:</label>
            <div>${user?.full_name || '-'}</div>
          </div>
          <div class="info-item">
            <label>Dptº:</label>
            <div>${formData.department || '-'}</div>
          </div>
          <div class="info-item">
            <label>Período:</label>
            <div>Início: ${formData.start_date || '-'}<br>Fim: ${formData.end_date || '-'}</div>
          </div>
        </div>
        
        <div class="columns">
          <div class="column">
            <div class="column-header">Entregáveis/Metas</div>
            <div class="column-content">
              ${formData.deliverables_goals.map((item, i) => `
                <div class="item">${item || '-'}</div>
              `).join('')}
            </div>
          </div>
          
          <div class="column">
            <div class="column-header">Comportamento/Atitude/Postura</div>
            <div class="column-content">
              ${formData.behavior_attitude.map((item, i) => `
                <div class="item">${item || '-'}</div>
              `).join('')}
            </div>
          </div>
        </div>
        
        <div class="footer-text">
          Espero que as expectativas acima alinhadas, possam ser cumpridas com responsabilidade a fim de mantermos a 
          qualidade em nossos serviços prestados, e para que possamos buscar constantemente o desenvolvimento alcançando 
          novos desafios e novas metas.
        </div>
        
        <div style="margin-bottom: 10px;">
          <strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}
          &nbsp;&nbsp;&nbsp;&nbsp;
          <strong>Data do próximo alinhamento:</strong> ${formData.next_alignment_date ? new Date(formData.next_alignment_date).toLocaleDateString('pt-BR') : '-'}
        </div>
        
        <div class="signatures">
          <div class="signature">
            <div class="signature-line">
              Colaborador<br>
              ${employee?.full_name || ''}
            </div>
          </div>
          <div class="signature">
            <div class="signature-line">
              Gestor<br>
              ${user?.full_name || ''}
            </div>
          </div>
        </div>
        
        <div class="logo-footer" style="text-align: center; margin-top: 30px;">
          ${workshop.logo_url ? `<img src="${workshop.logo_url}" alt="Logo da Oficina" class="logo-img" style="max-height: 40px;"/>` : `<div class="workshop-name">${workshop.name}</div>`}
          <div style="font-size: 12px; color: #666; margin-top: 5px;">ACELERADORA</div>
        </div>
        
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.close();
            }, 500);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const tourSteps = [
    {
      target: "coex-header",
      title: "Contrato de Expectativa",
      description: "O COEX é um acordo formal entre gestor e colaborador que alinha expectativas, metas e comportamentos esperados.",
      position: "bottom"
    },
    {
      target: "coex-deliverables",
      title: "Entregáveis e Metas",
      description: "Liste as entregas esperadas: quantos carros atendidos, ticket médio, rentabilidade, etc.",
      position: "bottom"
    },
    {
      target: "coex-behaviors",
      title: "Comportamentos e Atitudes",
      description: "Defina valores e comportamentos inegociáveis que o colaborador deve demonstrar.",
      position: "bottom"
    },
    {
      target: "coex-actions",
      title: "Finalização",
      description: "Salve o contrato e exporte em PDF para ambos assinarem. Renovar a cada 6-12 meses.",
      position: "top"
    }
  ];

  const helpContent = {
    title: "COEX - Contrato de Expectativa",
    description: "O COEX é uma ferramenta de gestão que cria compromissos emocionais entre gestor e colaborador. Não tem validade jurídica, mas eleva o salário emocional e reduz turnover.",
    faqs: [
      {
        question: "O COEX tem validade jurídica?",
        answer: "Não. O COEX tem validade emocional. Ele cria compromisso e clareza sobre o que ambos esperam um do outro."
      },
      {
        question: "Como definir metas?",
        answer: "Seja específico: número de carros atendidos, ticket médio, rentabilidade R70/I30, retorno, qualidade. Use dados reais."
      },
      {
        question: "Como definir comportamentos?",
        answer: "Liste valores inegociáveis: pontualidade, proatividade, trabalho em equipe, alinhamento com missão e valores da empresa."
      },
      {
        question: "Quando renovar o COEX?",
        answer: "Renove a cada 6 ou 12 meses. Use esse momento para realinhar expectativas e celebrar conquistas."
      }
    ]
  };

  const isLoading = loadingEmployee || loadingContract;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
      <HelpButton {...helpContent} />
      <GuidedTour tourId="coex_form" steps={tourSteps} autoStart={false} />

      <div className="max-w-6xl mx-auto">
        <div id="coex-header" className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-8 h-8 text-red-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              COEX - Contrato de Expectativa
            </h1>
          </div>
          <p className="text-gray-600">
            {employee ? `Colaborador: ${employee.full_name}` : 'Novo Contrato'}
          </p>
        </div>

        {coexRestriction.restricted && (
          <div className="mb-6 bg-orange-50 border-l-4 border-orange-500 p-4">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-orange-500 mr-3 mt-0.5" />
              <div>
                <h3 className="text-orange-800 font-bold">Criação de COEX Restrita</h3>
                <p className="text-orange-700 text-sm mt-1">
                  Este colaborador já possui um COEX recente. Um novo contrato só poderá ser criado a partir de <strong>{format(coexRestriction.nextDate, 'dd/MM/yyyy')}</strong> (6 meses após o anterior).
                </p>
                <p className="text-orange-700 text-sm mt-2">
                  Recomendamos revisar o contrato vigente e realizar os feedbacks mensais.
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className={`space-y-6 ${coexRestriction.restricted ? 'opacity-50 pointer-events-none' : ''}`}>
          <Card>
            <CardHeader>
              <CardTitle>Informações do Contrato</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Departamento</Label>
                  <Input
                    value={formData.department}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                    placeholder="Ex: Logística"
                  />
                </div>
                <div>
                  <Label>Data de Início</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label>Data de Fim</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card id="coex-deliverables" className="border-2 border-red-200">
              <CardHeader className="bg-red-50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-red-900">Entregáveis/Metas</CardTitle>
                  <Button type="button" size="sm" onClick={addDeliverable} variant="outline">
                    <Plus className="w-4 h-4 mr-1" />
                    Adicionar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                {formData.deliverables_goals.map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <Textarea
                      value={item}
                      onChange={(e) => updateDeliverable(index, e.target.value)}
                      placeholder="Ex: Manter material organizado, 15 carros/mês..."
                      rows={2}
                      className="flex-1"
                    />
                    {formData.deliverables_goals.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeDeliverable(index)}
                      >
                        <X className="w-4 h-4 text-red-600" />
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card id="coex-behaviors" className="border-2 border-red-200">
              <CardHeader className="bg-red-50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-red-900">Comportamento/Atitude/Postura</CardTitle>
                  <Button type="button" size="sm" onClick={addBehavior} variant="outline">
                    <Plus className="w-4 h-4 mr-1" />
                    Adicionar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                {formData.behavior_attitude.map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <Textarea
                      value={item}
                      onChange={(e) => updateBehavior(index, e.target.value)}
                      placeholder="Ex: Manter foco, zelar pela harmonia, ser proativo..."
                      rows={2}
                      className="flex-1"
                    />
                    {formData.behavior_attitude.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeBehavior(index)}
                      >
                        <X className="w-4 h-4 text-red-600" />
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
                <p className="text-sm text-gray-700 leading-relaxed">
                  <strong>Importante:</strong> Espero que as expectativas acima alinhadas, possam ser cumpridas com 
                  responsabilidade a fim de mantermos a qualidade em nossos serviços prestados, e para que possamos 
                  buscar constantemente o desenvolvimento alcançando novos desafios e novas metas.
                </p>
              </div>

              <div>
                <Label>Data do próximo alinhamento</Label>
                <Input
                  type="date"
                  value={formData.next_alignment_date}
                  onChange={(e) => setFormData({...formData, next_alignment_date: e.target.value})}
                />
              </div>
            </CardContent>
          </Card>

          <div id="coex-actions" className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(createPageUrl("Colaboradores"))}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleExportPDF}
              className="flex-1"
            >
              <Printer className="w-4 h-4 mr-2" />
              Imprimir / PDF
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-red-600 hover:bg-red-700"
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar COEX
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}