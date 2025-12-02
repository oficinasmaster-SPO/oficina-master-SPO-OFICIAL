import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Edit2, Trash2, Sparkles, Target, Eye, Heart, Users, TrendingUp, Calendar as CalendarIcon, FileText, Mail, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Checkbox } from "@/components/ui/checkbox";

const pillarLabels = {
  proposito: { label: "Propósito", icon: Target, color: "blue" },
  missao: { label: "Missão", icon: Target, color: "green" },
  visao: { label: "Visão", icon: Eye, color: "purple" },
  valores: { label: "Valores", icon: Heart, color: "pink" },
  postura_atitudes: { label: "Postura e Atitudes", icon: Users, color: "indigo" },
  comportamentos_inaceitaveis: { label: "Comportamentos Inaceitáveis", icon: Users, color: "red" },
  rituais_cultura: { label: "Rituais de Cultura", icon: Sparkles, color: "yellow" },
  sistemas_regras: { label: "Sistemas e Regras", icon: TrendingUp, color: "cyan" },
  comunicacao_interna: { label: "Comunicação Interna", icon: Users, color: "orange" },
  lideranca: { label: "Liderança", icon: Users, color: "violet" },
  foco_cliente: { label: "Foco no Cliente", icon: Heart, color: "rose" },
  performance_responsabilidade: { label: "Performance e Responsabilidade", icon: TrendingUp, color: "emerald" },
  desenvolvimento_continuo: { label: "Desenvolvimento Contínuo", icon: TrendingUp, color: "teal" },
  identidade_pertencimento: { label: "Identidade e Pertencimento", icon: Sparkles, color: "fuchsia" }
};

const frequencyLabels = {
  diario: "Diário",
  semanal: "Semanal",
  quinzenal: "Quinzenal",
  mensal: "Mensal",
  continuo: "Contínuo",
  trimestral: "Trimestral",
  eventual: "Eventual"
};

const defaultRituals = [
  { 
    name: "Ritual de Alinhamento Cultural", 
    pillar: "rituais_cultura", 
    frequency: "mensal",
    description: "Reunião mensal para alinhar os valores e práticas culturais da empresa com toda a equipe.",
    responsible_role: "Líder/Dono",
    implementation_steps: ["Reunir toda equipe", "Revisar missão, visão e valores", "Compartilhar histórias de sucesso", "Alinhar expectativas"]
  },
  { 
    name: "Ritual do Dono (Pensar Como Dono)", 
    pillar: "postura_atitudes", 
    frequency: "continuo",
    description: "Incentivar cada colaborador a pensar como dono do negócio, tomando decisões com responsabilidade e visão estratégica.",
    responsible_role: "Todos",
    implementation_steps: ["Incentivar autonomia", "Compartilhar números do negócio", "Envolver nas decisões", "Reconhecer iniciativas"]
  },
  { 
    name: "Ritual da Excelência", 
    pillar: "foco_cliente", 
    frequency: "continuo",
    description: "Buscar excelência em cada atendimento e serviço prestado ao cliente.",
    responsible_role: "Todos",
    implementation_steps: ["Padrão de qualidade definido", "Checklist de excelência", "Feedback do cliente", "Melhoria contínua"]
  },
  { 
    name: "Ritual de Clareza", 
    pillar: "comunicacao_interna", 
    frequency: "continuo",
    description: "Manter comunicação clara e objetiva em todas as interações da equipe.",
    responsible_role: "Todos",
    implementation_steps: ["Comunicar expectativas", "Confirmar entendimento", "Documentar acordos", "Revisar periodicamente"]
  },
  { 
    name: "Ritual de Conexão", 
    pillar: "identidade_pertencimento", 
    frequency: "semanal",
    description: "Momento semanal para fortalecer laços entre os membros da equipe.",
    responsible_role: "Líder",
    implementation_steps: ["Café da manhã em equipe", "Compartilhar conquistas pessoais", "Celebrar aniversários", "Integração"]
  },
  { 
    name: "Ritual da Mesa Redonda", 
    pillar: "lideranca", 
    frequency: "mensal",
    description: "Reunião mensal com líderes para alinhamento estratégico e tomada de decisões importantes.",
    responsible_role: "Líderes",
    implementation_steps: ["Revisar indicadores", "Discutir desafios", "Alinhar estratégias", "Definir ações"]
  },
  { 
    name: "Ritual do Start Diário", 
    pillar: "rituais_cultura", 
    frequency: "diario",
    description: "Reunião rápida no início do dia para alinhar prioridades e energizar a equipe.",
    responsible_role: "Líder",
    implementation_steps: ["Reunir equipe (5-10min)", "Revisar agenda do dia", "Alinhar prioridades", "Motivar equipe"]
  },
  { 
    name: "Ritual da Entrega", 
    pillar: "performance_responsabilidade", 
    frequency: "continuo",
    description: "Compromisso de entregar o que foi prometido, no prazo e com qualidade.",
    responsible_role: "Todos",
    implementation_steps: ["Definir prazos realistas", "Acompanhar progresso", "Comunicar impedimentos", "Entregar com qualidade"]
  },
  { 
    name: "Ritual da Responsabilidade", 
    pillar: "performance_responsabilidade", 
    frequency: "continuo",
    description: "Cada colaborador assume responsabilidade por suas ações e resultados.",
    responsible_role: "Todos",
    implementation_steps: ["Assumir compromissos", "Prestar contas", "Resolver problemas", "Aprender com erros"]
  },
  { 
    name: "Ritual da Maturidade Profissional", 
    pillar: "desenvolvimento_continuo", 
    frequency: "trimestral",
    description: "Avaliação trimestral do desenvolvimento profissional de cada colaborador.",
    responsible_role: "Líder",
    implementation_steps: ["Avaliar evolução", "Dar feedback", "Definir plano desenvolvimento", "Acompanhar metas"]
  },
  { 
    name: "Ritual da Alta Performance", 
    pillar: "performance_responsabilidade", 
    frequency: "mensal",
    description: "Reconhecimento mensal dos colaboradores que alcançaram alta performance.",
    responsible_role: "Líder/Dono",
    implementation_steps: ["Definir critérios", "Medir resultados", "Reconhecer publicamente", "Compartilhar práticas"]
  },
  { 
    name: "Ritual do Foco no Cliente", 
    pillar: "foco_cliente", 
    frequency: "continuo",
    description: "Todas as decisões consideram o impacto no cliente e na experiência dele.",
    responsible_role: "Todos",
    implementation_steps: ["Pensar do ponto de vista do cliente", "Resolver dores", "Superar expectativas", "Coletar feedback"]
  },
  { 
    name: "Ritual da Confiança", 
    pillar: "valores", 
    frequency: "continuo",
    description: "Construir e manter relações de confiança entre equipe, clientes e parceiros.",
    responsible_role: "Todos",
    implementation_steps: ["Cumprir promessas", "Ser transparente", "Admitir erros", "Construir reputação"]
  },
  { 
    name: "Ritual da Voz Ativa", 
    pillar: "comunicacao_interna", 
    frequency: "continuo",
    description: "Incentivar todos a expressarem opiniões e contribuírem com ideias.",
    responsible_role: "Todos",
    implementation_steps: ["Criar ambiente seguro", "Ouvir ativamente", "Valorizar contribuições", "Implementar ideias"]
  },
  { 
    name: "Ritual da Consistência", 
    pillar: "valores", 
    frequency: "continuo",
    description: "Manter consistência nas ações, decisões e na entrega de valor.",
    responsible_role: "Todos",
    implementation_steps: ["Seguir padrões", "Manter qualidade", "Ser previsível", "Criar rotinas"]
  },
  { 
    name: "Ritual da Cultura Viva", 
    pillar: "rituais_cultura", 
    frequency: "mensal",
    description: "Revisar e fortalecer a cultura organizacional mensalmente.",
    responsible_role: "Líder/Dono",
    implementation_steps: ["Revisar valores", "Compartilhar histórias", "Celebrar comportamentos", "Corrigir desvios"]
  },
  { 
    name: "Ritual da Transparência", 
    pillar: "valores", 
    frequency: "continuo",
    description: "Manter transparência nas comunicações, decisões e resultados.",
    responsible_role: "Líderes",
    implementation_steps: ["Compartilhar informações", "Explicar decisões", "Mostrar números", "Ser honesto"]
  },
  { 
    name: "Ritual da Ação Imediata", 
    pillar: "postura_atitudes", 
    frequency: "continuo",
    description: "Agir rapidamente diante de problemas e oportunidades.",
    responsible_role: "Todos",
    implementation_steps: ["Identificar urgências", "Decidir rápido", "Executar imediato", "Ajustar caminho"]
  },
  { 
    name: "Ritual do Planejamento Vivo", 
    pillar: "sistemas_regras", 
    frequency: "semanal",
    description: "Revisar e ajustar planejamento semanalmente baseado em resultados.",
    responsible_role: "Líder",
    implementation_steps: ["Revisar semana anterior", "Ajustar plano", "Definir prioridades", "Alocar recursos"]
  },
  { 
    name: "Ritual de Abertura de Semana (Kick Off)", 
    pillar: "rituais_cultura", 
    frequency: "semanal",
    description: "Reunião de abertura da semana para energizar e alinhar a equipe.",
    responsible_role: "Líder",
    implementation_steps: ["Reunir equipe", "Revisar metas da semana", "Motivar equipe", "Alinhar expectativas"]
  },
  { 
    name: "Ritual da Virada", 
    pillar: "lideranca", 
    frequency: "eventual",
    description: "Momento especial quando há mudança de padrão ou grande transformação.",
    responsible_role: "Dono/Líder",
    implementation_steps: ["Reconhecer momento", "Comunicar mudança", "Engajar equipe", "Celebrar conquista"]
  },
  { 
    name: "Ritual do Compromisso", 
    pillar: "valores", 
    frequency: "continuo",
    description: "Honrar todos os compromissos assumidos com clientes e equipe.",
    responsible_role: "Todos",
    implementation_steps: ["Assumir apenas o possível", "Comunicar impedimentos", "Cumprir prazos", "Renegociar quando necessário"]
  },
  { 
    name: "Ritual da Semana do Dono", 
    pillar: "postura_atitudes", 
    frequency: "semanal",
    description: "Cada colaborador age como dono do negócio durante toda a semana.",
    responsible_role: "Todos",
    implementation_steps: ["Pensar no resultado final", "Tomar iniciativa", "Resolver problemas", "Buscar eficiência"]
  },
  { 
    name: "Ritual do Checkpoint", 
    pillar: "rituais_cultura", 
    frequency: "semanal",
    description: "Ponto de verificação semanal de metas e entregas.",
    responsible_role: "Líder",
    implementation_steps: ["Revisar indicadores", "Verificar entregas", "Identificar desvios", "Ajustar rota"]
  },
  { 
    name: "Ritual do Feedback Contínuo", 
    pillar: "rituais_cultura", 
    frequency: "continuo",
    description: "Dar e receber feedback constante para melhoria contínua.",
    responsible_role: "Todos",
    implementation_steps: ["Criar cultura de feedback", "Dar feedback construtivo", "Receber com abertura", "Implementar melhorias"]
  },
  { 
    name: "Ritual do Pulso da Cultura", 
    pillar: "rituais_cultura", 
    frequency: "mensal",
    description: "Medir mensalmente a saúde da cultura organizacional.",
    responsible_role: "Líder/Dono",
    implementation_steps: ["Aplicar pesquisa", "Analisar resultados", "Identificar pontos atenção", "Agir"]
  },
  { 
    name: "Ritual do Norte Claro", 
    pillar: "visao", 
    frequency: "trimestral",
    description: "Revisar trimestralmente a visão e direção estratégica da empresa.",
    responsible_role: "Dono/Líderes",
    implementation_steps: ["Revisar visão", "Avaliar progresso", "Ajustar estratégia", "Comunicar time"]
  },
  { 
    name: "Ritual da Postura", 
    pillar: "postura_atitudes", 
    frequency: "continuo",
    description: "Manter postura profissional e alinhada aos valores em todas situações.",
    responsible_role: "Todos",
    implementation_steps: ["Definir padrões", "Dar exemplo", "Corrigir desvios", "Reconhecer boa postura"]
  },
  { 
    name: "Ritual da Presença", 
    pillar: "postura_atitudes", 
    frequency: "diario",
    description: "Estar presente e engajado em cada momento do trabalho.",
    responsible_role: "Todos",
    implementation_steps: ["Eliminar distrações", "Focar no momento", "Dar atenção plena", "Estar disponível"]
  },
  { 
    name: "Ritual da Identidade", 
    pillar: "identidade_pertencimento", 
    frequency: "mensal",
    description: "Fortalecer a identidade e pertencimento dos colaboradores à empresa.",
    responsible_role: "Líder/Dono",
    implementation_steps: ["Contar história empresa", "Valorizar contribuições", "Criar senso pertencimento", "Celebrar identidade"]
  },
  { 
    name: "Ritual da Força Operacional", 
    pillar: "performance_responsabilidade", 
    frequency: "semanal",
    description: "Revisar semanalmente a força operacional e produtividade da equipe.",
    responsible_role: "Líder",
    implementation_steps: ["Medir produtividade", "Identificar gargalos", "Otimizar processos", "Melhorar eficiência"]
  },
  { 
    name: "Ritual do Flow da Equipe", 
    pillar: "lideranca", 
    frequency: "semanal",
    description: "Garantir que a equipe está em sintonia e trabalhando em fluxo.",
    responsible_role: "Líder",
    implementation_steps: ["Observar dinâmica", "Remover obstáculos", "Facilitar colaboração", "Manter ritmo"]
  },
  { 
    name: "Ritual do Compromisso Ativo", 
    pillar: "valores", 
    frequency: "continuo",
    description: "Manter compromissos ativos e visíveis para todos.",
    responsible_role: "Todos",
    implementation_steps: ["Registrar compromissos", "Acompanhar status", "Comunicar progresso", "Cumprir ou renegociar"]
  },
  { 
    name: "Ritual das 3 Verdades (clareza – responsabilidade – entrega)", 
    pillar: "rituais_cultura", 
    frequency: "diario",
    description: "Prática diária das três verdades fundamentais: ter clareza do que fazer, assumir responsabilidade e entregar resultados.",
    responsible_role: "Todos",
    implementation_steps: ["Clareza: saber o que fazer", "Responsabilidade: assumir compromisso", "Entrega: executar com qualidade", "Revisar diariamente"]
  }
];

export default function Rituais() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [workshop, setWorkshop] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRitual, setEditingRitual] = useState(null);
  const [filterPillar, setFilterPillar] = useState("all");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    pillar: "rituais_cultura",
    frequency: "semanal",
    responsible_role: "",
    implementation_steps: [""]
  });

  // Scheduling State
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedRitualForSchedule, setSelectedRitualForSchedule] = useState(null);
  const [scheduleDate, setScheduleDate] = useState(new Date());
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [employees, setEmployees] = useState([]);
  
  // Step-by-step Modal State
  const [stepsModalOpen, setStepsModalOpen] = useState(false);
  const [viewingRitual, setViewingRitual] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: workshops, isLoading: loadingWorkshop } = useQuery({
    queryKey: ['workshops', user?.id],
    queryFn: async () => {
      const data = await base44.entities.Workshop.list();
      const userWorkshop = data.find(w => w.owner_id === user.id);
      setWorkshop(userWorkshop);
      
      // Load employees for scheduling
      if (userWorkshop) {
        const emps = await base44.entities.Employee.filter({ workshop_id: userWorkshop.id, status: 'ativo' });
        setEmployees(emps);
      }
      
      return data;
    },
    enabled: !!user
  });

  const { data: scheduledRituals = [], refetch: refetchScheduled } = useQuery({
    queryKey: ['scheduled-rituals', workshop?.id],
    queryFn: async () => {
      if (!workshop?.id) return [];
      return await base44.entities.ScheduledRitual.filter({ workshop_id: workshop.id });
    },
    enabled: !!workshop?.id
  });

  const scheduleMutation = useMutation({
    mutationFn: async (data) => {
      const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
      const ritual = await base44.entities.ScheduledRitual.create({ ...data, evidence_token: token });
      
      // Send emails
      if (data.participants && data.participants.length > 0) {
        await base44.functions.invoke("sendRitualEvidenceRequest", {
          ritual_id: ritual.id,
          participants: data.participants,
          origin: window.location.origin
        });
      }
      return ritual;
    },
    onSuccess: () => {
      toast.success("Ritual agendado e solicitações enviadas!");
      setScheduleDialogOpen(false);
      refetchScheduled();
    },
    onError: () => toast.error("Erro ao agendar ritual")
  });

  const { data: rituals = [], isLoading: loadingRituals, refetch } = useQuery({
    queryKey: ['rituals', workshop?.id],
    queryFn: async () => {
      if (!workshop?.id) return [];
      try {
        const data = await base44.entities.Ritual.filter({ workshop_id: workshop.id });
        console.log("Rituais carregados:", data?.length || 0);
        return data || [];
      } catch (error) {
        console.error("Erro ao carregar rituais:", error);
        return [];
      }
    },
    enabled: !!workshop?.id
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Ritual.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['rituals']);
      setDialogOpen(false);
      resetForm();
      toast.success("Ritual criado!");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Ritual.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['rituals']);
      setDialogOpen(false);
      setEditingRitual(null);
      resetForm();
      toast.success("Ritual atualizado!");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Ritual.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['rituals']);
      toast.success("Ritual removido!");
    }
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      pillar: "rituais_cultura",
      frequency: "semanal",
      responsible_role: "",
      implementation_steps: [""]
    });
  };

  const handleSubmit = () => {
    if (!workshop) return;

    const data = {
      ...formData,
      workshop_id: workshop.id,
      implementation_steps: formData.implementation_steps.filter(s => s.trim())
    };

    if (editingRitual) {
      updateMutation.mutate({ id: editingRitual.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleSchedule = () => {
    if (!workshop || !selectedRitualForSchedule) return;
    
    const participantsData = employees
      .filter(e => selectedEmployees.includes(e.id))
      .map(e => ({
        employee_id: e.id,
        email: e.email,
        name: e.full_name
      }));

    scheduleMutation.mutate({
      workshop_id: workshop.id,
      ritual_id: selectedRitualForSchedule.id,
      ritual_name: selectedRitualForSchedule.name,
      scheduled_date: format(scheduleDate, 'yyyy-MM-dd'),
      scheduled_time: scheduleTime,
      participants: participantsData,
      status: 'agendado'
    });
  };

  const openScheduleDialog = (ritual) => {
    setSelectedRitualForSchedule(ritual);
    setSelectedEmployees([]);
    setScheduleDate(new Date());
    setScheduleDialogOpen(true);
  };

  const openStepsModal = (ritual) => {
    setViewingRitual(ritual);
    setStepsModalOpen(true);
  };

  const printSteps = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>${viewingRitual.name} - Passo a Passo</title>
          <style>
            body { font-family: sans-serif; padding: 40px; }
            h1 { color: #6b21a8; border-bottom: 2px solid #6b21a8; padding-bottom: 10px; }
            .meta { margin-bottom: 30px; color: #666; }
            .steps { margin-top: 20px; }
            .step { margin-bottom: 15px; padding: 15px; background: #f9f9f9; border-left: 4px solid #6b21a8; }
            .step-num { font-weight: bold; margin-bottom: 5px; }
          </style>
        </head>
        <body>
          <h1>${viewingRitual.name}</h1>
          <div class="meta">
            <p><strong>Pilar:</strong> ${pillarLabels[viewingRitual.pillar]?.label || viewingRitual.pillar}</p>
            <p><strong>Frequência:</strong> ${viewingRitual.frequency}</p>
            <p><strong>Responsável:</strong> ${viewingRitual.responsible_role}</p>
            <p><strong>Descrição:</strong> ${viewingRitual.description}</p>
          </div>
          <h2>Como Executar (Passo a Passo)</h2>
          <div class="steps">
            ${viewingRitual.implementation_steps.map((step, i) => `
              <div class="step">
                <div class="step-num">Passo ${i + 1}</div>
                <div>${step}</div>
              </div>
            `).join('')}
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleEdit = (ritual) => {
    setEditingRitual(ritual);
    setFormData({
      name: ritual.name,
      description: ritual.description || "",
      pillar: ritual.pillar,
      frequency: ritual.frequency || "semanal",
      responsible_role: ritual.responsible_role || "",
      implementation_steps: ritual.implementation_steps?.length > 0 ? ritual.implementation_steps : [""]
    });
    setDialogOpen(true);
  };

  const handleImportDefaults = async () => {
    if (!workshop?.id) {
      toast.error("Oficina não encontrada");
      return;
    }

    const loadingToast = toast.loading("Importando 34 rituais...");

    try {
      console.log("Iniciando importação de rituais para workshop:", workshop.id);
      
      // Importar todos os rituais em lote
      const ritualsToCreate = defaultRituals.map(ritual => ({
        ...ritual,
        workshop_id: workshop.id,
        active: true,
        order: 0
      }));
      
      await base44.entities.Ritual.bulkCreate(ritualsToCreate);
      
      console.log("Rituais criados, recarregando...");
      await refetch();
      
      toast.dismiss(loadingToast);
      toast.success("✅ 34 rituais importados com sucesso!");
    } catch (error) {
      console.error("Erro ao importar:", error);
      toast.dismiss(loadingToast);
      toast.error("Erro ao importar: " + error.message);
    }
  };

  const filteredRituals = filterPillar === "all" 
    ? rituals 
    : rituals.filter(r => r.pillar === filterPillar);

  const ritualsByPillar = filteredRituals.reduce((acc, ritual) => {
    if (!acc[ritual.pillar]) acc[ritual.pillar] = [];
    acc[ritual.pillar].push(ritual);
    return acc;
  }, {});

  if (loadingRituals || loadingWorkshop) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="ml-3 text-gray-600">Carregando rituais...</p>
      </div>
    );
  }

  if (!workshop) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <p className="text-gray-600 mb-4">Você precisa cadastrar uma oficina primeiro</p>
            <Button onClick={() => navigate(createPageUrl("Cadastro"))}>
              Cadastrar Oficina
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">🔥 Rituais de Aculturamento</h1>
            <p className="text-gray-600">34 rituais organizados em 14 pilares culturais</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleImportDefaults} variant="outline" className="bg-yellow-50 border-yellow-300 hover:bg-yellow-100">
              <Sparkles className="w-4 h-4 mr-2 text-yellow-600" />
              {rituals.length === 0 ? 'Importar 34 Rituais' : 'Reimportar Rituais'}
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { resetForm(); setEditingRitual(null); }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Ritual
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingRitual ? "Editar Ritual" : "Novo Ritual"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Nome do Ritual *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Ex: Ritual do Start Diário"
                    />
                  </div>
                  <div>
                    <Label>Descrição</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Descreva o objetivo e como executar este ritual..."
                      rows={4}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Pilar Cultural *</Label>
                      <Select value={formData.pillar} onValueChange={(v) => setFormData({...formData, pillar: v})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(pillarLabels).map(([key, { label }]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Frequência *</Label>
                      <Select value={formData.frequency} onValueChange={(v) => setFormData({...formData, frequency: v})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(frequencyLabels).map(([key, label]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Responsável</Label>
                    <Input
                      value={formData.responsible_role}
                      onChange={(e) => setFormData({...formData, responsible_role: e.target.value})}
                      placeholder="Ex: Líder, Dono, Todos"
                    />
                  </div>
                  <div>
                    <Label>Passos de Implementação</Label>
                    {formData.implementation_steps.map((step, index) => (
                      <div key={index} className="flex gap-2 mb-2">
                        <Input
                          value={step}
                          onChange={(e) => {
                            const newSteps = [...formData.implementation_steps];
                            newSteps[index] = e.target.value;
                            setFormData({...formData, implementation_steps: newSteps});
                          }}
                          placeholder={`Passo ${index + 1}`}
                        />
                        {index === formData.implementation_steps.length - 1 && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => setFormData({
                              ...formData,
                              implementation_steps: [...formData.implementation_steps, ""]
                            })}
                          >
                            +
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  <Button onClick={handleSubmit} className="w-full">
                    {editingRitual ? "Atualizar" : "Criar"} Ritual
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs defaultValue="library" className="space-y-6">
          <TabsList>
            <TabsTrigger value="library">Biblioteca de Rituais</TabsTrigger>
            <TabsTrigger value="scheduled">Agendados & Realizados</TabsTrigger>
          </TabsList>

          <TabsContent value="library">
            <div className="mb-6">
              <Select value={filterPillar} onValueChange={setFilterPillar}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Filtrar por pilar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Pilares</SelectItem>
                  {Object.entries(pillarLabels).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loadingRituals ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-yellow-600 mr-3" />
            <p className="text-gray-600">Carregando rituais...</p>
          </div>
        ) : rituals.length === 0 ? (
          <Card className="border-2 border-dashed border-yellow-300 bg-gradient-to-br from-yellow-50 to-orange-50">
            <CardContent className="p-12 text-center">
              <Sparkles className="w-20 h-20 mx-auto mb-4 text-yellow-600" />
              <h3 className="text-3xl font-bold text-gray-900 mb-3">🔥 Implemente os Rituais na sua Oficina</h3>
              <p className="text-lg text-gray-700 mb-6 max-w-2xl mx-auto">
                Temos <strong>34 rituais organizacionais</strong> prontos para você implementar, 
                organizados em <strong>14 pilares culturais</strong>.
              </p>
              <Button 
                onClick={handleImportDefaults} 
                size="lg"
                className="bg-yellow-600 hover:bg-yellow-700 text-white text-xl px-12 py-8 shadow-lg"
              >
                <Sparkles className="w-6 h-6 mr-3" />
                Importar 34 Rituais Agora
              </Button>
              <p className="text-sm text-gray-500 mt-6">
                ✅ Você poderá editar, personalizar ou remover qualquer ritual depois
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {Object.entries(ritualsByPillar).map(([pillar, pillarRituals]) => {
              const pillarInfo = pillarLabels[pillar];
              const Icon = pillarInfo.icon;
              
              return (
                <div key={pillar}>
                  <div className="flex items-center gap-3 mb-4">
                    <Icon className={`w-6 h-6 text-${pillarInfo.color}-600`} />
                    <h2 className="text-2xl font-bold text-gray-900">{pillarInfo.label}</h2>
                    <Badge variant="outline">{pillarRituals.length}</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pillarRituals.map((ritual) => (
                      <Card key={ritual.id} className="hover:shadow-lg transition-shadow border-l-4" style={{borderLeftColor: `var(--${pillarInfo.color}-500, #3b82f6)`}}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-lg flex-1">{ritual.name}</CardTitle>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" onClick={() => handleEdit(ritual)}>
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => {
                                  if (confirm("Remover este ritual?")) {
                                    deleteMutation.mutate(ritual.id);
                                  }
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                            </div>
                            <div className="flex gap-2 mt-2 flex-wrap">
                            <Badge variant="secondary">{frequencyLabels[ritual.frequency]}</Badge>
                            {ritual.responsible_role && (
                              <Badge variant="outline">{ritual.responsible_role}</Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          {ritual.description && (
                            <p className="text-sm text-gray-600 mb-3 line-clamp-3">{ritual.description}</p>
                          )}
                          {ritual.implementation_steps && ritual.implementation_steps.length > 0 && (
                            <div className="mt-3 pt-3 border-t">
                              <p className="text-xs font-semibold text-gray-500 mb-2">Passos:</p>
                              <ul className="text-xs text-gray-600 space-y-1">
                                {ritual.implementation_steps.slice(0, 2).map((step, idx) => (
                                  <li key={idx} className="flex items-start">
                                    <span className="mr-2">•</span>
                                    <span className="line-clamp-1">{step}</span>
                                  </li>
                                ))}
                                {ritual.implementation_steps.length > 2 && (
                                  <li className="text-gray-400 italic">
                                    +{ritual.implementation_steps.length - 2} mais...
                                  </li>
                                )}
                              </ul>
                            </div>
                          )}
                          <div className="mt-4 pt-3 border-t flex gap-2">
                            <Button size="sm" variant="outline" className="flex-1" onClick={() => openStepsModal(ritual)}>
                              <FileText className="w-4 h-4 mr-2" /> Passo a Passo
                            </Button>
                            <Button size="sm" className="flex-1 bg-purple-600 hover:bg-purple-700" onClick={() => openScheduleDialog(ritual)}>
                              <CalendarIcon className="w-4 h-4 mr-2" /> Agendar
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </TabsContent>

        <TabsContent value="scheduled">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Execução</CardTitle>
              <CardDescription>Acompanhe os rituais agendados e realizados</CardDescription>
            </CardHeader>
            <CardContent>
              {scheduledRituals.length === 0 ? (
                <div className="text-center py-12 text-gray-500">Nenhum ritual agendado.</div>
              ) : (
                <div className="space-y-4">
                  {scheduledRituals.map(sr => (
                    <div key={sr.id} className="flex items-center justify-between p-4 border rounded-lg bg-white">
                      <div>
                        <h4 className="font-bold text-gray-900">{sr.ritual_name}</h4>
                        <div className="flex gap-4 text-sm text-gray-600 mt-1">
                          <span className="flex items-center"><CalendarIcon className="w-4 h-4 mr-1" /> {format(new Date(sr.scheduled_date), 'dd/MM/yyyy')} às {sr.scheduled_time}</span>
                          <span className="flex items-center"><Users className="w-4 h-4 mr-1" /> {sr.participants?.length || 0} participantes</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {sr.status === 'realizado' ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                            <CheckCircle className="w-3 h-3 mr-1" /> Realizado
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Agendado</Badge>
                        )}
                        {sr.evidence_url && (
                          <Button size="sm" variant="outline" onClick={() => window.open(sr.evidence_url, '_blank')}>
                            <FileText className="w-4 h-4 mr-2" /> Ver Evidência
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog Agendamento */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agendar Ritual: {selectedRitualForSchedule?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {scheduleDate ? format(scheduleDate, "dd/MM/yyyy") : <span>Selecione</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={scheduleDate} onSelect={setScheduleDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>Horário</Label>
                <Input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Participantes (receberão email para evidência)</Label>
              <div className="max-h-48 overflow-y-auto border rounded-md p-2 mt-2 space-y-2">
                {employees.map(emp => (
                  <div key={emp.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`emp-${emp.id}`} 
                      checked={selectedEmployees.includes(emp.id)}
                      onCheckedChange={(checked) => {
                        if(checked) setSelectedEmployees([...selectedEmployees, emp.id]);
                        else setSelectedEmployees(selectedEmployees.filter(id => id !== emp.id));
                      }}
                    />
                    <label htmlFor={`emp-${emp.id}`} className="text-sm cursor-pointer">{emp.full_name}</label>
                  </div>
                ))}
              </div>
            </div>
            <Button 
              onClick={handleSchedule} 
              disabled={scheduleMutation.isPending} 
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {scheduleMutation.isPending ? <Loader2 className="animate-spin mr-2" /> : <Mail className="w-4 h-4 mr-2" />}
              Agendar e Solicitar Evidência
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Passo a Passo */}
      <Dialog open={stepsModalOpen} onOpenChange={setStepsModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-600" />
              Como Executar: {viewingRitual?.name}
            </DialogTitle>
          </DialogHeader>
          {viewingRitual && (
            <div className="space-y-6 py-4">
              <div className="bg-gray-50 p-4 rounded-lg grid grid-cols-2 gap-4 text-sm">
                <div><strong>Pilar:</strong> {pillarLabels[viewingRitual.pillar]?.label}</div>
                <div><strong>Frequência:</strong> {frequencyLabels[viewingRitual.frequency]}</div>
                <div><strong>Responsável:</strong> {viewingRitual.responsible_role}</div>
                <div className="col-span-2"><strong>Descrição:</strong> {viewingRitual.description}</div>
              </div>
              
              <div>
                <h3 className="font-semibold mb-3">Passo a Passo:</h3>
                <div className="space-y-3">
                  {viewingRitual.implementation_steps.map((step, idx) => (
                    <div key={idx} className="flex gap-3 items-start p-3 border rounded-lg hover:bg-purple-50 transition-colors">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </div>
                      <p className="text-gray-700 mt-0.5">{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={printSteps} variant="outline">
                  <FileText className="w-4 h-4 mr-2" /> Imprimir Documento
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}