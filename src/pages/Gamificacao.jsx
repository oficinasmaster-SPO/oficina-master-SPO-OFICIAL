import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Trophy, Award, Target, Sparkles, Plus, Wrench, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import LevelBadge from "../components/dashboard/LevelBadge";
import ChallengeCard from "../components/gamification/ChallengeCard";
import DynamicRanking from "../components/gamification/DynamicRanking";
import RewardsWall from "../components/gamification/RewardsWall";
import RankingSection from "@/components/gamification/RankingSection";

export default function Gamificacao() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      try {
        const profiles = await base44.entities.UserGameProfile.list();
        const profilesArray = Array.isArray(profiles) ? profiles : [];
        const profile = profilesArray.find(p => p.user_id === currentUser.id);
        setUserProfile(profile || null);
      } catch (profileError) {
        console.log("Error fetching profiles:", profileError);
        setUserProfile(null);
      }
    } catch (error) {
      console.log("Error loading user:", error);
    }
  };

  const { data: challenges = [], isLoading: loadingChallenges } = useQuery({
    queryKey: ['challenges'],
    queryFn: async () => {
      try {
        const result = await base44.entities.Challenge.list('-created_date');
        return Array.isArray(result) ? result : [];
      } catch (error) {
        console.log("Error fetching challenges:", error);
        return [];
      }
    },
    enabled: !!user,
    retry: 1
  });

  const { data: rewards = [], isLoading: loadingRewards } = useQuery({
    queryKey: ['rewards'],
    queryFn: async () => {
      try {
        const result = await base44.entities.Reward.list('-awarded_date');
        return Array.isArray(result) ? result : [];
      } catch (error) {
        console.log("Error fetching rewards:", error);
        return [];
      }
    },
    enabled: !!user,
    retry: 1
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      try {
        const result = await base44.entities.Employee.list();
        return Array.isArray(result) ? result : [];
      } catch (error) {
        console.log("Error fetching employees:", error);
        return [];
      }
    },
    enabled: !!user,
    retry: 1
  });

  const { data: workshops = [] } = useQuery({
    queryKey: ['workshops'],
    queryFn: async () => {
      try {
        const result = await base44.entities.Workshop.list();
        return Array.isArray(result) ? result : [];
      } catch (error) {
        console.log("Error fetching workshops:", error);
        return [];
      }
    },
    enabled: !!user,
    retry: 1
  });

  // Workshop do usuário atual
  const currentWorkshop = workshops.find(w => w.owner_id === user?.id) || 
    workshops.find(w => employees.find(e => e.email === user?.email && e.workshop_id === w.id));

  const myEmployeeRecord = employees.find(e => e.email === user?.email);

  const period = new Date().toISOString().slice(0, 7);

  const { data: internalRankings = [], refetch: refetchRankings } = useQuery({
    queryKey: ['productivity-rankings-internal', currentWorkshop?.id, period],
    queryFn: async () => {
        if (!currentWorkshop?.id) return [];
        const ranks = await base44.entities.ProductivityRanking.filter({ 
            workshop_id: currentWorkshop.id,
            period 
        });

        return ranks.map(rank => ({
            ...rank,
            employee: employees.find(e => e.id === rank.employee_id)
        }));
    },
    enabled: !!currentWorkshop?.id && employees.length > 0
  });

  const { data: nationalRankings = [] } = useQuery({
      queryKey: ['productivity-rankings-national', period],
      queryFn: async () => {
          // Fetch all rankings for the period (assuming RLS allows it for "National" view)
          // In a real scenario with many records, this should be a backend aggregation function
          const ranks = await base44.entities.ProductivityRanking.filter({ period });

          // We need to enrich with employee names even for other workshops
          // Since we might not have all employees loaded, we rely on what's available or fetch if needed.
          // For now, we assume 'employees' contains needed data or we map what we can.
          // Note: In a production app with thousands of users, we would fetch only top N records via backend function.

          // For national ranking, we also need workshop names.
          return ranks.map(rank => {
              const emp = employees.find(e => e.id === rank.employee_id);
              const ws = workshops.find(w => w.id === rank.workshop_id);
              return {
                  ...rank,
                  employee: emp || { full_name: 'Usuário Externo', profile_picture_url: null }, // Fallback
                  workshop_name: ws?.name || 'Oficina Externa'
              };
          });
      },
      enabled: !!user
  });

  const calculateRankingsMutation = useMutation({
    mutationFn: async () => {
        return await base44.functions.invoke('calculateRankings', { 
            workshop_id: currentWorkshop.id,
            period: new Date().toISOString().slice(0, 7)
        });
    },
    onSuccess: () => {
        refetchRankings();
        toast.success("Rankings atualizados com sucesso!");
    },
    onError: (error) => {
        toast.error("Erro ao atualizar rankings: " + error.message);
    }
  });

  useEffect(() => {
    if (currentWorkshop?.id) {
        // Attempt to calculate/refresh on load
        calculateRankingsMutation.mutate();
    }
  }, [currentWorkshop?.id]);

  const createChallengeMutation = useMutation({
    mutationFn: async () => {
      // Gerar desafio semanal automático
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 7);

      const challenges = [
        {
          title: "Top 10 Produtividade",
          description: "Entre no top 10 de produtividade esta semana",
          type: "semanal",
          target_type: "individual",
          target_area: "tecnico",
          metric: "produtividade",
          goal_value: 50000,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          reward_xp: 500,
          reward_badge: "top_10_week",
          status: "ativo"
        },
        {
          title: "Zero Retrabalho",
          description: "Complete a semana sem nenhum retrabalho",
          type: "semanal",
          target_type: "individual",
          target_area: "tecnico",
          metric: "qualidade",
          goal_value: 100,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          reward_xp: 300,
          reward_badge: "zero_rework",
          status: "ativo"
        },
        {
          title: "Equipe Campeã",
          description: "Seja a equipe com maior faturamento do mês",
          type: "mensal",
          target_type: "equipe",
          target_area: "vendas",
          metric: "faturamento",
          goal_value: 200000,
          start_date: startDate.toISOString(),
          end_date: new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).toISOString(),
          reward_xp: 1000,
          reward_badge: "team_champion",
          status: "ativo"
        }
      ];

      return await base44.entities.Challenge.create(challenges[Math.floor(Math.random() * challenges.length)]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
      toast.success("Novo desafio criado!");
    }
  });

  const awardRewardMutation = useMutation({
    mutationFn: async (data) => {
      // Criar recompensa
      const reward = await base44.entities.Reward.create(data);

      // Atualizar XP do usuário
      const profiles = await base44.entities.UserGameProfile.list();
      const profile = profiles.find(p => p.user_id === data.user_id);
      
      if (profile) {
        const newXP = (profile.xp || 0) + (data.xp_earned || 0);
        const newLevel = Math.floor(newXP / 1000) + 1;
        
        await base44.entities.UserGameProfile.update(profile.id, {
          xp: newXP,
          level: Math.min(newLevel, 6)
        });
      }

      return reward;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
      toast.success("Recompensa concedida!");
    }
  });

  // Desafios ativos
  const activeChallenges = Array.isArray(challenges) ? challenges.filter(c => c.status === 'ativo') : [];

  // Progresso do usuário nos desafios
  const getUserProgress = (challenge) => {
    return challenge?.participants?.find(p => p.user_id === user?.id);
  };

  // Minhas recompensas
  const myRewards = Array.isArray(rewards) ? rewards.filter(r => r.user_id === user?.id) : [];

  if (loadingChallenges || loadingRewards) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-3 flex items-center justify-center gap-3">
            <Wrench className="w-10 h-10 text-purple-600" />
            Sistema de Gamificação
          </h1>
          <p className="text-lg text-gray-600">
            Desafios, Rankings e Reconhecimento
          </p>
        </div>

        {/* Perfil do Usuário */}
        {userProfile && (
          <div className="mb-8">
            <LevelBadge level={userProfile.level} xp={userProfile.xp} />
          </div>
        )}

        {/* Admin Actions */}
        {user?.role === 'admin' && (
          <div className="mb-6 flex gap-3">
            <Button
              onClick={() => createChallengeMutation.mutate()}
              disabled={createChallengeMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {createChallengeMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Criar Novo Desafio
            </Button>
          </div>
        )}

        <Tabs defaultValue="desafios" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white shadow-md">
            <TabsTrigger value="desafios">
              <Target className="w-4 h-4 mr-2" />
              Desafios
            </TabsTrigger>
            <TabsTrigger value="rankings">
              <Trophy className="w-4 h-4 mr-2" />
              Rankings
            </TabsTrigger>
            <TabsTrigger value="recompensas">
              <Award className="w-4 h-4 mr-2" />
              Minhas Recompensas
            </TabsTrigger>
            <TabsTrigger value="mural">
              <Sparkles className="w-4 h-4 mr-2" />
              Mural Público
            </TabsTrigger>
          </TabsList>

          {/* Desafios */}
          <TabsContent value="desafios" className="space-y-6">
            <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
              <CardHeader>
                <CardTitle>Desafios Ativos</CardTitle>
              </CardHeader>
              <CardContent>
                {activeChallenges.length === 0 ? (
                  <div className="text-center py-12">
                    <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Nenhum desafio ativo no momento</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeChallenges.map(challenge => (
                      <ChallengeCard
                        key={challenge.id}
                        challenge={challenge}
                        userProgress={getUserProgress(challenge)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rankings */}
          <TabsContent value="rankings">
             <div className="grid gap-6">
                {/* Productivity Rankings Section */}
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Rankings de Produtividade</h3>
                            <p className="text-sm text-gray-500">Baseado nos registros diários e engajamento</p>
                        </div>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => calculateRankingsMutation.mutate()}
                            disabled={calculateRankingsMutation.isPending}
                        >
                            {calculateRankingsMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                            Atualizar
                        </Button>
                    </div>
                    
                    <RankingSection 
                        internalRankings={internalRankings}
                        nationalRankings={nationalRankings}
                        userEmployee={myEmployeeRecord}
                        currentWorkshop={currentWorkshop}
                    />
                </div>

                {/* XP General Ranking */}
                <Card>
                  <CardHeader>
                    <CardTitle>Ranking Geral (XP)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DynamicRanking employees={employees} workshops={workshops} />
                  </CardContent>
                </Card>
            </div>
          </TabsContent>

          {/* Minhas Recompensas */}
          <TabsContent value="recompensas">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-yellow-600" />
                  Minhas Conquistas ({myRewards.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {myRewards.length === 0 ? (
                  <div className="text-center py-12">
                    <Award className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Complete desafios para ganhar recompensas!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {myRewards.map(reward => (
                      <div
                        key={reward.id}
                        className="p-4 rounded-lg border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50 hover:shadow-lg transition-all"
                      >
                        <div className="text-center">
                          <div
                            className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center"
                            style={{ background: reward.color || '#f59e0b' }}
                          >
                            <Trophy className="w-8 h-8 text-white" />
                          </div>
                          <h3 className="font-bold text-gray-900 mb-1">{reward.title}</h3>
                          <p className="text-sm text-gray-600 mb-2">{reward.description}</p>
                          <div className="flex items-center justify-center gap-2">
                            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full font-medium">
                              +{reward.xp_earned} XP
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Mural Público */}
          <TabsContent value="mural">
            <RewardsWall rewards={rewards} employees={employees} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}