import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { BookOpen, MoreVertical, Edit, Trash2, Eye, Play, Settings, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import CourseFormDialog from "./CourseFormDialog";
import PublishCourseDialog from "./PublishCourseDialog";
import AccessControlDialog from "./AccessControlDialog";

export default function CourseCard({ course, onRefetch }) {
  const navigate = useNavigate();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [isAccessOpen, setIsAccessOpen] = useState(false);

  const getStatusColor = (status) => {
    const colors = {
      rascunho: "bg-gray-100 text-gray-700",
      publicado: "bg-green-100 text-green-700",
      em_breve: "bg-blue-100 text-blue-700",
      arquivado: "bg-red-100 text-red-700"
    };
    return colors[status] || colors.rascunho;
  };

  const getStatusLabel = (status) => {
    const labels = {
      rascunho: "Rascunho",
      publicado: "Publicado",
      em_breve: "Em Breve",
      arquivado: "Arquivado"
    };
    return labels[status] || status;
  };

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir este curso?')) return;
    try {
      await base44.entities.TrainingCourse.delete(course.id);
      toast.success('Curso excluído com sucesso');
      onRefetch();
    } catch (error) {
      toast.error('Erro ao excluir curso');
    }
  };

  const coverImage = course.cover_images?.[0] || null;
  const isInternal = !course.workshop_id;

  return (
    <>
      <Card className="group hover:shadow-lg transition-all overflow-hidden">
        <div className="relative h-48 bg-gray-200">
          {coverImage ? (
            <img src={coverImage} alt={course.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
              <BookOpen className="w-16 h-16 text-blue-300" />
            </div>
          )}
          <div className="absolute top-3 right-3 flex gap-2">
            <Badge className={getStatusColor(course.status)}>
              {getStatusLabel(course.status)}
            </Badge>
            {isInternal && (
              <Badge className="bg-purple-100 text-purple-700">
                Interno
              </Badge>
            )}
          </div>
        </div>

        <CardContent className="p-5 space-y-4">
          <div className="flex justify-between items-start gap-2">
            <h3 className="text-lg font-bold text-gray-900 line-clamp-2 flex-1">
              {course.title}
            </h3>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
                  <Edit className="w-4 h-4 mr-2" /> Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsPublishOpen(true)}>
                  <Play className="w-4 h-4 mr-2" /> Publicar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsAccessOpen(true)}>
                  <Users className="w-4 h-4 mr-2" /> Controle de Acesso
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => navigate(`${createPageUrl('GerenciarModulo')}?course_id=${course.id}`)}
                >
                  <Settings className="w-4 h-4 mr-2" /> Gerenciar Módulos
                </DropdownMenuItem>
                <DropdownMenuItem className="text-red-600" onClick={handleDelete}>
                  <Trash2 className="w-4 h-4 mr-2" /> Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <p className="text-sm text-gray-600 line-clamp-2">
            {course.description || "Sem descrição"}
          </p>

          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="capitalize">
              {course.category || 'outros'}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {course.difficulty_level || 'iniciante'}
            </Badge>
            {course.total_duration_minutes > 0 && (
              <Badge variant="outline">
                {course.total_duration_minutes} min
              </Badge>
            )}
          </div>

          <Button
            className="w-full"
            onClick={() => navigate(`${createPageUrl('GerenciarModulo')}?course_id=${course.id}`)}
          >
            <Settings className="w-4 h-4 mr-2" />
            Gerenciar Conteúdo
          </Button>
        </CardContent>
      </Card>

      <CourseFormDialog
        open={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSuccess={onRefetch}
        course={course}
        workshopId={course.workshop_id}
      />

      <PublishCourseDialog
        open={isPublishOpen}
        onClose={() => setIsPublishOpen(false)}
        course={course}
        onSuccess={onRefetch}
      />

      <AccessControlDialog
        open={isAccessOpen}
        onClose={() => setIsAccessOpen(false)}
        course={course}
        onSuccess={onRefetch}
      />
    </>
  );
}