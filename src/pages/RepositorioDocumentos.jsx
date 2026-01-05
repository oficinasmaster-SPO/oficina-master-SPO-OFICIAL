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
import { Loader2, Upload, FileText, Trash2, Download, Plus, Search, ShieldCheck, Globe, Building, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import AIDocumentAnalyzer from "@/components/documents/AIDocumentAnalyzer";
import AdminViewBanner from "../components/shared/AdminViewBanner";
import DocumentViewer from "@/components/documents/DocumentViewer";
import MultiFileUpload from "@/components/documents/MultiFileUpload";
import DocumentsDashboard from "@/components/documents/DocumentsDashboard";
import DigitalSignature from "@/components/documents/DigitalSignature";
import OCRExtractor from "@/components/documents/OCRExtractor";
import ComplianceAnalyzer from "@/components/documents/ComplianceAnalyzer";
import TagsManager from "@/components/documents/TagsManager";
import VersionHistory from "@/components/documents/VersionHistory";
import ShareDocumentDialog from "@/components/documents/ShareDocumentDialog";
import AccessReport from "@/components/documents/AccessReport";
import DocumentFilters from "@/components/documents/DocumentFilters";
import DocumentFormDialog from "@/components/documents/DocumentFormDialog";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [isAdminView, setIsAdminView] = useState(false);
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingDocument, setEditingDocument] = useState(null);
  const [filters, setFilters] = useState({
    category: '',
    document_type: '',
    status: '',
    legal_impact: '',
    mandatory_by_law: ''
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

  const filteredDocuments = React.useMemo(() => {
    let filtered = documents;

    // Busca por texto
    if (searchTerm) {
      filtered = filtered.filter(doc => 
        doc.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.document_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.subprocess_area?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtros
    if (filters.category) {
      filtered = filtered.filter(doc => doc.category === filters.category);
    }
    if (filters.document_type) {
      filtered = filtered.filter(doc => doc.document_type === filters.document_type);
    }
    if (filters.status) {
      filtered = filtered.filter(doc => doc.status === filters.status);
    }
    if (filters.legal_impact) {
      filtered = filtered.filter(doc => doc.legal_impact === filters.legal_impact);
    }
    if (filters.mandatory_by_law === 'sim') {
      filtered = filtered.filter(doc => doc.mandatory_by_law === true);
    } else if (filters.mandatory_by_law === 'nao') {
      filtered = filtered.filter(doc => doc.mandatory_by_law === false);
    }

    return filtered;
  }, [documents, searchTerm, filters]);
  
  console.log(`📊 Total: ${documents.length} | Exibindo: ${filteredDocuments.length}`);

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

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
  };

  const handleClearFilters = () => {
    setFilters({
      category: '',
      document_type: '',
      status: '',
      legal_impact: '',
      mandatory_by_law: ''
    });
  };

  const handleEdit = (doc) => {
    setEditingDocument(doc);
    setShowFormDialog(true);
  };

  const handleNewDocument = () => {
    setEditingDocument(null);
    setShowFormDialog(true);
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
          <Button onClick={handleNewDocument} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-5 h-5 mr-2" />
            Novo Documento
          </Button>
        </div>

        <DocumentsDashboard documents={documents} />

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Buscar por ID, nome, processo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white"
            />
          </div>
        </div>

        <DocumentFilters 
          filters={filters}
          onFilterChange={handleFilterChange}
          onClear={handleClearFilters}
        />

        <Card className="shadow-md overflow-hidden border-t-4 border-t-blue-500">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[80px]">ID</TableHead>
                  <TableHead className="w-[250px]">Nome do Documento</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead>Processo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Versão</TableHead>
                  <TableHead>Revisar Até</TableHead>
                  <TableHead>Impacto</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-12 text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>Nenhum documento encontrado.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDocuments.map((doc) => {
                    const expiryStatus = getExpiryStatus(doc.next_review_date);
                    
                    const categoryLabels = {
                      governanca: "Governança",
                      juridico_regimento: "Jurídico",
                      rh_pessoas: "RH",
                      operacional: "Operacional",
                      tecnico: "Técnico",
                      comercial: "Comercial",
                      financeiro: "Financeiro",
                      treinamento: "Treinamento",
                      auditoria_dados: "Auditoria"
                    };

                    const statusLabels = {
                      em_construcao: "Construção",
                      em_revisao: "Revisão",
                      aprovado: "Aprovado",
                      em_uso: "Em Uso",
                      obsoleto: "Obsoleto",
                      arquivado: "Arquivado"
                    };

                    const roleLabels = {
                      socio: "Sócio",
                      diretor: "Diretor",
                      gerente: "Gerente",
                      financeiro: "Financeiro",
                      consultor_vendas: "Vendas",
                      tecnico: "Técnico",
                      rh: "RH",
                      administrativo: "Admin",
                      outros: "Outros"
                    };

                    return (
                    <TableRow key={doc.id} className={`hover:bg-slate-50 ${expiryStatus?.status === 'expired' ? 'bg-red-50' : ''}`}>
                      <TableCell className="font-mono text-xs text-gray-700">
                        {doc.document_id || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <p className="font-medium text-gray-900 text-sm">{doc.title}</p>
                          {doc.process_owner && (
                            <p className="text-xs text-gray-500">Owner: {doc.process_owner}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {categoryLabels[doc.category] || doc.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-700">
                        {doc.subprocess_area || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">
                          {doc.document_type?.toUpperCase() || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-gray-700">
                        {roleLabels[doc.responsible_role] || doc.responsible_role || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${
                          doc.status === 'em_uso' ? 'bg-green-100 text-green-700' :
                          doc.status === 'aprovado' ? 'bg-blue-100 text-blue-700' :
                          doc.status === 'em_revisao' ? 'bg-yellow-100 text-yellow-700' :
                          doc.status === 'obsoleto' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {statusLabels[doc.status] || doc.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-gray-700">
                        {doc.version || 'v1.0'}
                      </TableCell>
                      <TableCell>
                        {doc.next_review_date ? (
                          <div className="flex flex-col gap-1">
                            <span className="text-xs text-gray-700">
                              {format(new Date(doc.next_review_date), "dd/MM/yyyy")}
                            </span>
                            {expiryStatus && (
                              <Badge className={`${expiryStatus.color} border text-xs`}>
                                {expiryStatus.label}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {doc.legal_impact && (
                            <Badge className={`text-xs ${
                              doc.legal_impact === 'alto' ? 'bg-red-100 text-red-700' :
                              doc.legal_impact === 'medio' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {doc.legal_impact}
                            </Badge>
                          )}
                          {doc.mandatory_by_law && (
                            <Badge className="bg-orange-100 text-orange-700 text-xs">
                              Lei
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                            onClick={() => handleEdit(doc)}
                            title="Editar"
                          >
                            <Search className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-green-600 hover:bg-green-50"
                            onClick={() => handleDownload(doc)}
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-red-500 hover:bg-red-50"
                            onClick={() => handleDelete(doc.id)}
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
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

        <DocumentFormDialog
          open={showFormDialog}
          onClose={() => {
            setShowFormDialog(false);
            setEditingDocument(null);
          }}
          document={editingDocument}
          workshopId={workshop?.id}
          onSuccess={() => {
            setShowFormDialog(false);
            setEditingDocument(null);
            queryClient.invalidateQueries(['company-documents']);
          }}
        />
      </div>
    </div>
  );
}