import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Clock, CheckCircle, XCircle, PlayCircle, AlertCircle } from "lucide-react";
import { format, differenceInMinutes } from "date-fns";

export default function UserReportTraining({ userData, filters }) {
  const { trainingProgress, assessmentResults } = userData;

  // Estatísticas gerais
  const totalLessons = trainingProgress.length;
  const completedLessons = trainingProgress.filter(p => p.status === 'completed').length;
  const inProgressLessons = trainingProgress.filter(p => p.status === 'in_progress').length;
  const totalWatchTime = trainingProgress.reduce((acc, p) => acc + (p.watch_time_seconds || 0), 0);

  const totalAssessments = assessmentResults.length;
  const passedAssessments = assessmentResults.filter(a => a.passed).length;
  const averageScore = totalAssessments > 0 
    ? assessmentResults.reduce((acc, a) => acc + (a.score || 0), 0) / totalAssessments
    : 0;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-700">Concluído</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-700">Em Progresso</Badge>;
      case 'not_started':
        return <Badge className="bg-slate-100 text-slate-700">Não Iniciado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Aulas Acessadas</CardTitle>
            <BookOpen className="w-4 h-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLessons}</div>
            <p className="text-xs text-slate-500 mt-1">
              {completedLessons} concluídas ({Math.round((completedLessons / totalLessons) * 100) || 0}%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tempo Total</CardTitle>
            <Clock className="w-4 h-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.floor(totalWatchTime / 3600)}h {Math.floor((totalWatchTime % 3600) / 60)}min
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Assistido
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avaliações</CardTitle>
            <CheckCircle className="w-4 h-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAssessments}</div>
            <p className="text-xs text-slate-500 mt-1">
              {passedAssessments} aprovadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Nota Média</CardTitle>
            <PlayCircle className="w-4 h-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageScore.toFixed(1)}</div>
            <p className="text-xs text-slate-500 mt-1">
              Nas avaliações
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progresso por Aula */}
      <Card>
        <CardHeader>
          <CardTitle>Progresso por Aula</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {trainingProgress.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <p>Nenhum progresso de treinamento registrado</p>
              </div>
            ) : (
              trainingProgress.map((progress, idx) => (
                <div key={idx} className="p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusBadge(progress.status)}
                        <span className="text-sm text-slate-500">
                          Aula ID: {progress.lesson_id}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Tempo assistido: {Math.floor(progress.watch_time_seconds / 60)}min
                      </p>
                    </div>
                    {progress.last_access_date && (
                      <span className="text-xs text-slate-500">
                        {format(new Date(progress.last_access_date), "dd/MM/yyyy")}
                      </span>
                    )}
                  </div>
                  <Progress value={progress.progress_percentage || 0} className="h-2" />
                  <p className="text-xs text-slate-500 mt-1">
                    {progress.progress_percentage || 0}% concluído
                  </p>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Resultados de Avaliações */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Avaliações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {assessmentResults.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <p>Nenhuma avaliação realizada</p>
              </div>
            ) : (
              assessmentResults.map((result, idx) => (
                <div key={idx} className="p-4 bg-slate-50 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {result.passed ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    <div>
                      <p className="text-sm font-medium">
                        Avaliação {result.assessment_id}
                      </p>
                      <p className="text-xs text-slate-500">
                        {result.submitted_at && format(new Date(result.submitted_at), "dd/MM/yyyy HH:mm")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">
                      {result.score?.toFixed(1) || 0}
                    </p>
                    <p className="text-xs text-slate-500">
                      Tentativa {result.attempt_number || 1}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}