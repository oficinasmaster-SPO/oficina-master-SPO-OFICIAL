import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import WheelLoader from "@/components/ui/WheelLoader";

export default function ProximosPassosAbaTab({ workshopId }) {
  const queryClient = useQueryClient();
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

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      return await base44.entities.ConsultoriaProximoPasso.update(id, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proximos-passos-cliente", workshopId] });
    },
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

      <Card>
        <CardHeader>
          <CardTitle>Próximos Passos do Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-3 text-sm font-semibold">Título</th>
                  <th className="text-left p-3 text-sm font-semibold">Responsável</th>
                  <th className="text-center p-3 text-sm font-semibold">Prazo</th>
                  <th className="text-center p-3 text-sm font-semibold">Prioridade</th>
                  <th className="text-center p-3 text-sm font-semibold">Status</th>
                  <th className="text-center p-3 text-sm font-semibold">Execução</th>
                </tr>
              </thead>
              <tbody>
                {proximosPassos.map((pp) => {
                  const statusBadge = getStatusBadge(pp.status);
                  const prioridadeBadge = getPrioridadeBadge(pp.prioridade);
                  const isVencido = new Date(pp.prazo) < hoje && !["finalizado", "cancelado"].includes(pp.status);

                  return (
                    <tr key={pp.id} className={`border-b hover:bg-gray-50 ${isVencido ? "bg-red-50" : ""}`}>
                      <td className="p-3">
                        <p className="font-medium">{pp.titulo}</p>
                      </td>
                      <td className="p-3 text-sm">{pp.responsavel_nome || "—"}</td>
                      <td className="p-3 text-center">
                        <span className={`text-sm ${isVencido ? "text-red-600 font-semibold" : ""}`}>
                          {format(new Date(pp.prazo), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <Badge className={prioridadeBadge.className}>{prioridadeBadge.label}</Badge>
                      </td>
                      <td className="p-3 text-center">
                        <Badge className={statusBadge.className}>{statusBadge.label}</Badge>
                      </td>
                      <td className="p-3 text-center">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${pp.percentual_execucao || 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600">{pp.percentual_execucao || 0}%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}