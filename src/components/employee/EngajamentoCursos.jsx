import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Award, TrendingUp, Plus, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function EngajamentoCursos({ employee, onUpdate }) {
  const [showAddCourseDialog, setShowAddCourseDialog] = useState(false);
  const [courseName, setCourseName] = useState("");

  const engagementScore = employee.engagement_score || 0;
  const coursesCompleted = employee.courses_completed || [];

  const handleAddCourse = async () => {
    if (!courseName.trim()) {
      toast.error("Digite o nome do curso");
      return;
    }

    const updatedCourses = [...coursesCompleted, courseName.trim()];
    await onUpdate({ courses_completed: updatedCourses });
    
    setCourseName("");
    setShowAddCourseDialog(false);
    toast.success("Curso adicionado!");
  };

  const getEngagementLevel = (score) => {
    if (score >= 80) return { label: "Excelente", color: "bg-green-500" };
    if (score >= 60) return { label: "Bom", color: "bg-blue-500" };
    if (score >= 40) return { label: "Regular", color: "bg-yellow-500" };
    return { label: "Baixo", color: "bg-red-500" };
  };

  const engagementLevel = getEngagementLevel(engagementScore);

  return (
    <div className="space-y-6">
      <Card className="shadow-lg border-2 border-purple-200">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle>Engajamento com a Plataforma</CardTitle>
              <CardDescription>Nível de interação e participação</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Score de Engajamento</p>
                <div className="flex items-center gap-3">
                  <span className="text-4xl font-bold text-purple-600">{engagementScore}%</span>
                  <Badge className={`${engagementLevel.color} text-white`}>
                    {engagementLevel.label}
                  </Badge>
                </div>
              </div>
              <Award className="w-16 h-16 text-purple-300" />
            </div>
            
            <div>
              <Progress value={engagementScore} className="h-3" />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <p className="text-sm text-blue-900 mb-1">Logins Mensais</p>
                <p className="text-2xl font-bold text-blue-600">-</p>
                <p className="text-xs text-blue-700 mt-1">Em breve</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <p className="text-sm text-green-900 mb-1">Ações Completadas</p>
                <p className="text-2xl font-bold text-green-600">-</p>
                <p className="text-xs text-green-700 mt-1">Em breve</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg border-2 border-blue-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle>Cursos Concluídos</CardTitle>
                <CardDescription>Histórico de treinamentos e capacitações</CardDescription>
              </div>
            </div>
            <Button onClick={() => setShowAddCourseDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Curso
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {coursesCompleted.length === 0 ? (
            <div className="text-center py-8">
              <GraduationCap className="w-16 h-16 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Nenhum curso concluído ainda</p>
            </div>
          ) : (
            <div className="space-y-2">
              {coursesCompleted.map((course, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-900">{course}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAddCourseDialog} onOpenChange={setShowAddCourseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Curso Concluído</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome do Curso</Label>
              <Input
                placeholder="Ex: Atendimento ao Cliente Avançado"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowAddCourseDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddCourse}>
                Adicionar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Biblioteca de Cursos da Plataforma */}
      <Card className="shadow-lg border-2 border-gray-200">
        <CardHeader>
          <CardTitle>Cursos Disponíveis na Plataforma</CardTitle>
          <CardDescription>Monitore o engajamento e resultados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Exemplo estático de cursos disponíveis para adicionar futuramente lógica de tracking */}
            <div className="p-4 border rounded-lg bg-gray-50 flex justify-between items-center">
              <div>
                <p className="font-semibold">Atendimento de Excelência</p>
                <p className="text-xs text-gray-500">Módulo Comercial</p>
              </div>
              <Button size="sm" variant="ghost" disabled>Em breve</Button>
            </div>
            <div className="p-4 border rounded-lg bg-gray-50 flex justify-between items-center">
              <div>
                <p className="font-semibold">Gestão de Tempo e Produtividade</p>
                <p className="text-xs text-gray-500">Módulo Gestão</p>
              </div>
              <Button size="sm" variant="ghost" disabled>Em breve</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}