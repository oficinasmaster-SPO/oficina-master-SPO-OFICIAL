import React, { useState } from 'react';
import { ChevronDown, AlertCircle, AlertTriangle, AlertOctagon, Users, Calendar, User, Clock, Tag, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Formata data ISO para dd/mm/yyyy
const fmtDate = (d) => {
  if (!d) return null;
  try { return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
  catch { return d; }
};

// Badge colorido de dias em atraso
function DiasBadge({ dias, label }) {
  if (dias == null) return null;
  const cor = dias >= 14 ? 'bg-red-100 text-red-700' : dias >= 7 ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700';
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${cor}`}>
      {label || `${dias}d atraso`}
    </span>
  );
}

// Linha de detalhe genérica
function InfoRow({ icon: Icon, text }) {
  if (!text) return null;
  return (
    <div className="flex items-center gap-1.5 text-xs text-gray-500">
      <Icon className="w-3 h-3 flex-shrink-0" />
      <span>{text}</span>
    </div>
  );
}

// Detalhes específicos por categoria de risco
function ClienteDetalhes({ cliente, categoria }) {
  switch (categoria) {
    case 'followup_atrasado':
      return (
        <div className="space-y-0.5 mt-1">
          <InfoRow icon={User} text={cliente.consultor_nome} />
          <InfoRow icon={Calendar} text={cliente.data_followup_mais_antigo ? `FUP mais antigo: ${fmtDate(cliente.data_followup_mais_antigo)}` : null} />
          <InfoRow icon={Tag} text={cliente.detalhes} />
        </div>
      );
    case 'onboarding_risco':
      return (
        <div className="space-y-0.5 mt-1">
          <InfoRow icon={Calendar} text={cliente.data_ativacao ? `Ativado em: ${fmtDate(cliente.data_ativacao)}` : null} />
          <InfoRow icon={User} text={cliente.consultor_nome} />
          <InfoRow icon={Tag} text={cliente.plano ? `Plano: ${cliente.plano}` : null} />
        </div>
      );
    case 'atendimentos_atrasados':
      return (
        <div className="space-y-0.5 mt-1">
          <InfoRow icon={Tag} text={cliente.tipo} />
          <InfoRow icon={User} text={cliente.consultor_nome} />
          <InfoRow icon={Calendar} text={cliente.data_agendada ? `Agendado: ${fmtDate(cliente.data_agendada)}` : null} />
        </div>
      );
    case 'proximos_passos_atrasados':
      return (
        <div className="space-y-0.5 mt-1">
          <InfoRow icon={Tag} text={cliente.titulo} />
          <InfoRow icon={User} text={cliente.responsavel ? `Resp: ${cliente.responsavel}` : null} />
          <InfoRow icon={Calendar} text={cliente.prazo ? `Prazo: ${fmtDate(cliente.prazo)}` : null} />
          <InfoRow icon={MapPin} text={cliente.origem ? `Origem: ${cliente.origem}` : null} />
        </div>
      );
    case 'cronograma_atrasado':
      return (
        <div className="space-y-0.5 mt-1">
          <InfoRow icon={Tag} text={cliente.item} />
          <InfoRow icon={Clock} text={cliente.item_tipo ? `Tipo: ${cliente.item_tipo}` : null} />
          <InfoRow icon={Calendar} text={cliente.data_termino_previsto ? `Previsto: ${fmtDate(cliente.data_termino_previsto)}` : null} />
          <InfoRow icon={Calendar} text={cliente.data_inicio_real ? `Iniciado: ${fmtDate(cliente.data_inicio_real)}` : null} />
        </div>
      );
    case 'cronograma_nao_iniciado':
      return (
        <div className="space-y-0.5 mt-1">
          <InfoRow icon={Tag} text={cliente.item} />
          <InfoRow icon={Clock} text={cliente.item_tipo ? `Tipo: ${cliente.item_tipo}` : null} />
          <InfoRow icon={Calendar} text={cliente.data_deveria_ter_iniciado ? `Deveria ter iniciado: ${fmtDate(cliente.data_deveria_ter_iniciado)}` : null} />
        </div>
      );
    case 'sprints_atrasadas':
      return (
        <div className="space-y-0.5 mt-1">
          <InfoRow icon={Tag} text={cliente.sprint_title ? `Sprint ${cliente.sprint_number}: ${cliente.sprint_title}` : null} />
          <InfoRow icon={MapPin} text={cliente.mission ? `Missão: ${cliente.mission}` : null} />
          <InfoRow icon={Calendar} text={cliente.end_date ? `Venceu: ${fmtDate(cliente.end_date)}` : null} />
          <InfoRow icon={Clock} text={cliente.last_activity_date ? `Últ. atividade: ${fmtDate(cliente.last_activity_date)}` : `Sem atividade registrada`} />
        </div>
      );
    default:
      return null;
  }
}

const severidadeConfig = {
  critico: {
    icon: AlertOctagon,
    color: 'bg-red-50 border-red-300',
    text: 'text-red-700',
    badge: 'bg-red-100 text-red-800',
    label: '🔴 CRÍTICO'
  },
  alto: {
    icon: AlertTriangle,
    color: 'bg-orange-50 border-orange-300',
    text: 'text-orange-700',
    badge: 'bg-orange-100 text-orange-800',
    label: '🟠 ALTO'
  },
  medio: {
    icon: AlertCircle,
    color: 'bg-yellow-50 border-yellow-300',
    text: 'text-yellow-700',
    badge: 'bg-yellow-100 text-yellow-800',
    label: '🟡 MÉDIO'
  }
};

const engajamentoConfig = {
  saudavel: { label: '🟢 Saudável', bar: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50 border-green-200' },
  alerta:   { label: '🟡 Alerta',   bar: 'bg-yellow-400', text: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200' },
  critico:  { label: '🔴 Crítico',  bar: 'bg-red-500',   text: 'text-red-700',   bg: 'bg-red-50 border-red-200' }
};

export default function RiscoCard({ risco, onAcao, engajamentoStatus, taxaEngajamento, totalAtivos, desengajados }) {
  const [expanded, setExpanded] = useState(false);
  const config = severidadeConfig[risco.severidade] || severidadeConfig.medio;
  const Icon = config.icon;

  const showEngajamento = risco.engajamento_cliente && engajamentoStatus && taxaEngajamento !== undefined && taxaEngajamento !== null;
  // engajamentoStatus pode ser objeto {nivel, label} ou string direta
  const nivelEngajamento = typeof engajamentoStatus === 'string' ? engajamentoStatus : engajamentoStatus?.nivel;
  const engConf = showEngajamento ? (engajamentoConfig[nivelEngajamento] || engajamentoConfig.saudavel) : null;
  const engLabel = typeof engajamentoStatus === 'object' ? engajamentoStatus?.label : nivelEngajamento;

  // Label de contexto diferente para PP vs Sprints
  const isSprints = risco.categoria === 'sprints_atrasadas';
  const isPP = risco.categoria === 'proximos_passos_atrasados';

  return (
    <div className={`border-2 rounded-lg p-4 ${config.color}`}>
      {/* Header */}
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3">
          <Icon className={`w-5 h-5 ${config.text}`} />
          <div>
            <h3 className={`font-bold ${config.text}`}>{risco.titulo}</h3>
            <p className="text-sm text-gray-600">{risco.descricao}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-sm font-bold ${config.badge}`}>
            {risco.total} cliente{risco.total !== 1 ? 's' : ''}
          </span>
          <ChevronDown className={`w-5 h-5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Termômetro de Engajamento do Cliente */}
      {showEngajamento && (
        <div className={`mt-3 border rounded-lg p-3 ${engConf.bg}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Users className={`w-4 h-4 ${engConf.text}`} />
              <span className={`text-xs font-semibold ${engConf.text}`}>
                {isSprints ? 'Engajamento nas Sprints' : 'Cumprimento de Prazo'}
              </span>
            </div>
            <span className={`text-xs font-bold ${engConf.text}`}>{engLabel} — {taxaEngajamento}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${engConf.bar}`}
              style={{ width: `${Math.min(taxaEngajamento, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Saudável ≤15%</span>
            <span>Alerta ≤40%</span>
            <span>Crítico &gt;40%</span>
          </div>
          {totalAtivos > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              {isSprints
                ? `${desengajados || 0} de ${totalAtivos} clientes sem atividade nos últimos 7 dias`
                : `${desengajados || 0} de ${totalAtivos} clientes com PP possuem prazo vencido`
              }
            </p>
          )}
        </div>
      )}

      {/* Detalhes Expandidos */}
      {expanded && (
        <div className="mt-4 space-y-2 border-t-2 pt-4">
          {risco.clientes && risco.clientes.length > 0 ? (
            risco.clientes.map((cliente, idx) => (
              <div key={idx} className="flex items-start justify-between bg-white bg-opacity-70 p-3 rounded-lg border border-white/50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm text-gray-900">{cliente.name}</p>
                    {(cliente.dias_atrasado != null && cliente.dias_atrasado > 0) && (
                      <DiasBadge dias={cliente.dias_atrasado} />
                    )}
                    {(cliente.dias_followup_atrasado != null) && (
                      <DiasBadge dias={cliente.dias_followup_atrasado} label={`${cliente.dias_followup_atrasado}d FUP`} />
                    )}
                    {(cliente.dias_sem_atividade != null) && (
                      <DiasBadge dias={cliente.dias_sem_atividade} label={`${cliente.dias_sem_atividade}d s/ ativ.`} />
                    )}
                    {(cliente.dias_restantes != null && cliente.dias_restantes <= 0) && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-red-100 text-red-700">Urgente!</span>
                    )}
                  </div>
                  <ClienteDetalhes cliente={cliente} categoria={risco.categoria} />
                </div>
                {onAcao && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onAcao(risco, cliente)}
                    className="text-xs ml-3 flex-shrink-0"
                  >
                    Agir
                  </Button>
                )}
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-600">Nenhum cliente em risco nesta categoria</p>
          )}
        </div>
      )}
    </div>
  );
}