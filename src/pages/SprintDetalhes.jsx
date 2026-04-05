import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, CheckCircle2, Clock, Circle } from 'lucide-react';

const FASES = [
  { id: 'planning', nome: 'Planejamento', emoji: '📋', cor: 'text-blue-600', bg: 'bg-blue-50' },
  { id: 'execucao', nome: 'Implementação', emoji: '⚙️', cor: 'text-green-600', bg: 'bg-green-50' },
  { id: 'checkpoint', nome: 'Acompanhamento', emoji: '📊', cor: 'text-purple-600', bg: 'bg-purple-50' },
  { id: 'review', nome: 'Revisão', emoji: '🔄', cor: 'text-orange-600', bg: 'bg-orange-50' },
  { id: 'retrospectiva', nome: 'Melhoria', emoji: '🚀', cor: 'text-red-600', bg: 'bg-red-50' },
];

const STATUS_ICONS = {
  not_started: <Circle className="w-4 h-4 text-gray-300" />,
  in_progress: <Clock className="w-4 h-4 text-blue-500" />,
  completed: <CheckCircle2 className="w-4 h-4 text-green-500" />,
};

export default function SprintDetalhes() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sprintId = searchParams.get('sprint_id');
  const [sprint, setSprint] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSprint = async () => {
      if (!sprintId) return;
      try {
        const data = await base44.entities.ConsultoriaSprint.filter({ id: sprintId });
        if (data && data.length > 0) {
          setSprint(data[0]);
        }
      } catch (error) {
        console.error('Erro ao carregar sprint:', error);
      } finally {
        setLoading(false);
      }
    };
    loadSprint();
  }, [sprintId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!sprint) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-gray-500 mb-4">Sprint não encontrado</p>
        <Button onClick={() => navigate(-1)} variant="outline">Voltar</Button>
      </div>
    );
  }

  const phases = sprint.phases || [];
  const completedPhases = phases.filter(p => p.status === 'completed').length;
  const totalPhases = phases.length || FASES.length;
  const progressPercentage = (completedPhases / totalPhases) * 100;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{sprint.title}</h1>
          <p className="text-sm text-gray-500">{sprint.objective}</p>
        </div>
      </div>

      {/* Progresso Geral */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-gray-900">Progresso Geral</h2>
          <span className="text-2xl font-bold text-blue-600">{Math.round(progressPercentage)}%</span>
        </div>
        <Progress value={progressPercentage} className="h-3" />
        <p className="text-xs text-gray-500 mt-2">
          {completedPhases} de {totalPhases} fases concluídas
        </p>
      </div>

      {/* Fases */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {FASES.map((fase, idx) => {
          const phaseData = phases.find(p => p.name === 'Planning' || p.name === 'Execution' || p.name === 'Monitoring' || p.name === 'Review' || p.name === 'Retrospective');
          const status = phaseData?.status || 'not_started';
          
          return (
            <div
              key={fase.id}
              className={`rounded-lg p-4 border-2 ${
                status === 'completed'
                  ? 'border-green-200 bg-green-50'
                  : status === 'in_progress'
                  ? 'border-blue-200 bg-blue-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <span className="text-2xl">{fase.emoji}</span>
                <div className="flex-shrink-0">{STATUS_ICONS[status]}</div>
              </div>
              <p className="font-semibold text-sm text-gray-900">{fase.nome}</p>
              <p className="text-xs text-gray-500 mt-1">
                {status === 'completed' && 'Concluída'}
                {status === 'in_progress' && 'Em andamento'}
                {status === 'not_started' && 'Não iniciada'}
              </p>
            </div>
          );
        })}
      </div>

      {/* Detalhes do Sprint */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Status</p>
            <p className="text-sm font-medium text-gray-900 capitalize">{sprint.status}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Progresso</p>
            <p className="text-sm font-medium text-gray-900">{sprint.progress_percentage || 0}%</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Início</p>
            <p className="text-sm font-medium text-gray-900">{new Date(sprint.start_date).toLocaleDateString('pt-BR')}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Término previsto</p>
            <p className="text-sm font-medium text-gray-900">{new Date(sprint.end_date).toLocaleDateString('pt-BR')}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Dias restantes</p>
            <p className="text-sm font-medium text-gray-900">
              {Math.max(0, Math.ceil((new Date(sprint.end_date) - new Date()) / (1000 * 60 * 60 * 24)))}
            </p>
          </div>
        </div>
      </div>

      {/* Botão de Ação */}
      <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" size="lg">
        Gerenciar Sprint
      </Button>
    </div>
  );
}