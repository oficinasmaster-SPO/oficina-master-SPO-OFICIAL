import React from "react";
import { AlertCircle, TrendingUp, Clock, CheckCircle2 } from "lucide-react";

// Capacidade padrão mensal por consultor (horas)
const CAPACIDADE_HORAS_MES = 80;

// Metas mínimas por plano (minutos/mês)
const META_PLANO = {
  GOLD: 240,       // 4h
  IOM: 300,        // 5h
  MILLIONS: 360,   // 6h
  PRATA: 180,      // 3h
  BRONZE: 120,     // 2h
  START: 60,       // 1h
  FREE: 0,
};

export function useAlertas({ porCliente, porConsultor, periodo }) {
  const clientesSemAtencao = React.useMemo(() => {
    return (porCliente || []).filter(c => {
      if (!c.ultimo_contato) return true;
      const dias = Math.floor((Date.now() - new Date(c.ultimo_contato).getTime()) / (1000 * 60 * 60 * 24));
      return dias > 7;
    });
  }, [porCliente]);

  const fatorPeriodo = periodo === 'semana' ? 0.25 : periodo === 'trimestre' ? 3 : periodo === 'ano' ? 12 : 1;
  const capacidadePeriodo = CAPACIDADE_HORAS_MES * fatorPeriodo * 60;

  const consultoresSaturados = React.useMemo(() => {
    return (porConsultor || []).filter(c => c.total_minutos > capacidadePeriodo);
  }, [porConsultor, capacidadePeriodo]);

  return { clientesSemAtencao, consultoresSaturados, capacidadePeriodo };
}

export function PainelAlertas({ clientesSemAtencao = [], consultoresSaturados = [] }) {
  if (!clientesSemAtencao.length && !consultoresSaturados.length) return null;

  return (
    <div className="space-y-3">
      {clientesSemAtencao.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="text-sm font-semibold text-red-700">
              {clientesSemAtencao.length} cliente{clientesSemAtencao.length > 1 ? 's' : ''} sem atenção há +7 dias
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {clientesSemAtencao.slice(0, 10).map(c => {
              const dias = c.ultimo_contato
                ? Math.floor((Date.now() - new Date(c.ultimo_contato).getTime()) / (1000 * 60 * 60 * 24))
                : null;
              return (
                <span key={c.workshop_id} className="text-xs bg-red-100 text-red-700 border border-red-200 px-2.5 py-1 rounded-full">
                  {c.workshop_name} {dias !== null ? `(${dias}d)` : '(sem contato)'}
                </span>
              );
            })}
            {clientesSemAtencao.length > 10 && (
              <span className="text-xs text-red-500">+{clientesSemAtencao.length - 10} mais</span>
            )}
          </div>
        </div>
      )}

      {consultoresSaturados.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-semibold text-amber-700">
              {consultoresSaturados.length} consultor{consultoresSaturados.length > 1 ? 'es' : ''} acima da capacidade
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {consultoresSaturados.map(c => {
              const horas = Math.round(c.total_minutos / 60);
              return (
                <span key={c.consultor_id} className="text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full">
                  {c.consultor_nome.split(' ')[0]}: {horas}h
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function BarraMeta({ cliente, plano }) {
  const metaMin = META_PLANO[plano] || 0;
  if (!metaMin) return null;

  const pct = Math.min(Math.round((cliente.total_minutos / metaMin) * 100), 100);
  const atingido = pct >= 100;
  const h = (min) => {
    const hrs = Math.floor(min / 60);
    const m = min % 60;
    return hrs > 0 ? `${hrs}h${m > 0 ? m + 'm' : ''}` : `${m}m`;
  };

  return (
    <div className="mt-1">
      <div className="flex items-center justify-between text-xs mb-0.5">
        <span className="text-gray-500">Meta {plano}</span>
        <span className={atingido ? 'text-green-600 font-semibold' : 'text-gray-500'}>
          {atingido ? <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Atingida</span> : `${h(cliente.total_minutos)} / ${h(metaMin)}`}
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${atingido ? 'bg-green-500' : pct >= 75 ? 'bg-blue-500' : pct >= 40 ? 'bg-amber-400' : 'bg-red-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function BadgeSaturacao({ consultor, capacidadePeriodo }) {
  if (consultor.total_minutos <= capacidadePeriodo) return null;
  const pct = Math.round((consultor.total_minutos / capacidadePeriodo) * 100);
  return (
    <span className="text-xs bg-amber-100 text-amber-700 border border-amber-300 px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1 flex-shrink-0">
      <TrendingUp className="w-3 h-3" />
      {pct}%
    </span>
  );
}