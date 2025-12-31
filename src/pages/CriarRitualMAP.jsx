import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ITFormDialog from "@/components/processes/ITFormDialog";

export default function CriarRitualMAP() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [workshop, setWorkshop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ritual, setRitual] = useState(null);
  const [processDocument, setProcessDocument] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      const workshops = await base44.entities.Workshop.filter({ owner_id: user.id });
      const userWorkshop = workshops[0];
      setWorkshop(userWorkshop);

      const ritualId = searchParams.get('ritual_id');
      if (!ritualId) {
        toast.error("ID do ritual não informado");
        navigate(createPageUrl("RituaisAculturamento"));
        return;
      }

      const ritualData = await base44.entities.Ritual.get(ritualId);
      setRitual(ritualData);

        // Verificar se já existe MAP para este ritual
        const existingMaps = await base44.entities.ProcessDocument.filter({
          category: "Ritual",
          title: ritualData.name,
          workshop_id: userWorkshop.id
        });

        if (existingMaps.length > 0) {
          setProcessDocument(existingMaps[0]);
        }
      }

      setIsFormOpen(true);
    } catch (error) {
      console.error("Erro ao carregar:", error);
      toast.error(`Erro ao carregar dados: ${error.message || 'Erro desconhecido'}`);
      navigate(createPageUrl("RituaisAculturamento"));
    } finally {
      setLoading(false);
    }
  };

  const generateMapCode = async () => {
    const allDocs = await base44.entities.ProcessDocument.list();
    const ritualMaps = allDocs.filter(d => d.code && d.code.startsWith('MAP-RIT-'));
    const numbers = ritualMaps.map(d => {
      const match = d.code.match(/MAP-RIT-(\d+)/);
      return match ? parseInt(match[1]) : 0;
    });
    const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
    return `MAP-RIT-${String(maxNumber + 1).padStart(4, '0')}`;
  };

  const handleSaveMap = async (formData) => {
    setIsSaving(true);
    try {
      let savedMap;
      
      if (processDocument) {
        // Atualizar MAP existente
        savedMap = await base44.entities.ProcessDocument.update(processDocument.id, {
          title: formData.title,
          description: formData.description,
          content: formData.content,
          file_url: formData.file_url,
          operational_status: "operacional"
        });
        toast.success("MAP do Ritual atualizado!");
      } else {
        // Criar novo MAP
        const code = await generateMapCode();
        savedMap = await base44.entities.ProcessDocument.create({
          code,
          title: formData.title,
          type: "IT",
          category: "Ritual",
          description: formData.description || `Mapa de Processo do Ritual: ${ritual.name}`,
          content: formData.content,
          file_url: formData.file_url,
          workshop_id: workshop.id,
          is_template: false,
          operational_status: "operacional",
          status: "ativo",
          revision: "1",
          version_history: [{
            revision: "1",
            date: new Date().toISOString(),
            changed_by: "Sistema",
            changes: "Criação do MAP do Ritual"
          }]
        });

        // Vincular MAP ao Ritual
        if (ritual) {
          await base44.entities.Ritual.update(ritual.id, {
            process_document_id: savedMap.id
          });
        }

        toast.success("MAP do Ritual criado!");
      }

      setTimeout(() => {
        navigate(createPageUrl("RituaisAculturamento"));
      }, 1500);
    } catch (error) {
      console.error("Erro ao salvar MAP:", error);
      toast.error(`Erro ao salvar MAP: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate(createPageUrl("RituaisAculturamento"))}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para Rituais
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              {processDocument ? "Editar" : "Criar"} MAP do Ritual: {ritual?.name}
            </CardTitle>
            <p className="text-gray-600 mt-2">
              Preencha todas as abas (Básico, Fluxo, Atividades, Riscos, Indicadores, Evidência) 
              para criar o Mapa de Processo completo deste ritual cultural.
            </p>
          </CardHeader>
          <CardContent>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h4 className="font-semibold text-blue-900 mb-2">📋 Orientações para Criação do MAP</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>Objetivo:</strong> Por que este ritual existe? Qual comportamento ele reforça?</li>
                <li>• <strong>Fluxo:</strong> Descreva o passo a passo completo do ritual</li>
                <li>• <strong>Atividades:</strong> Quem faz o quê? Quando? Com que recursos?</li>
                <li>• <strong>Riscos:</strong> O que pode dar errado? Como prevenir?</li>
                <li>• <strong>Indicadores:</strong> Como medir a efetividade do ritual?</li>
                <li>• <strong>Evidência:</strong> Que documentos/fotos/registros comprovar a execução?</li>
              </ul>
            </div>

            <ITFormDialog
              open={isFormOpen}
              onClose={() => navigate(createPageUrl("RituaisAculturamento"))}
              it={processDocument ? {
                title: processDocument.title,
                type: processDocument.type || "IT",
                description: processDocument.description,
                content: processDocument.content,
                file_url: processDocument.file_url
              } : {
                title: ritual?.name || "",
                type: "IT",
                description: ritual?.description || "",
                content: {
                  objetivo: `Fortalecer a cultura organizacional através do ritual: ${ritual?.name}`,
                  campo_aplicacao: "",
                  informacoes_complementares: ritual?.description || "",
                  fluxo_descricao: "",
                  fluxo_image_url: "",
                  atividades: [],
                  matriz_riscos: [{ risco: "", categoria: "", causa: "", impacto: "", controle: "" }],
                  inter_relacoes: [],
                  indicadores: [{ nome: "", formula: "", meta: "", frequencia: "mensal" }],
                  evidencia_execucao: { tipo_evidencia: "", descricao: "", periodo_retencao: "", justificativa_retencao: "" }
                },
                file_url: ""
              }}
              workshopId={workshop?.id}
              onSave={handleSaveMap}
              isSaving={isSaving}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}