import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2, GripVertical, Video, FileText, Save, ArrowLeft, Brain } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function EditorModulo() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const moduleId = searchParams.get("id");
  
  const [loading, setLoading] = useState(true);
  const [module, setModule] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [assessments, setAssessments] = useState([]);
  
  // Lesson Modal
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [lessonForm, setLessonForm] = useState({ title: "", description: "", video_url: "", transcription: "", duration_seconds: 0 });

  // Assessment Modal
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);
  const [currentLessonId, setCurrentLessonId] = useState(null);
  const [assessmentForm, setAssessmentForm] = useState({ title: "", type: "quiz", questions: [] });

  useEffect(() => {
    if (moduleId) loadData();
  }, [moduleId]);

  const loadData = async () => {
    try {
      const [mod, less] = await Promise.all([
        base44.entities.TrainingModule.get(moduleId),
        base44.entities.TrainingLesson.filter({ module_id: moduleId })
      ]);
      
      setModule(mod);
      setLessons(less.sort((a, b) => a.order - b.order));

      // Load assessments for all lessons
      const allAssessments = [];
      for (const l of less) {
        const ass = await base44.entities.TrainingAssessment.filter({ lesson_id: l.id });
        if (ass) allAssessments.push(...ass);
      }
      setAssessments(allAssessments);
    } catch (error) {
      toast.error("Erro ao carregar módulo");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLesson = async () => {
    try {
        if (editingLesson) {
            await base44.entities.TrainingLesson.update(editingLesson.id, lessonForm);
            toast.success("Aula atualizada");
        } else {
            await base44.entities.TrainingLesson.create({
                ...lessonForm,
                module_id: moduleId,
                order: lessons.length + 1
            });
            toast.success("Aula criada");
        }
        setIsLessonModalOpen(false);
        loadData();
    } catch (e) {
        toast.error("Erro ao salvar aula");
    }
  };

  const openLessonModal = (lesson = null) => {
    if (lesson) {
        setEditingLesson(lesson);
        setLessonForm({ ...lesson });
    } else {
        setEditingLesson(null);
        setLessonForm({ title: "", description: "", video_url: "", transcription: "", duration_seconds: 0 });
    }
    setIsLessonModalOpen(true);
  };

  const handleDeleteLesson = async (id) => {
      if (confirm("Tem certeza?")) {
          await base44.entities.TrainingLesson.delete(id);
          loadData();
      }
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate(createPageUrl("GestaoTreinamentos"))}>
                <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
                <h1 className="text-3xl font-bold text-gray-900">{module.title}</h1>
                <p className="text-gray-500">Gerenciar conteúdo do módulo</p>
            </div>
        </div>

        <div className="flex justify-end">
            <Button onClick={() => openLessonModal()} className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-2" /> Adicionar Aula
            </Button>
        </div>

        <div className="space-y-4">
            {lessons.map((lesson, index) => (
                <Card key={lesson.id} className="group">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="cursor-move text-gray-400"><GripVertical className="w-5 h-5" /></div>
                        <div className="w-10 h-10 bg-indigo-100 rounded flex items-center justify-center text-indigo-600 font-bold">
                            {index + 1}
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-lg">{lesson.title}</h3>
                            <div className="flex gap-4 text-sm text-gray-500">
                                <span className="flex items-center gap-1"><Video className="w-3 h-3" /> {Math.round(lesson.duration_seconds / 60)} min</span>
                                {lesson.transcription && <span className="flex items-center gap-1 text-green-600"><Brain className="w-3 h-3" /> IA Ready</span>}
                            </div>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button size="sm" variant="outline" onClick={() => openLessonModal(lesson)}>
                                Editar
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDeleteLesson(lesson.id)}>
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    </CardContent>
                    
                    {/* Assessments Section inside Lesson Card */}
                    <div className="bg-gray-50 p-3 border-t text-sm">
                        <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-gray-600">Avaliações & Exercícios</span>
                            {/* Simplification: Just showing placeholder for now */}
                            <Button size="sm" variant="link" className="text-indigo-600 h-auto p-0">
                                + Adicionar Avaliação
                            </Button>
                        </div>
                        {assessments.filter(a => a.lesson_id === lesson.id).length === 0 && (
                            <p className="text-gray-400 italic text-xs">Nenhuma avaliação vinculada.</p>
                        )}
                    </div>
                </Card>
            ))}
            {lessons.length === 0 && (
                <div className="text-center py-12 text-gray-500 bg-white rounded border border-dashed">
                    Nenhuma aula cadastrada neste módulo.
                </div>
            )}
        </div>

        {/* Lesson Modal */}
        <Dialog open={isLessonModalOpen} onOpenChange={setIsLessonModalOpen}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>{editingLesson ? "Editar Aula" : "Nova Aula"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div>
                        <Label>Título</Label>
                        <Input value={lessonForm.title} onChange={e => setLessonForm({...lessonForm, title: e.target.value})} />
                    </div>
                    <div>
                        <Label>Link do Vídeo (YouTube/Vimeo)</Label>
                        <Input value={lessonForm.video_url} onChange={e => setLessonForm({...lessonForm, video_url: e.target.value})} placeholder="https://..." />
                    </div>
                    <div>
                        <Label>Duração (segundos)</Label>
                        <Input type="number" value={lessonForm.duration_seconds} onChange={e => setLessonForm({...lessonForm, duration_seconds: parseInt(e.target.value)})} />
                    </div>
                    <div>
                        <Label>Transcrição / Resumo (Para IA)</Label>
                        <Textarea 
                            value={lessonForm.transcription} 
                            onChange={e => setLessonForm({...lessonForm, transcription: e.target.value})} 
                            placeholder="Cole aqui o texto do vídeo para que a IA possa gerar feedbacks precisos..."
                            rows={5}
                        />
                    </div>
                    <Button onClick={handleSaveLesson} className="w-full">Salvar Aula</Button>
                </div>
            </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}