import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Loader2, User, Award, Brain, History } from "lucide-react";
import { technicalCriteria, emotionalCriteria, calculateClassification } from "../components/performance/PerformanceCriteria";
import { toast } from "sonner";
import TrackingWrapper from "@/components/shared/TrackingWrapper";

export default function DiagnosticoDesempenho() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [workshop, setWorkshop] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [currentSection, setCurrentSection] = useState("intro");
  
  const [technicalScores, setTechnicalScores] = useState(
    Object.fromEntries(technicalCriteria.map(c => [c.id, 5]))
  );
  
  const [emotionalScores, setEmotionalScores] = useState(
    Object.fromEntries(emotionalCriteria.map(c => [c.id, 5]))
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      const workshops = await base44.entities.Workshop.list();
      let userWorkshop = workshops.find(w => w.owner_id === currentUser.id);
      
      if (!userWorkshop) {
        // Fallback for employees
        const employees = await base44.entities.Employee.filter({ email: currentUser.email });
        if (employees.length > 0 && employees[0].workshop_id) {
            userWorkshop = workshops.find(w => w.id === employees[0].workshop_id);
        }
      }
      setWorkshop(userWorkshop);

      const allEmployees = await base44.entities.Employee.list();
      const activeEmployees = allEmployees.filter(e => 
        e.status === "ativo" && (!userWorkshop || e.workshop_id === userWorkshop.id)
      );
      setEmployees(activeEmployees);
    } catch (error) {
      toast.error("Você precisa estar logado");
      base44.auth.redirectToLogin(createPageUrl("DiagnosticoDesempenho"));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedEmployee) {
      toast.error("Selecione um colaborador");
      return;
    }

    setSubmitting(true);

    try {
      const techValues = Object.values(technicalScores);
      const emoValues = Object.values(emotionalScores);
      
      const technicalAvg = techValues.reduce((a, b) => a + b, 0) / techValues.length;
      const emotionalAvg = emoValues.reduce((a, b) => a + b, 0) / emoValues.length;
      
      const { classification, recommendation } = calculateClassification(technicalAvg, emotionalAvg);

      const diagnostic = await base44.entities.PerformanceMatrixDiagnostic.create({
        employee_id: selectedEmployee,
        evaluator_id: user.id,
        workshop_id: workshop?.id || null,
        technical_scores: technicalScores,
        emotional_scores: emotionalScores,
        technical_average: Number(technicalAvg.toFixed(2)),
        emotional_average: Number(emotionalAvg.toFixed(2)),
        classification: classification,
        recommendation: recommendation,
        completed: true
      });

      toast.success("Diagnóstico de desempenho concluído!");
      navigate(createPageUrl("ResultadoDesempenho") + `?id=${diagnostic.id}`);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar diagnóstico");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <TrackingWrapper
      workshopId={workshop?.id}
      itemTipo="diagnostico"
      itemId="diagnostico_desempenho"
      itemNome="Matriz de Decisão de Desempenho"
      itemCategoria="diagnosticos"
    >
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div className="text-center md:text-left flex-1">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-full mb-3">
              <Award className="w-6 h-6 text-indigo-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">
              Matriz de Decisão de Desempenho
            </h1>
            <p className="text-gray-600">
              Avalie competências técnicas e emocionais.
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate(createPageUrl("HistoricoDesempenho"))}>
            <History className="w-4 h-4 mr-2" />
            Histórico
          </Button>
        </div>

        {currentSection === "intro" && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center gap-3">
                <User className="w-6 h-6 text-indigo-600" />
                <div>
                  <CardTitle>Selecione o Colaborador</CardTitle>
                  <CardDescription>Escolha quem será avaliado nesta matriz de decisão</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Colaborador *</Label>
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha um colaborador..." />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.length === 0 ? (
                      <SelectItem value="none" disabled>
                        Nenhum colaborador cadastrado
                      </SelectItem>
                    ) : (
                      employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.full_name} - {emp.position}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-indigo-50 rounded-lg p-4 space-y-2">
                <h3 className="font-semibold text-indigo-900">Como funciona a avaliação:</h3>
                <ul className="text-sm text-indigo-700 space-y-1 ml-4 list-disc">
                  <li><strong>17 critérios técnicos</strong> (Habilidade/Conhecimento)</li>
                  <li><strong>13 critérios emocionais</strong> (Atitude/Caráter)</li>
                  <li>Cada critério recebe nota de <strong>0 a 10</strong></li>
                  <li>Classificação automática na matriz de decisão</li>
                </ul>
              </div>

              <Button
                onClick={() => setCurrentSection("technical")}
                disabled={!selectedEmployee}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
              >
                Iniciar Avaliação
              </Button>
            </CardContent>
          </Card>
        )}

        {currentSection === "technical" && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Brain className="w-6 h-6 text-blue-600" />
                <div>
                  <CardTitle>Competências Técnicas</CardTitle>
                  <CardDescription>Habilidade e Conhecimento - Avalie de 0 a 10</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {technicalCriteria.map((criterion, index) => (
                <div key={criterion.id} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-medium">
                      {index + 1}. {criterion.text}
                    </Label>
                    <span className="text-lg font-bold text-blue-600 min-w-[40px] text-right">
                      {technicalScores[criterion.id]}
                    </span>
                  </div>
                  <Slider
                    value={[technicalScores[criterion.id]]}
                    onValueChange={([value]) => 
                      setTechnicalScores({...technicalScores, [criterion.id]: value})
                    }
                    min={0}
                    max={10}
                    step={1}
                    className="w-full"
                  />
                </div>
              ))}

              <div className="flex gap-4 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setCurrentSection("intro")}
                  className="flex-1"
                >
                  Voltar
                </Button>
                <Button
                  onClick={() => setCurrentSection("emotional")}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  Próximo: Avaliação Emocional
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentSection === "emotional" && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Award className="w-6 h-6 text-purple-600" />
                <div>
                  <CardTitle>Competências Emocionais</CardTitle>
                  <CardDescription>Atitude e Caráter - Avalie de 0 a 10</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {emotionalCriteria.map((criterion, index) => (
                <div key={criterion.id} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-medium">
                      {index + 1}. {criterion.text}
                    </Label>
                    <span className="text-lg font-bold text-purple-600 min-w-[40px] text-right">
                      {emotionalScores[criterion.id]}
                    </span>
                  </div>
                  <Slider
                    value={[emotionalScores[criterion.id]]}
                    onValueChange={([value]) => 
                      setEmotionalScores({...emotionalScores, [criterion.id]: value})
                    }
                    min={0}
                    max={10}
                    step={1}
                    className="w-full"
                  />
                </div>
              ))}

              <div className="flex gap-4 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setCurrentSection("technical")}
                  className="flex-1"
                >
                  Voltar
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    "Finalizar Avaliação"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
    </TrackingWrapper>
  );
}