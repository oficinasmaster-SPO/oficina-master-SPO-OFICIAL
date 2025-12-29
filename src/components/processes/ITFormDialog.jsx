import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import ITFluxoTab from "./ITFluxoTab";
import ITAtividadesTab from "./ITAtividadesTab";
import ITRiscosTab from "./ITRiscosTab";
import ITIndicadoresTab from "./ITIndicadoresTab";
import ITInterRelacoesTab from "./ITInterRelacoesTab";

export default function ITFormDialog({ open, onClose, it, mapId, workshopId, onSave }) {
  const [uploading, setUploading] = React.useState(false);
  const [formData, setFormData] = React.useState({
    title: "",
    type: "IT",
    description: "",
    content: {
      objetivo: "",
      campo_aplicacao: "",
      informacoes_complementares: "",
      fluxo_descricao: "",
      fluxo_image_url: "",
      atividades: [],
      matriz_riscos: [{ risco: "", categoria: "", causa: "", impacto: "", controle: "" }],
      inter_relacoes: [],
      indicadores: [{ nome: "", formula: "", meta: "", frequencia: "mensal" }],
      evidencia_execucao: { tipo_evidencia: "", descricao: "" }
    },
    file_url: ""
  });

  React.useEffect(() => {
    if (it) {
      setFormData({
        title: it.title || "",
        type: it.type || "IT",
        description: it.description || "",
        content: {
          objetivo: it.content?.objetivo || "",
          campo_aplicacao: it.content?.campo_aplicacao || "",
          informacoes_complementares: it.content?.informacoes_complementares || "",
          fluxo_descricao: it.content?.fluxo_descricao || "",
          fluxo_image_url: it.content?.fluxo_image_url || "",
          atividades: it.content?.atividades || [],
          matriz_riscos: it.content?.matriz_riscos?.length > 0 ? it.content.matriz_riscos : [{ risco: "", categoria: "", causa: "", impacto: "", controle: "" }],
          inter_relacoes: it.content?.inter_relacoes || [],
          indicadores: it.content?.indicadores?.length > 0 ? it.content.indicadores : [{ nome: "", formula: "", meta: "", frequencia: "mensal" }],
          evidencia_execucao: it.content?.evidencia_execucao || { tipo_evidencia: "", descricao: "" }
        },
        file_url: it.file_url || ""
      });
    } else {
      setFormData({
        title: "",
        type: "IT",
        description: "",
        content: {
          objetivo: "",
          campo_aplicacao: "",
          informacoes_complementares: "",
          fluxo_descricao: "",
          fluxo_image_url: "",
          atividades: [],
          matriz_riscos: [{ risco: "", categoria: "", causa: "", impacto: "", controle: "" }],
          inter_relacoes: [],
          indicadores: [{ nome: "", formula: "", meta: "", frequencia: "mensal" }],
          evidencia_execucao: { tipo_evidencia: "", descricao: "" }
        },
        file_url: ""
      });
    }
  }, [it, open]);

  const handleFileUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (field === 'file') {
        setFormData({ ...formData, file_url });
      } else {
        setFormData({ ...formData, content: { ...formData.content, fluxo_image_url: file_url } });
      }
      toast.success("Arquivo enviado!");
    } catch (error) {
      toast.error("Erro no upload");
    } finally {
      setUploading(false);
    }
  };

  const addActivity = () => {
    setFormData({
      ...formData,
      content: {
        ...formData.content,
        atividades: [...formData.content.atividades, { atividade: "", responsavel: "", frequencia: "", observacao: "" }]
      }
    });
  };

  const addRisk = () => {
    setFormData({
      ...formData,
      content: {
        ...formData.content,
        matriz_riscos: [...formData.content.matriz_riscos, { risco: "", categoria: "", causa: "", impacto: "", controle: "" }]
      }
    });
  };

  const addInterRelation = () => {
    setFormData({
      ...formData,
      content: {
        ...formData.content,
        inter_relacoes: [...formData.content.inter_relacoes, { area: "", interacao: "" }]
      }
    });
  };

  const addIndicator = () => {
    setFormData({
      ...formData,
      content: {
        ...formData.content,
        indicadores: [...formData.content.indicadores, { nome: "", formula: "", meta: "", frequencia: "mensal" }]
      }
    });
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast.error("Título é obrigatório");
      return;
    }

    if (!formData.content.objetivo?.trim()) {
      toast.error("Objetivo é obrigatório");
      return;
    }

    if (formData.content.matriz_riscos.filter(r => r.risco?.trim()).length < 3) {
      toast.error("Matriz de Riscos deve ter no mínimo 3 riscos preenchidos");
      return;
    }

    if (formData.content.indicadores.filter(i => i.nome?.trim()).length < 1) {
      toast.error("Deve haver no mínimo 1 indicador preenchido");
      return;
    }

    if (!formData.content.evidencia_execucao?.tipo_evidencia?.trim()) {
      toast.error("Evidência de Execução é obrigatória");
      return;
    }

    await onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{it ? 'Editar IT/FR' : 'Nova IT/FR'}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basico" className="mt-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="basico">Básico</TabsTrigger>
            <TabsTrigger value="fluxo">Fluxo</TabsTrigger>
            <TabsTrigger value="atividades">Atividades</TabsTrigger>
            <TabsTrigger value="riscos">Riscos</TabsTrigger>
            <TabsTrigger value="indicadores">Indicadores</TabsTrigger>
            <TabsTrigger value="evidencia">Evidência</TabsTrigger>
          </TabsList>

          <TabsContent value="basico" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Título *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Abertura de OS"
                />
              </div>
              <div>
                <Label>Tipo *</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IT">IT - Instrução de Trabalho</SelectItem>
                    <SelectItem value="FR">FR - Formulário/Registro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Descrição Resumida</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            <div>
              <Label>Objetivo da IT *</Label>
              <Textarea
                value={formData.content.objetivo}
                onChange={(e) => setFormData({ ...formData, content: { ...formData.content, objetivo: e.target.value } })}
                placeholder="Garantir que..."
                rows={3}
              />
            </div>

            <div>
              <Label>Campo de Aplicação *</Label>
              <Textarea
                value={formData.content.campo_aplicacao}
                onChange={(e) => setFormData({ ...formData, content: { ...formData.content, campo_aplicacao: e.target.value } })}
                placeholder="Quando e para quem aplicar..."
                rows={2}
              />
            </div>

            <div>
              <Label>Informações Complementares</Label>
              <Textarea
                value={formData.content.informacoes_complementares}
                onChange={(e) => setFormData({ ...formData, content: { ...formData.content, informacoes_complementares: e.target.value } })}
                placeholder="Orientações, regras, restrições..."
                rows={3}
              />
            </div>

            <div>
              <Label>Arquivo Anexo (Opcional)</Label>
              <Input type="file" onChange={(e) => handleFileUpload(e, 'file')} disabled={uploading} />
              {formData.file_url && (
                <p className="text-sm text-green-600 mt-1">✓ Arquivo anexado</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="fluxo" className="space-y-4">
            <ITFluxoTab
              content={formData.content}
              onChange={(updated) => setFormData({ ...formData, content: updated })}
              onFileUpload={handleFileUpload}
              uploading={uploading}
            />
          </TabsContent>

          <TabsContent value="atividades" className="space-y-4">
            <ITAtividadesTab
              atividades={formData.content.atividades}
              onChange={(updated) => setFormData({ ...formData, content: { ...formData.content, atividades: updated } })}
            />
            <ITInterRelacoesTab
              interRelacoes={formData.content.inter_relacoes}
              onChange={(updated) => setFormData({ ...formData, content: { ...formData.content, inter_relacoes: updated } })}
            />
          </TabsContent>

          <TabsContent value="riscos" className="space-y-4">
            <ITRiscosTab
              riscos={formData.content.matriz_riscos}
              onChange={(updated) => setFormData({ ...formData, content: { ...formData.content, matriz_riscos: updated } })}
            />
          </TabsContent>

          <TabsContent value="indicadores" className="space-y-4">
            <ITIndicadoresTab
              indicadores={formData.content.indicadores}
              onChange={(updated) => setFormData({ ...formData, content: { ...formData.content, indicadores: updated } })}
            />
          </TabsContent>

          <TabsContent value="evidencia" className="space-y-4">
            <div>
              <Label>Tipo de Evidência *</Label>
              <Input
                value={formData.content.evidencia_execucao.tipo_evidencia}
                onChange={(e) => setFormData({
                  ...formData,
                  content: {
                    ...formData.content,
                    evidencia_execucao: { ...formData.content.evidencia_execucao, tipo_evidencia: e.target.value }
                  }
                })}
                placeholder="Ex: OS preenchida, Checklist assinado"
              />
            </div>
            <div>
              <Label>Descrição da Evidência *</Label>
              <Textarea
                value={formData.content.evidencia_execucao.descricao}
                onChange={(e) => setFormData({
                  ...formData,
                  content: {
                    ...formData.content,
                    evidencia_execucao: { ...formData.content.evidencia_execucao, descricao: e.target.value }
                  }
                })}
                placeholder="O que deve ser registrado para comprovar execução..."
                rows={3}
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={uploading}>
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar IT/FR'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}