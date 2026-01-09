import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Users, Edit2 } from "lucide-react";
import { toast } from "sonner";

export default function MassReportView({ selectedClients, formData }) {
  const [showClientsDialog, setShowClientsDialog] = useState(false);
  const [showAtaPreview, setShowAtaPreview] = useState(false);

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
        <Button
          onClick={() => setShowAtaPreview(true)}
          className="gap-2 bg-blue-600 hover:bg-blue-700"
        >
          <FileText className="w-4 h-4" />
          Visualizar Ata (PDF)
        </Button>
        <Button
          variant="outline"
          className="gap-2"
        >
          <Edit2 className="w-4 h-4" />
          Editar Ata
        </Button>
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

      {/* Dialog: Ata Preview */}
      <Dialog open={showAtaPreview} onOpenChange={setShowAtaPreview}>
        <DialogContent className="max-w-3xl max-h-96 overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Visualização da Ata</DialogTitle>
          </DialogHeader>
          <div className="p-6 bg-white border rounded">
            <h2 className="text-xl font-bold mb-4">ATA DE REUNIÃO</h2>
            <div className="space-y-4 text-sm">
              <div>
                <p className="font-semibold">Data: {formData.data_agendada}</p>
                <p className="font-semibold">Tipo: {formData.tipo_atendimento}</p>
              </div>
              <div>
                <p className="font-semibold mb-1">Pauta:</p>
                <p className="whitespace-pre-wrap">{formData.pauta || "Não informada"}</p>
              </div>
              <div>
                <p className="font-semibold mb-1">Objetivos:</p>
                <p className="whitespace-pre-wrap">{formData.objetivos || "Não informados"}</p>
              </div>
              <div>
                <p className="font-semibold mb-1">Observações:</p>
                <p className="whitespace-pre-wrap">{formData.observacoes || "Nenhuma"}</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}