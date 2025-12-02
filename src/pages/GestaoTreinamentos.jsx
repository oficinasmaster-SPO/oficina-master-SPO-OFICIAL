import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Plus, Video, BarChart3, Users, BookOpen, Edit2, Trash2, PlayCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function GestaoTreinamentos() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [workshop, setWorkshop] = useState(null);
  const [modules, setModules] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [progressData, setProgressData] = useState([]);

  // Modal States
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  
  // Form States
  const [newModule, setNewModule] = useState({ title: "", description: "", category: "tecnico", level: "iniciante" });
  const [selectedModuleForEnroll, setSelectedModuleForEnroll] = useState(null);
  const [selectedEmployeesForEnroll, setSelectedEmployeesForEnroll] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      const workshops = await base44.entities.Workshop.list();
      const userWorkshop = workshops.find(w => w.owner_id === user.id);
      setWorkshop(userWorkshop);

      if (userWorkshop) {
        const [fetchedModules, fetchedEmployees, fetchedEnrollments, fetchedProgress] = await Promise.all([
            base44.entities.TrainingModule.filter({ workshop_id: userWorkshop.id }),
            base44.entities.Employee.filter({ workshop_id: userWorkshop.id, status: "ativo" }),
            base44.entities.TrainingEnrollment.filter({ workshop_id: userWorkshop.id }),
            base44.entities.TrainingProgress.list() // Ideally filtered by employees of this workshop
        ]);
        setModules(fetchedModules);
        setEmployees(fetchedEmployees);
        setEnrollments(fetchedEnrollments);
        setProgressData(fetchedProgress);
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateModule = async () => {
    if (!newModule.title) return toast.error("Título obrigatório");
    try {
        await base44.entities.TrainingModule.create({
            ...newModule,
            workshop_id: workshop.id,
            active: true
        });
        toast.success("Módulo criado!");
        setIsModuleModalOpen(false);
        loadData();
    } catch (e) {
        toast.error("Erro ao criar módulo");
    }
  };

  const handleEnroll = async () => {
    if (!selectedModuleForEnroll || selectedEmployeesForEnroll.length === 0) return;
    try {
        const promises = selectedEmployeesForEnroll.map(empId => {
            // Check if already enrolled
            const exists = enrollments.find(e => e.employee_id === empId && e.module_id === selectedModuleForEnroll);
            if (exists) return null;
            
            return base44.entities.TrainingEnrollment.create({
                workshop_id: workshop.id,
                employee_id: empId,
                module_id: selectedModuleForEnroll,
                assigned_at: new Date().toISOString(),
                status: "active"
            });
        });
        await Promise.all(promises);
        toast.success("Colaboradores matriculados!");
        setIsEnrollModalOpen(false);
        loadData();
    } catch (e) {
        toast.error("Erro ao matricular");
    }
  };

  const getModuleProgress = (moduleId, employeeId) => {
    // Simple calculation: count completed lessons / total lessons
    // Needs lessons data first, for now mocking or simple placeholder
    return 0; // TODO: Implement real calculation
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Gestão de Treinamentos</h1>
                <p className="text-gray-500">Gerencie cursos, matricule colaboradores e acompanhe o progresso.</p>
            </div>
            <div className="flex gap-2">
                <Button onClick={() => setIsEnrollModalOpen(true)} variant="outline">
                    <Users className="w-4 h-4 mr-2" /> Matricular
                </Button>
                <Button onClick={() => setIsModuleModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
                    <Plus className="w-4 h-4 mr-2" /> Novo Módulo
                </Button>
            </div>
        </div>

        <Tabs defaultValue="modules" className="space-y-6">
            <TabsList>
                <TabsTrigger value="modules">Módulos e Conteúdo</TabsTrigger>
                <TabsTrigger value="tracking">Acompanhamento e Ranking</TabsTrigger>
            </TabsList>

            <TabsContent value="modules" className="space-y-6">
                <div className="grid md:grid-cols-3 gap-6">
                    {modules.map(module => (
                        <Card key={module.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(`${createPageUrl('EditorModulo')}?id=${module.id}`)}>
                            <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-t-lg flex items-center justify-center">
                                <BookOpen className="w-12 h-12 text-white opacity-50" />
                            </div>
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <Badge variant="secondary">{module.category}</Badge>
                                    <Badge variant="outline">{module.level}</Badge>
                                </div>
                                <CardTitle className="mt-2">{module.title}</CardTitle>
                                <CardDescription className="line-clamp-2">{module.description}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button variant="ghost" className="w-full justify-between group">
                                    Gerenciar Aulas
                                    <Edit2 className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                    {modules.length === 0 && (
                        <div className="col-span-3 text-center py-12 bg-white rounded-lg border border-dashed">
                            <p className="text-gray-500">Nenhum módulo criado ainda.</p>
                        </div>
                    )}
                </div>
            </TabsContent>

            <TabsContent value="tracking">
                <Card>
                    <CardHeader>
                        <CardTitle>Progresso dos Colaboradores</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            {employees.map(emp => {
                                const empEnrollments = enrollments.filter(e => e.employee_id === emp.id);
                                if (empEnrollments.length === 0) return null;

                                return (
                                    <div key={emp.id} className="border rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold">
                                                    {emp.full_name.charAt(0)}
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold">{emp.full_name}</h3>
                                                    <p className="text-sm text-gray-500">{emp.position}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-sm font-medium text-gray-600">Cursos: {empEnrollments.length}</span>
                                            </div>
                                        </div>
                                        <div className="grid gap-4 md:grid-cols-2">
                                            {empEnrollments.map(enroll => {
                                                const module = modules.find(m => m.id === enroll.module_id);
                                                if (!module) return null;
                                                return (
                                                    <div key={enroll.id} className="bg-gray-50 p-3 rounded flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <Video className="w-4 h-4 text-gray-400" />
                                                            <span className="text-sm font-medium">{module.title}</span>
                                                        </div>
                                                        {/* Placeholder progress */}
                                                        <Badge variant={enroll.status === 'completed' ? 'success' : 'secondary'}>
                                                            {enroll.status === 'active' ? 'Em andamento' : 'Concluído'}
                                                        </Badge>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>

        {/* Modal Create Module */}
        <Dialog open={isModuleModalOpen} onOpenChange={setIsModuleModalOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Criar Novo Módulo</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div>
                        <Label>Título</Label>
                        <Input value={newModule.title} onChange={e => setNewModule({...newModule, title: e.target.value})} />
                    </div>
                    <div>
                        <Label>Descrição</Label>
                        <Textarea value={newModule.description} onChange={e => setNewModule({...newModule, description: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Categoria</Label>
                            <Select value={newModule.category} onValueChange={v => setNewModule({...newModule, category: v})}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="tecnico">Técnico</SelectItem>
                                    <SelectItem value="vendas">Vendas</SelectItem>
                                    <SelectItem value="gestao">Gestão</SelectItem>
                                    <SelectItem value="comportamental">Comportamental</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Nível</Label>
                            <Select value={newModule.level} onValueChange={v => setNewModule({...newModule, level: v})}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="iniciante">Iniciante</SelectItem>
                                    <SelectItem value="intermediario">Intermediário</SelectItem>
                                    <SelectItem value="avancado">Avançado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <Button onClick={handleCreateModule} className="w-full">Criar Módulo</Button>
                </div>
            </DialogContent>
        </Dialog>

        {/* Modal Enroll */}
        <Dialog open={isEnrollModalOpen} onOpenChange={setIsEnrollModalOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Matricular Colaboradores</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div>
                        <Label>Selecione o Módulo</Label>
                        <Select value={selectedModuleForEnroll} onValueChange={setSelectedModuleForEnroll}>
                            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent>
                                {modules.map(m => (
                                    <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Selecione os Colaboradores</Label>
                        <div className="border rounded-md p-2 max-h-48 overflow-y-auto space-y-2 mt-2">
                            {employees.map(emp => (
                                <div key={emp.id} className="flex items-center space-x-2">
                                    <input 
                                        type="checkbox" 
                                        id={`enroll-${emp.id}`}
                                        checked={selectedEmployeesForEnroll.includes(emp.id)}
                                        onChange={(e) => {
                                            if(e.target.checked) setSelectedEmployeesForEnroll([...selectedEmployeesForEnroll, emp.id]);
                                            else setSelectedEmployeesForEnroll(selectedEmployeesForEnroll.filter(id => id !== emp.id));
                                        }}
                                        className="rounded border-gray-300"
                                    />
                                    <label htmlFor={`enroll-${emp.id}`} className="text-sm">{emp.full_name}</label>
                                </div>
                            ))}
                        </div>
                    </div>
                    <Button onClick={handleEnroll} disabled={!selectedModuleForEnroll || selectedEmployeesForEnroll.length === 0} className="w-full">
                        Matricular Selecionados
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}