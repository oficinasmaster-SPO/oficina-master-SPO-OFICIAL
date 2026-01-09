import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Eye, Download, Edit2, CheckCircle, Bell, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import AtaPreviewDialog from "./AtaPreviewDialog";
import ViewClientsDialog from "./ViewClientsDialog";

export default function MassReportHistory() {
  const queryClient = useQueryClient();
  const [showViewClients, setShowViewClients] = useState(false);
  const [showAtaPreview, setShowAtaPreview] = useState(false);
  const [selectedAta, setSelectedAta] = useState(null);
  const [selectedGroupClients, setSelectedGroupClients] = useState([]);
  const [selectedGroupName, setSelectedGroupName] = useState("");
  const [selectedDisparo, setSelectedDisparo] = useState(null);

  const { data: historico = [], isLoading } = useQuery({
    queryKey: ["batch-dispatch-history"],
    queryFn: async () => {
      try {
        const disparos = await base44.entities.BatchDispatch.list();
        return disparos.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      } catch (error) {
        toast.error("Erro ao carregar histórico");
        return [];
      }
    }
  });

  // Finalizar lote em massa
  const finalizarLoteMutation = useMutation({
    mutationFn: async (disparo) => {
      if (!disparo.atendimentos_criados || disparo.atendimentos_criados.length === 0) {
        throw new Error("Nenhum atendimento encontrado neste disparo");
      }
      
      // Atualizar todos os atendimentos
      await Promise.all(
        disparo.atendimentos_criados.map(atendimentoId =>
          base44.entities.ConsultoriaAtendimento.update(atendimentoId, {
            status: "realizado",
            data_realizada: new Date().toISOString()
          })
        )
      );
      
      // Atualizar o próprio BatchDispatch
      await base44.entities.BatchDispatch.update(disparo.id, {
        status: "realizado"
      });
      
      return disparo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batch-dispatch-history"] });
      toast.success("Lote finalizado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao finalizar lote: " + error.message);
    }
  });

  // Reenviar notificações do lote
  const reenviareNotificacoesMutation = useMutation({
    mutationFn: async (disparo) => {
      if (!disparo.clientes || disparo.clientes.length === 0) {
        throw new Error("Nenhum cliente encontrado neste disparo");
      }
      
      // Enviar notificações para cada cliente do disparo
      await Promise.all(
        disparo.clientes.map(cliente =>
          base44.entities.Notification.create({
            workshop_id: cliente.workshop_id,
            type: "nova_ata",
            title: "Novo Atendimento Agendado",
            message: `Atendimento em ${disparo.data_agendada} às ${disparo.hora_agendada} - Tipo: ${disparo.tipo_atendimento.replace(/_/g, " ")}`
          }).catch(() => null)
        )
      );
      
      return disparo;
    },
    onSuccess: () => {
      toast.success("Notificações reenviadas para todos os clientes!");
    },
    onError: (error) => {
      toast.error("Erro ao reenviar: " + error.message);
    }
  });

  if (isLoading) {
    return <div className="text-center py-4 text-gray-500">Carregando histórico...</div>;
  }

  if (historico.length === 0) {
    return <div className="text-center py-8 text-gray-500">Nenhum disparo registrado ainda</div>;
  }

  return (
    <>
      <div className="space-y-2">
        {historico.map((disparo) => (
          <div key={disparo.id} className="border rounded-lg p-4 hover:bg-gray-50">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="font-mono text-sm text-blue-600 font-semibold">{disparo.disparo_id}</p>
                <p className="text-sm font-medium">{disparo.grupo_nome}</p>
                <div className="grid grid-cols-3 gap-4 mt-2 text-xs text-gray-600">
                  <span>📅 {disparo.data_agendada} - {disparo.hora_agendada}</span>
                  <span>👥 {disparo.total_clientes} cliente(s)</span>
                  <span>👤 {disparo.consultor_nome}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Status: <span className={disparo.status === "realizado" ? "text-green-600" : "text-amber-600"}>{disparo.status}</span></p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  title="Ver clientes"
                  className="h-8 w-8 p-0"
                  onClick={() => {
                    setSelectedGroupClients(disparo.clientes?.map(c => c.workshop_id) || []);
                    setSelectedGroupName(disparo.grupo_nome);
                    setShowViewClients(true);
                  }}
                >
                  <Eye className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  title="Editar"
                  className="h-8 w-8 p-0"
                  onClick={() => {
                    setSelectedAta({
                      id: disparo.disparo_id,
                      workshop_name: disparo.grupo_nome,
                      tipo_atendimento: disparo.tipo_atendimento,
                      status: disparo.status,
                      pauta: disparo.pauta,
                      objetivos: disparo.objetivos,
                      observacoes: disparo.observacoes,
                      data_agendada: disparo.data_agendada,
                      hora_agendada: disparo.hora_agendada
                    });
                    setSelectedDisparo(disparo);
                    setShowAtaPreview(true);
                  }}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  title="Finalizar lote"
                  className="h-8 w-8 p-0"
                  disabled={finalizarLoteMutation.isPending || disparo.status === "realizado"}
                  onClick={() => finalizarLoteMutation.mutate(disparo)}
                >
                  {finalizarLoteMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  title="Reenviar notificações"
                  className="h-8 w-8 p-0"
                  disabled={reenviareNotificacoesMutation.isPending}
                  onClick={() => reenviareNotificacoesMutation.mutate(disparo)}
                >
                  {reenviareNotificacoesMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Bell className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <AtaPreviewDialog
        open={showAtaPreview}
        onOpenChange={setShowAtaPreview}
        ata={selectedAta}
        onSave={() => {
          queryClient.invalidateQueries({ queryKey: ["batch-dispatch-history"] });
          setShowAtaPreview(false);
        }}
        isLoading={false}
      />

      <ViewClientsDialog
        open={showViewClients}
        onOpenChange={setShowViewClients}
        clientIds={selectedGroupClients}
        groupName={selectedGroupName}
      />
    </>
  );
}