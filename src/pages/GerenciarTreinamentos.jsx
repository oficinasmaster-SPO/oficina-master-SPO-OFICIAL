import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, BookOpen, Loader2, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import CourseList from "@/components/training/CourseList";
import CourseFormDialog from "@/components/training/CourseFormDialog";

export default function GerenciarTreinamentos() {
  const navigate = useNavigate();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState("todos");
  const [filterType, setFilterType] = useState("todos");

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: workshop } = useQuery({
    queryKey: ['workshop', user?.workshop_id],
    queryFn: async () => {
      if (user?.workshop_id) {
        return await base44.entities.Workshop.get(user.workshop_id);
      }
      const workshops = await base44.entities.Workshop.filter({ owner_id: user.id });
      return workshops[0];
    },
    enabled: !!user
  });

  const { data: courses = [], isLoading, refetch } = useQuery({
    queryKey: ['training-courses', workshop?.id, user?.role],
    queryFn: async () => {
      if (user?.role === 'admin') {
        return await base44.entities.TrainingCourse.list('-created_date');
      }
      if (workshop?.id) {
        return await base44.entities.TrainingCourse.filter(
          { workshop_id: workshop.id },
          '-created_date'
        );
      }
      return [];
    },
    enabled: !!user && (!!workshop || user?.role === 'admin')
  });

  const myCourses = courses.filter(c => 
    c.created_by === user?.email || c.workshop_id === workshop?.id
  );
  const internalCourses = courses.filter(c => 
    !c.workshop_id && user?.role === 'admin'
  );

  const getFilteredCourses = (list) => {
    return list.filter(course => {
      const statusMatch = filterStatus === 'todos' || course.status === filterStatus;
      const typeMatch = filterType === 'todos' || 
        (filterType === 'interno' && !course.workshop_id) ||
        (filterType === 'empresa' && !!course.workshop_id);
      return statusMatch && typeMatch;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-8 h-8 text-blue-600" />
            Gestão de Treinamentos
          </h1>
          <p className="text-gray-600 mt-2">
            Crie e organize cursos, módulos e aulas para sua equipe
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(createPageUrl('ConfiguracaoAcademia'))}
          >
            <Settings className="w-4 h-4 mr-2" />
            Configurações
          </Button>
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Curso
          </Button>
        </div>
      </div>

      <Tabs defaultValue="meus-cursos" className="w-full">
        <TabsList>
          <TabsTrigger value="meus-cursos">
            Meus Cursos ({myCourses.length})
          </TabsTrigger>
          {user?.role === 'admin' && (
            <TabsTrigger value="internos">
              Treinamentos Internos ({internalCourses.length})
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="meus-cursos" className="mt-6">
          <CourseList
            courses={getFilteredCourses(myCourses)}
            onRefetch={refetch}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            filterType={filterType}
            setFilterType={setFilterType}
            showTypeFilter={false}
          />
        </TabsContent>

        {user?.role === 'admin' && (
          <TabsContent value="internos" className="mt-6">
            <CourseList
              courses={getFilteredCourses(internalCourses)}
              onRefetch={refetch}
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
              filterType={filterType}
              setFilterType={setFilterType}
              showTypeFilter={false}
            />
          </TabsContent>
        )}
      </Tabs>

      <CourseFormDialog
        open={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSuccess={refetch}
        workshopId={workshop?.id}
      />
    </div>
  );
}