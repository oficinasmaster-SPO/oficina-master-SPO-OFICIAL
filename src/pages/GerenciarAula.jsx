import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, ArrowLeft, Plus, Trash2, CheckCircle, HelpCircle, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function GerenciarAula() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const lessonId = searchParams.get("id");

  const [loading, setLoading] = useState(true);
  const [lesson, setLesson] = useState(null);
  const [assessments, setAssessments] = useState([]);
  
  // Assessment Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState(null);
  const [formData, setFormData] = useState({
    type: "quiz",
    title: "",
    description: "",
    passing_score: 70,
    ai_prompt_template: "",
    questions: [] 
  });
  
  // Current Question Editing State (inside modal)
  const [currentQuestion, setCurrentQuestion] = useState({
    id: "",
    text: "",
    type: "multiple_choice",
    options: ["", "", "", ""],
    correct_answer: "0" // index string or text value
  });

  useEffect(() => {
    if (lessonId) loadData();
  }, [lessonId]);

  const loadData = async () => {
    try {
      const l = await base44.entities.TrainingLesson.get(lessonId);
      setLesson(l);
      const a = await base44.entities.LessonAssessment.filter({ lesson_id: lessonId });
      setAssessments(a);
    } catch (error) {
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = () => {
    if (!currentQuestion.text) return;
    
    const newQ = {
      ...currentQuestion,
      id: Date.now().toString(),
      // Filter empty options if multiple choice
      options: currentQuestion.type === 'multiple_choice' ? currentQuestion.options.filter(o => o.trim()) : []
    };

    setFormData({
      ...formData,
      questions: [...formData.questions, newQ]
    });

    setCurrentQuestion({
      id: "",
      text: "",
      type: "multiple_choice",
      options: ["", "", "", ""],
      correct_answer: "0"
    });
  };

  const handleRemoveQuestion = (index) => {
    const newQs = [...formData.questions];
    newQs.splice(index, 1);
    setFormData({ ...formData, questions: newQs });
  };

  const handleSaveAssessment = async () => {
    if (!formData.title || formData.questions.length === 0) {
      toast.error("Título e pelo menos uma pergunta são obrigatórios");
      return;
    }

    try {
      const data = {
        ...formData,
        lesson_id: lessonId
      };

      if (editingAssessment) {
        await base44.entities.LessonAssessment.update(editingAssessment.id, data);
        toast.success("Avaliação atualizada");
      } else {
        await base44.entities.LessonAssessment.create(data);
        toast.success("Avaliação criada");
      }
      
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      toast.error("Erro ao salvar");
    }
  };

  const handleDeleteAssessment = async (id) => {
    if (!confirm("Excluir avaliação?")) return;
    await base44.entities.LessonAssessment.delete(id);
    loadData();
  };

  const openModal = (assessment = null) => {
    if (assessment) {
      setEditingAssessment(assessment);
      setFormData({
        type: assessment.type,
        title: assessment.title,
        description: assessment.description || "",
        passing_score: assessment.passing_score || 70,
        ai_prompt_template: assessment.ai_prompt_template || "",
        questions: assessment.questions || []
      });
    } else {
      setEditingAssessment(null);
      setFormData({
        type: "quiz",
        title: "",
        description: "",
        passing_score: 70,
        ai_prompt_template: "",
        questions: []
      });
    }
    setIsModalOpen(true);
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(`${createPageUrl("GerenciarModulo")}?id=${lesson.module_id}`)} className="mb-4 pl-0">
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar para Módulo
        </Button>

        <div className="flex justify-between items-center mb-8">
          <div>
             <h1 className="text-2xl font-bold text-slate-900">Gerenciar Avaliações</h1>
             <p className="text-slate-600">Aula: {lesson.title}</p>
          </div>
          <Button onClick={() => openModal()} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" /> Nova Avaliação
          </Button>
        </div>

        <div className="grid gap-4">
          {assessments.length === 0 && (
            <Card className="text-center py-8">
              <CardContent>
                <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">Nenhuma avaliação criada para esta aula.</p>
              </CardContent>
            </Card>
          )}
          
          {assessments.map(assessment => (
            <Card key={assessment.id}>
              <CardHeader className="flex flex-row items-center justify-between py-4">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {assessment.title}
                    <span className="text-xs font-normal px-2 py-1 bg-slate-100 rounded-full border capitalize">
                      {assessment.type}
                    </span>
                  </CardTitle>
                  <p className="text-sm text-gray-500">{assessment.questions.length} perguntas • Nota mínima: {assessment.passing_score}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openModal(assessment)}>Editar</Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteAssessment(assessment.id)}>Excluir</Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAssessment ? "Editar Avaliação" : "Nova Avaliação"}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Título</Label>
                <Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Ex: Quiz sobre Fechamento" />
              </div>
              <div className="col-span-2">
                <Label>Descrição / Instruções</Label>
                <Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={formData.type} onValueChange={val => setFormData({...formData, type: val})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quiz">Quiz (Múltipla Escolha)</SelectItem>
                    <SelectItem value="exercise">Exercício (Dissertativo)</SelectItem>
                    <SelectItem value="poll">Enquete (Sem nota)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Nota Mínima (0-100)</Label>
                <Input type="number" value={formData.passing_score} onChange={e => setFormData({...formData, passing_score: parseInt(e.target.value)})} />
              </div>
              <div className="col-span-2">
                <Label className="flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-purple-600" />
                  Instruções para a IA (Prompt Template)
                </Label>
                <Textarea 
                  value={formData.ai_prompt_template} 
                  onChange={e => setFormData({...formData, ai_prompt_template: e.target.value})} 
                  placeholder="Ex: Seja rigoroso com a gramática. Foque na aplicação prática dos conceitos da aula X."
                  className="border-purple-200 bg-purple-50 focus:border-purple-400"
                />
                <p className="text-xs text-gray-500 mt-1">Instruções específicas para personalizar o feedback que a IA dará ao aluno.</p>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-4">Perguntas ({formData.questions.length})</h3>
              
              <div className="space-y-4 mb-6">
                {formData.questions.map((q, idx) => (
                  <div key={idx} className="p-3 border rounded bg-gray-50 relative group">
                    <p className="font-medium pr-8">{idx + 1}. {q.text}</p>
                    {q.type === 'multiple_choice' && (
                      <ul className="ml-4 mt-2 text-sm text-gray-600 list-disc">
                        {q.options.map((opt, i) => (
                          <li key={i} className={String(i) === String(q.correct_answer) ? "text-green-600 font-bold" : ""}>
                            {opt}
                          </li>
                        ))}
                      </ul>
                    )}
                    <Button 
                      size="icon" variant="ghost" 
                      className="absolute top-2 right-2 text-red-500 opacity-0 group-hover:opacity-100"
                      onClick={() => handleRemoveQuestion(idx)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="bg-slate-100 p-4 rounded-lg border border-slate-200">
                <h4 className="text-sm font-bold mb-3 text-slate-700">Adicionar Pergunta</h4>
                <div className="space-y-3">
                  <div>
                    <Label>Enunciado</Label>
                    <Input value={currentQuestion.text} onChange={e => setCurrentQuestion({...currentQuestion, text: e.target.value})} />
                  </div>
                  
                  <div>
                    <Label>Tipo da Pergunta</Label>
                    <Select value={currentQuestion.type} onValueChange={val => setCurrentQuestion({...currentQuestion, type: val})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="multiple_choice">Múltipla Escolha</SelectItem>
                        <SelectItem value="text">Texto Livre</SelectItem>
                        <SelectItem value="boolean">Verdadeiro/Falso</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {currentQuestion.type === 'multiple_choice' && (
                    <div className="grid grid-cols-2 gap-2">
                      {currentQuestion.options.map((opt, idx) => (
                        <div key={idx}>
                          <Label className="text-xs">Opção {idx + 1}</Label>
                          <div className="flex items-center gap-2">
                             <Input value={opt} onChange={e => {
                               const newOpts = [...currentQuestion.options];
                               newOpts[idx] = e.target.value;
                               setCurrentQuestion({...currentQuestion, options: newOpts});
                             }} />
                             {formData.type !== 'poll' && (
                                 <input 
                                   type="radio" 
                                   name="correct_opt" 
                                   checked={String(currentQuestion.correct_answer) === String(idx)}
                                   onChange={() => setCurrentQuestion({...currentQuestion, correct_answer: String(idx)})}
                                   title="Marcar como correta"
                                 />
                             )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {currentQuestion.type === 'boolean' && formData.type !== 'poll' && (
                     <div className="flex gap-4">
                        <label className="flex items-center gap-2">
                          <input type="radio" name="bool_ans" checked={currentQuestion.correct_answer === 'true'} onChange={() => setCurrentQuestion({...currentQuestion, correct_answer: 'true'})} />
                          Verdadeiro
                        </label>
                        <label className="flex items-center gap-2">
                          <input type="radio" name="bool_ans" checked={currentQuestion.correct_answer === 'false'} onChange={() => setCurrentQuestion({...currentQuestion, correct_answer: 'false'})} />
                          Falso
                        </label>
                     </div>
                  )}

                  <Button onClick={handleAddQuestion} size="sm" className="w-full mt-2">
                    <Plus className="w-4 h-4 mr-2" /> Adicionar à Avaliação
                  </Button>
                </div>
              </div>
            </div>

            <Button onClick={handleSaveAssessment} className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6">
              Salvar Avaliação
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}