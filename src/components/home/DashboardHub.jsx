import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  Users, 
  Target, 
  Sparkles, 
  Trophy, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  ArrowRight, 
  FileText, 
  Brain, 
  Award, 
  Building2, 
  Plus, 
  Bell, 
  Megaphone, 
  BarChart3,
  Lightbulb,
  Edit,
  Rocket
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export default function DashboardHub({ user, workshop }) {
  const [isNoticeDialogOpen, setIsNoticeDialogOpen] = React.useState(false);
  const [isTipsDialogOpen, setIsTipsDialogOpen] = React.useState(false);
  const [newNotice, setNewNotice] = React.useState({ title: "", content: "", priority: "media" });
  const [quickTips, setQuickTips] = React.useState("");

  // Queries para Avisos e Configurações
  const { data: notices = [], refetch: refetchNotices } = useQuery({
    queryKey: ['internal-notices'],
    queryFn: () => base44.entities.InternalNotice.filter({ active: true }),
    retry: 1
  });

  const { data: tipsSetting, refetch: refetchTips } = useQuery({
    queryKey: ['system-setting-tips'],
    queryFn: async () => {
        const settings = await base44.entities.SystemSetting.filter({ key: 'home_quick_tips' });
        return settings[0] || null;
    }
  });

  React.useEffect(() => {
    if (tipsSetting) {
        setQuickTips(tipsSetting.value);
    }
  }, [tipsSetting]);

  const handleSaveNotice = async () => {
    try {
        await base44.entities.InternalNotice.create({
            ...newNotice,
            active: true,
            target_app_roles: [] // Todos por enquanto
        });
        setIsNoticeDialogOpen(false);
        setNewNotice({ title: "", content: "", priority: "media" });
        refetchNotices();
        toast.success("Aviso publicado!");
    } catch (error) {
        toast.error("Erro ao publicar aviso");
    }
  };

  const handleSaveTips = async () => {
    try {
        if (tipsSetting) {
            await base44.entities.SystemSetting.update(tipsSetting.id, { value: quickTips });
        } else {
            await base44.entities.SystemSetting.create({
                key: 'home_quick_tips',
                value: quickTips,
                description: 'Dicas rápidas da tela inicial'
            });
        }
        setIsTipsDialogOpen(false);
        refetchTips();
        toast.success("Dicas atualizadas!");
    } catch (error) {
        toast.error("Erro ao salvar dicas");
    }
  };


  const { data: diagnostics = [] } = useQuery({
    queryKey: ['user-diagnostics', user?.id],
    queryFn: async () => {
      try {
        const result = await base44.entities.Diagnostic.list('-created_date');
        return Array.isArray(result) ? result : [];
      } catch (error) {
        console.log("Error fetching diagnostics:", error);
        return [];
      }
    },
    enabled: !!user?.id,
    retry: 1
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['user-tasks', user?.id],
    queryFn: async () => {
      try {
        const result = await base44.entities.Task.list();
        return Array.isArray(result) ? result : [];
      } catch (error) {
        console.log("Error fetching tasks:", error);
        return [];
      }
    },
    enabled: !!user?.id,
    retry: 1
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['user-notifications', user?.id],
    queryFn: async () => {
      try {
        const result = await base44.entities.Notification.list();
        return Array.isArray(result) ? result : [];
      } catch (error) {
        console.log("Error fetching notifications:", error);
        return [];
      }
    },
    enabled: !!user?.id,
    retry: 1
  });

  const { data: gameProfile } = useQuery({
    queryKey: ['user-game-profile', user?.id],
    queryFn: async () => {
      try {
        const profiles = await base44.entities.UserGameProfile.list();
        const profilesArray = Array.isArray(profiles) ? profiles : [];
        return profilesArray.find(p => p.user_id === user?.id) || null;
      } catch (error) {
        console.log("Error fetching game profile:", error);
        return null;
      }
    },
    enabled: !!user?.id,
    retry: 1
  });

  // Guard against null user
  if (!user?.id) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <p className="text-gray-600">Carregando dados do usuário...</p>
        </div>
      </div>
    );
  }

  const lastDiagnostic = diagnostics?.[0] || null;
  const userWorkshop = workshop || null;
  const pendingTasks = Array.isArray(tasks) 
    ? tasks.filter(t => t.status !== 'concluida' && t.assigned_to?.includes(user.id))
    : [];
  const overdueTasks = pendingTasks.filter(t => {
    if (!t.due_date) return false;
    return new Date(t.due_date) < new Date();
  });
  const unreadNotifications = Array.isArray(notifications)
    ? notifications.filter(n => n.user_id === user.id && !n.is_read)
    : [];

  const phaseColors = {
    1: "from-red-500 to-orange-500",
    2: "from-yellow-500 to-amber-500",
    3: "from-blue-500 to-cyan-500",
    4: "from-green-500 to-emerald-500"
  };

  const phaseLabels = {
    1: "Sobrevivência",
    2: "Crescimento",
    3: "Organização",
    4: "Consolidação"
  };

  const quickActions = [
    {
      title: "Nível 1 - Iniciante",
      description: "Ver progresso do nível",
      icon: Award,
      href: createPageUrl("Gamificacao"),
      color: "from-orange-500 to-red-500"
    },
    {
      title: "Fase Oficina 1,2,3,4",
      description: "Diagnóstico de fase",
      icon: BarChart3,
      href: createPageUrl("SelecionarDiagnostico"),
      color: "from-blue-500 to-indigo-500"
    },
    {
      title: "IA Analytics",
      description: "Nova análise inteligente",
      icon: Brain,
      href: createPageUrl("IAAnalytics"),
      color: "from-purple-500 to-pink-500"
    },
    {
      title: "Gestão de Equipe",
      description: "Ver colaboradores",
      icon: Users,
      href: createPageUrl("Colaboradores"),
      color: "from-green-500 to-emerald-500"
    },
    {
      title: "Desafios Ranking",
      description: "Ver conquistas e rankings",
      icon: Trophy,
      href: createPageUrl("Gamificacao"),
      color: "from-yellow-500 to-orange-500"
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Bem-vindo, {user.full_name || user.email}!
        </h1>
        <p className="text-gray-600">
          Aqui está o resumo da sua oficina
        </p>
      </div>

      {/* Dicas Rápidas (Admin Altera) */}
      <Card className="mb-6 bg-gradient-to-r from-indigo-50 to-blue-50 border-l-4 border-indigo-500 shadow-sm">
        <CardContent className="p-4 flex justify-between items-start">
            <div className="flex gap-3">
                <Lightbulb className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
                <div>
                    <h3 className="font-bold text-indigo-900 text-lg mb-1">Dicas Rápidas</h3>
                    <p className="text-indigo-800 whitespace-pre-line">
                        {tipsSetting?.value || "Bem-vindo ao Oficinas Master! Complete seu perfil e comece seus diagnósticos."}
                    </p>
                </div>
            </div>
            {user.role === 'admin' && (
                <Dialog open={isTipsDialogOpen} onOpenChange={setIsTipsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-indigo-400 hover:text-indigo-600">
                            <Edit className="w-4 h-4" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Editar Dicas Rápidas</DialogTitle>
                        </DialogHeader>
                        <div className="py-4">
                            <Label>Texto das Dicas</Label>
                            <Textarea 
                                value={quickTips} 
                                onChange={(e) => setQuickTips(e.target.value)} 
                                rows={4} 
                                placeholder="Digite as dicas que aparecerão para todos..." 
                            />
                        </div>
                        <DialogFooter>
                            <Button onClick={handleSaveTips}>Salvar</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </CardContent>
      </Card>

      {/* Avisos Internos (Sistema de Avisos) */}
      {notices.length > 0 && (
        <div className="mb-6 space-y-4">
            {notices.map((notice) => (
                <Card key={notice.id} className="bg-yellow-50 border border-yellow-200">
                    <CardContent className="p-4 flex gap-3">
                        <Megaphone className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                        <div>
                            <h4 className="font-bold text-yellow-900">{notice.title}</h4>
                            <p className="text-sm text-yellow-800">{notice.content}</p>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
      )}

      {/* Botão Admin para Criar Aviso */}
      {user.role === 'admin' && (
         <div className="mb-6 flex justify-end">
            <Dialog open={isNoticeDialogOpen} onOpenChange={setIsNoticeDialogOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" className="border-yellow-500 text-yellow-700 hover:bg-yellow-50">
                        <Plus className="w-4 h-4 mr-2" /> Novo Aviso
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Criar Novo Aviso</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label>Título</Label>
                            <Input 
                                value={newNotice.title} 
                                onChange={(e) => setNewNotice({...newNotice, title: e.target.value})} 
                                placeholder="Ex: Manutenção Programada" 
                            />
                        </div>
                        <div>
                            <Label>Mensagem</Label>
                            <Textarea 
                                value={newNotice.content} 
                                onChange={(e) => setNewNotice({...newNotice, content: e.target.value})} 
                                placeholder="Digite o conteúdo do aviso..." 
                            />
                        </div>
                        <div>
                            <Label>Prioridade</Label>
                            <Select 
                                value={newNotice.priority} 
                                onValueChange={(v) => setNewNotice({...newNotice, priority: v})}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="baixa">Baixa</SelectItem>
                                    <SelectItem value="media">Média</SelectItem>
                                    <SelectItem value="alta">Alta</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleSaveNotice}>Publicar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
         </div>
      )}

      {/* Nível de Maturidade da Oficina */}
      {userWorkshop && (
        <Card className="mb-6 border-2 border-blue-100 hover:shadow-xl transition-shadow bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Building2 className="w-6 h-6" />
              Fase Atual da Oficina
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className={cn(
                  "w-24 h-24 rounded-full flex items-center justify-center text-4xl font-bold text-white shadow-lg",
                  phaseColors[userWorkshop.maturity_level] || "bg-gray-500"
                )}>
                  {userWorkshop.maturity_level || 1}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {phaseLabels[userWorkshop.maturity_level || 1]}
                  </h3>
                  <p className="text-gray-600 mt-1 max-w-md">
                    Sua oficina está na fase de {phaseLabels[userWorkshop.maturity_level || 1].toLowerCase()}. 
                    Continue realizando diagnósticos para evoluir.
                  </p>
                </div>
              </div>
              <Link to={createPageUrl("SelecionarDiagnostico")}>
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 shadow-md">
                  <Rocket className="mr-2 w-5 h-5" />
                  Evoluir de Nível
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}


      {/* Alertas e Notificações */}
      {(overdueTasks.length > 0 || unreadNotifications.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {overdueTasks.length > 0 && (
            <Card className="border-2 border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-red-900">
                      {overdueTasks.length} {overdueTasks.length === 1 ? 'Tarefa Atrasada' : 'Tarefas Atrasadas'}
                    </h3>
                    <p className="text-sm text-red-700">Requer atenção imediata</p>
                  </div>
                  <Link to={createPageUrl("Tarefas")}>
                    <Button size="sm" variant="outline" className="border-red-300 text-red-700 hover:bg-red-100">
                      Ver Tarefas
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {unreadNotifications.length > 0 && (
            <Card className="border-2 border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Target className="w-6 h-6 text-blue-600" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-blue-900">
                      {unreadNotifications.length} {unreadNotifications.length === 1 ? 'Notificação' : 'Notificações'}
                    </h3>
                    <p className="text-sm text-blue-700">Novos alertas e lembretes</p>
                  </div>
                  <Link to={createPageUrl("Notificacoes")}>
                    <Button size="sm" variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-100">
                      Ver Notificações
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Status do Último Diagnóstico */}
      {lastDiagnostic ? (
        <Card className="mb-6 border-2 hover:shadow-xl transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-6 h-6 text-blue-600" />
              Último Diagnóstico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-20 h-20 rounded-2xl bg-gradient-to-br flex items-center justify-center",
                  phaseColors[lastDiagnostic.phase] || "from-gray-500 to-gray-600"
                )}>
                  <span className="text-3xl font-bold text-white">
                    {lastDiagnostic.phase}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Fase {lastDiagnostic.phase}: {phaseLabels[lastDiagnostic.phase]}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Pontuação: <strong>{lastDiagnostic.score}/48</strong>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Realizado em {new Date(lastDiagnostic.created_date).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
              <Link to={createPageUrl("Resultado") + `?id=${lastDiagnostic.id}`}>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  Ver Resultado
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-6 border-2 border-dashed border-gray-300">
          <CardContent className="p-6 text-center">
            <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhum diagnóstico realizado ainda
            </h3>
            <p className="text-gray-600 mb-4">
              Faça seu primeiro diagnóstico para descobrir em qual fase sua oficina está
            </p>
            <Link to={createPageUrl("Questionario")}>
              <Button className="bg-blue-600 hover:bg-blue-700">
                Fazer Diagnóstico Agora
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Gamificação */}
      {gameProfile && (
        <Card className="mb-6 bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-full flex items-center justify-center">
                  <Award className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Nível {gameProfile.level} - {gameProfile.level_name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {gameProfile.xp} XP | {gameProfile.badges?.length || 0} conquistas
                  </p>
                </div>
              </div>
              <Link to={createPageUrl("Gamificacao")}>
                <Button variant="outline" className="border-yellow-400 text-yellow-700 hover:bg-yellow-100">
                  Ver Conquistas
                  <Trophy className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ações Rápidas */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Acesso Rápido</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Link key={index} to={action.href}>
                <Card className="group hover:shadow-xl transition-all cursor-pointer border-2 hover:border-blue-200">
                  <CardContent className="p-6">
                    <div className={cn(
                      "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4 group-hover:scale-110 transition-transform",
                      action.color
                    )}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {action.title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {action.description}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recursos Não Explorados */}
      <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-600" />
            Explore Mais Recursos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link to={createPageUrl("CulturaOrganizacional")}>
              <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-white transition-colors cursor-pointer border border-transparent hover:border-purple-200">
                <Target className="w-8 h-8 text-purple-600" />
                <div>
                  <h4 className="font-semibold text-gray-900">Manual da Cultura</h4>
                  <p className="text-sm text-gray-600">Pilares, expectativas e rituais</p>
                </div>
              </div>
            </Link>
            
            {/* Descrição de cargo removida da tela inicial do gestor conforme solicitado */}
            
            <Link to={createPageUrl("MonitoramentoRH")}>
                <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-white transition-colors cursor-pointer border border-transparent hover:border-purple-200">
                    <Users className="w-8 h-8 text-indigo-600" />
                    <div>
                        <h4 className="font-semibold text-gray-900">Monitoramento RH</h4>
                        <p className="text-sm text-gray-600">Acompanhe o clima da equipe</p>
                    </div>
                </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}