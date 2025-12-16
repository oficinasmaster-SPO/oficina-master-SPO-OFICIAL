import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, PlayCircle, CheckCircle, Lock, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AssistirCurso() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get('course_id');

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: course, isLoading: loadingCourse } = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => base44.entities.TrainingCourse.get(courseId),
    enabled: !!courseId
  });

  const { data: modules = [], isLoading: loadingModules } = useQuery({
    queryKey: ['course-modules', courseId],
    queryFn: () => base44.entities.CourseModule.filter({ course_id: courseId }),
    enabled: !!courseId
  });

  const { data: allLessons = [] } = useQuery({
    queryKey: ['course-lessons', courseId],
    queryFn: async () => {
      const lessons = await base44.entities.CourseLesson.list();
      return lessons.filter(l => modules.some(m => m.id === l.module_id));
    },
    enabled: modules.length > 0
  });

  const { data: progress = [] } = useQuery({
    queryKey: ['user-progress', courseId, user?.id],
    queryFn: () => base44.entities.CourseProgress.filter({
      user_id: user.id,
      course_id: courseId
    }),
    enabled: !!user?.id && !!courseId
  });

  const handleStartLesson = (lessonId) => {
    navigate(`${createPageUrl('AssistirAula')}?lesson_id=${lessonId}`);
  };

  const isLessonCompleted = (lessonId) => {
    return progress.some(p => p.lesson_id === lessonId && p.status === 'completed');
  };

  const isLessonInProgress = (lessonId) => {
    return progress.some(p => p.lesson_id === lessonId && p.status === 'in_progress');
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
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <Button
        variant="ghost"
        onClick={() => navigate(createPageUrl('AcademiaTreinamento'))}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar para Academia
      </Button>

      {/* Header do Curso */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-8 text-white">
        <div className="flex items-start gap-6">
          {course.cover_images?.[0] && (
            <img
              src={course.cover_images[0]}
              alt={course.title}
              className="w-48 h-32 object-cover rounded-lg"
            />
          )}
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-3">{course.title}</h1>
            <p className="text-blue-100 mb-4">{course.description}</p>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="capitalize">
                {course.category}
              </Badge>
              <Badge variant="secondary" className="capitalize">
                {course.difficulty_level}
              </Badge>
              {course.total_duration_minutes > 0 && (
                <Badge variant="secondary">
                  {Math.floor(course.total_duration_minutes / 60)}h {course.total_duration_minutes % 60}min
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Módulos e Aulas */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">Conteúdo do Curso</h2>

        {modules.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-600">Este curso ainda não possui módulos configurados</p>
            </CardContent>
          </Card>
        ) : (
          modules.map((module) => {
            const moduleLessons = allLessons.filter(l => l.module_id === module.id);
            const completedCount = moduleLessons.filter(l => isLessonCompleted(l.id)).length;

            return (
              <Card key={module.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{module.title}</h3>
                      {module.description && (
                        <p className="text-sm text-gray-600 mt-1">{module.description}</p>
                      )}
                    </div>
                    <Badge variant="outline">
                      {completedCount} / {moduleLessons.length} concluídas
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    {moduleLessons.length === 0 ? (
                      <p className="text-sm text-gray-500">Nenhuma aula disponível</p>
                    ) : (
                      moduleLessons.map((lesson, idx) => {
                        const completed = isLessonCompleted(lesson.id);
                        const inProgress = isLessonInProgress(lesson.id);

                        return (
                          <div
                            key={lesson.id}
                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center gap-4 flex-1">
                              <div className="flex-shrink-0">
                                {completed ? (
                                  <CheckCircle className="w-6 h-6 text-green-600" />
                                ) : inProgress ? (
                                  <PlayCircle className="w-6 h-6 text-blue-600" />
                                ) : (
                                  <div className="w-6 h-6 rounded-full border-2 border-gray-300" />
                                )}
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">
                                  {idx + 1}. {lesson.title}
                                </p>
                                {lesson.duration_minutes > 0 && (
                                  <p className="text-sm text-gray-500">
                                    {lesson.duration_minutes} minutos
                                  </p>
                                )}
                              </div>
                            </div>

                            <Button
                              onClick={() => handleStartLesson(lesson.id)}
                              variant={completed ? "outline" : "default"}
                              size="sm"
                            >
                              {completed ? (
                                <>
                                  <PlayCircle className="w-4 h-4 mr-2" />
                                  Assistir novamente
                                </>
                              ) : inProgress ? (
                                <>
                                  <PlayCircle className="w-4 h-4 mr-2" />
                                  Continuar
                                </>
                              ) : (
                                <>
                                  <PlayCircle className="w-4 h-4 mr-2" />
                                  Iniciar
                                </>
                              )}
                            </Button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}