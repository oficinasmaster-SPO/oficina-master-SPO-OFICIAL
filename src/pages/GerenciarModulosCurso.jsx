import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import TrainingBreadcrumbs from "@/components/training/Breadcrumbs";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, ArrowLeft, Plus, GripVertical, Trash2, Edit, Book } from "lucide-react";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

export default function GerenciarModulosCurso() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get("course_id");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: ""
  });

  const { data: course, isLoading: loadingCourse } = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => base44.entities.TrainingCourse.get(courseId),
    enabled: !!courseId
  });

  const { data: modules = [], isLoading: loadingModules } = useQuery({
    queryKey: ['course-modules', courseId],
    queryFn: async () => {
      const mods = await base44.entities.CourseModule.filter({ course_id: courseId });
      return mods.sort((a, b) => a.order - b.order);
    },
    enabled: !!courseId
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const moduleData = {
        ...data,
        course_id: courseId,
        order: editingModule ? editingModule.order : modules.length + 1
      };

      if (editingModule) {
        return await base44.entities.CourseModule.update(editingModule.id, moduleData);
      } else {
        return await base44.entities.CourseModule.create(moduleData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['course-modules']);
      toast.success(editingModule ? 'Módulo atualizado!' : 'Módulo criado!');
      setIsModalOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error('Erro ao salvar módulo');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CourseModule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['course-modules']);
      toast.success('Módulo excluído');
    },
    onError: () => {
      toast.error('Erro ao excluir');
    }
  });

  const handleSave = () => {
    if (!formData.title) {
      toast.error('Título é obrigatório');
      return;
    }
    saveMutation.mutate(formData);
  };

  const handleDelete = (id) => {
    if (!confirm('Excluir este módulo e todas as suas aulas?')) return;
    deleteMutation.mutate(id);
  };

  const handleEdit = (module) => {
    setEditingModule(module);
    setFormData({
      title: module.title,
      description: module.description || ""
    });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingModule(null);
    setFormData({ title: "", description: "" });
  };

  const onDragEnd = async (result) => {
    if (!result.destination) return;

    const items = Array.from(modules);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    try {
      await Promise.all(items.map((module, index) => 
        base44.entities.CourseModule.update(module.id, { order: index + 1 })
      ));
      queryClient.invalidateQueries(['course-modules']);
    } catch (error) {
      toast.error("Erro ao reordenar");
    }
  };

  if (loadingCourse || loadingModules) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <p className="text-gray-600">Curso não encontrado</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-5xl mx-auto">
        <TrainingBreadcrumbs
          items={[
            { label: course.title },
            { label: "Módulos" }
          ]}
        />

        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{course.title}</h1>
            <p className="text-slate-600 mt-1">Gerencie os módulos deste curso</p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" /> Novo Módulo
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Módulos do Curso</CardTitle>
          </CardHeader>
          <CardContent>
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="modules">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                    {modules.length === 0 && (
                      <p className="text-center text-gray-500 py-8">
                        Nenhum módulo criado ainda.
                      </p>
                    )}
                    {modules.map((module, index) => (
                      <Draggable key={module.id} draggableId={module.id} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className="flex items-center gap-4 p-4 bg-white border rounded-lg hover:shadow-sm transition-shadow group"
                          >
                            <div
                              {...provided.dragHandleProps}
                              className="text-gray-400 cursor-grab hover:text-gray-600"
                            >
                              <GripVertical className="w-5 h-5" />
                            </div>
                            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 text-blue-600">
                              <Book className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-slate-900">{module.title}</h4>
                              {module.description && (
                                <p className="text-sm text-gray-500 mt-1">{module.description}</p>
                              )}
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                size="sm"
                                onClick={() => navigate(`${createPageUrl("GerenciarModulo")}?id=${module.id}`)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                Gerenciar Aulas
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEdit(module)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600"
                                onClick={() => handleDelete(module.id)}
                              >
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

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingModule ? "Editar Módulo" : "Novo Módulo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Título do Módulo</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Introdução ao Tema"
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva o conteúdo deste módulo..."
                rows={4}
              />
            </div>
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Salvar Módulo"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}