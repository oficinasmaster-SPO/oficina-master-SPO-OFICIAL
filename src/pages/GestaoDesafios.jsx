import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2, Save, Target, Building2, Calendar, Award, Lightbulb, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function GestaoDesafios() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [currentChallenge, setCurrentChallenge] = useState(null);

  useEffect(() => {
    const init = async () => {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        if (currentUser) {
            const workshops = await base44.entities.Workshop.list();
            // Lógica para encontrar a oficina do usuário (mesma da Home)
            let userWorkshop = workshops.find(w => w.owner_id === currentUser.id);
            if (!userWorkshop) {
                const employees = await base44.entities.Employee.filter({ email: currentUser.email });
                const myEmployeeRecord = employees[0];
                if (myEmployeeRecord && myEmployeeRecord.workshop_id) {
                    userWorkshop = workshops.find(w => w.id === myEmployeeRecord.workshop_id);
                }
            }
            setWorkshop(userWorkshop);
        }
    };
    init();
  }, []);

  // Estado inicial do formulário
  const initialFormState = {
    title: "",
    description: "",
    scope: "workshop",
    type: "semanal",
    target_type: "individual",
    target_area: "todos",
    metric: "produtividade",
    goal_value: 0,
    reward_xp: 100,
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: format(new Date(new Date().setDate(new Date().getDate() + 7)), 'yyyy-MM-dd'),
    status: "ativo"
  };

  const [formData, setFormData] = useState(initialFormState);

  // Carregar desafios da oficina
  const { data: challenges = [], isLoading } = useQuery({
    queryKey: ['workshop-challenges', workshop?.id],
    queryFn: async () => {
      if (!workshop?.id) return [];
      const result = await base44.entities.Challenge.filter({ 
          scope: 'workshop',
          workshop_id: workshop.id
      });
      return Array.isArray(result) ? result.sort((a,b) => new Date(b.created_date) - new Date(a.created_date)) : [];
    },
    enabled: !!workshop?.id
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Challenge.create({
      ...data,
      workshop_id: workshop.id,
      start_date: new Date(data.start_date).toISOString(),
      end_date: new Date(data.end_date).toISOString()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['workshop-challenges']);
      toast.success("Desafio interno criado com sucesso!");
      resetForm();
    },
    onError: (e) => toast.error("Erro ao criar desafio: " + e.message)
  });

  const generateAiChallengeMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('generateChallengeAI', {
        scope: 'workshop',
        workshop_id: workshop.id
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
      toast.success("Sugestão da IA gerada com sucesso! Revise antes de salvar.");
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
      queryClient.invalidateQueries(['workshop-challenges']);
      toast.success("Desafio atualizado com sucesso!");
      resetForm();
    },
    onError: (e) => toast.error("Erro ao atualizar: " + e.message)
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Challenge.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['workshop-challenges']);
      toast.success("Desafio removido!");
    }
  });

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

  if (!workshop) {
    return <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto" /> Carregando dados da oficina...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Target className="w-8 h-8 text-purple-600" />
              Desafios da Oficina
            </h1>
            <p className="text-gray-600 mt-1">
              Crie competições internas para engajar sua equipe ({workshop.name})
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
                <Button onClick={() => setIsEditing(true)} className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="w-4 h-4 mr-2" /> Novo Desafio Interno
                </Button>
            </div>
          )}
        </div>

        {isEditing ? (
          <Card>
            <CardHeader>
              <CardTitle>{currentChallenge ? 'Editar Desafio' : 'Novo Desafio Interno'}</CardTitle>
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
                      placeholder="Ex: Semana Sem Erros"
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
                    <Label>Área / Equipe Alvo</Label>
                    <Select 
                      value={formData.target_area} 
                      onValueChange={v => setFormData({...formData, target_area: v})}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="tecnico">Técnicos</SelectItem>
                        <SelectItem value="vendas">Vendas</SelectItem>
                        <SelectItem value="comercial">Comercial</SelectItem>
                        <SelectItem value="administrativo">Administrativo</SelectItem>
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
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Métrica</Label>
                    <Select 
                      value={formData.metric} 
                      onValueChange={v => setFormData({...formData, metric: v})}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="produtividade">Produtividade (Pontos)</SelectItem>
                        <SelectItem value="faturamento">Faturamento (R$)</SelectItem>
                        <SelectItem value="qualidade">Qualidade (0 defeitos)</SelectItem>
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
                  <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
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
              <Card key={challenge.id} className="hover:shadow-md transition-all border-l-4 border-l-purple-500">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg text-gray-900">{challenge.title}</h3>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          challenge.status === 'ativo' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {challenge.status.toUpperCase()}
                        </span>
                        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                          {challenge.type}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm max-w-2xl">{challenge.description}</p>
                      <div className="flex gap-4 text-sm text-gray-500 mt-2">
                        <span>Meta: <strong>{challenge.goal_value}</strong></span>
                        <span>XP: <strong>{challenge.reward_xp}</strong></span>
                        <span>Área: <strong>{challenge.target_area}</strong></span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon" onClick={() => handleEdit(challenge)}>
                        <span className="sr-only">Editar</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {challenges.length === 0 && !isLoading && (
              <div className="text-center py-12 bg-white rounded-lg border border-dashed">
                <Lightbulb className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Nenhum desafio interno criado ainda.</p>
                <p className="text-sm text-gray-400">Crie competições para motivar sua equipe!</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}