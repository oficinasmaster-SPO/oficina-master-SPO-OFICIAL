import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";
import {
  Settings2, Map, Zap, BookOpen, ChevronRight, ExternalLink,
  CheckCircle2, Circle, Clock, Target, Users, Lightbulb, 
  ListChecks, Route, PlayCircle, Plus, X, Star, Lock
} from "lucide-react";

// Camada 1 - Interno/Estratégico
function CamadaEstrategica({ workshopId }) {
  const metodo = [
    { fase: "1. Diagnóstico", descricao: "Avaliar maturidade, processos e gaps do negócio", icon: "🔍" },
    { fase: "2. Planejamento", descricao: "Definir prioridades, metas e cronograma de implementação", icon: "📋" },
    { fase: "3. Implementação", descricao: "Executar processos com acompanhamento semanal (sprints)", icon: "⚙️" },
    { fase: "4. Consolidação", descricao: "Garantir a sustentabilidade das melhorias implantadas", icon: "🏆" },
    { fase: "5. Expansão", descricao: "Escalar processos e estrutura para crescimento", icon: "🚀" },
  ];

  const pilares = [
    { nome: "Vendas & Comercial", cor: "bg-blue-50 border-blue-200 text-blue-700" },
    { nome: "Processos Operacionais", cor: "bg-green-50 border-green-200 text-green-700" },
    { nome: "Gestão Financeira", cor: "bg-yellow-50 border-yellow-200 text-yellow-700" },
    { nome: "Pessoas & Cultura", cor: "bg-purple-50 border-purple-200 text-purple-700" },
    { nome: "Marketing & Captação", cor: "bg-pink-50 border-pink-200 text-pink-700" },
    { nome: "Estratégia & Escala", cor: "bg-orange-50 border-orange-200 text-orange-700" },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl p-5 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Settings2 className="w-5 h-5 text-yellow-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-yellow-400">Camada 1 — Interno</span>
        </div>
        <h3 className="text-lg font-bold">Plano Estratégico de Consultoria</h3>
        <p className="text-sm text-slate-300 mt-1">Metodologia interna de condução do projeto. Visível apenas para o consultor.</p>
      </div>

      <div>
        <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Route className="w-4 h-4 text-slate-600" />
          Método de Aceleração
        </h4>
        <div className="space-y-2">
          {metodo.map((item, idx) => (
            <div key={idx} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50">
              <span className="text-xl">{item.icon}</span>
              <div>
                <p className="font-medium text-sm text-gray-900">{item.fase}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.descricao}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Target className="w-4 h-4 text-slate-600" />
          Pilares do Projeto
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {pilares.map((pilar, idx) => (
            <div key={idx} className={`border rounded-lg p-3 text-sm font-medium ${pilar.cor}`}>
              {pilar.nome}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Missões disponíveis
const MISSOES = [
  { id: "agenda_cheia", nome: "Missão Agenda Cheia", emoji: "📅", descricao: "Para clientes com baixo volume de clientes", cor: "bg-blue-50 border-blue-300 text-blue-800" },
  { id: "fechamento_imbativel", nome: "Missão Fechamento Imbatível", emoji: "🎯", descricao: "Para clientes que não convertem vendas", cor: "bg-green-50 border-green-300 text-green-800" },
  { id: "caixa_forte", nome: "Missão Caixa Forte", emoji: "💰", descricao: "Para clientes sem lucro ou com caixa negativo", cor: "bg-yellow-50 border-yellow-300 text-yellow-800" },
  { id: "equipe_elite", nome: "Missão Equipe de Elite", emoji: "👥", descricao: "Para clientes com problemas de equipe", cor: "bg-purple-50 border-purple-300 text-purple-800" },
  { id: "contratacao_certa", nome: "Missão Contratação Certa", emoji: "🤝", descricao: "Para clientes que precisam contratar bem", cor: "bg-pink-50 border-pink-300 text-pink-800" },
  { id: "estrutura_produtiva", nome: "Missão Estrutura Produtiva", emoji: "⚙️", descricao: "Para clientes com gargalos operacionais", cor: "bg-orange-50 border-orange-300 text-orange-800" },
  { id: "oficina_sistematizada", nome: "Missão Oficina Sistematizada", emoji: "📋", descricao: "Para clientes que precisam de processos e sistemas", cor: "bg-indigo-50 border-indigo-300 text-indigo-800" },
];

// Camada 2 - Trilha do Cliente
function CamadaTrilhaCliente({ workshopId }) {
  const [missoesSelecionadas, setMissoesSelecionadas] = useState([]);
  const [mostrarSeletor, setMostrarSeletor] = useState(false);

  const toggleMissao = (missaoId) => {
    setMissoesSelecionadas(prev =>
      prev.includes(missaoId)
        ? prev.filter(id => id !== missaoId)
        : [...prev, missaoId]
    );
  };

  const missoesSelecionadasData = MISSOES.filter(m => missoesSelecionadas.includes(m.id));

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-700 to-blue-600 rounded-xl p-5 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Map className="w-5 h-5 text-blue-200" />
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-200">Camada 2 — Trilha do Cliente</span>
        </div>
        <h3 className="text-lg font-bold">Jornada de Implementação Personalizada</h3>
        <p className="text-sm text-blue-100 mt-1">Trilha montada após diagnóstico. O cliente visualiza no Cronograma de Consultoria.</p>
      </div>

      {/* Link ao cronograma */}
      <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <Map className="w-6 h-6 text-blue-600 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-semibold text-blue-900 text-sm">Cronograma de Consultoria</p>
          <p className="text-xs text-blue-700">O cliente acompanha sua trilha de implementação nesta página.</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="border-blue-300 text-blue-700 hover:bg-blue-100 flex-shrink-0"
          onClick={() => window.open(`/CronogramaConsultoria?workshop_id=${workshopId}`, '_blank')}
        >
          <ExternalLink className="w-3 h-3 mr-1" />
          Abrir
        </Button>
      </div>

      {/* Semana 1 - Fixo */}
      <div>
        <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-blue-600" />
          Trilha de Implementação
        </h4>

        <div className="space-y-3">
          {/* Semana 1 - sempre fixa */}
          <div className="border-2 border-gray-300 rounded-xl p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gray-700 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
                <div>
                  <p className="font-semibold text-sm text-gray-900">Semana 1 — Padrão</p>
                  <p className="text-xs text-gray-500">Todas as trilhas começam aqui</p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Lock className="w-3 h-3" />
                Fixo
              </div>
            </div>
            <div className="pl-9 space-y-1.5">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <span className="text-base">🔍</span> Diagnóstico Inicial
              </div>
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <span className="text-base">🗂️</span> Organização e Alinhamento
              </div>
            </div>
          </div>

          {/* Semanas personalizadas selecionadas */}
          {missoesSelecionadasData.map((missao, idx) => (
            <div key={missao.id} className={`border-2 rounded-xl p-4 ${missao.cor}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-white border-2 border-current flex items-center justify-center text-xs font-bold flex-shrink-0">{idx + 2}</div>
                  <div>
                    <p className="font-semibold text-sm">{missao.emoji} {missao.nome}</p>
                    <p className="text-xs opacity-70">{missao.descricao}</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleMissao(missao.id)}
                  className="p-1 rounded-full hover:bg-white/50 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {/* Botão adicionar missão */}
          <button
            onClick={() => setMostrarSeletor(!mostrarSeletor)}
            className="w-full border-2 border-dashed border-blue-300 rounded-xl p-4 text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            {mostrarSeletor ? 'Fechar seletor' : 'Adicionar Missão à Trilha'}
          </button>
        </div>
      </div>

      {/* Seletor de missões */}
      {mostrarSeletor && (
        <div className="border rounded-xl p-4 bg-white shadow-md">
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-4 h-4 text-amber-500" />
            <p className="font-semibold text-sm text-gray-900">Selecionar Missões</p>
            <p className="text-xs text-gray-500 ml-auto">Personalize conforme o diagnóstico do cliente</p>
          </div>
          <div className="space-y-2">
            {MISSOES.map((missao) => {
              const selecionada = missoesSelecionadas.includes(missao.id);
              return (
                <button
                  key={missao.id}
                  onClick={() => toggleMissao(missao.id)}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-all flex items-center justify-between ${
                    selecionada
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{missao.emoji}</span>
                    <div>
                      <p className="font-medium text-sm text-gray-900">{missao.nome}</p>
                      <p className="text-xs text-gray-500">{missao.descricao}</p>
                    </div>
                  </div>
                  {selecionada && <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Camada 3 - Sprints
function CamadaSprints({ workshopId }) {
  const sprints = [
    { semana: "Semana 1", foco: "Diagnóstico e alinhamento", tarefas: ["Levantar DRE", "Mapear fluxo de atendimento", "Identificar gargalos"], status: "concluido" },
    { semana: "Semana 2", foco: "Precificação e margem", tarefas: ["Calcular TCMP²", "Revisar tabela de preços", "Treinar consultor de vendas"], status: "em_andamento" },
    { semana: "Semana 3", foco: "Processos de vendas", tarefas: ["Implementar checklist de OS", "Definir script de venda"], status: "a_fazer" },
    { semana: "Semana 4", foco: "Revisão e próximos passos", tarefas: ["Consolidar resultados", "Planejar próximo ciclo"], status: "a_fazer" },
  ];

  const statusConfig = {
    concluido: { label: "Concluído", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
    em_andamento: { label: "Em Andamento", color: "bg-blue-100 text-blue-700", icon: Clock },
    a_fazer: { label: "A Fazer", color: "bg-gray-100 text-gray-600", icon: Circle },
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-green-700 to-emerald-600 rounded-xl p-5 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-5 h-5 text-green-200" />
          <span className="text-xs font-semibold uppercase tracking-wider text-green-200">Camada 3 — Sprints</span>
        </div>
        <h3 className="text-lg font-bold">Execução Semanal</h3>
        <p className="text-sm text-green-100 mt-1">Tarefas semanais de implementação para o cliente.</p>
      </div>

      <div className="space-y-4">
        {sprints.map((sprint, idx) => {
          const cfg = statusConfig[sprint.status];
          const Icon = cfg.icon;
          return (
            <div key={idx} className="border rounded-xl p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                    <span className="text-xs font-bold text-green-700">{idx + 1}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{sprint.semana}</p>
                    <p className="text-xs text-gray-500">{sprint.foco}</p>
                  </div>
                </div>
                <Badge className={cfg.color}>
                  <Icon className="w-3 h-3 mr-1" />
                  {cfg.label}
                </Badge>
              </div>
              <div className="space-y-1 pl-10">
                {sprint.tarefas.map((tarefa, tidx) => (
                  <div key={tidx} className="flex items-center gap-2 text-sm text-gray-600">
                    <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                    {tarefa}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Camada 4 - Trilha do Consultor
function CamadaConsultor({ workshopId }) {
  const guias = [
    {
      titulo: "Como Conduzir o Diagnóstico Inicial",
      descricao: "Passo a passo para levantar informações, identificar dores e priorizar ações.",
      passos: ["Apresente-se e contextualize o programa", "Aplique o checklist de diagnóstico", "Escute ativamente as dores do proprietário", "Priorize os 3 maiores gargalos"],
      cor: "border-l-4 border-l-purple-500 bg-purple-50",
      badge: "Onboarding"
    },
    {
      titulo: "Como Conduzir Atendimentos Semanais",
      descricao: "Estrutura padrão para reuniões de acompanhamento de 60-90 minutos.",
      passos: ["Check-in: resultado da semana anterior", "Revisão das metas e KPIs", "Resolução de bloqueios", "Definição de tarefas para próxima semana", "Registro na plataforma"],
      cor: "border-l-4 border-l-blue-500 bg-blue-50",
      badge: "Reunião Semanal"
    },
    {
      titulo: "Como Fechar um Ciclo de Sprint",
      descricao: "Consolidar aprendizados e planejar o próximo ciclo com o cliente.",
      passos: ["Revise todas as tarefas do sprint", "Calcule os resultados alcançados", "Celebre as conquistas com o cliente", "Apresente o plano do próximo ciclo"],
      cor: "border-l-4 border-l-green-500 bg-green-50",
      badge: "Fechamento"
    },
    {
      titulo: "Como Escalar o Projeto",
      descricao: "Quando e como avançar para etapas de crescimento e autonomia.",
      passos: ["Verifique consolidação dos processos base", "Avalie prontidão da equipe", "Introduza ferramentas de escala", "Reduza dependência gradualmente"],
      cor: "border-l-4 border-l-orange-500 bg-orange-50",
      badge: "Escala"
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-700 to-violet-600 rounded-xl p-5 text-white">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="w-5 h-5 text-purple-200" />
          <span className="text-xs font-semibold uppercase tracking-wider text-purple-200">Camada 4 — Guia do Consultor</span>
        </div>
        <h3 className="text-lg font-bold">Como Conduzir Este Projeto</h3>
        <p className="text-sm text-purple-100 mt-1">Trilha de orientação interna para o consultor responsável.</p>
      </div>

      <div className="space-y-4">
        {guias.map((guia, idx) => (
          <div key={idx} className={`rounded-xl p-4 ${guia.cor}`}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <PlayCircle className="w-5 h-5 text-gray-600 flex-shrink-0" />
                <p className="font-semibold text-sm text-gray-900">{guia.titulo}</p>
              </div>
              <Badge variant="outline" className="text-xs flex-shrink-0">{guia.badge}</Badge>
            </div>
            <p className="text-xs text-gray-600 mb-3 pl-7">{guia.descricao}</p>
            <div className="space-y-1.5 pl-7">
              {guia.passos.map((passo, pidx) => (
                <div key={pidx} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="w-5 h-5 rounded-full bg-white border flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                    {pidx + 1}
                  </span>
                  {passo}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ConsultoriaClienteTab({ client }) {
  const workshopId = client?.id;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b">
        <Lightbulb className="w-5 h-5 text-amber-500" />
        <h3 className="font-semibold text-gray-900">Módulo de Consultoria</h3>
        <Badge variant="outline" className="text-xs ml-auto">4 Camadas</Badge>
      </div>

      <Tabs defaultValue="estrategico">
        <TabsList className="grid w-full grid-cols-4 h-auto">
          <TabsTrigger value="estrategico" className="text-xs py-2 px-1 flex flex-col gap-0.5 h-auto">
            <Settings2 className="w-3.5 h-3.5" />
            Estratégico
          </TabsTrigger>
          <TabsTrigger value="trilha" className="text-xs py-2 px-1 flex flex-col gap-0.5 h-auto">
            <Map className="w-3.5 h-3.5" />
            Trilha
          </TabsTrigger>
          <TabsTrigger value="sprints" className="text-xs py-2 px-1 flex flex-col gap-0.5 h-auto">
            <Zap className="w-3.5 h-3.5" />
            Sprints
          </TabsTrigger>
          <TabsTrigger value="consultor" className="text-xs py-2 px-1 flex flex-col gap-0.5 h-auto">
            <BookOpen className="w-3.5 h-3.5" />
            Guia
          </TabsTrigger>
        </TabsList>

        <TabsContent value="estrategico" className="mt-4">
          <CamadaEstrategica workshopId={workshopId} />
        </TabsContent>
        <TabsContent value="trilha" className="mt-4">
          <CamadaTrilhaCliente workshopId={workshopId} />
        </TabsContent>
        <TabsContent value="sprints" className="mt-4">
          <CamadaSprints workshopId={workshopId} />
        </TabsContent>
        <TabsContent value="consultor" className="mt-4">
          <CamadaConsultor workshopId={workshopId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}