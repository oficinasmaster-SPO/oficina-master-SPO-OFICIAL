import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Users, Edit2 } from "lucide-react";
import { toast } from "sonner";
import AtaPreviewDialog from "./AtaPreviewDialog";

export default function MassReportView({ selectedClients, formData }) {
  const queryClient = useQueryClient();
  const [showClientsDialog, setShowClientsDialog] = useState(false);
  const [showAtaPreview, setShowAtaPreview] = useState(false);
  const [selectedAta, setSelectedAta] = useState(null);

  // Carregar dados dos clientes selecionados
  const { data: clientsData = [] } = useQuery({
    queryKey: ["selected-clients-data", selectedClients],
    queryFn: async () => {
      if (selectedClients.length === 0) return [];
      const data = await Promise.all(
        selectedClients.map(id => base44.entities.Workshop.get(id).catch(() => null))
      );
      return data.filter(Boolean);
    },
    enabled: selectedClients.length > 0
  });

  // Mutation para salvar ATA alterada
  const updateAtaMutation = useMutation({
    mutationFn: async (ataData) => {
      // Se status for "realizado", atualizar TODAS as ATAs do lote
      if (ataData.status === "realizado") {
        // Buscar todas as ATAs deste lote (mesmo data_agendada)
        const allAtas = await base44.entities.ConsultoriaAtendimento.filter({
          data_agendada: ataData.data_agendada
        });
        
        // Atualizar todas com status realizado
        await Promise.all(
          allAtas.map(ata =>
            base44.entities.ConsultoriaAtendimento.update(ata.id, {
              status: "realizado",
              data_realizada: new Date().toISOString()
            })
          )
        );
      }
      return ataData;
    },
    onSuccess: () => {
      toast.success("Ata atualizada! Todas do lote foram marcadas como realizado.");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar: " + error.message);
    }
  });

  // Gerar lista de ATAs que serão criadas
  const atasPreview = selectedClients.map((clientId, idx) => {
    const client = clientsData.find(c => c.id === clientId);
    return {
      id: clientId,
      workshop_name: client?.name || `Cliente ${idx + 1}`,
      tipo_atendimento: formData.tipo_atendimento,
      status: formData.status,
      pauta: formData.pauta,
      objetivos: formData.objetivos,
      observacoes: formData.observacoes,
      data_agendada: formData.data_agendada,
      hora_agendada: formData.hora_agendada
    };
  });

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total de Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{selectedClients.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Tipo de Atendimento</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm capitalize">{formData.tipo_atendimento?.replace(/_/g, " ")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Data Agendada</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{formData.data_agendada ? new Date(formData.data_agendada).toLocaleDateString("pt-BR") : "-"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Ações */}
      <div className="flex gap-3">
        <Button
          onClick={() => setShowClientsDialog(true)}
          variant="outline"
          className="gap-2"
        >
          <Users className="w-4 h-4" />
          Ver Clientes ({selectedClients.length})
        </Button>
      </div>

      {/* Lista de ATAs por cliente */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">ATAs que serão criadas</Label>
        <div className="grid gap-2 max-h-64 overflow-y-auto">
          {atasPreview.map((ata) => (
            <div key={ata.id} className="p-3 border rounded-lg flex items-center justify-between hover:bg-gray-50">
              <div className="flex-1">
                <p className="font-medium text-sm">{ata.workshop_name}</p>
                <p className="text-xs text-gray-600">{ata.data_agendada}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedAta(ata);
                    setShowAtaPreview(true);
                  }}
                  className="gap-1"
                >
                  <Edit2 className="w-3 h-3" />
                  Editar
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dialog: Clientes */}
      <Dialog open={showClientsDialog} onOpenChange={setShowClientsDialog}>
        <DialogContent className="max-w-2xl max-h-96 overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Clientes Selecionados</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {clientsData.map(client => (
              <div key={client.id} className="p-3 border rounded-lg">
                <p className="font-medium">{client.name}</p>
                <p className="text-sm text-gray-600">{client.city} • {client.planoAtual}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <AtaPreviewDialog
        open={showAtaPreview}
        onOpenChange={setShowAtaPreview}
        ata={selectedAta}
        onSave={(updatedAta) => {
          setSelectedAta(updatedAta);
          updateAtaMutation.mutate(updatedAta);
        }}
        isLoading={updateAtaMutation.isPending}
      />
    </div>
  );
}