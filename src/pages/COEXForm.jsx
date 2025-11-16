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
import { Loader2, Save, Download, FileText, Plus, X } from "lucide-react";
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
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setFormData(prev => ({ ...prev, gestor_id: currentUser.id }));
    } catch (error) {
      console.error(error);
    }
  };

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
      if (contractId) {
        return await base44.entities.COEXContract.update(contractId, data);
      } else {
        return await base44.entities.COEXContract.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['coex-contracts']);
      toast.success("COEX salvo com sucesso!");
      navigate(createPageUrl("DetalhesColaborador") + `?id=${employeeId}`);
    },
    onError: () => toast.error("Erro ao salvar COEX")
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
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>COEX - ${employee?.full_name}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 40px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { color: #E31837; font-size: 28px; font-weight: bold; margin-bottom: 10px; }
          h1 { color: #E31837; font-size: 24px; margin-bottom: 20px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px; margin-bottom: 20px; }
          .info-item { border: 1px solid #ddd; padding: 8px; }
          .info-item label { font-size: 10px; color: #666; display: block; }
          .info-item div { font-weight: bold; margin-top: 3px; }
          .columns { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
          .column { border: 2px solid #E31837; }
          .column-header { background: #E31837; color: white; padding: 10px; font-weight: bold; text-align: center; }
          .column-content { padding: 15px; }
          .item { margin-bottom: 10px; line-height: 1.6; }
          .footer-text { background: #f5f5f5; padding: 15px; border: 1px solid #ddd; margin-bottom: 20px; font-size: 12px; line-height: 1.6; }
          .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; }
          .signature { text-align: center; }
          .signature-line { border-top: 2px solid #000; margin-top: 50px; padding-top: 10px; }
          .logo-footer { text-align: center; margin-top: 30px; }
          .logo-footer img { height: 40px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">Oficinas Master</div>
          <h1>Contrato de Expectativa</h1>
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
        
        <div class="logo-footer">
          <div class="logo">Oficinas Master</div>
          <div style="font-size: 12px; color: #666; margin-top: 5px;">ACELERADORA</div>
        </div>
        
        <script>window.print();</script>
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

        <form onSubmit={handleSubmit} className="space-y-6">
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
              <Download className="w-4 h-4 mr-2" />
              Exportar PDF
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