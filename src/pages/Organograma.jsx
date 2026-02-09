import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, Save, Eye, Edit3, Download, FileText, Info, CheckCircle, Target, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import OrgChartEditor from "@/components/organization/OrgChartEditor";
import OrgChartViewer from "@/components/organization/OrgChartViewer";
import TemplateSelector from "@/components/organization/TemplateSelector";
import { generateOrgChartPDF } from "@/components/organization/OrgChartPDFGenerator.jsx";

export default function Organograma() {
  const [workshop, setWorkshop] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const queryClient = useQueryClient();
  const location = useLocation();

  React.useEffect(() => {
    const loadWorkshop = async () => {
      try {
        const user = await base44.auth.me();
        const params = new URLSearchParams(location.search);
        const workshopId = params.get('workshop_id');
        const assistanceMode = params.get('assistance_mode') === 'true';

        let workshopToLoad = null;
        if (assistanceMode && workshopId) {
          workshopToLoad = await base44.entities.Workshop.get(workshopId);
        } else {
          const workshops = await base44.entities.Workshop.filter({ owner_id: user.id });
          if (workshops && workshops.length > 0) {
            workshopToLoad = workshops[0];
          }
        }
        setWorkshop(workshopToLoad);
      } catch (error) {
        console.error("Erro ao carregar oficina:", error);
        toast.error("Não foi possível carregar os dados da oficina.");
      }
    };
    loadWorkshop();
  }, [location.search]);

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
      {/* Card Informativo */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Info className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl font-bold text-blue-900">
                Organograma de Áreas (Estrutural)
              </CardTitle>
              <CardDescription className="text-blue-700 mt-1">
                Mostra as áreas e funções, sem nomes nem fotos
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Target className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-blue-900">O que ele responde</h3>
                  <p className="text-sm text-blue-700">O que precisa existir para a empresa funcionar</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-blue-900">Para que serve</h3>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Clareza estrutural</li>
                    <li>• Desenho da empresa ideal</li>
                    <li>• Base para processos</li>
                    <li>• Planejamento de crescimento</li>
                    <li>• Evita dependência de pessoas específicas</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-blue-900">Quando usar</h3>
                  <p className="text-sm text-blue-700 mb-2">Quando a empresa está:</p>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>✔ Crescendo</li>
                    <li>✔ Estruturando processos</li>
                    <li>✔ Saindo do "dono faz tudo"</li>
                    <li>✔ Pensando em escala</li>
                    <li>✔ Criando playbooks</li>
                  </ul>
                </div>
              </div>

              <div className="bg-blue-600 text-white p-4 rounded-lg">
                <p className="text-sm font-medium italic">
                  💡 "Função vem antes da pessoa."
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold">Organograma de Áreas</CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Estrutura de áreas e funções de {workshop.name}
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