import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Building2, User, DollarSign, CheckSquare } from "lucide-react";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import InterviewPDFGenerator from "./InterviewPDFGenerator";
import { base44 } from "@/api/base44Client";

const CLASSIFICATION_COLORS = {
  A: "bg-green-600 text-white",
  B: "bg-blue-600 text-white",
  C: "bg-yellow-600 text-white",
  D: "bg-red-600 text-white"
};

const BLOCK_LABELS = {
  tecnico: { label: "Técnico", color: "#3b82f6" },
  comportamental: { label: "Comportamental", color: "#8b5cf6" },
  cultural: { label: "Cultural", color: "#ec4899" },
  historico: { label: "Histórico/Risco", color: "#f59e0b" }
};

export default function InterviewReportViewer({ interview, candidate, onClose }) {
  const [interviewer, setInterviewer] = React.useState(null);
  const [workshop, setWorkshop] = React.useState(null);

  React.useEffect(() => {
    const loadData = async () => {
      try {
        if (interview.interviewer_id) {
          const userData = await base44.entities.User.get(interview.interviewer_id);
          setInterviewer(userData);
        }
        if (interview.workshop_id) {
          const workshopData = await base44.entities.Workshop.get(interview.workshop_id);
          setWorkshop(workshopData);
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      }
    };
    loadData();
  }, [interview]);

  const handleDownloadPDF = () => {
    InterviewPDFGenerator.generate(interview, candidate, interviewer, workshop);
  };

  // Preparar dados para gráfico radar
  const radarData = [
    {
      subject: "Técnico",
      score: interview.technical_score || 0,
      fullMark: 100
    },
    {
      subject: "Comportamental",
      score: interview.behavioral_score || 0,
      fullMark: 100
    },
    {
      subject: "Cultural",
      score: interview.cultural_score || 0,
      fullMark: 100
    }
  ];

  // Preparar dados para gráfico de barras (por critério)
  const criteriaData = [];
  interview.forms_used?.forEach(form => {
    if (form.is_lead_score && form.answers) {
      form.answers.forEach(answer => {
        criteriaData.push({
          name: answer.question_text?.substring(0, 20) + "..." || "Critério",
          pontuacao: answer.score || 0
        });
      });
    }
  });

  return (
    <div className="space-y-6 w-full mx-auto" style={{ maxWidth: '210mm' }}>
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-8">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl">Relatório de Entrevista</CardTitle>
              <p className="text-blue-100 mt-1">{candidate?.full_name}</p>
            </div>
            <Button onClick={handleDownloadPDF} className="bg-white text-blue-600 hover:bg-blue-50">
              <Download className="w-4 h-4 mr-2" />
              Baixar PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          {/* Informações do Cabeçalho */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6 bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-xs text-gray-600">Candidato</p>
                <p className="font-semibold text-gray-900">{candidate?.full_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-xs text-gray-600">Empresa</p>
                <p className="font-semibold text-gray-900">{workshop?.name || "Carregando..."}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-xs text-gray-600">Entrevistador</p>
                <p className="font-semibold text-gray-900">{interviewer?.full_name || "Carregando..."}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-600">Data da Entrevista</p>
              <p className="font-medium">{new Date(interview.interview_date).toLocaleDateString('pt-BR')}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Cargo Pretendido</p>
              <p className="font-medium">{candidate?.desired_position}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Área</p>
              <p className="font-medium">{candidate?.desired_position?.includes('Técnico') ? 'Técnica' : 
                                           candidate?.desired_position?.includes('Vendas') ? 'Comercial' : 
                                           candidate?.desired_position?.includes('Marketing') ? 'Marketing' : 'Geral'}</p>
            </div>
          </div>

          {/* Informações Salariais */}
          {(candidate?.salary_expectation > 0 || candidate?.previous_salary > 0) && (
            <div className="bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-200 rounded-lg p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-6 h-6 text-green-600" />
                <h3 className="text-lg font-bold text-gray-900">Informações Salariais</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {candidate?.salary_expectation > 0 && (
                  <div className="bg-white p-4 rounded-lg border border-green-200">
                    <p className="text-sm text-gray-600 mb-1">💰 Pretensão Salarial</p>
                    <p className="text-2xl font-bold text-green-700">
                      R$ {candidate.salary_expectation.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                )}
                {candidate?.previous_salary > 0 && (
                  <div className="bg-white p-4 rounded-lg border border-blue-200">
                    <p className="text-sm text-gray-600 mb-1">🏢 Salário Anterior</p>
                    <p className="text-2xl font-bold text-blue-700">
                      R$ {candidate.previous_salary.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                )}
                {candidate?.bad_month_salary_claim && (
                  <div className="bg-white p-4 rounded-lg border border-yellow-200">
                    <p className="text-sm text-gray-600 mb-1">⚠️ Resposta "Mês Ruim"</p>
                    <p className="text-sm font-medium text-gray-900 mb-2">{candidate.bad_month_salary_claim}</p>
                    {candidate.salary_credibility_percentage > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              candidate.salary_credibility_percentage >= 70 ? 'bg-green-500' :
                              candidate.salary_credibility_percentage >= 40 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${candidate.salary_credibility_percentage}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-gray-700">{candidate.salary_credibility_percentage}%</span>
                      </div>
                    )}
                    <p className="text-xs text-gray-600 mt-1">Credibilidade da resposta</p>
                  </div>
                )}
              </div>
              {candidate?.salary_credibility_percentage > 0 && (
                <div className="mt-4 bg-white p-4 rounded-lg border border-yellow-300">
                  <p className="text-sm font-semibold text-yellow-800 mb-2">📊 Orientação de Negociação:</p>
                  <p className="text-sm text-gray-700">
                    {candidate.salary_credibility_percentage >= 70 
                      ? "✅ Alta credibilidade. Use o salário anterior como base real para negociação."
                      : candidate.salary_credibility_percentage >= 40
                      ? "⚠️ Credibilidade moderada. Valide informações com referências profissionais."
                      : "❌ Baixa credibilidade. Considere proposta conservadora e valide dados."}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded">
              <div>
                <p className="text-sm text-gray-600 mb-1">Lead Score Final</p>
                <p className="text-4xl font-bold text-blue-600">{interview.final_score || 0}</p>
              </div>
            </div>

            {interview.seniority_level && (
              <div className={`border-l-4 p-6 rounded-lg shadow-md ${
                interview.seniority_level === 'master' ? 'bg-gradient-to-br from-purple-50 to-purple-100 border-purple-600' :
                interview.seniority_level === 'senior' ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-600' :
                interview.seniority_level === 'pleno' ? 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-600' :
                'bg-gradient-to-br from-orange-50 to-orange-100 border-orange-600'
              }`}>
                <p className="text-sm text-gray-600 mb-2 font-medium uppercase tracking-wide">Nível de Senioridade</p>
                <div className="flex items-center gap-3 mb-2">
                  <span className={`text-5xl ${
                    interview.seniority_level === 'master' ? 'text-purple-600' :
                    interview.seniority_level === 'senior' ? 'text-green-600' :
                    interview.seniority_level === 'pleno' ? 'text-yellow-600' :
                    'text-orange-600'
                  }`}>
                    {interview.seniority_level === 'master' ? '👑' :
                     interview.seniority_level === 'senior' ? '⭐' :
                     interview.seniority_level === 'pleno' ? '🔷' :
                     '🌱'}
                  </span>
                  <div>
                    <p className={`text-3xl font-black ${
                      interview.seniority_level === 'master' ? 'text-purple-700' :
                      interview.seniority_level === 'senior' ? 'text-green-700' :
                      interview.seniority_level === 'pleno' ? 'text-yellow-700' :
                      'text-orange-700'
                    }`}>
                      {interview.seniority_level === 'master' ? 'MASTER' :
                       interview.seniority_level === 'senior' ? 'SÊNIOR' :
                       interview.seniority_level === 'pleno' ? 'PLENO' :
                       'JÚNIOR'}
                    </p>
                    <p className="text-xs text-gray-600 font-medium mt-0.5">
                      {interview.seniority_level === 'master' ? 'Profissional altamente capacitado • Top 1%' :
                       interview.seniority_level === 'senior' ? 'Profissional experiente • Alto nível' :
                       interview.seniority_level === 'pleno' ? 'Profissional qualificado • Nível intermediário' :
                       'Profissional em desenvolvimento • Nível inicial'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-gray-50 border-l-4 border-gray-600 p-4 rounded">
              <p className="text-sm text-gray-600 mb-1">Classificação Final</p>
              <Badge className={`text-2xl px-6 py-2 ${CLASSIFICATION_COLORS[interview.recommendation] || 'bg-gray-400'}`}>
                {interview.recommendation || "N/A"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader className="p-6">
          <CardTitle className="text-xl">Análise por Competência</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar name="Pontuação" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>

          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <p className="text-sm text-gray-600 mb-1">Técnico (40%)</p>
              <p className="text-3xl font-bold text-blue-600">{interview.technical_score || 0}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg text-center">
              <p className="text-sm text-gray-600 mb-1">Comportamental (30%)</p>
              <p className="text-3xl font-bold text-purple-600">{interview.behavioral_score || 0}</p>
            </div>
            <div className="bg-pink-50 p-4 rounded-lg text-center">
              <p className="text-sm text-gray-600 mb-1">Cultural (15%)</p>
              <p className="text-3xl font-bold text-pink-600">{interview.cultural_score || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {criteriaData.length > 0 && (
        <Card className="shadow-lg">
          <CardHeader className="p-6">
            <CardTitle className="text-xl">Pontuação Detalhada por Critério</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={criteriaData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis domain={[0, 10]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="pontuacao" fill="#3b82f6" name="Pontuação" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-lg">
        <CardHeader className="p-6">
          <CardTitle className="text-xl flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-blue-600" />
            Avaliação Detalhada + Checklists
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          {interview.forms_used?.map((form, idx) => (
            <div key={idx} className="border-l-4 border-blue-500 pl-4 py-2">
              <h3 className="font-semibold text-lg mb-3">{form.form_name}</h3>
              
              {form.answers?.map((answer, ansIdx) => (
                <div key={ansIdx} className="mb-4 bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-medium text-gray-900">{answer.question_text}</p>
                    <Badge className="bg-blue-100 text-blue-800">
                      {answer.score}/{answer.max_points || 10}
                    </Badge>
                  </div>
                  
                  {/* Checklist Completo (Pontuados e Não Pontuados) */}
                  {answer.checklist_selected && answer.checklist_selected.length > 0 && (
                    <div className="mt-3 bg-white p-4 rounded border-2 border-green-200">
                      <div className="flex items-center gap-2 mb-3">
                        <CheckSquare className="w-4 h-4 text-green-600" />
                        <p className="text-sm font-bold text-green-800">✅ Checklist - Itens Pontuados:</p>
                      </div>
                      <div className="space-y-1">
                        {answer.checklist_selected.map((item, itemIdx) => (
                          <div key={itemIdx} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="text-green-600 font-bold">✓</span>
                            <span>{item.text} <span className="text-green-600 font-semibold">(+{item.points} pts)</span></span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-sm font-semibold text-gray-700">
                          Total Checklist: <span className="text-green-600">{answer.checklist_selected.reduce((sum, item) => sum + item.points, 0)} pontos</span>
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Itens NÃO pontuados do checklist (se existirem) */}
                  {answer.checklist_items && answer.checklist_items.length > 0 && (
                    <div className="mt-3 bg-red-50 p-4 rounded border-2 border-red-200">
                      <div className="flex items-center gap-2 mb-3">
                        <CheckSquare className="w-4 h-4 text-red-600" />
                        <p className="text-sm font-bold text-red-800">❌ Checklist - Itens NÃO Pontuados:</p>
                      </div>
                      <div className="space-y-1">
                        {answer.checklist_items
                          .filter(item => !answer.checklist_selected?.find(sel => sel.text === item.text))
                          .map((item, itemIdx) => (
                            <div key={itemIdx} className="flex items-start gap-2 text-sm text-gray-600">
                              <span className="text-red-500 font-bold">✗</span>
                              <span>{item.text}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                  
                  {answer.observation && (
                    <div className="mt-2 bg-white p-3 rounded border border-gray-200">
                      <p className="text-sm text-gray-600 mb-1 font-medium">📝 Observações:</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{answer.observation}</p>
                    </div>
                  )}
                  
                  {answer.audio_url && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-600 mb-1 font-medium">🎙️ Áudio:</p>
                      <audio src={answer.audio_url} controls className="w-full" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </CardContent>
      </Card>

      {interview.interviewer_notes && (
        <Card className="shadow-lg">
          <CardHeader className="p-6">
            <CardTitle className="text-xl">Observações do Entrevistador</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-gray-700 whitespace-pre-wrap">{interview.interviewer_notes}</p>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-2 p-6">
        <Button variant="outline" onClick={onClose}>Fechar</Button>
        <Button onClick={handleDownloadPDF}>
          <FileText className="w-4 h-4 mr-2" />
          Baixar Relatório PDF
        </Button>
      </div>
    </div>
  );
}