import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Upload, FileText, Trash2, Download, Filter, Plus, Search, ShieldCheck, Globe, Building, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import AdvancedFilter from "@/components/shared/AdvancedFilter";
import AIDocumentAnalyzer from "@/components/documents/AIDocumentAnalyzer";
import AdminViewBanner from "../components/shared/AdminViewBanner";
import DocumentViewer from "@/components/documents/DocumentViewer";
import DragDropUpload from "@/components/documents/DragDropUpload";
import DocumentsDashboard from "@/components/documents/DocumentsDashboard";
import DigitalSignature from "@/components/documents/DigitalSignature";
import OCRExtractor from "@/components/documents/OCRExtractor";
import ComplianceAnalyzer from "@/components/documents/ComplianceAnalyzer";
import TagsManager from "@/components/documents/TagsManager";
import VersionHistory from "@/components/documents/VersionHistory";
import ShareDocumentDialog from "@/components/documents/ShareDocumentDialog";
import AccessReport from "@/components/documents/AccessReport";

export default function RepositorioDocumentos() {
  const queryClient = useQueryClient();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedDocForAnalysis, setSelectedDocForAnalysis] = useState(null);
  const [selectedDocForPreview, setSelectedDocForPreview] = useState(null);
  const [selectedDocForSignature, setSelectedDocForSignature] = useState(null);
  const [selectedDocForOCR, setSelectedDocForOCR] = useState(null);
  const [selectedDocForCompliance, setSelectedDocForCompliance] = useState(null);
  const [selectedDocForVersions, setSelectedDocForVersions] = useState(null);
  const [selectedDocForShare, setSelectedDocForShare] = useState(null);
  const [selectedDocForReport, setSelectedDocForReport] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [filterParams, setFilterParams] = useState({ search: "", category: "", type: "" });
  const [isAdminView, setIsAdminView] = useState(false);
  
  const [newDoc, setNewDoc] = useState({
    title: "",
    category: "empresa",
    type: "interno",
    is_controlled_copy: false,
    file: null,
    expiry_date: ""
  });

  // Fetch Current User & Workshop
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: workshop } = useQuery({
    queryKey: ['workshop', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const urlParams = new URLSearchParams(window.location.search);
      const adminWorkshopId = urlParams.get('workshop_id');
      
      if (adminWorkshopId && user.role === 'admin') {
        setIsAdminView(true);
        return await base44.entities.Workshop.get(adminWorkshopId);
      }
      
      setIsAdminView(false);
      const ws = await base44.entities.Workshop.filter({ owner_id: user.id });
      return ws[0];
    },
    enabled: !!user
  });

  // Fetch Documents
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['company-documents', workshop?.id],
    queryFn: async () => {
      console.log("🔍 [QUERY] Iniciando busca de documentos");
      console.log("🔍 [QUERY] Workshop:", workshop);
      console.log("🔍 [QUERY] User:", user?.email, user?.role);
      
      if (!workshop) {
        console.error("❌ [QUERY] Workshop não encontrado - não pode buscar documentos");
        return [];
      }
      
      console.log(`🔍 [QUERY] Buscando documentos para workshop_id: "${workshop.id}"`);
      console.log(`🔍 [QUERY] Nome do workshop: "${workshop.name}"`);
      
      try {
        const docs = await base44.entities.CompanyDocument.filter({ workshop_id: workshop.id }, '-created_date');
        console.log(`✅ [QUERY] Query retornou ${docs.length} documentos`);
        
        if (docs.length > 0) {
          console.log("📄 [QUERY] Documentos encontrados:");
          docs.forEach((d, i) => {
            console.log(`  ${i + 1}. ID: ${d.id} | Title: ${d.title} | Workshop: ${d.workshop_id}`);
          });
        } else {
          console.warn("⚠️ [QUERY] Nenhum documento retornado pela query");
          console.log("⚠️ [QUERY] Tentando buscar TODOS os documentos (debug)...");
          const allDocs = await base44.entities.CompanyDocument.list();
          console.log(`⚠️ [QUERY] Total de documentos no sistema: ${allDocs.length}`);
          if (allDocs.length > 0) {
            console.log("⚠️ [QUERY] Workshops nos documentos existentes:");
            const uniqueWorkshops = [...new Set(allDocs.map(d => d.workshop_id))];
            uniqueWorkshops.forEach(wid => {
              const count = allDocs.filter(d => d.workshop_id === wid).length;
              console.log(`  - Workshop "${wid}": ${count} documentos`);
            });
          }
        }
        
        return docs;
      } catch (error) {
        console.error("❌ [QUERY] Erro ao buscar documentos:", error);
        return [];
      }
    },
    enabled: !!workshop && !!user,
    refetchOnMount: true,
    refetchOnWindowFocus: false
  });

  // Fetch Download Logs
  const { data: downloadLogs = [] } = useQuery({
    queryKey: ['download-logs', workshop?.id],
    queryFn: async () => {
      if (!workshop) return [];
      return await base44.entities.DownloadLog.filter({ workshop_id: workshop.id });
    },
    enabled: !!workshop
  });

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = !filterParams.search || doc.title.toLowerCase().includes(filterParams.search.toLowerCase());
    const matchesCategory = !filterParams.category || filterParams.category === 'all' || doc.category === filterParams.category;
    const matchesType = !filterParams.type || filterParams.type === 'all' || doc.type === filterParams.type;
    
    return matchesSearch && matchesCategory && matchesType;
  });
  
  console.log(`📊 [FILTER] Total: ${documents.length} | Filtrados: ${filteredDocuments.length}`);

  // Verificar documentos vencidos
  const getExpiryStatus = (expiryDate) => {
    if (!expiryDate) return null;
    const now = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.floor((expiry - now) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) return { status: 'expired', label: 'Vencido', color: 'bg-red-100 text-red-800 border-red-300' };
    if (daysUntilExpiry <= 7) return { status: 'critical', label: `Vence em ${daysUntilExpiry}d`, color: 'bg-orange-100 text-orange-800 border-orange-300' };
    if (daysUntilExpiry <= 30) return { status: 'warning', label: `Vence em ${daysUntilExpiry}d`, color: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
    return null;
  };

  // Create Document
  const createMutation = useMutation({
    mutationFn: async () => {
      console.log("📄 [CREATE] Salvando documento...");
      console.log("📄 [CREATE] Workshop:", workshop?.id, workshop?.name);
      console.log("📄 [CREATE] User:", user?.email);
      
      if (!workshop?.id) {
        throw new Error("Workshop não identificado");
      }
      
      if (!newDoc.file || !newDoc.title) {
        throw new Error("Preencha os campos obrigatórios");
      }
      
      setUploading(true);
      try {
        // 1. Upload File
        console.log("📤 [CREATE] Fazendo upload do arquivo...");
        const { file_url } = await base44.integrations.Core.UploadFile({ file: newDoc.file });
        console.log("✅ [CREATE] Arquivo enviado:", file_url);
        
        // 2. Create Record
        console.log("💾 [CREATE] Criando registro no banco...");
        const docData = {
          workshop_id: workshop.id,
          title: newDoc.title,
          category: newDoc.category,
          type: newDoc.type,
          is_controlled_copy: newDoc.is_controlled_copy,
          file_url: file_url,
          expiry_date: newDoc.expiry_date || null
        };
        console.log("📄 [CREATE] Dados que serão salvos:", docData);
        
        const created = await base44.entities.CompanyDocument.create(docData);
        console.log("✅ [CREATE] Documento salvo com sucesso!");
        console.log("✅ [CREATE] ID:", created.id);
        console.log("✅ [CREATE] Workshop ID salvo:", created.workshop_id);
        console.log("✅ [CREATE] Título:", created.title);

        return created;
      } catch (error) {
        console.error("❌ [CREATE] Erro ao salvar documento:", error);
        throw error;
      } finally {
        setUploading(false);
      }
    },
    onSuccess: () => {
      toast.success("Documento salvo com sucesso!");
      setShowUploadModal(false);
      setNewDoc({ title: "", category: "empresa", type: "interno", is_controlled_copy: false, file: null, expiry_date: "" });
      queryClient.invalidateQueries(['company-documents']);
    },
    onError: (e) => toast.error("Erro ao salvar: " + e.message)
  });

  // Delete Document
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.CompanyDocument.delete(id);
    },
    onSuccess: () => {
      toast.success("Documento removido");
      queryClient.invalidateQueries(['company-documents']);
    }
  });

  const handleDelete = (id) => {
    if (confirm("Tem certeza que deseja excluir este documento?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDownload = async (doc) => {
    try {
      // Registrar download
      await base44.entities.DownloadLog.create({
        document_id: doc.id,
        document_title: doc.title,
        user_id: user.id,
        user_email: user.email,
        workshop_id: workshop.id,
        download_date: new Date().toISOString()
      });

      // Abrir documento
      window.open(doc.file_url, '_blank');
      toast.success("Download registrado");
    } catch (error) {
      console.error("Erro ao registrar download:", error);
      window.open(doc.file_url, '_blank');
    }
  };

  const handleSign = async (signatureDataUrl) => {
    try {
      await base44.entities.CompanyDocument.update(selectedDocForSignature.id, {
        digital_signature_url: signatureDataUrl,
        signed_at: new Date().toISOString(),
        signed_by: user.id
      });
      queryClient.invalidateQueries(['company-documents']);
    } catch (error) {
      throw error;
    }
  };

  const handleUpdateTags = async (docId, tags) => {
    try {
      await base44.entities.CompanyDocument.update(docId, { tags });
      queryClient.invalidateQueries(['company-documents']);
      toast.success("Tags atualizadas");
    } catch (error) {
      toast.error("Erro ao atualizar tags");
    }
  };

  const categories = [
    { value: "empresa", label: "Empresa" },
    { value: "juridico", label: "Jurídico" },
    { value: "financeiro", label: "Financeiro" },
    { value: "consorcio", label: "Consórcio" },
    { value: "rh", label: "RH / Funcionários" },
    { value: "outros", label: "Outros" }
  ];

  const docTypes = [
    { value: "interno", label: "Interno", icon: Building },
    { value: "externo", label: "Externo", icon: Globe }
  ];

  const filterConfig = [
    {
      key: "category",
      label: "Categoria",
      type: "select",
      defaultValue: "all",
      options: [{ value: "all", label: "Todas" }, ...categories]
    },
    {
      key: "type",
      label: "Tipo",
      type: "select",
      defaultValue: "all",
      options: [{ value: "all", label: "Todos" }, ...docTypes.map(d => ({ value: d.value, label: d.label }))]
    }
  ];

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="w-10 h-10 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        
        {isAdminView && workshop && (
          <AdminViewBanner workshopName={workshop.name} />
        )}
        
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Repositório de Documentos</h1>
            <p className="text-gray-600">
              Centralize e organize todos os documentos da sua empresa
              {documents.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {documents.length} {documents.length === 1 ? 'documento' : 'documentos'}
                </Badge>
              )}
            </p>
          </div>
          <Button onClick={() => setShowUploadModal(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-5 h-5 mr-2" />
            Novo Documento
          </Button>
        </div>

        <DocumentsDashboard documents={documents} />

        <AdvancedFilter 
          onFilter={setFilterParams}
          filterConfig={filterConfig}
          placeholder="Buscar documentos..."
        />

        <Card className="shadow-md overflow-hidden border-t-4 border-t-blue-500">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[300px]">Documento</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cópia Controlada</TableHead>
                  <TableHead>Data Envio</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>Nenhum documento encontrado.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDocuments.map((doc) => {
                    const expiryStatus = getExpiryStatus(doc.expiry_date);
                    return (
                    <TableRow key={doc.id} className={`hover:bg-slate-50 ${expiryStatus?.status === 'expired' ? 'bg-red-50' : ''}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900">{doc.title}</p>
                              {expiryStatus && (
                                <Badge className={`${expiryStatus.color} border`}>
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  {expiryStatus.label}
                                </Badge>
                              )}
                            </div>
                            {doc.expiry_date && (
                              <p className="text-xs text-gray-500">
                                Validade: {format(new Date(doc.expiry_date), "dd/MM/yyyy")}
                              </p>
                            )}
                            <TagsManager 
                              document={doc}
                              onUpdate={(tags) => handleUpdateTags(doc.id, tags)}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {doc.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`capitalize flex w-fit items-center gap-1 ${doc.type === 'interno' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                          {doc.type === 'interno' ? <Building className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                          {doc.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {doc.is_controlled_copy ? (
                          <Badge className="bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200">
                            <ShieldCheck className="w-3 h-3 mr-1" /> Sim
                          </Badge>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-600 text-sm">
                        {doc.created_date ? format(new Date(doc.created_date), "dd/MM/yyyy", { locale: ptBR }) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => setSelectedDocForPreview(doc)}
                            title="Visualizar"
                          >
                            <Search className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => handleDownload(doc)}
                            title="Baixar"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDelete(doc.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 px-2 text-purple-600 hover:bg-purple-50"
                            onClick={() => setSelectedDocForAnalysis(doc)}
                            title="Extrair Dados"
                          >
                            Dados
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 px-2 text-orange-600 hover:bg-orange-50"
                            onClick={() => setSelectedDocForSignature(doc)}
                            title="Assinar"
                          >
                            Assinar
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 px-2 text-indigo-600 hover:bg-indigo-50"
                            onClick={() => setSelectedDocForOCR(doc)}
                            title="OCR"
                          >
                            OCR
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 px-2 text-pink-600 hover:bg-pink-50"
                            onClick={() => setSelectedDocForCompliance(doc)}
                            title="Conformidade"
                          >
                            Conf
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 px-2 text-gray-600 hover:bg-gray-50"
                            onClick={() => setSelectedDocForVersions(doc)}
                            title="Versões"
                          >
                            Ver
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 px-2 text-teal-600 hover:bg-teal-50"
                            onClick={() => setSelectedDocForShare(doc)}
                            title="Compartilhar"
                          >
                            Share
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 px-2 text-amber-600 hover:bg-amber-50"
                            onClick={() => setSelectedDocForReport(doc)}
                            title="Relatório"
                          >
                            Log
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                    })
                    )}
                    </TableBody>
            </Table>
          </div>
        </Card>

        {selectedDocForAnalysis && (
          <AIDocumentAnalyzer 
            document={selectedDocForAnalysis} 
            onClose={() => setSelectedDocForAnalysis(null)} 
          />
        )}

        <DocumentViewer 
          document={selectedDocForPreview}
          onClose={() => setSelectedDocForPreview(null)}
          onDownload={handleDownload}
        />

        <DigitalSignature
          document={selectedDocForSignature}
          onClose={() => setSelectedDocForSignature(null)}
          onSign={handleSign}
        />

        <OCRExtractor
          document={selectedDocForOCR}
          onClose={() => setSelectedDocForOCR(null)}
        />

        <ComplianceAnalyzer
          document={selectedDocForCompliance}
          onClose={() => setSelectedDocForCompliance(null)}
        />

        <VersionHistory
          document={selectedDocForVersions}
          versions={documents.filter(d => d.previous_version_id === selectedDocForVersions?.id)}
          onClose={() => setSelectedDocForVersions(null)}
        />

        <ShareDocumentDialog
          document={selectedDocForShare}
          onClose={() => setSelectedDocForShare(null)}
        />

        <AccessReport
          document={selectedDocForReport}
          logs={downloadLogs.filter(l => l.document_id === selectedDocForReport?.id)}
          onClose={() => setSelectedDocForReport(null)}
        />

        {/* Upload Modal */}
        <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Novo Documento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Título do Documento *</Label>
                <Input 
                  value={newDoc.title}
                  onChange={(e) => setNewDoc({...newDoc, title: e.target.value})}
                  placeholder="Ex: Contrato Social"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Categoria *</Label>
                  <Select value={newDoc.category} onValueChange={(v) => setNewDoc({...newDoc, category: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tipo *</Label>
                  <Select value={newDoc.type} onValueChange={(v) => setNewDoc({...newDoc, type: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {docTypes.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2 border p-3 rounded-lg bg-slate-50">
                <Checkbox 
                  id="controlled" 
                  checked={newDoc.is_controlled_copy}
                  onCheckedChange={(checked) => setNewDoc({...newDoc, is_controlled_copy: checked})}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="controlled" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Cópia Controlada
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Marque se este documento requer controle de versão rigoroso.
                  </p>
                </div>
              </div>

              <div>
                <Label>Arquivo *</Label>
                <div className="mt-2">
                  <DragDropUpload 
                    onFileSelect={(file) => setNewDoc({...newDoc, file})}
                  />
                  {newDoc.file && (
                    <p className="text-sm text-green-600 mt-2">
                      ✓ Arquivo selecionado: {newDoc.file.name}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label>Data de Validade (Opcional)</Label>
                <Input 
                  type="date"
                  value={newDoc.expiry_date}
                  onChange={(e) => setNewDoc({...newDoc, expiry_date: e.target.value})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowUploadModal(false)}>Cancelar</Button>
              <Button onClick={() => createMutation.mutate()} disabled={uploading}>
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Salvar Documento"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}