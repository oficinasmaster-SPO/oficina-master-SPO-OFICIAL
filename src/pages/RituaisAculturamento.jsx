import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Search, 
  Calendar, 
  Clock, 
  Target, 
  Users, 
  Star,
  Flame,
  Heart,
  Eye,
  MessageCircle,
  Zap,
  CheckCircle2,
  TrendingUp,
  Shield,
  Compass,
  Award,
  RefreshCw,
  Play,
  Flag,
  Repeat,
  FileText,
  Settings,
  Bell,
  Upload
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import RitualAdminPanel from "@/components/rituais/RitualAdminPanel";
import ScheduleFilters from "@/components/rituais/ScheduleFilters";
import RitualStatsCards from "@/components/rituais/RitualStatsCards";
import RitualMAPHierarchy from "@/components/rituais/RitualMAPHierarchy";
import AdvancedMAPSearch from "@/components/rituais/AdvancedMAPSearch";
import AdvancedFilters from "@/components/rituais/AdvancedFilters";
import MAPViewerDialog from "@/components/rituais/MAPViewerDialog";
import RitualAnalytics from "@/components/rituais/RitualAnalytics";
import RitualAuditLog from "@/components/rituais/RitualAuditLog";
import RitualNotifications from "@/components/rituais/RitualNotifications";
import RitualRecurrenceSettings from "@/components/rituais/RitualRecurrenceSettings";
import RitualReminders from "@/components/rituais/RitualReminders";
import RitualEvidenceUpload from "@/components/rituais/RitualEvidenceUpload";

export default function RituaisAculturamento() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [frequencyFilter, setFrequencyFilter] = useState("all");
  const [selectedRitual, setSelectedRitual] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  const [scheduledRituals, setScheduledRituals] = useState([]);
  const [ritualsWithMaps, setRitualsWithMaps] = useState([]);
  const [ritualsDB, setRitualsDB] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [scheduleFilters, setScheduleFilters] = useState({
    frequency: "all",
    status: "all",
    responsible: "all"
  });
  const [advancedFilters, setAdvancedFilters] = useState({
    frequency: "all",
    pillar: "all",
    dateFrom: "",
    dateTo: "",
    hasMAP: "all"
  });
  const [activeTab, setActiveTab] = useState("library");
  const [selectedMAP, setSelectedMAP] = useState(null);
  const [isMAPViewerOpen, setIsMAPViewerOpen] = useState(false);
  const [selectedRitualForRecurrence, setSelectedRitualForRecurrence] = useState(null);
  const [isRecurrenceOpen, setIsRecurrenceOpen] = useState(false);
  const [selectedScheduleForReminder, setSelectedScheduleForReminder] = useState(null);
  const [isReminderOpen, setIsReminderOpen] = useState(false);
  const [selectedScheduleForEvidence, setSelectedScheduleForEvidence] = useState(null);
  const [isEvidenceOpen, setIsEvidenceOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      const ownedWorkshops = await base44.entities.Workshop.filter({ owner_id: currentUser.id });
      const userWorkshop = ownedWorkshops[0];
      setWorkshop(userWorkshop);

      if (userWorkshop) {
        loadScheduledRituals(userWorkshop.id);
        loadRitualsWithMaps(userWorkshop.id);
        loadEmployees(userWorkshop.id);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const loadEmployees = async (workshopId) => {
    try {
      const employeesData = await base44.entities.Employee.filter({ 
        workshop_id: workshopId, 
        status: "ativo" 
      });
      setEmployees(Array.isArray(employeesData) ? employeesData : []);
    } catch (error) {
      console.error("Error loading employees:", error);
      setEmployees([]);
    }
  };

  const loadRitualsWithMaps = async (workshopId) => {
    try {
      const allRituals = await base44.entities.Ritual.filter({ workshop_id: workshopId });
      setRitualsWithMaps(Array.isArray(allRituals) ? allRituals : []);
    } catch (error) {
      console.error("Error loading rituals with maps:", error);
      setRitualsWithMaps([]);
    }
  };

  const loadScheduledRituals = async (workshopId) => {
    try {
      const schedules = await base44.entities.ScheduledRitual.filter({ 
        workshop_id: workshopId
      });
      setScheduledRituals(Array.isArray(schedules) ? schedules : []);
    } catch (error) {
      console.error("Error loading schedules:", error);
      setScheduledRituals([]);
    }
  };

  const handleSchedule = (ritual) => {
    setSelectedRitual(ritual);
    setScheduleDate("");
    setScheduleTime("");
    setNotes("");
    setIsDialogOpen(true);
  };

  const saveSchedule = async () => {
    if (!workshop) {
      toast.error("Você precisa ter uma oficina cadastrada para agendar.");
      return;
    }
    if (!scheduleDate || !scheduleTime) {
      toast.error("Selecione data e hora.");
      return;
    }

    setSaving(true);
    try {
      const dateTime = new Date(`${scheduleDate}T${scheduleTime}`);
      
      await base44.entities.ScheduledRitual.create({
        workshop_id: workshop.id,
        ritual_id: selectedRitual.id,
        ritual_name: selectedRitual.name,
        scheduled_date: dateTime.toISOString(),
        status: "agendado",
        notes: notes
      });

      toast.success("Ritual agendado com sucesso!");
      setIsDialogOpen(false);
      loadScheduledRituals(workshop.id);
    } catch (error) {
      console.error("Erro ao agendar ritual:", error);
      toast.error(`Erro ao agendar: ${error?.message || 'Erro desconhecido'}`);
    } finally {
      setSaving(false);
    }
  };

  const rituais = [
    {
      id: "ritual_alinhamento_cultural",
      name: "Ritual de Alinhamento Cultural",
      frequency: "semanal",
      description: "Reunião semanal para reforçar os valores, missão e visão da empresa, garantindo que todos estejam alinhados com a cultura organizacional.",
      icon: Compass
    },
    {
      id: "ritual_dono",
      name: "Ritual do Dono (Pensar Como Dono)",
      frequency: "diario",
      description: "Momento diário para cada colaborador refletir sobre suas responsabilidades como se fosse dono do negócio, tomando decisões com visão de longo prazo.",
      icon: Star
    },
    {
      id: "ritual_excelencia",
      name: "Ritual da Excelência",
      frequency: "diario",
      description: "Prática diária de buscar a excelência em cada tarefa, revisando o trabalho antes de entregar e garantindo qualidade máxima.",
      icon: Award
    },
    {
      id: "ritual_clareza",
      name: "Ritual de Clareza",
      frequency: "semanal",
      description: "Sessão semanal para esclarecer dúvidas, alinhar expectativas e garantir que todos entendam suas metas e responsabilidades.",
      icon: Eye
    },
    {
      id: "ritual_conexao",
      name: "Ritual de Conexão",
      frequency: "semanal",
      description: "Momento para fortalecer os laços entre a equipe, compartilhando experiências pessoais e profissionais que aproximam o time.",
      icon: Heart
    },
    {
      id: "ritual_mesa_redonda",
      name: "Ritual da Mesa Redonda",
      frequency: "quinzenal",
      description: "Reunião onde todos têm voz igual para discutir problemas, propor soluções e tomar decisões colaborativas.",
      icon: Users
    },
    {
      id: "ritual_start_diario",
      name: "Ritual do Start Diário",
      frequency: "diario",
      description: "Reunião rápida no início do dia para alinhar prioridades, compartilhar desafios e energizar a equipe para o trabalho.",
      icon: Play
    },
    {
      id: "ritual_entrega",
      name: "Ritual da Entrega",
      frequency: "diario",
      description: "Momento ao final do dia para revisar o que foi entregue, celebrar conquistas e identificar pendências para o próximo dia.",
      icon: CheckCircle2
    },
    {
      id: "ritual_responsabilidade",
      name: "Ritual da Responsabilidade",
      frequency: "semanal",
      description: "Prática de assumir responsabilidade pelos resultados, reconhecendo erros e buscando soluções ao invés de culpados.",
      icon: Shield
    },
    {
      id: "ritual_maturidade",
      name: "Ritual da Maturidade Profissional",
      frequency: "mensal",
      description: "Avaliação mensal do crescimento profissional de cada colaborador, identificando evolução e áreas de desenvolvimento.",
      icon: TrendingUp
    },
    {
      id: "ritual_alta_performance",
      name: "Ritual da Alta Performance",
      frequency: "semanal",
      description: "Sessão para revisar métricas de desempenho, celebrar resultados excepcionais e definir metas desafiadoras.",
      icon: Zap
    },
    {
      id: "ritual_foco_cliente",
      name: "Ritual do Foco no Cliente",
      frequency: "diario",
      description: "Lembrete diário de que o cliente é a razão do negócio, revisando feedbacks e buscando formas de superar expectativas.",
      icon: Target
    },
    {
      id: "ritual_confianca",
      name: "Ritual da Confiança",
      frequency: "semanal",
      description: "Prática de construir e manter a confiança na equipe através de transparência, cumprimento de promessas e apoio mútuo.",
      icon: Heart
    },
    {
      id: "ritual_voz_ativa",
      name: "Ritual da Voz Ativa",
      frequency: "semanal",
      description: "Momento em que todos são incentivados a expressar opiniões, sugestões e preocupações sem medo de julgamento.",
      icon: MessageCircle
    },
    {
      id: "ritual_consistencia",
      name: "Ritual da Consistência",
      frequency: "diario",
      description: "Prática de manter padrões consistentes de qualidade e comportamento, independente das circunstâncias.",
      icon: Repeat
    },
    {
      id: "ritual_cultura_viva",
      name: "Ritual da Cultura Viva",
      frequency: "mensal",
      description: "Revisão mensal de como a cultura está sendo vivida na prática, identificando gaps e celebrando exemplos positivos.",
      icon: Flame
    },
    {
      id: "ritual_transparencia",
      name: "Ritual da Transparência",
      frequency: "semanal",
      description: "Compartilhamento aberto de informações relevantes sobre o negócio, resultados e desafios com toda a equipe.",
      icon: Eye
    },
    {
      id: "ritual_acao_imediata",
      name: "Ritual da Ação Imediata",
      frequency: "diario",
      description: "Cultura de resolver problemas assim que identificados, sem procrastinação ou transferência de responsabilidade.",
      icon: Zap
    },
    {
      id: "ritual_planejamento_vivo",
      name: "Ritual do Planejamento Vivo",
      frequency: "semanal",
      description: "Revisão e ajuste semanal dos planos, garantindo flexibilidade e adaptação às mudanças do mercado.",
      icon: Calendar
    },
    {
      id: "ritual_kick_off",
      name: "Ritual de Abertura de Semana (Kick Off)",
      frequency: "semanal",
      description: "Reunião na segunda-feira para definir prioridades da semana, alinhar expectativas e motivar a equipe.",
      icon: Flag
    },
    {
      id: "ritual_virada",
      name: "Ritual da Virada",
      frequency: "eventual",
      description: "Momento especial quando há mudança de padrão ou direção, garantindo que todos entendam e se comprometam com o novo rumo.",
      icon: RefreshCw
    },
    {
      id: "ritual_compromisso",
      name: "Ritual do Compromisso",
      frequency: "semanal",
      description: "Prática de assumir compromissos públicos com a equipe e honrá-los, fortalecendo a cultura de accountability.",
      icon: CheckCircle2
    },
    {
      id: "ritual_semana_dono",
      name: "Ritual da Semana do Dono",
      frequency: "semanal",
      description: "Semana em que cada colaborador assume responsabilidades extras, vivenciando os desafios de ser dono do negócio.",
      icon: Star
    },
    {
      id: "ritual_checkpoint",
      name: "Ritual do Checkpoint",
      frequency: "diario",
      description: "Verificação rápida ao meio do dia para garantir que as prioridades estão sendo cumpridas e ajustar rotas se necessário.",
      icon: Target
    },
    {
      id: "ritual_feedback_continuo",
      name: "Ritual do Feedback Contínuo",
      frequency: "diario",
      description: "Cultura de dar e receber feedback constante, de forma construtiva e respeitosa, para melhoria contínua.",
      icon: MessageCircle
    },
    {
      id: "ritual_pulso_cultura",
      name: "Ritual do Pulso da Cultura",
      frequency: "mensal",
      description: "Pesquisa mensal rápida para medir o engajamento e a percepção da equipe sobre a cultura organizacional.",
      icon: Heart
    },
    {
      id: "ritual_norte_claro",
      name: "Ritual do Norte Claro",
      frequency: "mensal",
      description: "Revisão mensal dos objetivos estratégicos, garantindo que todos saibam para onde a empresa está indo.",
      icon: Compass
    },
    {
      id: "ritual_postura",
      name: "Ritual da Postura",
      frequency: "diario",
      description: "Lembrete diário sobre a importância da postura profissional, comunicação adequada e comportamento exemplar.",
      icon: Shield
    },
    {
      id: "ritual_presenca",
      name: "Ritual da Presença",
      frequency: "diario",
      description: "Prática de estar 100% presente nas atividades, evitando distrações e dando atenção total ao que está sendo feito.",
      icon: Eye
    },
    {
      id: "ritual_identidade",
      name: "Ritual da Identidade",
      frequency: "mensal",
      description: "Momento para reforçar a identidade da empresa, seus valores únicos e o que a diferencia no mercado.",
      icon: Flag
    },
    {
      id: "ritual_forca_operacional",
      name: "Ritual da Força Operacional",
      frequency: "semanal",
      description: "Avaliação da capacidade operacional da equipe, identificando gargalos e otimizando processos.",
      icon: Zap
    },
    {
      id: "ritual_flow_equipe",
      name: "Ritual do Flow da Equipe",
      frequency: "semanal",
      description: "Análise de como a equipe está fluindo junto, identificando conflitos e promovendo harmonia no trabalho.",
      icon: Users
    },
    {
      id: "ritual_compromisso_ativo",
      name: "Ritual do Compromisso Ativo",
      frequency: "diario",
      description: "Renovação diária do compromisso com as metas e valores da empresa, mantendo a motivação alta.",
      icon: CheckCircle2
    },
    {
      id: "ritual_3_verdades",
      name: "Ritual das 3 Verdades",
      frequency: "diario",
      description: "Prática diária de revisitar os três pilares fundamentais: Clareza (saber o que fazer), Responsabilidade (assumir o que é seu) e Entrega (cumprir o prometido).",
      icon: Award
    }
  ];

  const frequencyLabels = {
    diario: { label: "Diário", color: "bg-green-100 text-green-800" },
    semanal: { label: "Semanal", color: "bg-blue-100 text-blue-800" },
    quinzenal: { label: "Quinzenal", color: "bg-purple-100 text-purple-800" },
    mensal: { label: "Mensal", color: "bg-orange-100 text-orange-800" },
    eventual: { label: "Eventual", color: "bg-gray-100 text-gray-800" }
  };

  // Combinar rituais padrão + personalizados
  const allRituals = [...rituais, ...ritualsDB.map(r => ({
    ...r,
    id: r.id,
    icon: Flame,
    isCustom: true
  }))];

  const filteredRituais = allRituals.filter(ritual => {
    const matchesSearch = ritual.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          ritual.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFrequency = frequencyFilter === "all" || ritual.frequency === frequencyFilter;
    
    // Filtros avançados
    const matchesAdvFreq = advancedFilters.frequency === "all" || ritual.frequency === advancedFilters.frequency;
    const matchesPillar = advancedFilters.pillar === "all" || ritual.pillar === advancedFilters.pillar;
    const matchesMAP = advancedFilters.hasMAP === "all" || 
      (advancedFilters.hasMAP === "yes" && ritual.process_document_id) ||
      (advancedFilters.hasMAP === "no" && !ritual.process_document_id);
    
    return matchesSearch && matchesFrequency && matchesAdvFreq && matchesPillar && matchesMAP;
  });

  // Filtrar agendamentos
  const filteredSchedules = scheduledRituals.filter(schedule => {
    const matchesFreq = scheduleFilters.frequency === "all" || 
      ritualsDB.find(r => r.id === schedule.ritual_id)?.frequency === scheduleFilters.frequency;
    const matchesStatus = scheduleFilters.status === "all" || schedule.status === scheduleFilters.status;
    const matchesResp = scheduleFilters.responsible === "all" || 
      ritualsDB.find(r => r.id === schedule.ritual_id)?.responsible_user_id === scheduleFilters.responsible;
    return matchesFreq && matchesStatus && matchesResp;
  });

  const groupedByFrequency = {
    diario: filteredRituais.filter(r => r.frequency === "diario"),
    semanal: filteredRituais.filter(r => r.frequency === "semanal"),
    quinzenal: filteredRituais.filter(r => r.frequency === "quinzenal"),
    mensal: filteredRituais.filter(r => r.frequency === "mensal"),
    eventual: filteredRituais.filter(r => r.frequency === "eventual")
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                <Flame className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Rituais de Aculturamento</h1>
                <p className="text-gray-600">Práticas para fortalecer a cultura organizacional</p>
              </div>
            </div>
          </div>

          <RitualStatsCards 
            scheduledRituals={scheduledRituals} 
            ritualsDB={ritualsDB}
          />

          <RitualNotifications 
            workshop={workshop}
            onNotificationClick={(notif) => {
              if (notif.id === "today-rituals" || notif.id === "tomorrow-rituals" || notif.id === "overdue-rituals") {
                setActiveTab("schedules");
              }
            }}
          />

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
            <TabsList className="grid w-full max-w-4xl grid-cols-7">
              <TabsTrigger value="library">Biblioteca</TabsTrigger>
              <TabsTrigger value="schedules">Agendamentos</TabsTrigger>
              <TabsTrigger value="hierarchy">Hierarquia</TabsTrigger>
              <TabsTrigger value="search">Busca MAP</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="audit">Auditoria</TabsTrigger>
              <TabsTrigger value="admin">
                <Settings className="w-4 h-4 mr-1" />
                Admin
              </TabsTrigger>
            </TabsList>

            <TabsContent value="library" className="mt-6">
              {/* Advanced Filters */}
              <AdvancedFilters 
                filters={advancedFilters}
                onFiltersChange={setAdvancedFilters}
              />

              {/* Basic Filters */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6 mt-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    placeholder="Buscar ritual..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={frequencyFilter} onValueChange={setFrequencyFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Frequência" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as frequências</SelectItem>
                    <SelectItem value="diario">Diário</SelectItem>
                    <SelectItem value="semanal">Semanal</SelectItem>
                    <SelectItem value="quinzenal">Quinzenal</SelectItem>
                    <SelectItem value="mensal">Mensal</SelectItem>
                    <SelectItem value="eventual">Eventual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {Object.entries(frequencyLabels).map(([key, value]) => (
            <Card key={key} className="bg-white">
              <CardContent className="p-4 text-center">
                <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${value.color} mb-2`}>
                  {value.label}
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {rituais.filter(r => r.frequency === key).length}
                </p>
                <p className="text-xs text-gray-500">rituais</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Rituais agrupados por frequência */}
        {frequencyFilter === "all" ? (
          Object.entries(groupedByFrequency).map(([frequency, items]) => {
            if (items.length === 0) return null;
            const freqInfo = frequencyLabels[frequency];
            return (
              <div key={frequency} className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-gray-500" />
                  <h2 className="text-xl font-semibold text-gray-900">{freqInfo.label}</h2>
                  <Badge className={freqInfo.color}>{items.length}</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((ritual, index) => {
                    const Icon = ritual.icon;
                    return (
                      <Card key={index} className="bg-white hover:shadow-lg transition-all border-2 hover:border-purple-200">
                        <CardHeader className="pb-2">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Icon className="w-5 h-5 text-purple-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base leading-tight">{ritual.name}</CardTitle>
                              <Badge className={`mt-1 ${freqInfo.color}`}>
                                {freqInfo.label}
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-600 leading-relaxed">
                            {ritual.description}
                          </p>
                        </CardContent>
                        <CardFooter className="pt-0 flex flex-col gap-2">
                          {ritual.isCustom && (
                            <Badge className="absolute top-2 right-2 bg-purple-600 text-white">
                              Custom
                            </Badge>
                          )}
                          <div className="flex gap-2 w-full">
                            <Button 
                              className="flex-1 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200"
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(createPageUrl('CriarRitualMAP') + `?ritual_id=${ritual.id}`)}
                            >
                              <FileText className="w-3 h-3 mr-1" />
                              MAP
                            </Button>
                            <Button 
                              className="flex-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSchedule(ritual)}
                            >
                              <Calendar className="w-3 h-3 mr-1" />
                              Agendar
                            </Button>
                          </div>
                          {ritual.isCustom && (
                            <Button
                              className="w-full bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedRitualForRecurrence(ritual);
                                setIsRecurrenceOpen(true);
                              }}
                            >
                              <Repeat className="w-3 h-3 mr-1" />
                              Auto-Agendar
                            </Button>
                          )}
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRituais.map((ritual, index) => {
              const Icon = ritual.icon;
              const freqInfo = frequencyLabels[ritual.frequency];
              return (
                <Card key={index} className="bg-white hover:shadow-lg transition-all border-2 hover:border-purple-200 flex flex-col h-full">
                  <CardHeader className="pb-2">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base leading-tight">{ritual.name}</CardTitle>
                        <Badge className={`mt-1 ${freqInfo.color}`}>
                          {freqInfo.label}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {ritual.description}
                    </p>
                  </CardContent>
                  <CardFooter className="pt-0 flex gap-2">
                    <Button 
                      className="flex-1 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200"
                      variant="ghost"
                      onClick={() => navigate(createPageUrl('CriarRitualMAP') + `?ritual_id=${ritual.id}`)}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      MAP
                    </Button>
                    <Button 
                      className="flex-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                      variant="ghost"
                      onClick={() => handleSchedule(ritual)}
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Agendar
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}

        {/* Dialog de Agendamento */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agendar {selectedRitual?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input 
                    type="date" 
                    value={scheduleDate} 
                    onChange={(e) => setScheduleDate(e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hora</Label>
                  <Input 
                    type="time" 
                    value={scheduleTime} 
                    onChange={(e) => setScheduleTime(e.target.value)} 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea 
                  placeholder="Pauta, participantes ou notas..." 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)} 
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={saveSchedule} disabled={saving}>
                {saving ? "Salvando..." : "Confirmar Agendamento"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Lista de Agendamentos Futuros */}
        {scheduledRituals.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Próximos Rituais Agendados</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {scheduledRituals.map((schedule) => (
                <Card key={schedule.id} className="bg-blue-50 border-l-4 border-blue-500">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-gray-900">{schedule.ritual_name}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(schedule.scheduled_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </div>
                    {schedule.notes && (
                      <p className="text-xs text-gray-500 mt-2 italic">"{schedule.notes}"</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

              {filteredRituais.length === 0 && (
                <div className="text-center py-12">
                  <Flame className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Nenhum ritual encontrado</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="schedules" className="mt-6">
              <ScheduleFilters 
                filters={scheduleFilters}
                onFiltersChange={setScheduleFilters}
                employees={employees}
              />

              {filteredSchedules.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                  {filteredSchedules.map((schedule) => {
                    const ritual = ritualsDB.find(r => r.id === schedule.ritual_id);
                    const statusColors = {
                      agendado: "bg-blue-50 border-blue-500",
                      realizado: "bg-green-50 border-green-500",
                      concluido: "bg-purple-50 border-purple-500"
                    };
                    return (
                      <Card key={schedule.id} className={`border-l-4 ${statusColors[schedule.status]}`}>
                        <CardContent className="p-4">
                          <h3 className="font-semibold text-gray-900">{schedule.ritual_name}</h3>
                          <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                            <Calendar className="w-4 h-4" />
                            {format(new Date(schedule.scheduled_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </div>
                          <Badge className="mt-2">{schedule.status}</Badge>
                          {schedule.notes && (
                            <p className="text-xs text-gray-500 mt-2 italic">"{schedule.notes}"</p>
                          )}
                          <div className="flex gap-2 mt-3">
                            {schedule.status === "agendado" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedScheduleForReminder(schedule);
                                    setIsReminderOpen(true);
                                  }}
                                >
                                  <Bell className="w-3 h-3 mr-1" />
                                  Lembrete
                                </Button>
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                  onClick={() => {
                                    setSelectedScheduleForEvidence(schedule);
                                    setIsEvidenceOpen(true);
                                  }}
                                >
                                  <Upload className="w-3 h-3 mr-1" />
                                  Concluir
                                </Button>
                              </>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 mt-6">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Nenhum agendamento encontrado</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="hierarchy" className="mt-6">
              <RitualMAPHierarchy 
                workshop={workshop}
                onViewMAP={(map) => {
                  setSelectedMAP(map);
                  setIsMAPViewerOpen(true);
                }}
              />
            </TabsContent>

            <TabsContent value="search" className="mt-6">
              <AdvancedMAPSearch 
                workshop={workshop}
                onViewMAP={(map) => {
                  setSelectedMAP(map);
                  setIsMAPViewerOpen(true);
                }}
              />
            </TabsContent>

            <TabsContent value="analytics" className="mt-6">
              <RitualAnalytics workshop={workshop} />
            </TabsContent>

            <TabsContent value="audit" className="mt-6">
              <RitualAuditLog workshop={workshop} />
            </TabsContent>

            <TabsContent value="admin" className="mt-6">
              <RitualAdminPanel 
                workshop={workshop}
                onRitualsUpdate={setRitualsDB}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Dialogs */}
        <MAPViewerDialog 
          map={selectedMAP}
          open={isMAPViewerOpen}
          onClose={() => setIsMAPViewerOpen(false)}
          ritualsData={ritualsDB}
          user={user}
          workshop={workshop}
        />

        <RitualRecurrenceSettings
          ritual={selectedRitualForRecurrence}
          open={isRecurrenceOpen}
          onClose={() => {
            setIsRecurrenceOpen(false);
            setSelectedRitualForRecurrence(null);
          }}
          workshop={workshop}
        />

        <RitualReminders
          schedule={selectedScheduleForReminder}
          open={isReminderOpen}
          onClose={() => {
            setIsReminderOpen(false);
            setSelectedScheduleForReminder(null);
          }}
          employees={employees}
        />

        <RitualEvidenceUpload
          schedule={selectedScheduleForEvidence}
          open={isEvidenceOpen}
          onClose={() => {
            setIsEvidenceOpen(false);
            setSelectedScheduleForEvidence(null);
          }}
          onComplete={() => {
            loadScheduledRituals(workshop.id);
          }}
        />
      </div>
    </div>
  );
}