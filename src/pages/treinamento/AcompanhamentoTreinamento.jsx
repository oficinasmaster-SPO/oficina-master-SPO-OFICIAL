import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import {  Card, CardContent, CardHeader, CardTitle, CardDescription  } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {  Table, TableBody, TableCell, TableHead, TableHeader, TableRow  } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, Trophy, Search, Clock, CheckCircle, User, ArrowLeft, TrendingUp, Award, Eye } from "lucide-react";
import { toast } from "sonner";
import {  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger  } from "@/components/ui/dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import ReactMarkdown from 'react-markdown';

export default function AcompanhamentoTreinamento() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [progressData, setProgressData] = useState([]); // Flat list of progress
  const [assessmentResults, setAssessmentResults] = useState([]);
  const [modules, setModules] = useState([]);
  const [lessons, setLessons] = useState([]);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      const workshops = await base44.entities.Workshop.list();
      const userWorkshop = workshops.find(w => w.owner_id === currentUser.id);

      if (!userWorkshop) {
          toast.error("Oficina nÃ£o encontrada");
          return;
      }

      // Parallel Fetching
      const [emps, progs, results, mods, less] = await Promise.all([
          base44.entities.Employee.filter({ workshop_id: userWorkshop.id, status: 'ativo' }),
          base44.entities.EmployeeTrainingProgress.list(), // We'll filter in memory for now or use specific query if SDK supports IN
          base44.entities.LessonAssessmentResult.list(),
          base44.entities.TrainingModule.list(),
          base44.entities.TrainingLesson.list()
      ]);

      // Filter progress/results for current employees only
      const empIds = emps.map(e => e.id);
      const workshopProgress = progs.filter(p => empIds.includes(p.employee_id));
      const workshopResults = results.filter(r => empIds.includes(r.employee_id));

      setEmployees(emps);
      setProgressData(workshopProgress);
      setAssessmentResults(workshopResults);
      setModules(mods);
      setLessons(less);

    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  // Helper to get stats per employee
  const getEmployeeStats = (empId) => {
      const userProgs = progressData.filter(p => p.employee_id === empId);
      const completedLessons = userProgs.filter(p => p.status === 'completed').length;
      const totalLessonsAvailable = lessons.length; // Simplification: assuming all lessons available to everyone
      
      const userResults = assessmentResults.filter(r => r.employee_id === empId);
      const avgScore = userResults.length > 0 
          ? userResults.reduce((acc, curr) => acc + (curr.score || 0), 0) / userResults.length 
          : 0;

      const lastAccess = userProgs.sort((a, b) => new Date(b.last_access_date) - new Date(a.last_access_date))[0]?.last_access_date;

      return {
          completedLessons,
          completionRate: totalLessonsAvailable > 0 ? (completedLessons / totalLessonsAvailable) * 100 : 0,
          avgScore,
          assessmentsTaken: userResults.length,
          lastAccess,
          rankScore: completedLessons * 10 + avgScore // Arbitrary ranking formula
      };
  };

  const rankedEmployees = employees
    .map(emp => ({ ...emp, stats: getEmployeeStats(emp.id) }))
    .sort((a, b) => b.stats.rankScore - a.stats.rankScore);

  const filteredEmployees = rankedEmployees.filter(e => 
      e.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewDetails = (employee) => {
      setSelectedEmployee(employee);
      setIsDetailOpen(true);
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Acompanhamento de Treinamento</h1>
                <p className="text-slate-600">Monitore o progresso, notas e engajamento da sua equipe.</p>
            </div>
            <Button variant="outline" onClick={() => navigate(createPageUrl("GerenciarTreinamentos"))}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Voltar para GestÃ£o
            </Button>
        </div>

        {/* Top Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
                <CardContent className="p-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                        <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500">Taxa de ConclusÃ£o MÃ©dia</p>
                        <h3 className="text-2xl font-bold text-slate-900">
                            {(rankedEmployees.reduce((acc, curr) => acc + curr.stats.completionRate, 0) / (rankedEmployees.length || 1)).toFixed(1)}%
                        </h3>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardContent className="p-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                        <Award className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500">Nota MÃ©dia Geral</p>
                        <h3 className="text-2xl font-bold text-slate-900">
                            {(rankedEmployees.reduce((acc, curr) => acc + curr.stats.avgScore, 0) / (rankedEmployees.length || 1)).toFixed(1)}
                        </h3>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardContent className="p-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                        <CheckCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500">Aulas ConcluÃ­das (Total)</p>
                        <h3 className="text-2xl font-bold text-slate-900">
                            {rankedEmployees.reduce((acc, curr) => acc + curr.stats.completedLessons, 0)}
                        </h3>
                    </div>
                </CardContent>
            </Card>
        </div>

        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-yellow-500" />
                        Ranking da Equipe
                    </CardTitle>
                    <div className="relative w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                        <Input 
                            placeholder="Buscar colaborador..." 
                            className="pl-8"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-12">#</TableHead>
                            <TableHead>Colaborador</TableHead>
                            <TableHead>Progresso</TableHead>
                            <TableHead>Nota MÃ©dia</TableHead>
                            <TableHead>Ãšltimo Acesso</TableHead>
                            <TableHead className="text-right">AÃ§Ãµes</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredEmployees.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-slate-500">Nenhum colaborador encontrado.</TableCell>
                            </TableRow>
                        ) : (
                            filteredEmployees.map((emp, index) => (
                                <TableRow key={emp.id} className="hover:bg-slate-50">
                                    <TableCell className="font-bold text-slate-500">{index + 1}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold">
                                                {emp.full_name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900">{emp.full_name}</p>
                                                <p className="text-xs text-slate-500">{emp.position || "Cargo nÃ£o definido"}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Progress value={emp.stats.completionRate} className="w-24 h-2" />
                                            <span className="text-xs font-medium">{Math.round(emp.stats.completionRate)}%</span>
                                        </div>
                                        <span className="text-xs text-slate-400">{emp.stats.completedLessons} aulas</span>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={emp.stats.avgScore >= 70 ? "success" : emp.stats.avgScore >= 50 ? "warning" : "secondary"} 
                                            className={emp.stats.avgScore >= 70 ? "bg-green-100 text-green-700" : emp.stats.avgScore >= 50 ? "bg-yellow-100 text-yellow-700" : ""}>
                                            {emp.stats.avgScore.toFixed(1)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm text-slate-500">
                                        {emp.stats.lastAccess ? (
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {format(new Date(emp.stats.lastAccess), "dd/MM/yyyy HH:mm")}
                                            </div>
                                        ) : "Nunca acessou"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button size="sm" variant="outline" onClick={() => handleViewDetails(emp)}>
                                            Detalhes
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>

        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <User className="w-5 h-5" />
                        Detalhes do Treinamento: {selectedEmployee?.full_name}
                    </DialogTitle>
                </DialogHeader>
                
                {selectedEmployee && (
                    <div className="space-y-6 py-4">
                        {modules.map(mod => {
                            const modLessons = lessons.filter(l => l.module_id === mod.id);
                            if (modLessons.length === 0) return null;

                            return (
                                <Card key={mod.id} className="border shadow-sm">
                                    <CardHeader className="py-3 bg-slate-50 border-b">
                                        <CardTitle className="text-lg">{mod.title}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Aula</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead>Acesso</TableHead>
                                                    <TableHead>AvaliaÃ§Ã£o</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {modLessons.map(lesson => {
                                                    const prog = progressData.find(p => p.employee_id === selectedEmployee.id && p.lesson_id === lesson.id);
                                                    // Find assessment for this lesson - assuming 1-1 map for now
                                                    // Fetching assessments is heavy, so we'll try to find result that matches any assessment for this lesson (not loaded)
                                                    // Better approach: Load assessments too. Let's load them when opening detail.
                                                    // For this MVP, we'll just list the results that match this employee and show details in a generic way or fetch lazily.
                                                    
                                                    // Display basic progress info first
                                                    const watchTime = prog?.watch_time_seconds ? Math.round(prog.watch_time_seconds / 60) + ' min' : '-';

                                                    return (
                                                        <TableRow key={lesson.id}>
                                                            <TableCell className="font-medium">{lesson.title}</TableCell>
                                                            <TableCell>
                                                                {prog?.status === 'completed' ? (
                                                                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100"><CheckCircle className="w-3 h-3 mr-1"/> ConcluÃ­da</Badge>
                                                                ) : prog?.status === 'in_progress' ? (
                                                                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Em Andamento</Badge>
                                                                ) : (
                                                                    <span className="text-slate-400 text-sm">NÃ£o iniciada</span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="text-sm text-slate-500">
                                                                <div className="flex flex-col">
                                                                    <span>{prog?.last_access_date ? format(new Date(prog.last_access_date), "dd/MM/yy HH:mm") : "-"}</span>
                                                                    <span className="text-xs text-gray-400">Tempo: {watchTime}</span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                {/* Check if we have results for this user (filtered generically) */}
                                                                {/* This is imperfect without linking lesson->assessment->result explicitly in front end data structure */}
                                                                {/* But we can show a generic 'Ver Notas' button if progress is completed */}
                                                                {prog?.status === 'completed' && (
                                                                    <Button size="sm" variant="ghost" className="h-8" onClick={() => navigate(createPageUrl("MeusTreinamentos"))}>
                                                                        <Eye className="w-4 h-4" />
                                                                    </Button>
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}



