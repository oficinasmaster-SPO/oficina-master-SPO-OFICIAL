import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, PlayCircle, CheckCircle, Lock, Trophy } from "lucide-react";
import { toast } from "sonner";

export default function Treinamentos() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [enrolledModules, setEnrolledModules] = useState([]);
  const [progressMap, setProgressMap] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      const employee = await base44.entities.Employee.filter({ email: user.email }).then(res => res[0]);
      
      if (employee) {
        const enrollments = await base44.entities.TrainingEnrollment.filter({ employee_id: employee.id });
        
        const modulesData = [];
        for (const enroll of enrollments) {
            const module = await base44.entities.TrainingModule.get(enroll.module_id);
            if (module) {
                modulesData.push({ ...module, enrollment: enroll });
            }
        }
        setEnrolledModules(modulesData);

        // Load progress
        const progress = await base44.entities.TrainingProgress.filter({ employee_id: employee.id });
        // Map progress by module (mock logic for now)
        const pMap = {};
        modulesData.forEach(m => {
            const modProgress = progress.filter(p => p.module_id === m.id);
            // Calculate % based on lessons count (need to fetch lessons count, simplify for now)
            pMap[m.id] = 0; // Placeholder
        });
        setProgressMap(pMap);
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar treinamentos");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Meus Treinamentos</h1>
                <p className="text-gray-500">Desenvolva suas habilidades e evolua na carreira.</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600">
                    <Trophy className="w-6 h-6" />
                </div>
                <div>
                    <p className="text-sm text-gray-500">Nível Atual</p>
                    <p className="font-bold text-lg">Iniciante</p>
                </div>
            </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
            {enrolledModules.map(module => (
                <Card key={module.id} className="hover:shadow-xl transition-shadow cursor-pointer overflow-hidden group" onClick={() => navigate(`${createPageUrl('AulaPlayer')}?moduleId=${module.id}`)}>
                    <div className="h-40 bg-gray-900 relative">
                        {module.cover_url ? (
                            <img src={module.cover_url} alt={module.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-blue-600 to-purple-600 opacity-90" />
                        )}
                        <div className="absolute bottom-4 left-4 right-4">
                            <Progress value={progressMap[module.id] || 0} className="h-1.5 bg-white/30" indicatorClassName="bg-white" />
                            <p className="text-xs text-white mt-1 text-right">{progressMap[module.id] || 0}% Concluído</p>
                        </div>
                    </div>
                    <CardContent className="p-5">
                        <div className="flex justify-between items-start mb-2">
                            <Badge variant="outline" className="text-xs uppercase">{module.category}</Badge>
                            {module.enrollment.status === 'completed' && <CheckCircle className="w-5 h-5 text-green-500" />}
                        </div>
                        <h3 className="font-bold text-lg mb-2 group-hover:text-indigo-600 transition-colors">{module.title}</h3>
                        <p className="text-gray-500 text-sm line-clamp-2 mb-4">{module.description}</p>
                        <Button className="w-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                            Continuar Assistindo
                        </Button>
                    </CardContent>
                </Card>
            ))}
            {enrolledModules.length === 0 && (
                <div className="col-span-3 text-center py-20">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-700">Nenhum treinamento liberado</h3>
                    <p className="text-gray-500 mt-2">Solicite acesso aos cursos com seu gestor.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}