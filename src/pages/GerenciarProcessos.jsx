import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Upload, FileText, Trash2, Edit, Search, ArrowLeft, Save, Wand2, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AIProcessOptimizer from "@/components/processes/AIProcessOptimizer";

export default function GerenciarProcessos() {
  const [user, setUser] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  
  // Form state
  const [formData, setFormData] = useState({
    title: "",
    code: "",
    revision: "1",
    category: "",
    description: "",
    pdf_url: "",
    plan_access: ["FREE", "START", "BRONZE", "PRATA", "GOLD", "IOM", "MILLIONS"],
    is_template: true,
    area_id: "",
    operational_status: "em_elaboracao",
    content_json: {
      objetivo: "",
      campo_aplicacao: "",
      informacoes_complementares: "",
      fluxo_processo: "",
      atividades: [],
      matriz_riscos: [],
      indicadores: []
    },
    workshop_id: ""
  });
  const [uploading, setUploading] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);

  const queryClient = useQueryClient();

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        if (currentUser.role !== 'admin') {
          const workshops = await base44.entities.Workshop.filter({ owner_id: currentUser.id });
          const userWorkshop = workshops[0];
          setWorkshop(userWorkshop);
          
          // If editing user is not admin, set default is_template to false and workshop_id
          setFormData(prev => ({ 
            ...prev, 
            is_template: false,
            workshop_id: userWorkshop?.id || ""
          }));
        }
      } catch (e) { console.error(e); }
    };
    loadData();
  }, []);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['process-documents', user?.id],
    queryFn: async () => {
      const allDocs = await base44.entities.ProcessDocument.list();
      if (user?.role === 'admin') return allDocs;
      
      // If regular user, only show their workshop docs
      if (!workshop) return [];
      return allDocs.filter(d => d.workshop_id === workshop.id);
    },
    enabled: !!user && (user.role === 'admin' || !!workshop)
  });

  const generateMapCode = async () => {
    const allDocs = await base44.entities.ProcessDocument.list();
    const mapDocs = allDocs.filter(d => d.code && d.code.startsWith('MAP-'));
    const numbers = mapDocs.map(d => {
      const match = d.code.match(/MAP-(\d+)/);
      return match ? parseInt(match[1]) : 0;
    });
    const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
    return `MAP-${String(maxNumber + 1).padStart(4, '0')}`;
  };

  // Handle auto-open edit dialog from URL
  useEffect(() => {
    const editId = searchParams.get('edit');
    const newVersion = searchParams.get('new_version');
    const reason = searchParams.get('reason');
    const origin = searchParams.get('origin');
    const impact = searchParams.get('impact');
    
    if (editId && documents.length > 0 && !isDialogOpen) {
      const docToEdit = documents.find(d => d.id === editId);
      if (docToEdit) {
        handleEdit(docToEdit);
        
        // Se for uma nova versão, atualizar o formData com a nova revisão
        if (newVersion) {
          setTimeout(() => {
            setFormData(prev => ({
              ...prev,
              revision: newVersion
            }));
            
            toast.info(
              `Nova versão ${newVersion} criada. Motivo: ${decodeURIComponent(reason || '')}`,
              { duration: 5000 }
            );
          }, 100);
        }
      }
    }
  }, [searchParams, documents]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editingDoc) {
        // Ao atualizar, registrar no histórico de versões
        const reason = searchParams.get('reason');
        const origin = searchParams.get('origin');
        const impact = searchParams.get('impact');
        
        const versionEntry = {
          revision: data.revision,
          date: new Date().toISOString(),
          changed_by: user.full_name || user.email,
          changes: reason ? decodeURIComponent(reason) : "Atualização do documento",
          reason: reason ? decodeURIComponent(reason) : undefined,
          origin: origin || "melhoria_continua",
          expected_impact: impact ? decodeURIComponent(impact) : undefined
        };
        const updatedHistory = [...(editingDoc.version_history || []), versionEntry];
        return await base44.entities.ProcessDocument.update(editingDoc.id, {
          ...data,
          version_history: updatedHistory
        });
      } else {
        // Gerar código automaticamente se não foi fornecido
        if (!data.code || data.code.trim() === "") {
          data.code = await generateMapCode();
        }
        // Criar histórico inicial
        data.version_history = [{
          revision: data.revision || "1",
          date: new Date().toISOString(),
          changed_by: user.full_name || user.email,
          changes: "Criação do documento"
        }];
        data.status = "ativo";
        return await base44.entities.ProcessDocument.create(data);
      }
    },
    onSuccess: () => {
      toast.success(editingDoc ? "Processo atualizado!" : "Processo criado!");
      queryClient.invalidateQueries(['process-documents']);
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => toast.error("Erro ao salvar processo.")
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => await base44.entities.ProcessDocument.delete(id),
    onSuccess: () => {
      toast.success("Processo removido!");
      queryClient.invalidateQueries(['process-documents']);
    }
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, pdf_url: file_url }));
      toast.success("Arquivo enviado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro no upload do arquivo.");
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      code: "",
      revision: "1",
      category: "",
      description: "",
      pdf_url: "",
      plan_access: ["FREE", "START", "BRONZE", "PRATA", "GOLD", "IOM", "MILLIONS"],
      is_template: user?.role === 'admin',
      area_id: "",
      operational_status: "em_elaboracao",
      content_json: {
        objetivo: "",
        campo_aplicacao: "",
        informacoes_complementares: "",
        fluxo_processo: "",
        fluxo_image_url: "",
        atividades: [],
        matriz_riscos: [],
        inter_relacoes: [],
        indicadores: []
      },
      workshop_id: workshop?.id || ""
    });
    setEditingDoc(null);
  };

  const handleEdit = (doc) => {
    setEditingDoc(doc);
    setFormData({
      title: doc.title,
      code: doc.code || "",
      revision: doc.revision || "1",
      category: doc.category,
      description: doc.description || "",
      pdf_url: doc.pdf_url,
      plan_access: doc.plan_access || [],
      is_template: doc.is_template,
      area_id: doc.area_id || "",
      operational_status: doc.operational_status || "em_elaboracao",
      content_json: doc.content_json || {
        objetivo: "",
        campo_aplicacao: "",
        informacoes_complementares: "",
        fluxo_processo: "",
        fluxo_image_url: "",
        atividades: [],
        matriz_riscos: [],
        inter_relacoes: [],
        indicadores: []
      },
      workshop_id: doc.workshop_id
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title || !formData.category) {
      toast.error("Preencha os campos obrigatórios.");
      return;
    }
    // Remove pdf requirement for custom processes if user wants to rely on content_json content
    // But schema says required. Let's keep it required for now or allow dummy if content_json is present.
    // For now, simple validation
    
    saveMutation.mutate(formData);
  };

  const generateWithAI = async () => {
    if (!formData.title) {
      toast.error("Preencha pelo menos o Título para gerar com IA.");
      return;
    }

    setGeneratingAI(true);
    try {
      const prompt = `
        Atue como um consultor de processos especializado em oficinas mecânicas (Metodologia Oficinas Master).
        Gere o conteúdo COMPLETO para um Mapa da Auto Gestão do Processo (MAP), correlacionando todas as etapas.
        
        Dados de entrada:
        Título: ${formData.title}
        Categoria: ${formData.category}
        Objetivo (se houver): ${formData.content_json.objetivo || "Definir o padrão para este processo"}

        CRITÉRIOS DE GERAÇÃO:
        1. Fluxo do Processo (Texto): Descreva o fluxo passo a passo de forma resumida.
        2. Atividades (Passo a Passo): Liste pelo menos 6 atividades sequenciais, definindo quem faz (Responsável) e o que usa (Ferramentas/Docs).
        3. Matriz de Risco: Pelo menos 5 riscos correlacionados às atividades, com Identificação, Fonte, Impacto, Categoria (Baixo/Médio/Alto) e Controle.
        4. Inter-relação entre Áreas: Entre 5 e 10 interações claras com outros departamentos (Entradas e Saídas).
        5. Indicadores: No mínimo 4 KPIs relevantes para medir a eficácia deste processo específico.

        Retorne APENAS um JSON com a seguinte estrutura:
        {
          "fluxo_processo": "texto descritivo...",
          "atividades": [{"atividade": "...", "responsavel": "...", "ferramentas": "..."}],
          "matriz_riscos": [{"identificacao": "...", "fonte": "...", "impacto": "...", "categoria": "...", "controle": "..."}],
          "inter_relacoes": [{"area": "...", "interacao": "..."}],
          "indicadores": [{"indicador": "...", "meta": "...", "como_medir": "..."}]
        }
      `;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: "object",
          properties: {
            fluxo_processo: { type: "string" },
            atividades: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  atividade: { type: "string" },
                  responsavel: { type: "string" },
                  ferramentas: { type: "string" }
                }
              }
            },
            matriz_riscos: { 
              type: "array", 
              items: { 
                type: "object", 
                properties: { 
                  identificacao: {type: "string"}, 
                  fonte: {type: "string"}, 
                  impacto: {type: "string"}, 
                  categoria: {type: "string"}, 
                  controle: {type: "string"} 
                } 
              } 
            },
            inter_relacoes: { 
              type: "array", 
              items: { 
                type: "object", 
                properties: { 
                  area: {type: "string"}, 
                  interacao: {type: "string"} 
                } 
              } 
            },
            indicadores: { 
              type: "array", 
              items: { 
                type: "object", 
                properties: { 
                  indicador: {type: "string"}, 
                  meta: {type: "string"}, 
                  como_medir: {type: "string"} 
                } 
              } 
            }
          }
        }
      });

      setFormData(prev => ({
        ...prev,
        content_json: {
          ...prev.content_json,
          fluxo_processo: response.fluxo_processo || prev.content_json.fluxo_processo,
          atividades: response.atividades || [],
          matriz_riscos: response.matriz_riscos || [],
          inter_relacoes: response.inter_relacoes || [],
          indicadores: response.indicadores || []
        }
      }));
      
      toast.success("Conteúdo gerado com IA com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar conteúdo com IA.");
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleFluxoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      updateContent('fluxo_image_url', file_url);
      toast.success("Imagem do fluxograma enviada!");
    } catch (error) {
      toast.error("Erro no upload da imagem.");
    } finally {
      setUploading(false);
    }
  };

  // Content Editors Helpers
  const updateContent = (field, value) => {
    setFormData(prev => ({
      ...prev,
      content_json: { ...prev.content_json, [field]: value }
    }));
  };

  const addArrayItem = (field, emptyItem) => {
    setFormData(prev => ({
      ...prev,
      content_json: {
        ...prev.content_json,
        [field]: [...(prev.content_json[field] || []), emptyItem]
      }
    }));
  };

  const updateArrayItem = (field, index, subField, value) => {
    const newArray = [...(formData.content_json[field] || [])];
    newArray[index] = { ...newArray[index], [subField]: value };
    setFormData(prev => ({
      ...prev,
      content_json: { ...prev.content_json, [field]: newArray }
    }));
  };

  const removeArrayItem = (field, index) => {
    const newArray = [...(formData.content_json[field] || [])];
    newArray.splice(index, 1);
    setFormData(prev => ({
      ...prev,
      content_json: { ...prev.content_json, [field]: newArray }
    }));
  };

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (doc.code && doc.code.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === "all" || doc.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const { data: processAreas = [] } = useQuery({
    queryKey: ['process-areas'],
    queryFn: async () => {
      const allAreas = await base44.entities.ProcessArea.list();
      return allAreas.sort((a, b) => (a.order || 0) - (b.order || 0));
    }
  });

  const categories = processAreas.map(a => a.name);

  const plans = ["FREE", "START", "BRONZE", "PRATA", "GOLD", "IOM", "MILLIONS"];

  if (!user) return <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div>;

  // Allow admin OR workshop owners
  if (user.role !== 'admin' && !workshop) {
    return <div className="p-8 text-center">Acesso restrito. Você precisa ter uma oficina vinculada.</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl('MeusProcessos'))}>
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {user.role === 'admin' ? 'Gerenciar Processos (Admin)' : 'Meus Processos Personalizados'}
            </h1>
            <p className="text-gray-600">
              {user.role === 'admin' ? 'Gestão global de templates e documentos.' : 'Edite e personalize os processos da sua oficina.'}
            </p>
          </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if(!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-red-600 hover:bg-red-700">
              <Plus className="w-4 h-4 mr-2" /> Novo Processo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingDoc ? "Editar Processo" : "Novo Processo"}</DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="dados" className="mt-4 h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="dados">Dados Básicos</TabsTrigger>
                <TabsTrigger value="conteudo">Conteúdo do Processo</TabsTrigger>
              </TabsList>
              
              <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
                <TabsContent value="dados" className="space-y-4 mt-4 flex-1 overflow-y-auto px-1">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Título *</Label>
                      <Input 
                        value={formData.title} 
                        onChange={e => setFormData({...formData, title: e.target.value})} 
                        placeholder="Ex: Precificação R70/I30"
                      />
                    </div>
                    <div>
                      <Label>Código (auto-gerado se vazio)</Label>
                      <Input 
                        value={formData.code} 
                        onChange={e => setFormData({...formData, code: e.target.value})} 
                        placeholder="Ex: MAP-0001 (gerado automaticamente)"
                        disabled={!editingDoc}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {editingDoc ? "Editar código manualmente" : "Será gerado automaticamente ao salvar"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Categoria *</Label>
                      <Select 
                        value={formData.category} 
                        onValueChange={value => setFormData({...formData, category: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Versão do Documento</Label>
                      <Input 
                        value={formData.revision} 
                        onChange={e => setFormData({...formData, revision: e.target.value})}
                        placeholder="Ex: 1, 2, 3..."
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Incrementar ao atualizar o processo
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label>Descrição</Label>
                    <Textarea 
                      value={formData.description} 
                      onChange={e => setFormData({...formData, description: e.target.value})} 
                      placeholder="Breve resumo do processo..."
                    />
                  </div>

                  <div>
                    <Label>Status Operacional</Label>
                    <Select 
                      value={formData.operational_status} 
                      onValueChange={value => setFormData({...formData, operational_status: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="em_elaboracao">Em Elaboração</SelectItem>
                        <SelectItem value="em_implementacao">Em Implementação</SelectItem>
                        <SelectItem value="em_auditoria">Em Auditoria</SelectItem>
                        <SelectItem value="em_melhoria_continua">Em Melhoria Contínua</SelectItem>
                        <SelectItem value="operacional">Operacional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Arquivo PDF (Referência)</Label>
                    <div className="flex gap-2 items-center mt-1">
                      <Input 
                        type="file" 
                        accept=".pdf" 
                        onChange={handleFileUpload}
                        className="cursor-pointer"
                      />
                      {uploading && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
                    </div>
                    {formData.pdf_url && (
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-green-600 flex items-center">
                          <FileText className="w-3 h-3 mr-1" /> Arquivo carregado
                        </p>
                        <a href={formData.pdf_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">
                          Visualizar
                        </a>
                      </div>
                    )}
                  </div>

                  {user?.role === 'admin' && (
                    <div>
                      <Label className="mb-2 block">Planos com Acesso</Label>
                      <div className="flex flex-wrap gap-3">
                        {plans.map(plan => (
                          <div key={plan} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`plan-${plan}`}
                              checked={formData.plan_access.includes(plan)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setFormData(prev => ({ ...prev, plan_access: [...prev.plan_access, plan] }));
                                } else {
                                  setFormData(prev => ({ ...prev, plan_access: prev.plan_access.filter(p => p !== plan) }));
                                }
                              }}
                            />
                            <label htmlFor={`plan-${plan}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                              {plan}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="is_template" 
                      checked={formData.is_template}
                      onCheckedChange={(checked) => setFormData({...formData, is_template: checked})}
                      disabled={user?.role !== 'admin'}
                    />
                    <label htmlFor="is_template" className="text-sm font-medium">
                      É um modelo padrão (Template)?
                    </label>
                  </div>
                </TabsContent>

                <TabsContent value="conteudo" className="space-y-6 mt-4 flex-1 overflow-y-auto pr-2">
                  <div className="flex justify-end mb-4 gap-2">
                    <AIProcessOptimizer 
                      processData={formData} 
                      onApplyOptimization={(optimizedData) => {
                        setFormData(prev => ({
                          ...prev,
                          content_json: {
                            ...prev.content_json,
                            fluxo_processo: optimizedData.fluxo_processo || prev.content_json.fluxo_processo,
                            atividades: optimizedData.atividades || prev.content_json.atividades,
                            indicadores: optimizedData.indicadores || prev.content_json.indicadores
                          }
                        }));
                      }}
                    />
                    <Button 
                      type="button" 
                      onClick={generateWithAI} 
                      disabled={generatingAI}
                      className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700"
                    >
                      {generatingAI ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wand2 className="w-4 h-4 mr-2" />}
                      Gerar Completo
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label className="text-base font-semibold">1. Objetivo</Label>
                      <Textarea 
                        value={formData.content_json?.objetivo || ""} 
                        onChange={e => updateContent('objetivo', e.target.value)}
                        placeholder="Objetivo do processo..."
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label className="text-base font-semibold">2. Campo de Aplicação</Label>
                      <Textarea 
                        value={formData.content_json?.campo_aplicacao || ""} 
                        onChange={e => updateContent('campo_aplicacao', e.target.value)}
                        placeholder="Quais áreas devem estar envolvidas..."
                        rows={2}
                      />
                    </div>
                    <div>
                      <Label className="text-base font-semibold">3. Informações Complementares</Label>
                      <Textarea 
                        value={formData.content_json?.informacoes_complementares || ""} 
                        onChange={e => updateContent('informacoes_complementares', e.target.value)}
                        placeholder="Detalhes, condução, orientações..."
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label className="text-base font-semibold">4. Fluxo do Processo</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Textarea 
                          value={formData.content_json?.fluxo_processo || ""} 
                          onChange={e => updateContent('fluxo_processo', e.target.value)}
                          placeholder="Descrição textual do fluxo..."
                          rows={4}
                        />
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center text-center">
                          {formData.content_json?.fluxo_image_url ? (
                            <div className="relative w-full h-32">
                              <img src={formData.content_json.fluxo_image_url} alt="Fluxograma" className="w-full h-full object-contain" />
                              <Button 
                                type="button" 
                                size="sm" 
                                variant="destructive" 
                                className="absolute top-0 right-0"
                                onClick={() => updateContent('fluxo_image_url', "")}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
                              <Label htmlFor="fluxo-upload" className="cursor-pointer text-sm text-blue-600 hover:underline">
                                Upload Imagem Fluxograma
                              </Label>
                              <Input 
                                id="fluxo-upload" 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={handleFluxoUpload}
                              />
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center mb-2">
                        <Label className="text-base font-semibold">5. Atividades e Responsabilidades</Label>
                        <Button type="button" size="sm" variant="outline" onClick={() => addArrayItem('atividades', { atividade: "", responsavel: "", ferramentas: "" })}>
                          <Plus className="w-3 h-3 mr-1" /> Adicionar
                        </Button>
                      </div>
                      {formData.content_json?.atividades?.map((item, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-2 mb-2 items-start">
                          <div className="col-span-5">
                            <Textarea 
                              placeholder="Atividade" 
                              value={item.atividade} 
                              onChange={e => updateArrayItem('atividades', idx, 'atividade', e.target.value)}
                              rows={2}
                              className="text-sm"
                            />
                          </div>
                          <div className="col-span-3">
                            <Input 
                              placeholder="Responsável" 
                              value={item.responsavel} 
                              onChange={e => updateArrayItem('atividades', idx, 'responsavel', e.target.value)}
                              className="text-sm"
                            />
                          </div>
                          <div className="col-span-3">
                            <Input 
                              placeholder="Ferramentas/Docs" 
                              value={item.ferramentas} 
                              onChange={e => updateArrayItem('atividades', idx, 'ferramentas', e.target.value)}
                              className="text-sm"
                            />
                          </div>
                          <div className="col-span-1 flex justify-center">
                            <Button type="button" size="icon" variant="ghost" onClick={() => removeArrayItem('atividades', idx)}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center mb-2">
                        <Label className="text-base font-semibold">6. Matriz de Riscos (Min 5)</Label>
                        <Button type="button" size="sm" variant="outline" onClick={() => addArrayItem('matriz_riscos', { identificacao: "", fonte: "", impacto: "", categoria: "", controle: "" })}>
                          <Plus className="w-3 h-3 mr-1" /> Adicionar
                        </Button>
                      </div>
                      {formData.content_json?.matriz_riscos?.map((item, idx) => (
                        <div key={idx} className="bg-gray-50 p-3 rounded mb-2 relative border border-gray-200">
                          <Button type="button" size="icon" variant="ghost" className="absolute right-1 top-1" onClick={() => removeArrayItem('matriz_riscos', idx)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pr-8">
                            <div>
                              <Label className="text-xs">Risco</Label>
                              <Input value={item.identificacao} onChange={e => updateArrayItem('matriz_riscos', idx, 'identificacao', e.target.value)} className="text-sm" />
                            </div>
                            <div>
                              <Label className="text-xs">Fonte</Label>
                              <Input value={item.fonte} onChange={e => updateArrayItem('matriz_riscos', idx, 'fonte', e.target.value)} className="text-sm" />
                            </div>
                            <div>
                              <Label className="text-xs">Impacto</Label>
                              <Input value={item.impacto} onChange={e => updateArrayItem('matriz_riscos', idx, 'impacto', e.target.value)} className="text-sm" />
                            </div>
                            <div>
                              <Label className="text-xs">Categoria</Label>
                              <Select value={item.categoria} onValueChange={v => updateArrayItem('matriz_riscos', idx, 'categoria', v)}>
                                <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Baixo">Baixo</SelectItem>
                                  <SelectItem value="Médio">Médio</SelectItem>
                                  <SelectItem value="Alto">Alto</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="col-span-2">
                              <Label className="text-xs">Controle</Label>
                              <Input value={item.controle} onChange={e => updateArrayItem('matriz_riscos', idx, 'controle', e.target.value)} className="text-sm" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center mb-2">
                        <Label className="text-base font-semibold">7. Inter-relação entre Áreas (5-10)</Label>
                        <Button type="button" size="sm" variant="outline" onClick={() => addArrayItem('inter_relacoes', { area: "", interacao: "" })}>
                          <Plus className="w-3 h-3 mr-1" /> Adicionar
                        </Button>
                      </div>
                      {formData.content_json?.inter_relacoes?.map((item, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-2 mb-2 items-center">
                          <div className="col-span-4">
                            <Input placeholder="Área" value={item.area} onChange={e => updateArrayItem('inter_relacoes', idx, 'area', e.target.value)} className="text-sm" />
                          </div>
                          <div className="col-span-7">
                            <Input placeholder="Interação/Entrada/Saída" value={item.interacao} onChange={e => updateArrayItem('inter_relacoes', idx, 'interacao', e.target.value)} className="text-sm" />
                          </div>
                          <div className="col-span-1 flex justify-center">
                            <Button type="button" size="icon" variant="ghost" onClick={() => removeArrayItem('inter_relacoes', idx)}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center mb-2">
                        <Label className="text-base font-semibold">8/9. Indicadores (Min 4)</Label>
                        <Button type="button" size="sm" variant="outline" onClick={() => addArrayItem('indicadores', { indicador: "", meta: "", como_medir: "" })}>
                          <Plus className="w-3 h-3 mr-1" /> Adicionar
                        </Button>
                      </div>
                      {formData.content_json?.indicadores?.map((item, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-2 mb-2 items-start">
                          <div className="col-span-4">
                            <Input placeholder="Indicador" value={item.indicador} onChange={e => updateArrayItem('indicadores', idx, 'indicador', e.target.value)} className="text-sm" />
                          </div>
                          <div className="col-span-3">
                            <Input placeholder="Meta" value={item.meta} onChange={e => updateArrayItem('indicadores', idx, 'meta', e.target.value)} className="text-sm" />
                          </div>
                          <div className="col-span-4">
                            <Input placeholder="Como Medir" value={item.como_medir} onChange={e => updateArrayItem('indicadores', idx, 'como_medir', e.target.value)} className="text-sm" />
                          </div>
                          <div className="col-span-1 flex justify-center">
                            <Button type="button" size="icon" variant="ghost" onClick={() => removeArrayItem('indicadores', idx)}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <div className="flex justify-end gap-2 mt-6 pt-4 border-t bg-white">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={saveMutation.isPending || uploading} className="bg-green-600 hover:bg-green-700">
                    {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Salvar Processo
                  </Button>
                </div>
              </form>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
              <Input 
                placeholder="Buscar por título ou código..." 
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filtrar Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Categorias</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Planos</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        Nenhum processo encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDocs.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-mono text-xs">{doc.code || "-"}</TableCell>
                        <TableCell>
                          <div className="font-medium">{doc.title}</div>
                          <div className="text-xs text-gray-500">{doc.description && doc.description.substring(0, 50) + "..."}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{doc.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {doc.plan_access?.slice(0, 3).map(p => (
                              <span key={p} className="text-xs bg-gray-100 px-1 rounded">{p}</span>
                            ))}
                            {doc.plan_access?.length > 3 && <span className="text-xs text-gray-500">+{doc.plan_access.length - 3}</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="icon" variant="ghost" onClick={() => window.open(doc.pdf_url, '_blank')}>
                              <FileText className="w-4 h-4 text-blue-600" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => handleEdit(doc)}>
                              <Edit className="w-4 h-4 text-gray-600" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => {
                              if(confirm("Tem certeza que deseja excluir este processo?")) deleteMutation.mutate(doc.id);
                            }}>
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}