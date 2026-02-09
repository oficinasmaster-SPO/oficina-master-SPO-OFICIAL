import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import TrainingBreadcrumbs from "@/components/training/Breadcrumbs";
import ProgressionRulesConfig from "@/components/training/ProgressionRulesConfig";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ArrowLeft, Plus, Video, FileText, GripVertical, Trash2, Edit, PlayCircle, CheckSquare } from "lucide-react";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

export default function GerenciarModulo() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const moduleId = searchParams.get("id");
  
  const [loading, setLoading] = useState(true);
  const [module, setModule] = useState(null);
  const [lessons, setLessons] = useState([]);
  
  // Lesson Modal
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [lessonData, setLessonData] = useState({
    title: "",
    description: "",
    content_type: "video_youtube",
    content_url: "",
    duration_minutes: 0,
    transcript: "",
    progression_rules: {
      can_advance_if_failed: true,
      can_retake_assessment: true,
      can_skip_to_assessment: true,
      next_lesson_unlock: "always",
      require_assessment_pass: false
    }
  });
  const [savingLesson, setSavingLesson] = useState(false);

  useEffect(() => {
    if (!moduleId) {
      toast.error("Módulo não especificado");
      navigate(createPageUrl("GerenciarTreinamentos"));
      return;
    }
    loadData();
  }, [moduleId]);

  const loadData = async () => {
    try {
      const mod = await base44.entities.CourseModule.get(moduleId);
      setModule(mod);

      const ls = await base44.entities.CourseLesson.filter({ module_id: moduleId });
      setLessons(ls.sort((a, b) => a.order - b.order));
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLesson = async () => {
    if (!lessonData.title || !lessonData.content_type) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    setSavingLesson(true);
    try {
      const data = {
        ...lessonData,
        module_id: moduleId,
        order: editingLesson ? editingLesson.order : lessons.length + 1
      };

      if (editingLesson) {
        await base44.entities.CourseLesson.update(editingLesson.id, data);
        toast.success("Aula atualizada!");
      } else {
        await base44.entities.CourseLesson.create(data);
        toast.success("Aula criada!");
      }

      setIsLessonModalOpen(false);
      resetLessonForm();
      loadData();
    } catch (error) {
      toast.error("Erro ao salvar aula");
    } finally {
      setSavingLesson(false);
    }
  };

  const handleDeleteLesson = async (id) => {
    if (!confirm("Excluir esta aula?")) return;
    try {
      await base44.entities.CourseLesson.delete(id);
      toast.success("Aula excluída");
      loadData();
    } catch (error) {
      toast.error("Erro ao excluir");
    }
  };

  const handleEditLesson = (lesson) => {
    setEditingLesson(lesson);
    setLessonData({
      title: lesson.title,
      description: lesson.description || "",
      content_type: lesson.content_type,
      content_url: lesson.content_url || "",
      duration_minutes: lesson.duration_minutes || 0,
      transcript: lesson.transcript || "",
      progression_rules: lesson.progression_rules || {
        can_advance_if_failed: true,
        can_retake_assessment: true,
        can_skip_to_assessment: true,
        next_lesson_unlock: "always",
        require_assessment_pass: false
      }
    });
    setIsLessonModalOpen(true);
  };

  const resetLessonForm = () => {
    setEditingLesson(null);
    setLessonData({
      title: "",
      description: "",
      content_type: "video_youtube",
      content_url: "",
      duration_minutes: 0,
      transcript: "",
      progression_rules: {
        can_advance_if_failed: true,
        can_retake_assessment: true,
        can_skip_to_assessment: true,
        next_lesson_unlock: "always",
        require_assessment_pass: false
      }
    });
  };

  const onDragEnd = async (result) => {
    if (!result.destination) return;

    const items = Array.from(lessons);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setLessons(items);

    // Update order in backend (optimistic update locally first)
    // Ideally should be batched or debounced
    try {
      await Promise.all(items.map((lesson, index) => 
        base44.entities.CourseLesson.update(lesson.id, { order: index + 1 })
      ));
    } catch (error) {
      console.error("Failed to reorder", error);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-5xl mx-auto">
        <TrainingBreadcrumbs
          items={[
            { label: module.title, onClick: () => navigate(createPageUrl("GerenciarModulosCurso") + `?course_id=${module.course_id}`) },
            { label: "Aulas" }
          ]}
        />

        <div className="flex justify-between items-start mb-8">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">{module.title}</h1>
                <p className="text-slate-600 mt-1">{module.description}</p>
            </div>
            <Button onClick={() => { resetLessonForm(); setIsLessonModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" /> Nova Aula
            </Button>
        </div>

        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Conteúdo do Módulo</CardTitle>
            </CardHeader>
            <CardContent>
                <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="lessons">
                        {(provided) => (
                            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                                {lessons.length === 0 && <p className="text-center text-gray-500 py-8">Nenhuma aula criada ainda.</p>}
                                {lessons.map((lesson, index) => (
                                    <Draggable key={lesson.id} draggableId={lesson.id} index={index}>
                                        {(provided) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                className="flex items-center gap-4 p-4 bg-white border rounded-lg hover:shadow-sm transition-shadow group"
                                            >
                                                <div {...provided.dragHandleProps} className="text-gray-400 cursor-grab hover:text-gray-600">
                                                    <GripVertical className="w-5 h-5" />
                                                </div>
                                                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 text-blue-600">
                                                    {lesson.content_type.includes('video') ? <Video className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-semibold text-slate-900">{lesson.title}</h4>
                                                    <div className="flex items-center gap-3 text-sm text-gray-500">
                                                        <span>{lesson.duration_minutes} min</span>
                                                        <span className="capitalize">{lesson.content_type.replace('_', ' ')}</span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button size="sm" variant="outline" onClick={() => navigate(`${createPageUrl("GerenciarAula")}?id=${lesson.id}`)}>
                                                        <CheckSquare className="w-4 h-4 mr-2" />
                                                        Avaliações
                                                    </Button>
                                                    <Button size="sm" variant="ghost" onClick={() => handleEditLesson(lesson)}>
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                    <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleDeleteLesson(lesson.id)}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
            </CardContent>
        </Card>
      </div>

      <Dialog open={isLessonModalOpen} onOpenChange={setIsLessonModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle>{editingLesson ? "Editar Aula" : "Nova Aula"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <Label>Título da Aula</Label>
                        <Input value={lessonData.title} onChange={(e) => setLessonData({...lessonData, title: e.target.value})} />
                    </div>
                    <div className="col-span-2">
                        <Label>Descrição</Label>
                        <Textarea value={lessonData.description} onChange={(e) => setLessonData({...lessonData, description: e.target.value})} />
                    </div>
                    <div>
                        <Label>Tipo de Conteúdo</Label>
                        <Select value={lessonData.content_type} onValueChange={(val) => setLessonData({...lessonData, content_type: val})}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="video_youtube">Vídeo (YouTube)</SelectItem>
                                <SelectItem value="video_upload">Vídeo (Upload)</SelectItem>
                                <SelectItem value="text">Texto/Artigo</SelectItem>
                                <SelectItem value="pdf">Documento PDF</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Duração Estimada (min)</Label>
                        <Input type="number" value={lessonData.duration_minutes} onChange={(e) => setLessonData({...lessonData, duration_minutes: parseInt(e.target.value) || 0})} />
                    </div>
                    <div className="col-span-2">
                        <Label>URL do Conteúdo</Label>
                        <div className="space-y-2">
                            <Input 
                                value={lessonData.content_url} 
                                onChange={(e) => setLessonData({...lessonData, content_url: e.target.value})} 
                                placeholder={
                                    lessonData.content_type === 'video_youtube' ? 'https://youtube.com/watch?v=...' :
                                    lessonData.content_type === 'video_upload' ? 'Clique em "Fazer Upload" abaixo' :
                                    'URL do arquivo'
                                } 
                            />
                            {lessonData.content_type === 'video_upload' && (
                                <div>
                                    <input
                                        type="file"
                                        accept="video/*"
                                        id="video-upload"
                                        className="hidden"
                                        onChange={async (e) => {
                                            const file = e.target.files[0];
                                            if (!file) return;
                                            setSavingLesson(true);
                                            try {
                                                const result = await base44.integrations.Core.UploadFile({ file });
                                                setLessonData({...lessonData, content_url: result.file_url});
                                                toast.success('Vídeo enviado!');
                                            } catch (error) {
                                                toast.error('Erro ao enviar vídeo');
                                            } finally {
                                                setSavingLesson(false);
                                            }
                                        }}
                                    />
                                    <label
                                        htmlFor="video-upload"
                                        className="flex items-center justify-center gap-2 w-full p-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors"
                                    >
                                        <Video className="w-5 h-5 text-gray-400" />
                                        <span className="text-sm text-gray-600">
                                            {lessonData.content_url ? 'Trocar Vídeo' : 'Fazer Upload de Vídeo'}
                                        </span>
                                    </label>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="col-span-2">
                        <Label>Transcrição / Resumo (Para IA)</Label>
                        <Textarea 
                            value={lessonData.transcript} 
                            onChange={(e) => setLessonData({...lessonData, transcript: e.target.value})} 
                            placeholder="Cole aqui a transcrição ou um resumo detalhado do conteúdo para que a IA possa gerar feedbacks precisos."
                            className="h-32"
                        />
                    </div>
                </div>

                <ProgressionRulesConfig
                  rules={lessonData.progression_rules}
                  onChange={(newRules) => setLessonData({...lessonData, progression_rules: newRules})}
                />
                <Button onClick={handleSaveLesson} disabled={savingLesson} className="w-full bg-blue-600 hover:bg-blue-700">
                    {savingLesson ? <Loader2 className="animate-spin" /> : "Salvar Aula"}
                </Button>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
