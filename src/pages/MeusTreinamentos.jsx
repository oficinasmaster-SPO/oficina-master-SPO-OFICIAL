import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, BookOpen, PlayCircle, CheckCircle2, Lock, Trophy } from "lucide-react";
import { toast } from "sonner";

export default function MeusTreinamentos() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState([]);
  const [progressData, setProgressData] = useState({});
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      // 1. Fetch available modules (published ones)
      // In a real app, we might filter by user role/workshop
      let allModules = await base44.entities.TrainingModule.filter({ status: 'publicado' });
      
      // Filter by workshop if user belongs to one (assuming user has workshop_id or similar, 
      // logic might differ based on how user<->workshop is linked. 
      // For now, showing all published modules + those specific to their workshop if known)
      
      // 2. Fetch user progress
      const progress = await base44.entities.EmployeeTrainingProgress.filter({ employee_id: currentUser.id });
      
      // Map progress by module
      const progMap = {};
      
      // We need to know how many lessons are in each module to calculate %.
      // Fetching all lessons might be heavy, but necessary for accurate progress bar unless we denormalize.
      const allLessons = await base44.entities.TrainingLesson.list();
      
      for (const mod of allModules) {
        const modLessons = allLessons.filter(l => l.module_id === mod.id);
        const totalLessons = modLessons.length;
        
        if (totalLessons === 0) {
            progMap[mod.id] = { percent: 0, completed: 0, total: 0, started: false };
            continue;
        }

        const userModProgress = progress.filter(p => p.module_id === mod.id);
        const completedCount = userModProgress.filter(p => p.status === 'completed').length;
        
        progMap[mod.id] = {
            percent: Math.round((completedCount / totalLessons) * 100),
            completed: completedCount,
            total: totalLessons,
            started: userModProgress.length > 0,
            nextLessonId: modLessons.sort((a,b) => a.order - b.order).find(l => !userModProgress.find(p => p.lesson_id === l.id && p.status === 'completed'))?.id || modLessons[0].id
        };
      }
      
      setModules(allModules.sort((a, b) => a.order - b.order));
      setProgressData(progMap);

    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar treinamentos");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Meus Treinamentos</h1>
            <p className="text-slate-600 mt-1">Desenvolva suas habilidades e acompanhe sua evolução.</p>
          </div>
          {/* Summary Stats could go here */}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {modules.length === 0 ? (
             <div className="col-span-full text-center py-12">
                <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 text-lg">Nenhum treinamento disponível no momento.</p>
             </div>
          ) : (
            modules.map(module => {
              const prog = progressData[module.id] || { percent: 0, completed: 0, total: 0 };
              const isCompleted = prog.percent === 100 && prog.total > 0;

              return (
                <Card key={module.id} className="overflow-hidden hover:shadow-xl transition-all duration-300 group cursor-pointer" onClick={() => navigate(`${createPageUrl('AssistirAula')}?id=${prog.nextLessonId}`)}>
                  <div className="h-48 bg-slate-200 relative overflow-hidden">
                    {module.cover_image_url ? (
                      <img src={module.cover_image_url} alt={module.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-100">
                         <BookOpen className="w-12 h-12 text-slate-300" />
                      </div>
                    )}
                    
                    {/* Overlay Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    
                    <div className="absolute bottom-4 left-4 right-4">
                        <h3 className="text-white font-bold text-xl line-clamp-2 mb-1">{module.title}</h3>
                        <div className="flex items-center gap-2 text-white/90 text-sm">
                            <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {prog.total} Aulas</span>
                        </div>
                    </div>

                    {isCompleted && (
                        <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                            <Trophy className="w-3 h-3" /> Concluído
                        </div>
                    )}
                  </div>
                  
                  <CardContent className="p-5">
                    <p className="text-slate-600 text-sm line-clamp-2 mb-6 h-10">{module.description}</p>
                    
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs font-semibold text-slate-500">
                            <span>{prog.percent}% Concluído</span>
                            <span>{prog.completed}/{prog.total}</span>
                        </div>
                        <Progress value={prog.percent} className="h-2" />
                    </div>

                    <div className="mt-6">
                        <Button className="w-full bg-blue-600 hover:bg-blue-700 group-hover:bg-blue-700 transition-colors">
                            {prog.started ? (
                                <>
                                    <PlayCircle className="w-4 h-4 mr-2" /> Continuar
                                </>
                            ) : (
                                <>
                                    <PlayCircle className="w-4 h-4 mr-2" /> Iniciar
                                </>
                            )}
                        </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}