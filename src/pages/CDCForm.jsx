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
import { Loader2, Save, Download, Users, Printer } from "lucide-react";
import { toast } from "sonner";
import GuidedTour from "../components/help/GuidedTour";
import HelpButton from "../components/help/HelpButton";

export default function CDCForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const employeeId = searchParams.get('employee_id');

  const [user, setUser] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  const [formData, setFormData] = useState({
    nickname: "",
    birth_date: "",
    children: "",
    big_dream: "",
    hobbies: "",
    talents: "",
    favorite_food: "",
    personal_challenges: "",
    company_expectations: "",
    strengths: "",
    areas_to_develop: "",
    professional_skills: "",
    disc_profile: "",
    communication_channel: "",
    main_values: ""
  });

  const { data: employee, isLoading: loadingEmployee } = useQuery({
    queryKey: ['employee', employeeId],
    queryFn: async () => {
      const employees = await base44.entities.Employee.filter({ id: employeeId });
      return employees[0];
    },
    enabled: !!employeeId,
  });

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        const ownedWorkshops = await base44.entities.Workshop.filter({ owner_id: currentUser.id });
        const userWorkshop = ownedWorkshops && ownedWorkshops.length > 0 ? ownedWorkshops[0] : null;
        setWorkshop(userWorkshop);

      } catch (error) {
        console.error("Erro ao carregar dados iniciais:", error);
        toast.error("Erro ao carregar dados do usuário ou oficina.");
      }
    };
    loadInitialData();
  }, []);

  useEffect(() => {
    if (employee) {
      const initialFormData = employee.cdc_data || {};
      setFormData({
        ...initialFormData,
        birth_date: initialFormData.birth_date || employee.data_nascimento || "",
      });
    }
  }, [employee]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      // Salvar como histórico em CDCRecord
      const record = await base44.entities.CDCRecord.create({
        employee_id: employeeId,
        workshop_id: workshop?.id,
        evaluator_id: user.id,
        date: new Date().toISOString(),
        ...data
      });

      // Atualizar flag no funcionário apenas para facilitar listagem rápida
      await base44.entities.Employee.update(employeeId, {
        cdc_completed: true,
        cdc_data: data // Mantemos o último para referência rápida se necessário
      });

      return record;
    },
    onSuccess: async () => {
      // Track engagement
      try {
        await base44.functions.invoke('trackEngagement', {
          activityType: 'form_submission',
          details: { form: 'CDC', employeeId },
          workshopId: workshop?.id
        });
      } catch (err) {
        console.error("Failed to track engagement", err);
      }

      queryClient.invalidateQueries(['employee', employeeId]);
      toast.success("CDC salvo com sucesso! +50 XP");
      navigate(createPageUrl("DetalhesColaborador") + `?id=${employeeId}`);
    },
    onError: () => toast.error("Erro ao salvar CDC")
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleExportPDF = () => {
    if (!workshop) {
      toast.error("Dados da oficina não carregados para impressão.");
      return;
    }

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>CDC - ${employee?.full_name}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; }
          h1 { color: #E31837; text-align: center; margin-bottom: 20px; }
          .field { margin-bottom: 20px; }
          .field label { font-weight: bold; display: block; margin-bottom: 5px; }
          .field div { border: 1px solid #ddd; padding: 10px; background: #f9f9f9; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #E31837; padding-bottom: 20px; }
          .logo-container { display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 15px; }
          .logo-img { max-height: 80px; object-fit: contain; }
          .workshop-name { font-size: 24px; font-weight: bold; color: #333; text-transform: uppercase; }
          .slogan { font-size: 14px; color: #666; margin-bottom: 20px; font-style: italic; }
          .page-break { page-break-before: always; }
          .section-title { background-color: #f0f0f0; padding: 5px 10px; font-weight: bold; margin-top: 20px; border-left: 4px solid #E31837; }
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
          <h1 style="margin-top: 20px; font-size: 22px;">CDC - Conexão e Diagnóstico do Colaborador</h1>
          
          <table style="width: 100%; margin-top: 20px; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; width: 50%;"><strong>Colaborador:</strong> ${employee?.full_name || '-'}</td>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;" colspan="2"><strong>Avaliador:</strong> ${user?.full_name || '-'}</td>
            </tr>
          </table>
        </div>
        
        <div class="field">
          <label>Nome / Como gosta de ser chamado:</label>
          <div>${formData.nickname || '-'}</div>
        </div>
        
        <div class="field">
          <label>Data de Aniversário:</label>
          <div>${formData.birth_date || '-'}</div>
        </div>
        
        <div class="field">
          <label>Filhos (nomes e idades):</label>
          <div>${formData.children || '-'}</div>
        </div>
        
        <div class="field">
          <label>Qual o sonho grande:</label>
          <div>${formData.big_dream || '-'}</div>
        </div>
        
        <div class="field">
          <label>Hobbies:</label>
          <div>${formData.hobbies || '-'}</div>
        </div>
        
        <div class="field">
          <label>Talentos e dons pessoais:</label>
          <div>${formData.talents || '-'}</div>
        </div>
        
        <div class="field">
          <label>Prato e doce preferido:</label>
          <div>${formData.favorite_food || '-'}</div>
        </div>
        
        <div class="field">
          <label>Desafios Pessoais:</label>
          <div>${formData.personal_challenges || '-'}</div>
        </div>
        
        <div class="field">
          <label>Expectativa do colaborador em relação ao futuro da empresa:</label>
          <div>${formData.company_expectations || '-'}</div>
        </div>
        
        <div class="field">
          <label>Pontos Fortes:</label>
          <div>${formData.strengths || '-'}</div>
        </div>
        
        <div class="field">
          <label>Pontos a serem desenvolvidos:</label>
          <div>${formData.areas_to_develop || '-'}</div>
        </div>
        
        <div class="field">
          <label>Habilidades profissionais:</label>
          <div>${formData.professional_skills || '-'}</div>
        </div>
        
        <div class="field">
          <label>Perfil Comportamental (DISC):</label>
          <div>${formData.disc_profile || '-'}</div>
        </div>
        
        <div class="field">
          <label>Melhor canal de comunicação:</label>
          <div>${formData.communication_channel || '-'}</div>
        </div>
        
        <div class="field">
          <label>3 principais valores:</label>
          <div>${formData.main_values || '-'}</div>
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
      target: "cdc-personal-info",
      title: "Informações Pessoais",
      description: "Comece preenchendo dados pessoais do colaborador: nome, aniversário, filhos, sonhos e hobbies.",
      position: "bottom"
    },
    {
      target: "cdc-expectations",
      title: "Expectativas e Desenvolvimento",
      description: "Registre as expectativas do colaborador sobre a empresa, pontos fortes e áreas a desenvolver.",
      position: "bottom"
    },
    {
      target: "cdc-profile",
      title: "Perfil Comportamental",
      description: "Adicione o perfil DISC, valores e melhor canal de comunicação para gestão personalizada.",
      position: "top"
    },
    {
      target: "cdc-actions",
      title: "Salvar e Exportar",
      description: "Salve as informações e exporte em PDF para manter no arquivo do colaborador.",
      position: "top"
    }
  ];

  const helpContent = {
    title: "CDC - Conexão e Diagnóstico do Colaborador",
    description: "O CDC é uma ferramenta poderosa para criar conexão genuína com seu colaborador. Use essas informações para gestão personalizada, conversas difíceis e aumentar o salário emocional da equipe.",
    faqs: [
      {
        question: "Por que fazer o CDC?",
        answer: "O CDC ajuda você a conhecer profundamente cada colaborador, criar conexão e usar essas informações estrategicamente em feedbacks e alinhamentos."
      },
      {
        question: "Como usar as informações do CDC?",
        answer: "Use em conversas difíceis, para lembrar nomes de familiares, alinhar expectativas e demonstrar que você se importa com a pessoa."
      },
      {
        question: "O que é salário emocional?",
        answer: "É o investimento emocional que você faz no colaborador. Quanto mais alto, mais você pode cobrar sem que ele saia da empresa."
      },
      {
        question: "Quando aplicar o CDC?",
        answer: "Pode ser aplicado em uma reunião 1:1 especial ou durante a integração de um novo colaborador."
      }
    ]
  };

  const isLoading = loadingEmployee;
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
      <GuidedTour tourId="cdc_form" steps={tourSteps} autoStart={false} />

      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              CDC - Conexão e Diagnóstico do Colaborador
            </h1>
          </div>
          <p className="text-gray-600">
            Colaborador: <strong>{employee?.full_name}</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card id="cdc-personal-info">
            <CardHeader>
              <CardTitle>Informações Pessoais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nome / Como gosta de ser chamado</Label>
                  <Input
                    value={formData.nickname}
                    onChange={(e) => setFormData({...formData, nickname: e.target.value})}
                    placeholder="Apelido ou nome preferido"
                  />
                </div>
                <div>
                  <Label>Data de Aniversário</Label>
                  <Input
                    type="date"
                    value={formData.birth_date}
                    onChange={(e) => setFormData({...formData, birth_date: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <Label>Filhos (nomes e idades)</Label>
                <Textarea
                  value={formData.children}
                  onChange={(e) => setFormData({...formData, children: e.target.value})}
                  placeholder="Ex: João - 5 anos, Maria - 8 anos"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Qual o sonho grande</Label>
                  <Textarea
                    value={formData.big_dream}
                    onChange={(e) => setFormData({...formData, big_dream: e.target.value})}
                    placeholder="Ex: Ter minha própria oficina, viajar pelo mundo..."
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Hobbies</Label>
                  <Textarea
                    value={formData.hobbies}
                    onChange={(e) => setFormData({...formData, hobbies: e.target.value})}
                    placeholder="Ex: Futebol, videogame, pescaria..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Talentos e dons pessoais</Label>
                  <Textarea
                    value={formData.talents}
                    onChange={(e) => setFormData({...formData, talents: e.target.value})}
                    placeholder="Ex: Bom comunicador, organizado..."
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Prato e doce preferido</Label>
                  <Textarea
                    value={formData.favorite_food}
                    onChange={(e) => setFormData({...formData, favorite_food: e.target.value})}
                    placeholder="Ex: Feijoada, Brigadeiro..."
                    rows={3}
                  />
                </div>
              </div>

              <div>
                <Label>Desafios Pessoais</Label>
                <Textarea
                  value={formData.personal_challenges}
                  onChange={(e) => setFormData({...formData, personal_challenges: e.target.value})}
                  placeholder="Dificuldades ou desafios que o colaborador enfrenta"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card id="cdc-expectations">
            <CardHeader>
              <CardTitle>Expectativas e Desenvolvimento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Expectativa do colaborador em relação ao futuro da empresa</Label>
                <Textarea
                  value={formData.company_expectations}
                  onChange={(e) => setFormData({...formData, company_expectations: e.target.value})}
                  placeholder="O que ele espera da empresa? Onde quer chegar?"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Pontos Fortes</Label>
                  <Textarea
                    value={formData.strengths}
                    onChange={(e) => setFormData({...formData, strengths: e.target.value})}
                    placeholder="Principais forças"
                    rows={4}
                  />
                </div>
                <div>
                  <Label>Pontos a serem desenvolvidos</Label>
                  <Textarea
                    value={formData.areas_to_develop}
                    onChange={(e) => setFormData({...formData, areas_to_develop: e.target.value})}
                    placeholder="Áreas de melhoria"
                    rows={4}
                  />
                </div>
                <div>
                  <Label>Habilidades profissionais</Label>
                  <Textarea
                    value={formData.professional_skills}
                    onChange={(e) => setFormData({...formData, professional_skills: e.target.value})}
                    placeholder="Competências técnicas"
                    rows={4}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card id="cdc-profile">
            <CardHeader>
              <CardTitle>Perfil Comportamental</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Perfil Comportamental (DISC)</Label>
                  <Input
                    value={formData.disc_profile}
                    onChange={(e) => setFormData({...formData, disc_profile: e.target.value})}
                    placeholder="Ex: Dominante, Influente..."
                  />
                </div>
                <div>
                  <Label>Melhor canal de comunicação</Label>
                  <Input
                    value={formData.communication_channel}
                    onChange={(e) => setFormData({...formData, communication_channel: e.target.value})}
                    placeholder="Ex: Presencial, WhatsApp..."
                  />
                </div>
                <div>
                  <Label>3 principais valores</Label>
                  <Input
                    value={formData.main_values}
                    onChange={(e) => setFormData({...formData, main_values: e.target.value})}
                    placeholder="Ex: Honestidade, Família..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div id="cdc-actions" className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(createPageUrl("DetalhesColaborador") + `?id=${employeeId}`)}
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
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar CDC
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}