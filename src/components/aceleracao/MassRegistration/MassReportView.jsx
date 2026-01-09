import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Users, Edit2, Eye } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AtaPreviewDialog from "./AtaPreviewDialog";
import ViewClientsDialog from "./ViewClientsDialog";
import AtaPDFViewer from "./AtaPDFViewer";
import MassReportHistory from "./MassReportHistory";

export default function MassReportView({ selectedClients, formData }) {
  const [showViewClients, setShowViewClients] = useState(false);
  const [showAtaPreview, setShowAtaPreview] = useState(false);
  const [showPDFViewer, setShowPDFViewer] = useState(false);
  const [selectedAta, setSelectedAta] = useState(null);
  const [selectedPdfAta, setSelectedPdfAta] = useState(null);
  const [selectedGroupClients, setSelectedGroupClients] = useState([]);
  const [selectedGroupName, setSelectedGroupName] = useState("");

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

  // Gerar ID sequencial do disparo em massa
  const getNextDisparoId = () => {
    const lastId = localStorage.getItem("lastDisparoId") || "0";
    const nextNumber = parseInt(lastId) + 1;
    localStorage.setItem("lastDisparoId", nextNumber.toString());
    return `DP${String(nextNumber).padStart(3, "0")}`;
  };

  // Gerar resumo do lote (disparo em massa)
  const batchSummary = {
    id: getNextDisparoId(),
    groupName: formData.groupName || `Lote ${new Date().toLocaleDateString("pt-BR")}`,
    data: formData.data_agendada,
    hora: formData.hora_agendada,
    tipo: formData.tipo_atendimento,
    status: formData.status,
    clientCount: selectedClients.length,
    clientIds: selectedClients
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="atual" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="atual">Disparo Atual</TabsTrigger>
          <TabsTrigger value="historico">Histórico de Disparos</TabsTrigger>
        </TabsList>

        <TabsContent value="atual" className="space-y-4">
          {/* Tabela de Disparo em Massa */}
          {selectedClients.length > 0 ? (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">ID Disparo</th>
                <th className="px-4 py-3 text-left font-semibold">Grupo</th>
                <th className="px-4 py-3 text-left font-semibold">Data</th>
                <th className="px-4 py-3 text-left font-semibold">Hora</th>
                <th className="px-4 py-3 text-left font-semibold">Tipo</th>
                <th className="px-4 py-3 text-center font-semibold">Clientes</th>
                <th className="px-4 py-3 text-center font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs text-blue-600">{batchSummary.id}</td>
                <td className="px-4 py-3 font-medium">{batchSummary.groupName}</td>
                <td className="px-4 py-3">{batchSummary.data}</td>
                <td className="px-4 py-3">{batchSummary.hora}</td>
                <td className="px-4 py-3 text-xs">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                    {batchSummary.tipo.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="px-4 py-3 text-center font-semibold">{batchSummary.clientCount}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 justify-center">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedGroupClients(batchSummary.clientIds);
                        setSelectedGroupName(batchSummary.groupName);
                        setShowViewClients(true);
                      }}
                      title="Ver clientes"
                      className="h-8 w-8 p-0"
                    >
                      <Users className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setSelectedPdfAta({
                          id: batchSummary.id,
                          workshop_name: batchSummary.groupName,
                          tipo_atendimento: batchSummary.tipo,
                          status: batchSummary.status,
                          pauta: formData.pauta,
                          objetivos: formData.objetivos,
                          observacoes: formData.observacoes,
                          data_agendada: batchSummary.data,
                          hora_agendada: batchSummary.hora
                        });
                        setShowPDFViewer(true);
                      }}
                      title="Visualizar PDF"
                      className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700 text-white border-0"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setSelectedAta({
                          id: batchSummary.id,
                          workshop_name: batchSummary.groupName,
                          tipo_atendimento: batchSummary.tipo,
                          status: batchSummary.status,
                          pauta: formData.pauta,
                          objetivos: formData.objetivos,
                          observacoes: formData.observacoes,
                          data_agendada: batchSummary.data,
                          hora_agendada: batchSummary.hora
                        });
                        setShowAtaPreview(true);
                      }}
                      title="Editar"
                      className="h-8 w-8 p-0"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>Selecione clientes para visualizar o resumo do disparo</p>
        </div>
      )}

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

      <ViewClientsDialog
        open={showViewClients}
        onOpenChange={setShowViewClients}
        clientIds={selectedGroupClients}
        groupName={selectedGroupName}
      />

      <AtaPDFViewer
        open={showPDFViewer}
        onOpenChange={setShowPDFViewer}
        ata={selectedPdfAta}
        workshop={null}
      />
    </div>
  );
}