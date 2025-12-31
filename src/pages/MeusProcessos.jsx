import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Search, FileText, Download, Eye, Filter, Briefcase, DollarSign, Settings, Users, BarChart3, Truck, Copy, Loader2, Mail, History, LayoutGrid, List, Flame, Sparkles } from "lucide-react";
import { createPageUrl } from "@/utils";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import AdminViewBanner from "../components/shared/AdminViewBanner";
import ShareProcessDialog from "../components/processes/ShareProcessDialog";
import ShareHistoryDialog from "../components/processes/ShareHistoryDialog";
import RitualMAPGenerator from "../components/processes/RitualMAPGenerator";
import AreaGroupedView from "../components/processes/AreaGroupedView";
import ProcessHierarchyView from "../components/processes/ProcessHierarchyView";

export default function MeusProcessos() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("Todos");
  const [isAdminView, setIsAdminView] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState(null);
  const [viewMode, setViewMode] = useState("cards"); // cards, areas, hierarchy
  const [statusFilter, setStatusFilter] = useState("todos");
  const [dateFilter, setDateFilter] = useState("todos");
  const [mapGeneratorOpen, setMapGeneratorOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        const urlParams = new URLSearchParams(window.location.search);
        const adminWorkshopId = urlParams.get('workshop_id');
        
        let userWorkshop = null;
        
        if (adminWorkshopId && currentUser.role === 'admin') {
          userWorkshop = await base44.entities.Workshop.get(adminWorkshopId);
          setIsAdminView(true);
        } else {
          const workshops = await base44.entities.Workshop.filter({ owner_id: currentUser.id });
          userWorkshop = workshops[0] || null;
          setIsAdminView(false);
        }
        
        setWorkshop(userWorkshop);
      } catch (e) {
        console.error(e);
      }
    };
    loadData();
  }, []);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['my-processes', user?.id],
    queryFn: async () => {
      // Fetch all templates and custom documents for this workshop
      const allDocs = await base44.entities.ProcessDocument.list();
      return allDocs;
    },
    enabled: !!user
  });

  const { data: areas = [] } = useQuery({
    queryKey: ['process-areas'],
    queryFn: async () => await base44.entities.ProcessArea.list(),
    initialData: []
  });

  const { data: its = [] } = useQuery({
    queryKey: ['instruction-documents'],
    queryFn: async () => await base44.entities.InstructionDocument.list(),
    initialData: []
  });

  // Contar processos excluindo rituais
  const processosCount = accessibleDocs.filter(d => d.category !== 'Ritual').length;
  const ritualsCount = accessibleDocs.filter(d => d.category === 'Ritual').length;

  // Filter documents based on user access and workshop
  const accessibleDocs = documents.filter(doc => {
    // Check if it's a template or belongs to this workshop
    const isRelevant = doc.is_template || (workshop && doc.workshop_id === workshop.id);
    
    // TODO: Check plan access (doc.plan_access.includes(workshop.planoAtual))
    // For now, showing all relevant templates
    
    return isRelevant;
  });

  // Função para buscar em todo o conteúdo JSON
  const searchInContent = (doc, term) => {
    if (!term) return true;
    const lowerTerm = term.toLowerCase();
    
    // Busca em campos básicos
    if (doc.title?.toLowerCase().includes(lowerTerm) ||
        doc.code?.toLowerCase().includes(lowerTerm) ||
        doc.description?.toLowerCase().includes(lowerTerm)) {
      return true;
    }
    
    // Busca no content_json
    if (doc.content_json) {
      const content = doc.content_json;
      
      // Busca em objetivo, campo_aplicacao, informacoes_complementares, fluxo_processo
      if (content.objetivo?.toLowerCase().includes(lowerTerm) ||
          content.campo_aplicacao?.toLowerCase().includes(lowerTerm) ||
          content.informacoes_complementares?.toLowerCase().includes(lowerTerm) ||
          content.fluxo_processo?.toLowerCase().includes(lowerTerm)) {
        return true;
      }
      
      // Busca em atividades
      if (content.atividades?.some(a => 
        a.atividade?.toLowerCase().includes(lowerTerm) ||
        a.responsavel?.toLowerCase().includes(lowerTerm) ||
        a.ferramentas?.toLowerCase().includes(lowerTerm)
      )) {
        return true;
      }
      
      // Busca em riscos
      if (content.matriz_riscos?.some(r => 
        r.identificacao?.toLowerCase().includes(lowerTerm) ||
        r.fonte?.toLowerCase().includes(lowerTerm) ||
        r.impacto?.toLowerCase().includes(lowerTerm) ||
        r.controle?.toLowerCase().includes(lowerTerm)
      )) {
        return true;
      }
      
      // Busca em indicadores
      if (content.indicadores?.some(i => 
        i.indicador?.toLowerCase().includes(lowerTerm) ||
        i.meta?.toLowerCase().includes(lowerTerm) ||
        i.como_medir?.toLowerCase().includes(lowerTerm)
      )) {
        return true;
      }
      
      // Busca em inter-relações
      if (content.inter_relacoes?.some(ir => 
        ir.area?.toLowerCase().includes(lowerTerm) ||
        ir.interacao?.toLowerCase().includes(lowerTerm)
      )) {
        return true;
      }
    }
    
    return false;
  };

  const filteredDocs = accessibleDocs.filter(doc => {
    const matchesSearch = searchInContent(doc, searchTerm);
    const matchesTab = activeTab === "Todos" || doc.category === activeTab;
    const matchesStatus = statusFilter === "todos" || doc.status === statusFilter;
    
    // Filtro de data
    let matchesDate = true;
    if (dateFilter !== "todos" && doc.created_date) {
      const docDate = new Date(doc.created_date);
      const now = new Date();
      const diffDays = Math.floor((now - docDate) / (1000 * 60 * 60 * 24));
      
      if (dateFilter === "7dias") matchesDate = diffDays <= 7;
      else if (dateFilter === "30dias") matchesDate = diffDays <= 30;
      else if (dateFilter === "90dias") matchesDate = diffDays <= 90;
    }
    
    return matchesSearch && matchesTab && matchesStatus && matchesDate;
  });

  const duplicateMutation = useMutation({
    mutationFn: async (doc) => {
      if (!workshop) throw new Error("Oficina não encontrada");
      
      const newDoc = {
        title: `${doc.title} (Cópia)`,
        code: doc.code,
        revision: "1",
        category: doc.category,
        description: doc.description,
        pdf_url: doc.pdf_url, // Inherit PDF initially
        content_json: doc.content_json || {}, // Copy structured content
        plan_access: doc.plan_access,
        is_template: false,
        workshop_id: workshop.id
      };
      
      return await base44.entities.ProcessDocument.create(newDoc);
    },
    onSuccess: (newDoc) => {
      toast.success("Modelo copiado com sucesso! Redirecionando...");
      queryClient.invalidateQueries(['my-processes']);
      // Redirect to manage page to edit the new document
      navigate(createPageUrl('GerenciarProcessos') + `?edit=${newDoc.id}`);
    },
    onError: () => toast.error("Erro ao copiar modelo.")
  });

  const categories = [
    { id: "Todos", label: "Todos", icon: Filter },
    { id: "Vendas", label: "Vendas", icon: DollarSign },
    { id: "Comercial", label: "Comercial", icon: Briefcase },
    { id: "Pátio", label: "Pátio", icon: Truck },
    { id: "Financeiro", label: "Financeiro", icon: BarChart3 },
    { id: "RH", label: "RH & Pessoas", icon: Users },
    { id: "Ritual", label: "Rituais", icon: Briefcase },
    { id: "Geral", label: "Geral", icon: Settings },
  ];

  const getCategoryIcon = (cat) => {
    if (cat === "Ritual") return Flame;
    const found = categories.find(c => c.id === cat);
    return found ? found.icon : FileText;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        
        {isAdminView && workshop && (
          <AdminViewBanner workshopName={workshop.name} />
        )}
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-8 h-8 text-red-600" />
              Processos e MAPs
            </h1>
            <p className="text-gray-600 mt-1">
              Acesse a biblioteca completa de processos padronizados para sua oficina.
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={() => setMapGeneratorOpen(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Gerar MAPs de Rituais
            </Button>
            <Link to={createPageUrl('GerenciarProcessos')}>
              <Button className="bg-red-600 hover:bg-red-700 text-white border-0">
                <Settings className="w-4 h-4 mr-2" /> 
                {user?.role === 'admin' ? 'Gerenciar Biblioteca (Admin)' : 'Criar e Gerenciar Processos'}
              </Button>
            </Link>
          </div>
        </div>

        {/* Estatísticas e contador */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">Processos</p>
                  <p className="text-3xl font-bold text-blue-900">{processosCount}</p>
                </div>
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">Operacionais</p>
                  <p className="text-3xl font-bold text-green-900">
                    {accessibleDocs.filter(d => d.operational_status === 'operacional').length}
                  </p>
                </div>
                <BarChart3 className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-600 font-medium">ITs e FRs</p>
                  <p className="text-3xl font-bold text-yellow-900">{its.length}</p>
                </div>
                <FileText className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-600 font-medium">Filtrados</p>
                  <p className="text-3xl font-bold text-orange-900">{filteredDocs.length}</p>
                </div>
                <Filter className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Busca e filtros */}
        <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Buscar em todo conteúdo (título, objetivo, atividades, riscos, indicadores...)" 
                className="pl-10 bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="todos">Todos os Status</option>
              <option value="ativo">Ativo</option>
              <option value="em_revisao">Em Revisão</option>
              <option value="obsoleto">Obsoleto</option>
            </select>

            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="todos">Todas as Datas</option>
              <option value="7dias">Últimos 7 dias</option>
              <option value="30dias">Últimos 30 dias</option>
              <option value="90dias">Últimos 90 dias</option>
            </select>
          </div>

          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="text-sm text-gray-600">Visualização:</span>
            <Button
              variant={viewMode === "cards" ? "default" : "outline"}
              onClick={() => setViewMode("cards")}
              size="sm"
            >
              <LayoutGrid className="w-4 h-4 mr-2" />
              Cards
            </Button>
            <Button
              variant={viewMode === "areas" ? "default" : "outline"}
              onClick={() => setViewMode("areas")}
              size="sm"
            >
              <List className="w-4 h-4 mr-2" />
              Por Área
            </Button>
            <Button
              variant={viewMode === "hierarchy" ? "default" : "outline"}
              onClick={() => setViewMode("hierarchy")}
              size="sm"
            >
              <List className="w-4 h-4 mr-2" />
              Hierarquia
            </Button>

            {(searchTerm || statusFilter !== "todos" || dateFilter !== "todos") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("todos");
                  setDateFilter("todos");
                }}
                className="ml-auto text-red-600 hover:text-red-700"
              >
                Limpar Filtros
              </Button>
            )}
          </div>
        </div>

        <Tabs defaultValue="Todos" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex flex-wrap h-auto p-1 bg-white shadow-sm border">
            {categories.map(cat => {
              const Icon = cat.icon;
              return (
                <TabsTrigger key={cat.id} value={cat.id} className="flex items-center gap-2 px-4 py-2">
                  <Icon className="w-4 h-4" />
                  {cat.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value={activeTab} className="mt-0">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1,2,3].map(i => (
                  <Card key={i} className="animate-pulse h-48 bg-gray-100" />
                ))}
              </div>
            ) : filteredDocs.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-dashed">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-900">Nenhum processo encontrado</h3>
                <p className="text-gray-500">Tente mudar os filtros ou busque por outro termo.</p>
              </div>
            ) : viewMode === "areas" ? (
              <AreaGroupedView
                areas={areas}
                processes={filteredDocs}
                onSelectProcess={(process) => navigate(createPageUrl('VisualizarProcesso') + '?id=' + process.id)}
              />
            ) : viewMode === "hierarchy" ? (
              <ProcessHierarchyView
                maps={filteredDocs}
                its={its}
                onSelectMap={(map) => navigate(createPageUrl('VisualizarProcesso') + '?id=' + map.id)}
                onSelectIT={(it) => toast.info("Visualização de IT em desenvolvimento")}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDocs.map((doc) => {
                  const CategoryIcon = getCategoryIcon(doc.category);
                  return (
                    <Card key={doc.id} className="hover:shadow-lg transition-shadow duration-300 flex flex-col">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start mb-2">
                          <Badge variant="outline" className="flex items-center gap-1">
                            <CategoryIcon className="w-3 h-3" />
                            {doc.category}
                          </Badge>
                          {doc.code && (
                            <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              {doc.code}
                            </span>
                          )}
                        </div>
                        <CardTitle className="text-lg leading-tight text-gray-900">
                         {doc.title}
                        </CardTitle>
                        <CardDescription className="line-clamp-2 mt-2">
                         {doc.description || "Sem descrição disponível."}
                        </CardDescription>
                        <div className="flex flex-wrap gap-1 mt-3">
                         {doc.operational_status && (
                           <Badge variant="outline" className="text-xs">
                             {doc.operational_status.replace(/_/g, ' ')}
                           </Badge>
                         )}
                         {doc.child_its_count > 0 && (
                           <Badge variant="secondary" className="text-xs">
                             {doc.child_its_count} ITs
                           </Badge>
                         )}
                         {doc.indicators_count > 0 && (
                           <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                             {doc.indicators_count} KPIs
                           </Badge>
                         )}
                        </div>
                        </CardHeader>
                        <CardContent className="flex-1">
                        <div className="w-full h-32 bg-gray-100 rounded-md flex items-center justify-center border border-gray-200 mb-2 group cursor-pointer" onClick={() => window.open(doc.pdf_url, '_blank')}>
                          <FileText className="w-12 h-12 text-gray-400 group-hover:text-red-500 transition-colors" />
                        </div>
                      </CardContent>
                      <CardFooter className="pt-0 gap-2 flex-wrap">
                        <Button 
                          className="flex-1 bg-red-600 hover:bg-red-700" 
                          onClick={() => {
                            navigate(createPageUrl('VisualizarProcesso') + `?id=${doc.id}`);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Visualizar
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          onClick={() => {
                            setSelectedProcess(doc);
                            setShareDialogOpen(true);
                          }}
                          title="Compartilhar com Colaborador"
                          className="text-green-600 hover:text-green-700 border-green-200 hover:bg-green-50"
                        >
                          <Mail className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          onClick={() => {
                            setSelectedProcess(doc);
                            setHistoryDialogOpen(true);
                          }}
                          title="Ver Histórico de Compartilhamentos"
                          className="text-purple-600 hover:text-purple-700 border-purple-200 hover:bg-purple-50"
                        >
                          <History className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => window.open(doc.pdf_url, '_blank')} title="Baixar PDF">
                          <Download className="w-4 h-4" />
                        </Button>
                        {doc.is_template && user?.role !== 'admin' && (
                          <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => duplicateMutation.mutate(doc)}
                            disabled={duplicateMutation.isPending}
                            title="Usar como Modelo"
                            className="text-blue-600 hover:text-blue-700 border-blue-200 hover:bg-blue-50"
                          >
                            {duplicateMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <ShareProcessDialog
          open={shareDialogOpen}
          onClose={() => {
            setShareDialogOpen(false);
            setSelectedProcess(null);
          }}
          process={selectedProcess}
          workshop={workshop}
        />

        <ShareHistoryDialog
          open={historyDialogOpen}
          onClose={() => {
            setHistoryDialogOpen(false);
            setSelectedProcess(null);
          }}
          process={selectedProcess}
        />

        {mapGeneratorOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-auto">
              <div className="p-6">
                <RitualMAPGenerator
                  onClose={() => {
                    setMapGeneratorOpen(false);
                    queryClient.invalidateQueries(['my-processes']);
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}