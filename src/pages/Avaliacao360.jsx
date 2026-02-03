import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, TrendingUp, Heart, Award, MessageCircle, BarChart3 } from "lucide-react";
import { toast } from "sonner";

export default function Avaliacao360() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [evaluationType, setEvaluationType] = useState("peer");
  
  const [scores, setScores] = useState({
    comunicacao: 5,
    trabalho_equipe: 5,
    lideranca: 5,
    iniciativa: 5,
    qualidade_trabalho: 5,
    cumprimento_prazos: 5,
    adaptabilidade: 5,
    resolucao_problemas: 5
  });
  
  const [feedback, setFeedback] = useState({
    pontos_fortes: "",
    areas_melhoria: "",
    comentarios_gerais: ""
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const myEmployee = await base44.entities.Employee.filter({ user_id: currentUser.id });
      if (myEmployee && myEmployee.length > 0) {
        setEmployee(myEmployee[0]);
        
        // Carregar colegas da mesma oficina
        const colleagues = await base44.entities.Employee.filter({ 
          workshop_id: myEmployee[0].workshop_id,
          status: 'ativo'
        });
        setEmployees(colleagues.filter(e => e.id !== myEmployee[0].id));
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedEmployee) {
      toast.error("Selecione um colaborador para avaliar");
      return;
    }

    setSubmitting(true);
    try {
      await base44.entities.PerformanceFeedback.create({
        evaluated_employee_id: selectedEmployee,
        evaluator_id: user.id,
        evaluator_employee_id: employee.id,
        evaluation_type: evaluationType,
        scores,
        feedback,
        status: 'enviado'
      });

      toast.success("Avaliação enviada com sucesso!");
      setSelectedEmployee("");
      setScores({
        comunicacao: 5,
        trabalho_equipe: 5,
        lideranca: 5,
        iniciativa: 5,
        qualidade_trabalho: 5,
        cumprimento_prazos: 5,
        adaptabilidade: 5,
        resolucao_problemas: 5
      });
      setFeedback({
        pontos_fortes: "",
        areas_melhoria: "",
        comentarios_gerais: ""
      });
    } catch (error) {
      console.error(error);
      toast.error("Erro ao enviar avaliação");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const criteriaLabels = {
    comunicacao: "Comunicação",
    trabalho_equipe: "Trabalho em Equipe",
    lideranca: "Liderança",
    iniciativa: "Iniciativa",
    qualidade_trabalho: "Qualidade do Trabalho",
    cumprimento_prazos: "Cumprimento de Prazos",
    adaptabilidade: "Adaptabilidade",
    resolucao_problemas: "Resolução de Problemas"
  };

  const avgScore = Object.values(scores).reduce((a, b) => a + b, 0) / Object.keys(scores).length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-3 flex items-center justify-center gap-3">
          <Users className="w-10 h-10 text-blue-600" />
          Avaliação 360°
        </h1>
        <p className="text-gray-600">
          Avalie seus colegas e contribua para o desenvolvimento da equipe
        </p>
      </div>

      <Tabs defaultValue="avaliar" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 bg-white shadow-md">
          <TabsTrigger value="avaliar">
            <MessageCircle className="w-4 h-4 mr-2" />
            Avaliar Colegas
          </TabsTrigger>
          <TabsTrigger value="minhas">
            <BarChart3 className="w-4 h-4 mr-2" />
            Minhas Avaliações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="avaliar" className="space-y-6">
          {/* Seleção de Colaborador */}
          <Card>
            <CardHeader>
              <CardTitle>Selecione o Colaborador</CardTitle>
              <CardDescription>Escolha quem você deseja avaliar</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um colaborador..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.full_name} - {emp.position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {selectedEmployee && (
            <>
              {/* Tipo de Avaliação */}
              <Card>
                <CardHeader>
                  <CardTitle>Tipo de Avaliação</CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={evaluationType} onValueChange={setEvaluationType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="peer">Colega de Equipe</SelectItem>
                      <SelectItem value="subordinate">Subordinado</SelectItem>
                      <SelectItem value="manager">Gestor</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {/* Critérios de Avaliação */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Critérios de Avaliação</span>
                    <Badge className="bg-blue-600 text-white text-lg px-4 py-1">
                      Média: {avgScore.toFixed(1)}/10
                    </Badge>
                  </CardTitle>
                  <CardDescription>Avalie de 0 a 10 cada critério</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {Object.entries(criteriaLabels).map(([key, label]) => (
                    <div key={key} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="font-medium text-gray-900">{label}</label>
                        <span className="text-2xl font-bold text-blue-600">{scores[key]}</span>
                      </div>
                      <Slider
                        value={[scores[key]]}
                        onValueChange={(value) => setScores({ ...scores, [key]: value[0] })}
                        min={0}
                        max={10}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>0 - Insatisfatório</span>
                        <span>5 - Adequado</span>
                        <span>10 - Excepcional</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Feedback Qualitativo */}
              <Card>
                <CardHeader>
                  <CardTitle>Feedback Qualitativo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="font-medium text-gray-900 mb-2 block">Pontos Fortes</label>
                    <Textarea
                      value={feedback.pontos_fortes}
                      onChange={(e) => setFeedback({ ...feedback, pontos_fortes: e.target.value })}
                      placeholder="O que este colaborador faz muito bem?"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="font-medium text-gray-900 mb-2 block">Áreas de Melhoria</label>
                    <Textarea
                      value={feedback.areas_melhoria}
                      onChange={(e) => setFeedback({ ...feedback, areas_melhoria: e.target.value })}
                      placeholder="Onde este colaborador pode melhorar?"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="font-medium text-gray-900 mb-2 block">Comentários Gerais</label>
                    <Textarea
                      value={feedback.comentarios_gerais}
                      onChange={(e) => setFeedback({ ...feedback, comentarios_gerais: e.target.value })}
                      placeholder="Comentários adicionais..."
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700 px-8"
                >
                  {submitting ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Enviando...</>
                  ) : (
                    <>Enviar Avaliação</>
                  )}
                </Button>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="minhas">
          <MinhasAvaliacoes employeeId={employee?.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MinhasAvaliacoes({ employeeId }) {
  const { data: avaliacoes = [], isLoading } = useQuery({
    queryKey: ['minhas-avaliacoes', employeeId],
    queryFn: async () => {
      const result = await base44.entities.PerformanceFeedback.filter({ 
        evaluated_employee_id: employeeId 
      });
      return result || [];
    },
    enabled: !!employeeId
  });

  if (isLoading) {
    return <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />;
  }

  const avgScores = avaliacoes.length > 0 ? avaliacoes.reduce((acc, av) => {
    Object.entries(av.scores || {}).forEach(([key, value]) => {
      acc[key] = (acc[key] || 0) + value;
    });
    return acc;
  }, {}) : {};

  Object.keys(avgScores).forEach(key => {
    avgScores[key] = avgScores[key] / avaliacoes.length;
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Resumo das Avaliações Recebidas</CardTitle>
          <CardDescription>{avaliacoes.length} avaliações recebidas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(avgScores).map(([key, value]) => (
              <div key={key} className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 capitalize">{key.replace('_', ' ')}</p>
                <p className="text-2xl font-bold text-blue-600">{value.toFixed(1)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {avaliacoes.map((av, idx) => (
        <Card key={idx}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Avaliação #{idx + 1}</CardTitle>
              <Badge>{av.evaluation_type}</Badge>
            </div>
            <CardDescription>
              {new Date(av.created_date).toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {av.feedback?.pontos_fortes && (
              <div>
                <p className="font-medium text-green-900 mb-1">Pontos Fortes:</p>
                <p className="text-sm text-gray-700">{av.feedback.pontos_fortes}</p>
              </div>
            )}
            {av.feedback?.areas_melhoria && (
              <div>
                <p className="font-medium text-orange-900 mb-1">Áreas de Melhoria:</p>
                <p className="text-sm text-gray-700">{av.feedback.areas_melhoria}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}