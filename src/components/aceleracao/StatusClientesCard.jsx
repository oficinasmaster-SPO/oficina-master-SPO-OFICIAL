import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle, Clock, FileText, History } from "lucide-react";
import { formatDateTimeBR } from "@/utils/timezone";

function getMouseEnterSide(e) {
  const rect = e.currentTarget.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const w = rect.width;
  const h = rect.height;
  const fromTop = y;
  const fromBottom = h - y;
  const fromLeft = x;
  const fromRight = w - x;
  const min = Math.min(fromTop, fromBottom, fromLeft, fromRight);
  if (min === fromRight) return "left";
  if (min === fromLeft) return "right";
  if (min === fromTop) return "bottom";
  return "top";
}

export default function StatusClientesCard({ workshops = [], atendimentos = [], onStatusClick }) {
  const [hoverSides, setHoverSides] = useState({});
  const getClientesPorStatus = (status) => {
    const clientesComStatus = [];
    
    workshops.forEach(workshop => {
      const atendimentosWorkshop = atendimentos
        .filter(a => a.workshop_id === workshop.id && a.status_cliente)
        .sort((a, b) => new Date(b.data_realizada || b.data_agendada) - new Date(a.data_realizada || a.data_agendada));
      
      if (atendimentosWorkshop.length > 0) {
        const ultimoStatus = atendimentosWorkshop[0].status_cliente;
        if (ultimoStatus === status) {
          clientesComStatus.push(workshop);
        }
      }
    });
    
    return clientesComStatus;
  };

  const getStatusCounts = () => {
    const counts = {
      crescente: 0,
      decrescente: 0,
      estagnado: 0,
      nao_responde: 0
    };

    // Pegar o último atendimento de cada workshop
    workshops.forEach(workshop => {
      const atendimentosWorkshop = atendimentos
        .filter(a => a.workshop_id === workshop.id && a.status_cliente)
        .sort((a, b) => new Date(b.data_realizada || b.data_agendada) - new Date(a.data_realizada || a.data_agendada));
      
      if (atendimentosWorkshop.length > 0) {
        const ultimoStatus = atendimentosWorkshop[0].status_cliente;
        if (counts.hasOwnProperty(ultimoStatus)) {
          counts[ultimoStatus]++;
        }
      }
    });

    return counts;
  };

  const counts = getStatusCounts();

  const statusConfig = {
    crescente: { label: 'Crescente', color: 'bg-green-100 text-green-700', icon: TrendingUp },
    decrescente: { label: 'Decrescente', color: 'bg-red-100 text-red-700', icon: TrendingDown },
    estagnado: { label: 'Estagnado', color: 'bg-yellow-100 text-yellow-700', icon: Minus },
    nao_responde: { label: 'Não Responde', color: 'bg-gray-100 text-gray-700', icon: AlertCircle }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Status dos Clientes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Object.entries(statusConfig).map(([key, config]) => {
            const Icon = config.icon;
            const clientesStatus = getClientesPorStatus(key);
            
            return (
              <div 
                key={key} 
                className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                onClick={() => onStatusClick && onStatusClick(key, clientesStatus)}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{config.label}</span>
                </div>
                <Badge className={`${config.color} cursor-pointer hover:opacity-80`}>
                  {counts[key]}
                </Badge>
              </div>
            );
          })}
        </div>

        {/* Histórico de Reuniões Recentes */}
        <div className="mt-5 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <History className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Reuniões Recentes</span>
          </div>
          {(() => {
            const recentes = atendimentos
              .filter(a => a.status === 'realizado')
              .sort((a, b) => new Date(b.data_realizada || b.data_agendada) - new Date(a.data_realizada || a.data_agendada))
              .slice(0, 5);

            if (recentes.length === 0) {
              return <p className="text-xs text-gray-400 text-center py-2">Nenhuma reunião realizada</p>;
            }

            return (
              <div className="space-y-1">
                {recentes.map((atend) => {
                  const ws = workshops.find(w => w.id === atend.workshop_id);
                  return (
                    <HoverCard key={atend.id} openDelay={80} closeDelay={80}>
                      <HoverCardTrigger asChild>
                        <div
                          className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-green-50 transition-all group"
                          onMouseEnter={(e) => {
                            const side = getMouseEnterSide(e);
                            setHoverSides(prev => ({ ...prev, [atend.id]: side }));
                          }}
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0 group-hover:scale-125 transition-transform" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-700 truncate group-hover:text-green-700 transition-colors">
                              {ws?.name || 'Oficina'}
                            </p>
                            <p className="text-[10px] text-gray-400 truncate">
                              {formatDateTimeBR(atend.data_realizada || atend.data_agendada)}
                            </p>
                          </div>
                          {atend.ata_id && <FileText className="w-3 h-3 text-green-400 shrink-0" />}
                        </div>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-56 p-3" side={hoverSides[atend.id] || "right"} align="center">
                        <div className="space-y-2">
                          <div>
                            <p className="font-semibold text-sm text-gray-900">{ws?.name || 'Oficina'}</p>
                            <p className="text-xs text-green-600 font-medium mt-0.5">
                              {atend.tipo_atendimento?.replace(/_/g, ' ')}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-gray-600">
                            <Clock className="w-3 h-3" />
                            <span>{formatDateTimeBR(atend.data_realizada || atend.data_agendada)}</span>
                          </div>
                          {atend.duracao_real_minutos || atend.duracao_minutos ? (
                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                              <Clock className="w-3 h-3" />
                              <span>{atend.duracao_real_minutos || atend.duracao_minutos} min</span>
                            </div>
                          ) : null}
                          {atend.consultor_nome && (
                            <p className="text-xs text-gray-500">Consultor: {atend.consultor_nome}</p>
                          )}
                          {atend.ata_id ? (
                            <div className="flex items-center gap-1 text-xs text-green-600">
                              <CheckCircle className="w-3 h-3" />
                              <span>ATA gerada</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-xs text-amber-500">
                              <AlertCircle className="w-3 h-3" />
                              <span>Sem ATA</span>
                            </div>
                          )}
                          {atend.objetivos?.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-gray-700 mb-0.5">Objetivo</p>
                              <p className="text-xs text-gray-600 line-clamp-2">• {atend.objetivos[0]}</p>
                            </div>
                          )}
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </CardContent>
    </Card>
  );
}