import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { AlertCircle, TrendingUp, Zap } from 'lucide-react';

/**
 * Widget para exibir FUs ativos da semana
 * Usado na Home / Dashboard
 */
export default function FollowUpContadorWidget() {
  const { user } = useAuth();

  const { data: contadores = [] } = useQuery({
    queryKey: ['fu-contador-widget', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const today = new Date().toISOString().split('T')[0];
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
      const weekStartStr = weekStart.toISOString().split('T')[0];

      const ativos = await base44.entities.FollowUpContador.filter({
        consultor_id: user.id,
        status: { '$in': ['ativo', 'aguardando_proxima_semana'] }
      }, '-data_criacao', 20);

      return ativos.filter(f => f.data_ciclo_inicio === weekStartStr);
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  if (contadores.length === 0) {
    return null; // Não mostra se não há FUs ativos
  }

  const atrasados = contadores.filter(f => {
    const weekEnd = new Date(f.data_ciclo_fim);
    return weekEnd < new Date();
  });

  return (
    <Link to="/CentralFollowUp?tab=acompanhamento" className="hover:opacity-90 transition-opacity">
      <Card className={`cursor-pointer ${atrasados.length > 0 ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Acompanhamentos Ativos
            </span>
            <Badge className={atrasados.length > 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}>
              {contadores.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {atrasados.length > 0 && (
            <div className="flex items-start gap-2 p-2 bg-red-100/50 rounded-md">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">
                {atrasados.length} acompanhamento{atrasados.length !== 1 ? 's' : ''} atrasado{atrasados.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}

          <div className="text-xs text-gray-600 space-y-1">
            {contadores.slice(0, 3).map(f => (
              <div key={f.id} className="flex items-center justify-between p-1.5 bg-white/60 rounded">
                <span className="truncate font-medium">
                  {f.origem_tipo === 'bucket' ? '🏢' : '⚡'} {f.origem_nome}
                </span>
                <Badge className="text-[10px] bg-blue-100 text-blue-700 border-blue-300">
                  #{f.numero_sequencia}
                </Badge>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-gray-500 pt-1 text-right">
            Ver todos →
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}