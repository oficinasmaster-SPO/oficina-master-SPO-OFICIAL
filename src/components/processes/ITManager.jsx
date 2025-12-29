import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, FileCheck, ClipboardList, Trash2, Edit, FileText, Copy } from "lucide-react";
import { toast } from "sonner";
import ITFormDialog from "./ITFormDialog";
import ITViewer from "./ITViewer";

export default function ITManager({ mapId, workshopId, printMode = false }) {
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
      
      if (editingIT?.id) {
        // Atualizar existente e incrementar versão
        const currentVersion = parseInt(editingIT.version || "1");
        const newVersion = String(currentVersion + 1);
        
        const versionEntry = {
          version: newVersion,
          date: new Date().toISOString(),
          changed_by: user.full_name || user.email,
          changes: data.reason || "Atualização de conteúdo",
          reason: data.reason || "Atualização de conteúdo",
          origin: data.origin || "melhoria_continua",
          expected_impact: data.expected_impact || "Melhoria na execução"
        };

        const updatedHistory = [...(editingIT.version_history || []), versionEntry];

        return await base44.entities.InstructionDocument.update(editingIT.id, {
          ...data,
          version: newVersion,
          version_history: updatedHistory
        });
      } else {
        // Criar novo documento (não clone)
        const code = await generateCode(data.type);
        
        const initialVersionEntry = {
          version: "1",
          date: new Date().toISOString(),
          changed_by: user.full_name || user.email,
          changes: "Criação do documento",
          origin: "criacao_inicial"
        };
        
        return await base44.entities.InstructionDocument.create({
          parent_map_id: mapId,
          workshop_id: workshopId,
          code,
          version: "1",
          status: "ativo",
          version_history: [initialVersionEntry],
          ...data
        });
      }
    },
    onSuccess: () => {
      toast.success(editingIT ? "IT atualizada!" : "IT criada com sucesso!");
      queryClient.invalidateQueries(['its', mapId]);
      setIsDialogOpen(false);
      setEditingIT(null);
    },
    onError: (error) => {
      console.error("Erro ao salvar IT:", error);
      toast.error("Erro ao salvar IT: " + (error.message || "Tente novamente"));
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

  const handleClone = async (it) => {
    try {
      const user = await base44.auth.me();
      const newCode = await generateCode(it.type);
      
      // Criar cópia sem ID para forçar criação de novo documento
      const clonedData = {
        type: it.type,
        title: `${it.title} (Cópia)`,
        description: it.description,
        objective: it.objective,
        scope: it.scope,
        complementary_info: it.complementary_info,
        flow_image_url: it.flow_image_url,
        flow_description: it.flow_description,
        activities: it.activities,
        risks: it.risks,
        inter_relations: it.inter_relations,
        indicators: it.indicators,
        evidence_types: it.evidence_types,
        file_url: it.file_url
      };
      
      // Salvar diretamente como novo documento
      const newDoc = await base44.entities.InstructionDocument.create({
        parent_map_id: mapId,
        workshop_id: workshopId,
        code: newCode,
        version: "1",
        status: "ativo",
        version_history: [{
          version: "1",
          date: new Date().toISOString(),
          changed_by: user.full_name || user.email,
          changes: `Clonado de ${it.code}`,
          origin: "clonagem"
        }],
        ...clonedData
      });
      
      queryClient.invalidateQueries(['its', mapId]);
      toast.success(`${it.type} clonado com sucesso! Código: ${newCode}`);
    } catch (error) {
      console.error("Erro ao clonar:", error);
      toast.error("Erro ao clonar documento");
    }
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
            <ITViewer it={it} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 print:hidden">
      <Card className="bg-gradient-to-br from-green-50 to-orange-50 border-2">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-xl">Instruções de Trabalho & Formulários</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                {its.length === 0 ? 'Nenhum documento vinculado' : `${its.length} documento(s) vinculado(s)`}
              </p>
            </div>
            <Button 
              className="bg-green-600 hover:bg-green-700 shadow-lg" 
              onClick={() => {
                setEditingIT(null);
                setIsDialogOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova IT/FR
            </Button>
          </div>
        </CardHeader>
      </Card>

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
        isSaving={saveMutation.isPending}
      />

      {its.length === 0 ? (
        <Card className="border-2 border-dashed border-gray-300 bg-white">
          <CardContent className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-4">
              <FileCheck className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma IT ou FR vinculada</h3>
            <p className="text-gray-600 mb-4">Comece adicionando instruções de trabalho ou formulários</p>
            <Button 
              variant="outline" 
              className="border-green-600 text-green-600 hover:bg-green-50"
              onClick={() => setIsDialogOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Primeira IT/FR
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {its.map((it, index) => {
            const Icon = it.type === 'IT' ? FileCheck : ClipboardList;
            const bgColor = it.type === 'IT' ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200';
            const iconColor = it.type === 'IT' ? 'text-green-600' : 'text-orange-600';
            
            return (
              <Card key={it.id} className={`${bgColor} border-2 hover:shadow-lg transition-all`}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="relative flex-shrink-0">
                     <div className={`w-14 h-14 rounded-xl ${it.type === 'IT' ? 'bg-green-600' : 'bg-orange-600'} flex items-center justify-center text-white font-bold text-sm shadow-md`}>
                       {it.type}
                     </div>
                     <div className="absolute -top-1 -right-1 w-6 h-6 bg-white rounded-full border-2 border-gray-300 flex items-center justify-center text-xs text-gray-700 font-bold">
                       {index + 1}
                     </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="font-mono bg-white">{it.code}</Badge>
                        <Badge className={it.type === 'IT' ? 'bg-green-600' : 'bg-orange-600'}>{it.type}</Badge>
                        <Badge variant="secondary" className="bg-white">v{it.version || '1'}</Badge>
                      </div>
                      <h4 className="text-base font-bold text-gray-900 mb-1">{it.title}</h4>
                      {it.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">{it.description}</p>
                      )}
                    </div>
                    
                    <div className="flex gap-1 flex-shrink-0">
                      {it.file_url && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => window.open(it.file_url, '_blank')}
                          className="hover:bg-white"
                          title="Ver arquivo anexo"
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => handleClone(it)}
                        className="hover:bg-white"
                        title="Clonar IT/FR"
                      >
                        <Copy className="w-4 h-4 text-purple-600" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => handleEdit(it)}
                        className="hover:bg-white"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4 text-blue-600" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm(`Excluir ${it.type} "${it.title}"?`)) {
                            deleteMutation.mutate(it.id);
                          }
                        }}
                        className="hover:bg-white"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}