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
  Award
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function DashboardHub({ user }) {
  const { data: diagnostics = [] } = useQuery({
    queryKey: ['user-diagnostics', user.id],
    queryFn: () => base44.entities.Diagnostic.list('-created_date'),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['user-tasks', user.id],
    queryFn: () => base44.entities.Task.list(),
  });

  const { data: workshops = [] } = useQuery({
    queryKey: ['user-workshop', user.id],
    queryFn: () => base44.entities.Workshop.list(),
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['user-notifications', user.id],
    queryFn: () => base44.entities.Notification.list(),
  });

  const { data: gameProfile } = useQuery({
    queryKey: ['user-game-profile', user.id],
    queryFn: async () => {
      const profiles = await base44.entities.UserGameProfile.list();
      return profiles.find(p => p.user_id === user.id);
    },
  });

  const lastDiagnostic = diagnostics[0];
  const userWorkshop = workshops.find(w => w.owner_id === user.id);
  const pendingTasks = tasks.filter(t => t.status !== 'concluida' && t.assigned_to?.includes(user.id));
  const overdueTasks = pendingTasks.filter(t => {
    if (!t.due_date) return false;
    return new Date(t.due_date) < new Date();
  });
  const unreadNotifications = notifications.filter(n => n.user_id === user.id && !n.is_read);

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
      title: "IA Analytics",
      description: "Previsões e recomendações",
      icon: Sparkles,
      href: createPageUrl("IAAnalytics"),
      color: "from-purple-500 to-pink-500"
    },
    {
      title: "Novo Diagnóstico",
      description: "Avaliar evolução da oficina",
      icon: FileText,
      href: createPageUrl("Questionario"),
      color: "from-blue-500 to-indigo-500"
    },
    {
      title: "Gestão de Equipe",
      description: "Ver colaboradores",
      icon: Users,
      href: createPageUrl("Colaboradores"),
      color: "from-green-500 to-emerald-500"
    },
    {
      title: "Desafios",
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
            <Link to={createPageUrl("MissaoVisaoValores")}>
              <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-white transition-colors cursor-pointer">
                <Target className="w-8 h-8 text-purple-600" />
                <div>
                  <h4 className="font-semibold text-gray-900">Missão, Visão e Valores</h4>
                  <p className="text-sm text-gray-600">Defina a cultura da sua oficina</p>
                </div>
              </div>
            </Link>
            
            <Link to={createPageUrl("DescricoesCargo")}>
              <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-white transition-colors cursor-pointer">
                <FileText className="w-8 h-8 text-indigo-600" />
                <div>
                  <h4 className="font-semibold text-gray-900">Descrições de Cargo</h4>
                  <p className="text-sm text-gray-600">Gere com IA para sua equipe</p>
                </div>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}