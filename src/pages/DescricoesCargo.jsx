import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, FileText, Search, Briefcase, Download, Eye, Trash2, Globe, Copy, Pencil } from "lucide-react";
import JobDescriptionViewer from "@/components/job-description/JobDescriptionViewer";
import { toast } from "sonner";
import { useAdminMode } from "@/components/hooks/useAdminMode";
import { useWorkshopContext } from "@/components/hooks/useWorkshopContext";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function DescricoesCargo() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedArea, setSelectedArea] = useState("all");
  const [selectedDescription, setSelectedDescription] = useState(null);
  const [showViewer, setShowViewer] = useState(false);
  const { isAdminMode } = useAdminMode();
  const { workshopId } = useWorkshopContext();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCloning, setIsCloning] = useState(false);

  const { data: jobDescriptions = [], isLoading } = useQuery({
    queryKey: ['job-descriptions'],
    queryFn: () => base44.entities.JobDescription.list('-created_date')
  });

  const { data: workshops = [] } = useQuery({
    queryKey: ['workshops'],
    queryFn: () => base44.entities.Workshop.list()
  });

  const filteredDescriptions = jobDescriptions.filter(desc => {
    const matchesSearch = desc.job_title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesArea = selectedArea === "all" || desc.area === selectedArea;
    
    // Filter logic:
    // 1. System Templates (no workshop_id) - Visible to everyone
    // 2. Workshop Specific:
    //    - If Admin Mode: Show all (or filter by selected workshop if needed, but 'all' gives overview)
    //    - If Tenant: Show ONLY their own workshop's documents
    
    const isSystemDoc = !desc.workshop_id;
    const isMyWorkshopDoc = workshopId && desc.workshop_id === workshopId;
    
    // If user is NOT admin, they should only see System Docs or Their Own Docs
    if (!isAdminMode && !isSystemDoc && !isMyWorkshopDoc) {
      return false;
    }

    return matchesSearch && matchesArea;
  });

  const handleDelete = async (id) => {
    setIsDeleting(true);
    try {
      await base44.entities.JobDescription.delete(id);
      await queryClient.invalidateQueries(['job-descriptions']);
      toast.success("Descrição de cargo excluída com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao excluir descrição.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMakeGlobal = async (desc) => {
    if (!isAdminMode) return;
    setIsCloning(true);
    try {
      // Create a copy without workshop_id to make it global
      const { id, workshop_id, created_date, updated_date, created_by, ...dataToClone } = desc;
      
      await base44.entities.JobDescription.create({
        ...dataToClone,
        workshop_id: null, // Global
        job_title: `${desc.job_title} (Modelo Padrão)`,
        generated_by_ai: false
      });
      
      await queryClient.invalidateQueries(['job-descriptions']);
      toast.success("Modelo padrão criado com sucesso para todos os inquilinos!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao criar modelo global.");
    } finally {
      setIsCloning(false);
    }
  };

  const handleDuplicate = async (desc) => {
    setIsCloning(true);
    try {
      const { id, workshop_id, created_date, updated_date, created_by, ...dataToClone } = desc;
      
      // If it's a system template (no workshop_id), assign to current workshop
      // If it has a workshop_id, use that (or current workshop if we want to be safe)
      // Usually we want to duplicate into the CURRENT workshop context
      const targetWorkshopId = workshopId || workshop_id;

      await base44.entities.JobDescription.create({
        ...dataToClone,
        workshop_id: targetWorkshopId,
        job_title: `${desc.job_title} (Cópia)`,
        generated_by_ai: false
      });
      
      await queryClient.invalidateQueries(['job-descriptions']);
      toast.success("Descrição duplicada com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao duplicar descrição.");
    } finally {
      setIsCloning(false);
    }
  };

  const getWorkshopName = (workshopId) => {
    if (!workshopId) return "Modelo Padrão do Sistema";
    const workshop = workshops.find(w => w.id === workshopId);
    return workshop?.name || "Oficina não encontrada";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Descrições de Cargo
            </h1>
            <p className="text-gray-600">
              Gerencie as descrições de cargo da sua oficina
            </p>
          </div>
          <Button
            onClick={() => navigate(createPageUrl("CriarDescricaoCargo"))}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nova Descrição
          </Button>
        </div>

        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Buscar por cargo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="w-full md:w-64">
            <Select value={selectedArea} onValueChange={setSelectedArea}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por Área" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Áreas</SelectItem>
                <SelectItem value="vendas">Vendas</SelectItem>
                <SelectItem value="comercial">Comercial</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="tecnico">Técnico</SelectItem>
                <SelectItem value="administrativo">Administrativo</SelectItem>
                <SelectItem value="financeiro">Financeiro</SelectItem>
                <SelectItem value="gerencia">Gerência</SelectItem>
                <SelectItem value="operacional">Operacional</SelectItem>
                <SelectItem value="rh">RH</SelectItem>
                <SelectItem value="outros">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {filteredDescriptions.length === 0 ? (
          <Card className="shadow-lg">
            <CardContent className="p-12 text-center">
              <Briefcase className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Nenhuma descrição de cargo encontrada
              </h3>
              <p className="text-gray-600 mb-6">
                Crie sua primeira descrição de cargo para começar
              </p>
              <Button
                onClick={() => navigate(createPageUrl("CriarDescricaoCargo"))}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="w-5 h-5 mr-2" />
                Criar Primeira Descrição
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="bg-white rounded-md border shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Área</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDescriptions.map((desc) => (
                    <TableRow key={desc.id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span className="text-base">{desc.job_title}</span>
                          {desc.generated_by_ai && (
                            <span className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                              <Badge variant="secondary" className="text-[10px] px-1 py-0 h-5 bg-blue-50 text-blue-700 border-blue-200">
                                IA
                              </Badge>
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {desc.area ? (
                          <Badge variant="outline" className="capitalize">
                            {desc.area}
                          </Badge>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {!desc.workshop_id ? (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200">
                              Sistema
                            </Badge>
                          ) : (
                            <span className="text-sm text-gray-600">{getWorkshopName(desc.workshop_id)}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Visualizar"
                            onClick={() => {
                              setSelectedDescription(desc);
                              setShowViewer(true);
                            }}
                          >
                            <Eye className="w-4 h-4 text-gray-500" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Duplicar"
                            onClick={() => handleDuplicate(desc)}
                            disabled={isCloning}
                          >
                            <Copy className="w-4 h-4 text-emerald-600" />
                          </Button>

                            {(desc.workshop_id || isAdminMode) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title={!desc.workshop_id ? "Editar Modelo do Sistema" : "Editar"}
                              onClick={() => navigate(createPageUrl("EditarDescricaoCargo") + `?id=${desc.id}`)}
                            >
                              <Pencil className={`w-4 h-4 ${!desc.workshop_id ? "text-purple-600 font-bold" : "text-blue-600"}`} />
                            </Button>
                          )}

                          {isAdminMode && desc.workshop_id && (
                             <Button
                              variant="ghost"
                              size="icon"
                              title="Liberar para Todos (SPO)"
                              onClick={() => handleMakeGlobal(desc)}
                              disabled={isCloning}
                            >
                              <Globe className="w-4 h-4 text-purple-600" />
                            </Button>
                          )}

                          {((isAdminMode) || (desc.workshop_id && desc.workshop_id === workshopId)) && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Excluir"
                                  className="hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir Descrição de Cargo?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta ação não pode ser desfeita. A descrição de cargo será permanentemente removida.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDelete(desc.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

          <JobDescriptionViewer
            open={showViewer}
            onClose={() => {
              setShowViewer(false);
              setSelectedDescription(null);
            }}
            jobDescription={selectedDescription}
            workshop={workshops.find(w => w.id === selectedDescription?.workshop_id)}
          />
          </>
        )}
      </div>
    </div>
  );
}