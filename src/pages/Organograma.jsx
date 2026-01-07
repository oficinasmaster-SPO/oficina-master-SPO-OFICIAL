import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Save, Eye, Edit3, Download, FileText } from "lucide-react";
import { toast } from "sonner";
import OrgChartEditor from "@/components/organization/OrgChartEditor";
import OrgChartViewer from "@/components/organization/OrgChartViewer";
import TemplateSelector from "@/components/organization/TemplateSelector";
import { generateOrgChartPDF } from "@/components/organization/OrgChartPDFGenerator";

export default function Organograma() {
  const [workshop, setWorkshop] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const loadWorkshop = async () => {
      try {
        const user = await base44.auth.me();
        const workshops = await base44.entities.Workshop.filter({ owner_id: user.id });
        if (workshops && workshops.length > 0) {
          setWorkshop(workshops[0]);
        }
      } catch (error) {
        console.error("Erro ao carregar oficina:", error);
      }
    };
    loadWorkshop();
  }, []);

  const { data: nodes = [], isLoading } = useQuery({
    queryKey: ['orgchart-nodes', workshop?.id],
    queryFn: async () => {
      if (!workshop?.id) return [];
      return await base44.entities.OrgChartNode.filter({ workshop_id: workshop.id });
    },
    enabled: !!workshop?.id,
  });

  const createNodeMutation = useMutation({
    mutationFn: (nodeData) => base44.entities.OrgChartNode.create(nodeData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orgchart-nodes'] });
      toast.success("Nó criado com sucesso");
    },
  });

  const updateNodeMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.OrgChartNode.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orgchart-nodes'] });
      toast.success("Organograma atualizado");
    },
  });

  const deleteNodeMutation = useMutation({
    mutationFn: (id) => base44.entities.OrgChartNode.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orgchart-nodes'] });
      toast.success("Nó removido");
    },
  });

  const handleApplyTemplate = async (templateNodes) => {
    try {
      for (const node of templateNodes) {
        await createNodeMutation.mutateAsync({
          ...node,
          workshop_id: workshop.id,
        });
      }
      setShowTemplates(false);
      toast.success("Template aplicado com sucesso!");
    } catch (error) {
      toast.error("Erro ao aplicar template");
    }
  };

  const handleResetOrganogram = async () => {
    if (confirm("Deseja realmente resetar o organograma? Todos os dados atuais serão perdidos.")) {
      try {
        for (const node of nodes) {
          await deleteNodeMutation.mutateAsync(node.id);
        }
        setShowTemplates(true);
        toast.success("Organograma resetado!");
      } catch (error) {
        toast.error("Erro ao resetar organograma");
      }
    }
  };

  if (!workshop) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500">Carregando dados da oficina...</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500">Carregando organograma...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold">Organograma</CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Estrutura organizacional de {workshop.name}
            </p>
          </div>
          <div className="flex gap-2">
            {nodes.length > 0 && (
              <>
                <Button 
                  onClick={() => generateOrgChartPDF(nodes, workshop, false)} 
                  variant="outline"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Visualizar PDF
                </Button>
                <Button 
                  onClick={() => generateOrgChartPDF(nodes, workshop, true)} 
                  variant="outline"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Baixar PDF
                </Button>
                <Button onClick={handleResetOrganogram} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Trocar Template
                </Button>
              </>
            )}
            {nodes.length === 0 && (
              <Button onClick={() => setShowTemplates(true)} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Usar Template
              </Button>
            )}
            <Button
              onClick={() => setIsEditing(!isEditing)}
              variant={isEditing ? "default" : "outline"}
            >
              {isEditing ? (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  Visualizar
                </>
              ) : (
                <>
                  <Edit3 className="w-4 h-4 mr-2" />
                  Editar
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showTemplates ? (
            <TemplateSelector
              onApply={handleApplyTemplate}
              onCancel={() => setShowTemplates(false)}
            />
          ) : nodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Plus className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                Nenhum organograma criado
              </h3>
              <p className="text-gray-600 mb-6">
                Comece criando sua estrutura organizacional do zero ou use um template
              </p>
              <div className="flex gap-3">
                <Button onClick={() => setShowTemplates(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Usar Template
                </Button>
                <Button onClick={() => setIsEditing(true)} variant="outline">
                  Criar do Zero
                </Button>
              </div>
            </div>
          ) : isEditing ? (
            <OrgChartEditor
              nodes={nodes}
              workshopId={workshop.id}
              onCreateNode={createNodeMutation.mutate}
              onUpdateNode={updateNodeMutation.mutate}
              onDeleteNode={deleteNodeMutation.mutate}
            />
          ) : (
            <OrgChartViewer nodes={nodes} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}