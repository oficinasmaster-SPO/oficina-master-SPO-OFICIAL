import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2, Save, Target, Globe, Calendar, Award, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import ChallengeCard from "@/components/gamification/ChallengeCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export default function AdminDesafios() {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [currentChallenge, setCurrentChallenge] = useState(null);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [progressData, setProgressData] = useState({ value: 0, challenge: null });

  // Estado inicial do formulário
  const initialFormState = {
    title: "",
    description: "",
    scope: "global",
    type: "semanal",
    target_type: "individual",
    target_area: "todos",
    metric: "produtividade",
    metric_target_direction: "higher_is_better",
    goal_value: 0,
    reward_xp: 100,
    additional_reward_type: "none",
    additional_reward_description: "",
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: format(new Date(new Date().setDate(new Date().getDate() + 7)), 'yyyy-MM-dd'),
    status: "ativo"
  };

  const [formData, setFormData] = useState(initialFormState);

  // Carregar métricas disponíveis
  const { data: availableMetrics = [] } = useQuery({
    queryKey: ['available-metrics'],
    queryFn: async () => {
      const result = await base44.entities.ProductivityMetric.list();
      return Array.isArray(result) ? result.filter(m => m.is_active !== false) : [];
    }
  });

  // Carregar desafios globais
  const { data: challenges = [], isLoading } = useQuery({
    queryKey: ['admin-challenges'],
    queryFn: async () => {
      const result = await base44.entities.Challenge.list('-created_date');
      return Array.isArray(result) ? result.filter(c => c.scope === 'global') : [];
    }
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Challenge.create({
      ...data,
      start_date: new Date(data.start_date).toISOString(),
      end_date: new Date(data.end_date).toISOString()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-challenges']);
      toast.success("Desafio global criado com sucesso!");
      resetForm();
    },
    onError: (e) => toast.error("Erro ao criar desafio: " + e.message)
  });

  const generateAiChallengeMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('generateChallengeAI', {
        scope: 'global'
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (!data || data.error) {
         toast.error("Erro ao gerar sugestão: " + (data?.error || "Resposta inválida"));
         return;
      }
      // Converter as datas sugeridas ou usar padrão
      const startDate = data.start_date ? new Date(data.start_date) : new Date();
      const endDate = data.end_date ? new Date(data.end_date) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      setFormData({
        ...initialFormState,
        ...data,
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd')
      });
      setIsEditing(true);
      toast.success("Sugestão Global da IA gerada com sucesso! Revise antes de salvar.");
    },
    onError: (error) => {
      console.error(error);
      toast.error("Erro ao gerar sugestão com IA.");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Challenge.update(id, {
      ...data,
      start_date: new Date(data.start_date).toISOString(),
      end_date: new Date(data.end_date).toISOString()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-challenges']);
      toast.success("Desafio atualizado com sucesso!");
      resetForm();
    },
    onError: (e) => toast.error("Erro ao atualizar: " + e.message)
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Challenge.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-challenges']);
      toast.success("Desafio removido!");
    }
  });

  const handleFinalize = async (challenge) => {
    if (confirm("Tem certeza que deseja finalizar este desafio?")) {
      try {
        await base44.functions.invoke('updateChallengeProgress', {
          challenge_id: challenge.id,
          action: 'finalize'
        });
        toast.success("Desafio finalizado!");
        queryClient.invalidateQueries(['admin-challenges']);
      } catch (error) {
        toast.error("Erro ao finalizar desafio");
      }
    }
  };

  const handleUpdateProgress = async () => {
    if (!progressData.challenge) return;
    
    try {
      await base44.functions.invoke('updateChallengeProgress', {
        challenge_id: progressData.challenge.id,
        action: 'manual_update',
        manual_value: Number(progressData.value),
      });
      toast.success("Progresso atualizado!");
      setShowProgressModal(false);
      queryClient.invalidateQueries(['admin-challenges']);
    } catch (error) {
      toast.error("Erro ao atualizar progresso");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (currentChallenge) {
      updateMutation.mutate({ id: currentChallenge.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (challenge) => {
    setCurrentChallenge(challenge);
    setFormData({
      ...challenge,
      start_date: challenge.start_date ? format(new Date(challenge.start_date), 'yyyy-MM-dd') : '',
      end_date: challenge.end_date ? format(new Date(challenge.end_date), 'yyyy-MM-dd') : '',
    });
    setIsEditing(true);
  };

  const resetForm = () => {
    setFormData(initialFormState);
    setCurrentChallenge(null);
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Globe className="w-8 h-8 text-blue-600" />
              Gestão de Desafios Globais
            </h1>
            <p className="text-gray-600 mt-1">
              Crie desafios para todas as oficinas da rede (nível Brasil)
            </p>
          </div>
          {!isEditing && (
            <div className="flex gap-2">
                <Button 
                  onClick={() => generateAiChallengeMutation.mutate()} 
                  disabled={generateAiChallengeMutation.isPending}
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 border-0 shadow-md"
                >
                  {generateAiChallengeMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2 fill-yellow-300 text-yellow-100" />
                  )}
                  Gerar com IA
                </Button>
                <Button onClick={() => setIsEditing(true)} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" /> Novo Desafio Global
                </Button>
            </div>
          )}
        </div>

        {isEditing ? (
          <Card>
            <CardHeader>
              <CardTitle>{currentChallenge ? 'Editar Desafio' : 'Novo Desafio Global'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Título do Desafio</Label>
                    <Input 
                      required 
                      value={formData.title} 
                      onChange={e => setFormData({...formData, title: e.target.value})}
                      placeholder="Ex: Maratona de Vendas"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Tipo de Período</Label>
                    <Select 
                      value={formData.type} 
                      onValueChange={v => setFormData({...formData, type: v})}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="diario">Diário</SelectItem>
                        <SelectItem value="semanal">Semanal</SelectItem>
                        <SelectItem value="mensal">Mensal</SelectItem>
                        <SelectItem value="personalizado">Personalizado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Data Início</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                      <Input 
                        type="date" 
                        className="pl-10"
                        value={formData.start_date}
                        onChange={e => setFormData({...formData, start_date: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Data Fim</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                      <Input 
                        type="date" 
                        className="pl-10"
                        value={formData.end_date}
                        onChange={e => setFormData({...formData, end_date: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Público Alvo (Área)</Label>
                    <Select 
                      value={formData.target_area} 
                      onValueChange={v => setFormData({...formData, target_area: v})}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="vendas">Vendas</SelectItem>
                        <SelectItem value="comercial">Comercial</SelectItem>
                        <SelectItem value="tecnico">Técnico</SelectItem>
                        <SelectItem value="gerencia">Gerência</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo de Participação</Label>
                    <Select 
                      value={formData.target_type} 
                      onValueChange={v => setFormData({...formData, target_type: v})}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="individual">Individual</SelectItem>
                        <SelectItem value="equipe">Equipe</SelectItem>
                        <SelectItem value="oficina">Oficina Inteira</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Métrica</Label>
                    <Select 
                      value={formData.metric} 
                      onValueChange={v => {
                        setFormData({...formData, metric: v});
                        const selectedMetric = availableMetrics.find(m => m.code === v);
                        if (selectedMetric?.optimization_direction) {
                           setFormData(prev => ({...prev, metric_target_direction: selectedMetric.optimization_direction}));
                        }
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecione o indicador" /></SelectTrigger>
                      <SelectContent>
                        {availableMetrics.length > 0 ? availableMetrics.map(m => (
                          <SelectItem key={m.code} value={m.code}>
                            {m.name} ({m.category}) {m.optimization_direction === 'lower_is_better' ? '▼' : '▲'}
                          </SelectItem>
                        )) : (
                          <SelectItem value="produtividade">Carregando métricas...</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Meta (Valor numérico)</Label>
                    <Input 
                      type="number" 
                      value={formData.goal_value} 
                      onChange={e => setFormData({...formData, goal_value: Number(e.target.value)})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Recompensa (XP)</Label>
                    <div className="relative">
                      <Award className="absolute left-3 top-2.5 h-4 w-4 text-yellow-500" />
                      <Input 
                        type="number"
                        className="pl-10"
                        value={formData.reward_xp} 
                        onChange={e => setFormData({...formData, reward_xp: Number(e.target.value)})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo Recompensa Extra</Label>
                    <Select 
                      value={formData.additional_reward_type || 'none'} 
                      onValueChange={v => setFormData({...formData, additional_reward_type: v})}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhuma</SelectItem>
                        <SelectItem value="money">Dinheiro (R$)</SelectItem>
                        <SelectItem value="day_off">Folga</SelectItem>
                        <SelectItem value="gift">Presente/Brinde</SelectItem>
                        <SelectItem value="course">Curso/Treinamento</SelectItem>
                        <SelectItem value="other">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.additional_reward_type !== 'none' && (
                    <div className="space-y-2 md:col-span-2">
                      <Label>Descrição da Recompensa Extra</Label>
                      <Input 
                        value={formData.additional_reward_description || ''} 
                        onChange={e => setFormData({...formData, additional_reward_description: e.target.value})}
                        placeholder="Ex: R$ 500,00 via Pix para o vencedor, Vale jantar..."
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select 
                      value={formData.status} 
                      onValueChange={v => setFormData({...formData, status: v})}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ativo">Ativo</SelectItem>
                        <SelectItem value="concluido">Concluído</SelectItem>
                        <SelectItem value="expirado">Expirado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea 
                    rows={4}
                    value={formData.description} 
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    placeholder="Descreva as regras e objetivos do desafio..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                    {(createMutation.isPending || updateMutation.isPending) ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    {currentChallenge ? 'Atualizar Desafio' : 'Criar Desafio'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {challenges.map(challenge => (
              <ChallengeCard 
                key={challenge.id} 
                challenge={challenge} 
                isManager={true}
                onEdit={handleEdit}
                onDelete={(id) => {
                  if (confirm("Tem certeza que deseja excluir?")) deleteMutation.mutate(id);
                }}
                onFinalize={handleFinalize}
                onUpdateProgress={(c) => {
                  setProgressData({ 
                    value: c.target_type === 'oficina' ? (c.participants?.find(p => p.user_id === c.workshop_id)?.current_value || 0) : 0, 
                    challenge: c 
                  });
                  setShowProgressModal(true);
                }}
              />
            ))}
            {challenges.length === 0 && !isLoading && (
              <div className="text-center py-12 bg-white rounded-lg border border-dashed">
                <Globe className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Nenhum desafio global cadastrado.</p>
              </div>
            )}
          </div>
        )}

        {/* Modal de Atualização de Progresso */}
        <Dialog open={showProgressModal} onOpenChange={setShowProgressModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Atualizar Progresso</DialogTitle>
              <DialogDescription>
                Insira o valor atual alcançado para o desafio "{progressData.challenge?.title}".
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label>Valor Atual</Label>
              <Input 
                type="number" 
                value={progressData.value} 
                onChange={(e) => setProgressData({...progressData, value: e.target.value})}
                placeholder="Ex: 50000"
              />
              <p className="text-xs text-gray-500 mt-1">Meta: {progressData.challenge?.goal_value}</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowProgressModal(false)}>Cancelar</Button>
              <Button onClick={handleUpdateProgress} className="bg-purple-600 hover:bg-purple-700">Salvar Progresso</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}