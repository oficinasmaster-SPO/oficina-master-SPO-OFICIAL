import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import HeroBanner from "@/components/training/HeroBanner";
import CourseRow from "@/components/training/CourseRow";
import ComingSoonSection from "@/components/training/ComingSoonSection";

export default function AcademiaTreinamento() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [featuredCourse, setFeaturedCourse] = useState(null);
  const [continueWatching, setContinueWatching] = useState([]);
  const [comingSoon, setComingSoon] = useState([]);
  const [topInBrazil, setTopInBrazil] = useState([]);
  const [popularInRegion, setPopularInRegion] = useState([]);
  const [trendingWeek, setTrendingWeek] = useState([]);
  const [byCategory, setByCategory] = useState({});
  const [progressMap, setProgressMap] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      // Buscar todos os cursos
      const allCourses = await base44.entities.TrainingCourse.list();
      
      // Filtrar por workshop se necessário
      let availableCourses = allCourses;
      const workshops = await base44.entities.Workshop.filter({ 
        owner_id: currentUser.id 
      });
      const userWorkshop = workshops[0];

      if (userWorkshop) {
        availableCourses = allCourses.filter(c => 
          !c.workshop_id || c.workshop_id === userWorkshop.id
        );
      }

      // Buscar progresso do usuário
      const userProgress = await base44.entities.CourseProgress.filter({
        user_id: currentUser.id
      });

      // Criar mapa de progresso por curso
      const progMap = {};
      for (const course of availableCourses) {
        const courseLessons = await base44.entities.CourseLesson.list();
        const courseModules = await base44.entities.CourseModule.filter({
          course_id: course.id
        });
        
        const totalLessons = courseLessons.filter(l => 
          courseModules.some(m => m.id === l.module_id)
        ).length;

        const completedLessons = userProgress.filter(p => 
          p.course_id === course.id && p.status === 'completed'
        ).length;

        progMap[course.id] = {
          progress_percentage: totalLessons > 0 
            ? Math.round((completedLessons / totalLessons) * 100) 
            : 0,
          completed: completedLessons,
          total: totalLessons,
          has_progress: userProgress.some(p => p.course_id === course.id)
        };
      }
      setProgressMap(progMap);

      // 1. Curso em Destaque
      const featured = availableCourses.find(c => c.is_featured && c.status === 'publicado') 
        || availableCourses.filter(c => c.status === 'publicado')[0];
      setFeaturedCourse(featured);

      // 2. Continue Assistindo
      const inProgress = availableCourses.filter(c => {
        const prog = progMap[c.id];
        return prog?.has_progress && prog.progress_percentage > 0 && prog.progress_percentage < 100;
      });
      setContinueWatching(inProgress);

      // 3. Em Breve
      const upcoming = availableCourses.filter(c => c.status === 'em_breve');
      setComingSoon(upcoming);

      // 4. Rankings (baseado em analytics)
      const analytics = await base44.entities.CourseAnalytics.list();
      const publishedCourses = availableCourses.filter(c => c.status === 'publicado');

      // Top 10 Brasil (maior total_views)
      const topBrazil = publishedCourses
        .map(c => ({
          ...c,
          views: analytics.find(a => a.course_id === c.id)?.total_views || 0
        }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);
      setTopInBrazil(topBrazil);

      // Populares na Região (mesmo estado)
      if (userWorkshop?.state) {
        const regionalCourses = publishedCourses
          .filter(c => c.workshop_id)
          .slice(0, 10);
        setPopularInRegion(regionalCourses);
      }

      // Tendências da Semana (maior completion rate)
      const trending = publishedCourses
        .map(c => ({
          ...c,
          completion_rate: analytics.find(a => a.course_id === c.id)?.average_completion_rate || 0
        }))
        .sort((a, b) => b.completion_rate - a.completion_rate)
        .slice(0, 10);
      setTrendingWeek(trending);

      // 5. Por Categoria
      const categories = ['vendas', 'tecnico', 'gestao', 'comercial', 'marketing'];
      const categorized = {};
      for (const cat of categories) {
        categorized[cat] = publishedCourses.filter(c => c.category === cat);
      }
      setByCategory(categorized);

    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar academia");
    } finally {
      setLoading(false);
    }
  };

  const remindMeMutation = useMutation({
    mutationFn: async (course) => {
      return await base44.entities.CourseReminder.create({
        user_id: user.id,
        course_id: course.id,
        reminder_type: 'coming_soon'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['course-reminders']);
    }
  });

  const handleCourseClick = (course) => {
    navigate(`${createPageUrl('AssistirCurso')}?course_id=${course.id}`);
  };

  const handlePlayCourse = (course) => {
    navigate(`${createPageUrl('AssistirCurso')}?course_id=${course.id}`);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Hero Banner */}
      <HeroBanner
        featuredCourse={featuredCourse}
        onPlay={handlePlayCourse}
        onInfo={handleCourseClick}
      />

      {/* Content Rows */}
      <div className="relative -mt-32 space-y-12 pb-16">
        {/* Continue Assistindo */}
        {continueWatching.length > 0 && (
          <CourseRow
            title="Continue de onde parou"
            subtitle="Retome seus estudos"
            courses={continueWatching}
            progressMap={progressMap}
            onCourseClick={handleCourseClick}
            showProgress={true}
          />
        )}

        {/* Top 10 Brasil */}
        {topInBrazil.length > 0 && (
          <CourseRow
            title="🏆 Top 10 no Brasil"
            subtitle="Os cursos mais assistidos nacionalmente"
            courses={topInBrazil}
            progressMap={progressMap}
            onCourseClick={handleCourseClick}
          />
        )}

        {/* Tendências */}
        {trendingWeek.length > 0 && (
          <CourseRow
            title="🔥 Tendências da Semana"
            subtitle="Cursos com maior engajamento"
            courses={trendingWeek}
            progressMap={progressMap}
            onCourseClick={handleCourseClick}
          />
        )}

        {/* Por Categoria */}
        {Object.entries(byCategory).map(([category, courses]) => {
          if (courses.length === 0) return null;
          
          const categoryLabels = {
            vendas: "💰 Vendas & Negociação",
            tecnico: "🔧 Técnico & Operacional",
            gestao: "📊 Gestão & Liderança",
            comercial: "📈 Comercial & Marketing",
            marketing: "📣 Marketing & Mídias"
          };

          return (
            <CourseRow
              key={category}
              title={categoryLabels[category] || category}
              courses={courses}
              progressMap={progressMap}
              onCourseClick={handleCourseClick}
            />
          );
        })}

        {/* Popular na Região */}
        {popularInRegion.length > 0 && (
          <CourseRow
            title="📍 Popular na sua Região"
            subtitle="Cursos mais assistidos no seu estado"
            courses={popularInRegion}
            progressMap={progressMap}
            onCourseClick={handleCourseClick}
          />
        )}

        {/* Em Breve */}
        {comingSoon.length > 0 && (
          <ComingSoonSection
            courses={comingSoon}
            onRemindMe={(course) => remindMeMutation.mutate(course)}
          />
        )}
      </div>
    </div>
  );
}