import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Loader2, User, Save } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const technicalCriteria = [
  { key: "conhece_funcao", label: "Conhece profundamente sua função" },
  { key: "atinge_resultados", label: "Atinge os resultados esperados" },
  { key: "baixo_retrabalho", label: "Baixo retrabalho/erros" },
  { key: "trabalha_alto_nivel", label: "Trabalha em alto nível de qualidade" },
  { key: "toma_decisoes", label: "Toma decisões corretas" },
  { key: "contribui_ideias", label: "Contribui com ideias e melhorias" },
  { key: "produz_qualidade", label: "Produz com qualidade consistente" },
  { key: "prioridade_certa", label: "Define prioridades corretamente" },
  { key: "sistemas_eficientes", label: "Usa sistemas de forma eficiente" },
  { key: "transmite_informacoes", label: "Transmite informações claramente" },
  { key: "cumpre_compromissos", label: "Cumpre compromissos e prazos" },
  { key: "informa_impossibilidades", label: "Comunica impossibilidades a tempo" },
  { key: "da_recebe_feedback", label: "Dá e recebe feedback bem" },
  { key: "excede_expectativas", label: "Excede expectativas regularmente" },
  { key: "busca_conhecimento", label: "Busca conhecimento continuamente" },
  { key: "compreende_tecnologias", label: "Compreende novas tecnologias" },
  { key: "desenvolvimento_profissional", label: "Foca no desenvolvimento profissional" }
];

const emotionalCriteria = [
  { key: "autoconfianca", label: "Autoconfiança" },
  { key: "autocontrole", label: "Autocontrole emocional" },
  { key: "superacao", label: "Superação de desafios" },
  { key: "iniciativa", label: "Iniciativa e proatividade" },
  { key: "transparencia", label: "Transparência e honestidade" },
  { key: "flexibilidade", label: "Flexibilidade e adaptação" },
  { key: "otimismo", label: "Otimismo e positividade" },
  { key: "empatia", label: "Empatia com colegas" },
  { key: "servico", label: "Orientação ao cliente" },
  { key: "lideranca", label: "Liderança e influência" },
  { key: "influencia", label: "Capacidade de influenciar" },
  { key: "gerenciamento_conflitos", label: "Gerenciamento de conflitos" },
  { key: "trabalho_equipe", label: "Trabalho em equipe" }
];

export default function AutoavaliacaoDesempenho() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [technicalScores, setTechnicalScores] = useState({});
  const [emotionalScores, setEmotionalScores] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const employees = await base44.entities.Employee.filter({ user_id: currentUser.id });
      if (employees && employees.length > 0) {
        setEmployee(employees[0]);
        
        const initialTech = {};
        technicalCriteria.forEach(c => initialTech[c.key] = 5);
        setTechnicalScores(initialTech);

        const initialEmot = {};
        emotionalCriteria.forEach(c => initialEmot[c.key] = 5);
        setEmotionalScores(initialEmot);
      } else {
        toast.error("Perfil de colaborador não encontrado");
        navigate(createPageUrl("MeuPerfil"));
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const techAvg = Object.values(technicalScores).reduce((a, b) => a + b, 0) / technicalCriteria.length;
      const emotAvg = Object.values(emotionalScores).reduce((a, b) => a + b, 0) / emotionalCriteria.length;

      let classification = "observacao";
      if (techAvg < 5 && emotAvg < 5) classification = "demissao";
      else if (techAvg < 7 && emotAvg >= 7) classification = "treinamento_tecnico";
      else if (techAvg >= 7 && emotAvg < 7) classification = "treinamento_emocional";
      else if (techAvg >= 8 && emotAvg >= 8) classification = "investimento";
      else if (techAvg >= 7 && emotAvg >= 7) classification = "reconhecimento";

      const diagnostic = await base44.entities.PerformanceMatrixDiagnostic.create({
        employee_id: employee.id,
        evaluator_id: user.id,
        workshop_id: employee.workshop_id,
        evaluation_type: 'self',
        technical_scores: technicalScores,
        emotional_scores: emotionalScores,
        technical_average: techAvg,
        emotional_average: emotAvg,
        classification,
        completed: true
      });

      toast.success("Autoavaliação concluída!");
      navigate(createPageUrl("ResultadoDesempenho") + `?id=${diagnostic.id}`);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setSaving(false);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <Card className="shadow-2xl border-2 border-blue-200 mb-6">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <CardTitle className="flex items-center gap-2">
              <User className="w-6 h-6" />
              Autoavaliação de Desempenho - {employee?.full_name}
            </CardTitle>
            <p className="text-blue-100 text-sm mt-1">
              Avalie suas competências técnicas e emocionais de forma honesta
            </p>
          </CardHeader>
        </Card>

        {/* Competências Técnicas */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Competências Técnicas</CardTitle>
            <p className="text-sm text-gray-600">Avalie de 0 a 10</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {technicalCriteria.map((criteria) => (
              <div key={criteria.key}>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">{criteria.label}</label>
                  <span className="text-lg font-bold text-blue-600">{technicalScores[criteria.key] || 5}</span>
                </div>
                <Slider
                  value={[technicalScores[criteria.key] || 5]}
                  onValueChange={(val) => setTechnicalScores({...technicalScores, [criteria.key]: val[0]})}
                  max={10}
                  step={0.5}
                  className="w-full"
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Competências Emocionais */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Competências Emocionais</CardTitle>
            <p className="text-sm text-gray-600">Avalie de 0 a 10</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {emotionalCriteria.map((criteria) => (
              <div key={criteria.key}>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">{criteria.label}</label>
                  <span className="text-lg font-bold text-purple-600">{emotionalScores[criteria.key] || 5}</span>
                </div>
                <Slider
                  value={[emotionalScores[criteria.key] || 5]}
                  onValueChange={(val) => setEmotionalScores({...emotionalScores, [criteria.key]: val[0]})}
                  max={10}
                  step={0.5}
                  className="w-full"
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button 
            onClick={handleSubmit}
            disabled={saving}
            className="bg-green-600 hover:bg-green-700 px-8 py-6 text-lg h-auto"
          >
            {saving ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Salvando...</>
            ) : (
              <><Save className="w-5 h-5 mr-2" /> Concluir Autoavaliação</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}