import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, FileCheck, ClipboardList, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";
import ITFormDialog from "./ITFormDialog";
import ITViewer from "./ITViewer";
import ITManagerList from "./ITManagerList";

export default function ITManager({ mapId, workshopId, mapDoc, workshop, printMode = false }) {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingIT, setEditingIT] = React.useState(null);

  const { data: its = [], isLoading } = useQuery({
    queryKey: ['its', mapId],
    queryFn: async () => {
      const result = await base44.entities.InstructionDocument.filter({ parent_map_id: mapId });
      return result.sort((a, b) => (a.order || 0) - (b.order || 0));
    },
    enabled: !!mapId
  });

  const generateCode = async (type) => {
    const prefix = type === 'IT' ? 'IT' : 'FR';
    const existingCodes = its.filter(it => it.code?.startsWith(prefix));
    const numbers = existingCodes.map(it => {
      const match = it.code.match(/\d+/);
      return match ? parseInt(match[0]) : 0;
    });
    const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
    return `${prefix}-${String(maxNumber + 1).padStart(4, '0')}`;
  };

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      
      if (editingIT) {
        // Atualizar e adicionar ao histórico
        const newVersion = String(parseInt(editingIT.version || "1") + 1);
        const versionEntry = {
          version: newVersion,
          date: new Date().toISOString(),
          changed_by: user.full_name || user.email,
          reason: "Atualização de conteúdo",
          origin: "melhoria_continua",
          expected_impact: "Melhoria na execução"
        };

        return await base44.entities.InstructionDocument.update(editingIT.id, {
          ...data,
          version: newVersion,
          version_history: [...(editingIT.version_history || []), versionEntry]
        });
      } else {
        // Criar novo
        const code = await generateCode(data.type);
        return await base44.entities.InstructionDocument.create({
          parent_map_id: mapId,
          workshop_id: workshopId,
          code,
          version: "1",
          status: "ativo",
          version_history: [],
          ...data
        });
      }
    },
    onSuccess: () => {
      toast.success(editingIT ? "IT atualizada!" : "IT criada!");
      queryClient.invalidateQueries(['its', mapId]);
      setIsDialogOpen(false);
      setEditingIT(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => await base44.entities.InstructionDocument.delete(id),
    onSuccess: () => {
      toast.success("Documento removido!");
      queryClient.invalidateQueries(['its', mapId]);
    }
  });

  const handleEdit = (it) => {
    setEditingIT(it);
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  // Modo impressão - mostrar conteúdo completo das ITs
  if (printMode && its.length > 0) {
    return (
      <div className="space-y-8 print:space-y-12">
        {its.map((it, idx) => (
          <div key={it.id} className="page-break-before">
            {idx > 0 && <div className="border-t-4 border-gray-300 my-8" />}
            <ITViewer it={it} mapDoc={mapDoc} workshop={workshop} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 print:hidden">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Instruções de Trabalho & Formulários</h3>
        <Button className="bg-green-600 hover:bg-green-700" onClick={() => {
          setEditingIT(null);
          setIsDialogOpen(true);
        }}>
          <Plus className="w-4 h-4 mr-2" />
          Adicionar IT/FR
        </Button>
      </div>

      <ITFormDialog
        open={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setEditingIT(null);
        }}
        it={editingIT}
        mapId={mapId}
        workshopId={workshopId}
        onSave={(data) => saveMutation.mutate(data)}
      />

      {its.length === 0 ? (
        <Card className="border-2 border-dashed">
          <CardContent className="p-8 text-center">
            <FileCheck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Nenhuma IT ou FR vinculada</p>
          </CardContent>
        </Card>
      ) : (
        <ITManagerList
          its={its}
          mapDoc={mapDoc}
          workshop={workshop}
          onEdit={handleEdit}
          onDelete={(id) => deleteMutation.mutate(id)}
        />
      )}
    </div>
  );
}