import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, PlayCircle, CheckCircle, Lock, ArrowLeft, ChevronRight, FileText, Video, CheckCircle2, AlertCircle, Brain, PartyPopper } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from 'react-markdown';

export default function AssistirAula() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const lessonId = searchParams.get("id");
  
  const [loading, setLoading] = useState(true);
  const [lesson, setLesson] = useState(null);
  const [module, setModule] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [userProgress, setUserProgress] = useState({}); // map lessonId -> status
  const [assessments, setAssessments] = useState([]);
  const [user, setUser] = useState(null);

  // Assessment State
  const [activeAssessment, setActiveAssessment] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [aiFeedback, setAiFeedback] = useState(null);
  const [assessmentResult, setAssessmentResult] = useState(null);

  useEffect(() => {
    if (lessonId) loadData();
  }, [lessonId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      // 1. Fetch current lesson
      const currentLesson = await base44.entities.TrainingLesson.get(lessonId);
      if (!currentLesson) {
         toast.error("Aula não encontrada");
         return;
      }
      setLesson(currentLesson);

      // 2. Fetch module and all lessons
      const mod = await base44.entities.TrainingModule.get(currentLesson.module_id);
      setModule(mod);
      
      const allLessons = await base44.entities.TrainingLesson.filter({ module_id: currentLesson.module_id });
      setLessons(allLessons.sort((a, b) => a.order - b.order));

      // 3. Fetch user progress for this module
      const progress = await base44.entities.EmployeeTrainingProgress.filter({ 
          employee_id: currentUser.id,
          module_id: currentLesson.module_id 
      });
      
      const progressMap = {};
      progress.forEach(p => { progressMap[p.lesson_id] = p.status; });
      setUserProgress(progressMap);

      // 4. Fetch assessments for this lesson
      const lessonAssessments = await base44.entities.LessonAssessment.filter({ lesson_id: lessonId });
      setAssessments(lessonAssessments);

      // 5. Check if user already took the assessment
      if (lessonAssessments.length > 0) {
          const results = await base44.entities.LessonAssessmentResult.filter({ 
              employee_id: currentUser.id, 
              assessment_id: lessonAssessments[0].id 
          });
          if (results.length > 0) {
              setAssessmentResult(results[0]); // Show last result
          }
      }
      
      // 6. Mark as started if not already
      if (!progressMap[lessonId]) {
          await updateProgress('in_progress');
      }

    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar aula");
    } finally {
      setLoading(false);
    }
  };

  const updateProgress = async (status) => {
    try {
        // Check if record exists
        const existing = await base44.entities.EmployeeTrainingProgress.filter({
            employee_id: user.id,
            lesson_id: lesson.id
        });

        const data = {
            employee_id: user.id,
            lesson_id: lesson.id,
            module_id: lesson.module_id,
            status: status,
            last_access_date: new Date().toISOString()
        };

        if (status === 'completed') {
            data.completed_date = new Date().toISOString();
            data.progress_percentage = 100;
        }

        if (existing.length > 0) {
            await base44.entities.EmployeeTrainingProgress.update(existing[0].id, data);
        } else {
            await base44.entities.EmployeeTrainingProgress.create(data);
        }
        
        setUserProgress(prev => ({ ...prev, [lesson.id]: status }));

    } catch (error) {
        console.error("Error updating progress", error);
    }
  };

  const handleCompleteLesson = async () => {
      if (userProgress[lesson.id] === 'completed') {
          // Already completed, just navigate
          const currentIndex = lessons.findIndex(l => l.id === lesson.id);
          if (currentIndex < lessons.length - 1) {
              navigate(`${createPageUrl('AssistirAula')}?id=${lessons[currentIndex + 1].id}`);
          } else {
              toast.success("Módulo finalizado! Volte para 'Meus Treinamentos' para pegar seu certificado.");
              navigate(createPageUrl("MeusTreinamentos"));
          }
          return;
      }

      await updateProgress('completed');
      
      // Award XP
      try {
          const xpResponse = await base44.functions.invoke('awardXP', {
              user_id: user.id,
              xp_amount: 50, // 50 XP per lesson
              reason: `Conclusão da aula: ${lesson.title}`
          });
          
          if (xpResponse.data.leveled_up) {
              toast.success(`Aula concluída! +50 XP. Parabéns, você subiu para o nível ${xpResponse.data.profile.level}!`, {
                  icon: <PartyPopper className="w-5 h-5 text-yellow-500" />
              });
          } else {
              toast.success("Aula concluída! +50 XP");
          }
      } catch (error) {
          console.error("Failed to award XP", error);
          toast.success("Aula concluída!");
      }
      
      // Navigate to next lesson?
      const currentIndex = lessons.findIndex(l => l.id === lesson.id);
      if (currentIndex < lessons.length - 1) {
          setTimeout(() => {
              navigate(`${createPageUrl('AssistirAula')}?id=${lessons[currentIndex + 1].id}`);
          }, 1500);
      } else {
          // Module Completed
          // Award Extra XP for Module Completion
          try {
             await base44.functions.invoke('awardXP', {
                  user_id: user.id,
                  xp_amount: 200, // Bonus for module
                  reason: `Conclusão do módulo: ${module.title}`
              });
              toast.success("Módulo Completo! +200 XP Bônus");
          } catch (e) {}

          setTimeout(() => {
              navigate(createPageUrl("MeusTreinamentos"));
          }, 2000);
      }
  };

  const handleSubmitAssessment = async () => {
    const assessment = assessments[0]; // Handling 1 assessment per lesson for simplicity now
    if (!assessment) return;

    // Validate answers
    if (Object.keys(answers).length < assessment.questions.length) {
        toast.error("Responda todas as perguntas");
        return;
    }

    setSubmitting(true);
    setAiFeedback(null);

    try {
        // Call AI backend
        const response = await base44.functions.invoke("generateTrainingAIFeedback", {
            lesson_id: lesson.id,
            assessment_id: assessment.id,
            user_answers: answers,
            employee_name: user.full_name
        });

        const aiResult = response.data;
        
        if (response.status !== 200) throw new Error(aiResult.error || "Erro na IA");

        setAiFeedback(aiResult);

        // Save Result
        const resultData = {
            employee_id: user.id,
            assessment_id: assessment.id,
            score: aiResult.score,
            passed: aiResult.passed,
            answers: answers,
            ai_feedback: JSON.stringify(aiResult), // Storing full object for now
            attempt_date: new Date().toISOString()
        };

        await base44.entities.LessonAssessmentResult.create(resultData);
        setAssessmentResult(resultData);

        if (aiResult.passed) {
            toast.success("Parabéns! Você passou na avaliação.");
            handleCompleteLesson();
        } else {
            toast.warning("Você não atingiu a nota mínima. Veja o feedback e tente novamente.");
        }

    } catch (error) {
        console.error(error);
        toast.error("Erro ao enviar avaliação");
    } finally {
        setSubmitting(false);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-slate-100 overflow-hidden">
      {/* Sidebar - Lesson List */}
      <div className="w-full lg:w-80 bg-white border-r flex flex-col h-full overflow-hidden flex-shrink-0">
        <div className="p-4 border-b bg-slate-50">
            <h2 className="font-bold text-slate-800 line-clamp-1" title={module.title}>{module.title}</h2>
            <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                <Progress value={(Object.values(userProgress).filter(s => s === 'completed').length / lessons.length) * 100} className="h-1.5 flex-1" />
                <span>{Math.round((Object.values(userProgress).filter(s => s === 'completed').length / lessons.length) * 100)}%</span>
            </div>
        </div>
        <ScrollArea className="flex-1">
            <div className="p-4 space-y-2">
                {lessons.map((l, idx) => {
                    const isActive = l.id === lesson.id;
                    const status = userProgress[l.id] || 'not_started';
                    
                    return (
                        <button
                            key={l.id}
                            onClick={() => navigate(`${createPageUrl('AssistirAula')}?id=${l.id}`)}
                            className={`w-full text-left p-3 rounded-lg text-sm flex items-start gap-3 transition-colors ${
                                isActive ? 'bg-blue-50 border-blue-200 border' : 'hover:bg-slate-50 border border-transparent'
                            }`}
                        >
                            <div className="mt-0.5">
                                {status === 'completed' ? (
                                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                                ) : isActive ? (
                                    <PlayCircle className="w-4 h-4 text-blue-600" />
                                ) : (
                                    <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
                                )}
                            </div>
                            <div>
                                <p className={`font-medium ${isActive ? 'text-blue-700' : 'text-slate-700'}`}>{idx + 1}. {l.title}</p>
                                <span className="text-xs text-slate-500">{l.duration_minutes} min • {l.content_type === 'video_youtube' ? 'Vídeo' : 'Leitura'}</span>
                            </div>
                        </button>
                    );
                })}
            </div>
        </ScrollArea>
        <div className="p-4 border-t">
            <Button variant="outline" className="w-full" onClick={() => navigate(createPageUrl("MeusTreinamentos"))}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
            </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Lesson Content Area */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                
                {/* Content Player */}
                <div className="bg-black rounded-xl overflow-hidden shadow-lg aspect-video relative">
                    {lesson.content_type === 'video_youtube' ? (
                        <iframe 
                            src={`https://www.youtube.com/embed/${lesson.content_url.split('v=')[1]?.split('&')[0]}`} 
                            title={lesson.title}
                            className="w-full h-full"
                            allowFullScreen
                        />
                    ) : lesson.content_type === 'text' ? (
                        <div className="bg-white w-full h-full p-8 overflow-y-auto">
                            <article className="prose max-w-none">
                                <ReactMarkdown>{lesson.content_url}</ReactMarkdown> {/* Assuming content_url might store text for 'text' type, or fetches from url */}
                            </article>
                        </div>
                    ) : (
                         <div className="w-full h-full flex items-center justify-center text-white">
                            <p>Conteúdo não suportado ou link externo: <a href={lesson.content_url} target="_blank" className="underline text-blue-400">Abrir</a></p>
                         </div>
                    )}
                </div>

                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">{lesson.title}</h1>
                        <p className="text-slate-600 mt-2">{lesson.description}</p>
                    </div>
                    {userProgress[lesson.id] !== 'completed' && (
                         <Button onClick={handleCompleteLesson} className="bg-green-600 hover:bg-green-700">
                             Concluir Aula
                         </Button>
                    )}
                </div>

                <Separator />

                <Tabs defaultValue="assessments" className="w-full">
                    <TabsList>
                        <TabsTrigger value="assessments" className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" /> Avaliações & Exercícios
                        </TabsTrigger>
                        <TabsTrigger value="materials" className="flex items-center gap-2">
                            <FileText className="w-4 h-4" /> Materiais Complementares
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="assessments" className="mt-6">
                        {assessments.length === 0 ? (
                            <div className="text-center py-8 bg-slate-50 rounded-lg">
                                <p className="text-slate-500">Não há avaliações para esta aula.</p>
                            </div>
                        ) : assessmentResult && assessmentResult.passed ? (
                            <Card className="border-green-200 bg-green-50">
                                <CardContent className="pt-6 text-center">
                                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Trophy className="w-8 h-8 text-green-600" />
                                    </div>
                                    <h3 className="text-xl font-bold text-green-800">Avaliação Concluída!</h3>
                                    <p className="text-green-700 mb-4">Você atingiu a nota necessária.</p>
                                    
                                    {assessmentResult.ai_feedback && (
                                        <div className="bg-white p-4 rounded-lg text-left mt-4 border border-green-100 shadow-sm">
                                            <div className="flex items-center gap-2 mb-2 font-bold text-purple-700">
                                                <Brain className="w-4 h-4" /> Feedback da IA:
                                            </div>
                                            <ReactMarkdown className="prose text-sm">
                                                {JSON.parse(assessmentResult.ai_feedback).feedback}
                                            </ReactMarkdown>
                                        </div>
                                    )}

                                    <Button variant="outline" className="mt-4" onClick={() => setAssessmentResult(null)}>
                                        Tentar Novamente
                                    </Button>
                                </CardContent>
                            </Card>
                        ) : (
                            <Card>
                                <CardHeader>
                                    <CardTitle>{assessments[0].title}</CardTitle>
                                    <p className="text-sm text-slate-500">{assessments[0].description}</p>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {assessments[0].questions.map((q, idx) => (
                                        <div key={idx} className="space-y-3">
                                            <p className="font-medium text-slate-900">{idx + 1}. {q.text}</p>
                                            
                                            {q.type === 'multiple_choice' && (
                                                <RadioGroup onValueChange={(val) => setAnswers({...answers, [idx]: val})} value={answers[idx]}>
                                                    {q.options.map((opt, i) => (
                                                        <div key={i} className="flex items-center space-x-2">
                                                            <RadioGroupItem value={opt} id={`q${idx}-opt${i}`} />
                                                            <Label htmlFor={`q${idx}-opt${i}`} className="cursor-pointer">{opt}</Label>
                                                        </div>
                                                    ))}
                                                </RadioGroup>
                                            )}
                                            
                                            {q.type === 'text' && (
                                                <Textarea 
                                                    placeholder="Sua resposta..." 
                                                    onChange={(e) => setAnswers({...answers, [idx]: e.target.value})}
                                                    value={answers[idx] || ''}
                                                />
                                            )}

                                            {q.type === 'boolean' && (
                                                <RadioGroup onValueChange={(val) => setAnswers({...answers, [idx]: val})} value={answers[idx]} className="flex gap-4">
                                                    <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value="true" id={`q${idx}-true`} />
                                                        <Label htmlFor={`q${idx}-true`}>Verdadeiro</Label>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value="false" id={`q${idx}-false`} />
                                                        <Label htmlFor={`q${idx}-false`}>Falso</Label>
                                                    </div>
                                                </RadioGroup>
                                            )}
                                        </div>
                                    ))}

                                    <Button onClick={handleSubmitAssessment} disabled={submitting} className="w-full bg-blue-600 hover:bg-blue-700">
                                        {submitting ? <Loader2 className="animate-spin mr-2" /> : "Enviar Respostas"}
                                    </Button>

                                    {aiFeedback && !aiFeedback.passed && (
                                         <div className="mt-6 bg-red-50 p-4 rounded-lg border border-red-200">
                                             <div className="flex items-center gap-2 text-red-800 font-bold mb-2">
                                                 <AlertCircle className="w-5 h-5" /> Atenção
                                             </div>
                                             <p className="text-red-700 text-sm mb-4">Você não atingiu a pontuação mínima. Veja o feedback abaixo:</p>
                                             
                                             <div className="bg-white p-4 rounded border border-red-100">
                                                 <div className="flex items-center gap-2 mb-2 font-bold text-purple-700">
                                                     <Brain className="w-4 h-4" /> Feedback da IA:
                                                 </div>
                                                 <ReactMarkdown className="prose text-sm text-slate-700">
                                                     {aiFeedback.feedback}
                                                 </ReactMarkdown>
                                             </div>
                                         </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>
                    <TabsContent value="materials">
                        <div className="py-4 text-center text-slate-500">
                            Materiais complementares em breve.
                        </div>
                    </TabsContent>
                </Tabs>

            </div>
        </div>
      </div>
    </div>
  );
}

function Trophy({ className }) {
    return (
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="24" 
        height="24" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className={className}
      >
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
      </svg>
    )
}