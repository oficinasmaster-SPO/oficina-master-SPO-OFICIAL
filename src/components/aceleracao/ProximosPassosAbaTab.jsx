import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, AlertCircle, ChevronRight, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import WheelLoader from "@/components/ui/WheelLoader";
import ProximoPassoModal from "@/components/proximospassos/ProximoPassoModal";

export default function ProximosPassosAbaTab({ workshopId }) {
  const queryClient = useQueryClient();
  const [passoSelecionado, setPassoSelecionado] = useState(null);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const { data: proximosPassos = [], isLoading } = useQuery({
    queryKey: ["proximos-passos-cliente", workshopId],
    queryFn: async () => {
      if (!workshopId) return [];
      const data = await base44.entities.ConsultoriaProximoPasso.filter(
        { workshop_id: workshopId },
        "-created_date"
      );
      return data || [];
    },
    enabled: !!workshopId,
  });

  const getStatusBadge = (status) => {
    const badges = {
      pendente: { label: "Pendente", className: "bg-gray-100 text-gray-800" },
      em_andamento: { label: "Em Andamento", className: "bg-blue-100 text-blue-800" },
      aguardando_cliente: { label: "Aguardando Cliente", className: "bg-yellow-100 text-yellow-800" },
      aguardando_consultor: { label: "Aguardando Consultor", className: "bg-purple-100 text-purple-800" },
      validacao: { label: "Validação", className: "bg-orange-100 text-orange-800" },
      finalizado: { label: "Finalizado", className: "bg-green-100 text-green-800" },
      atrasado: { label: "Atrasado", className: "bg-red-100 text-red-800" },
      cancelado: { label: "Cancelado", className: "bg-gray-200 text-gray-700" },
    };
    return badges[status] || badges.pendente;
  };

  const getPrioridadeBadge = (prioridade) => {
    const badges = {
      baixa: { label: "Baixa", className: "bg-blue-100 text-blue-800" },
      media: { label: "Média", className: "bg-yellow-100 text-yellow-800" },
      alta: { label: "Alta", className: "bg-orange-100 text-orange-800" },
      critica: { label: "Crítica", className: "bg-red-100 text-red-800" },
    };
    return badges[prioridade] || badges.media;
  };

  const ativos = proximosPassos.filter((p) => !["finalizado", "cancelado"].includes(p.status));
  const concluidos = proximosPassos.filter((p) => p.status === "finalizado");
  const atrasados = ativos.filter((p) => new Date(p.prazo) < hoje);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <WheelLoader size="lg" text="Carregando próximos passos..." />
      </div>
    );
  }

  if (proximosPassos.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-gray-500">
          Nenhum próximo passo registrado para este cliente.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{ativos.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              Atrasados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{atrasados.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              Finalizados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{concluidos.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-2">
        {proximosPassos.map((pp) => {
          const statusBadge = getStatusBadge(pp.status);
          const prioridadeBadge = getPrioridadeBadge(pp.prioridade);
          const isVencido = pp.prazo && new Date(pp.prazo) < hoje && !["finalizado", "cancelado"].includes(pp.status);
          const pct = pp.percentual_execucao || 0;

          return (
            <button
              key={pp.id}
              onClick={() => setPassoSelecionado(pp)}
              className={`w-full text-left rounded-xl border px-4 py-3 transition-all hover:shadow-md group ${
                isVencido
                  ? "bg-red-50 border-red-200 hover:bg-red-100"
                  : pp.status === "finalizado"
                  ? "bg-green-50 border-green-200 hover:bg-green-100"
                  : "bg-white border-gray-200 hover:bg-gray-50"
              }`}
            >
              {/* Linha 1: título + responsável + prazo */}
              <div className="flex items-center gap-3 min-w-0">
                <p className="flex-1 text-sm font-semibold text-gray-900 truncate" title={pp.titulo}>
                  {pp.titulo}
                </p>
                {pp.responsavel_nome && (
                  <span className="flex items-center gap-1 text-xs text-gray-500 flex-shrink-0">
                    <User className="w-3 h-3" />
                    {pp.responsavel_nome}
                  </span>
                )}
                {pp.prazo && (
                  <span className={`flex items-center gap-1 text-xs flex-shrink-0 ${isVencido ? "text-red-600 font-semibold" : "text-gray-500"}`}>
                    <Clock className="w-3 h-3" />
                    {format(new Date(pp.prazo + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                )}
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 flex-shrink-0 transition-colors" />
              </div>

              {/* Linha 2: barra + % + badges */}
              <div className="flex items-center gap-3 mt-2">
                <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all ${
                      pct === 100 ? "bg-green-500" : isVencido ? "bg-red-400" : "bg-blue-500"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-[11px] text-gray-500 flex-shrink-0 w-8 text-right">{pct}%</span>
                <Badge className={`text-[10px] px-1.5 py-0.5 flex-shrink-0 ${prioridadeBadge.className}`}>
                  {prioridadeBadge.label}
                </Badge>
                <Badge className={`text-[10px] px-1.5 py-0.5 flex-shrink-0 ${statusBadge.className}`}>
                  {statusBadge.label}
                </Badge>
              </div>
            </button>
          );
        })}
      </div>
    </div>

    {passoSelecionado && (
      <ProximoPassoModal
        passo={passoSelecionado}
        onClose={() => setPassoSelecionado(null)}
        onSaved={() => {
          setPassoSelecionado(null);
          queryClient.invalidateQueries({ queryKey: ["proximos-passos-cliente", workshopId] });
        }}
      />
    )}
    </>
  );
}