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
import { Loader2, Plus, FileText, Search, Briefcase, Download, Eye, Trash2, Globe, Copy } from "lucide-react";
import JobDescriptionViewer from "@/components/job-description/JobDescriptionViewer";
import { toast } from "sonner";
import { useAdminMode } from "@/components/hooks/useAdminMode";
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDescriptions.map((desc) => (
                <Card key={desc.id} className="shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{desc.job_title}</CardTitle>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm text-gray-600">
                          {getWorkshopName(desc.workshop_id)}
                        </p>
                        {!desc.workshop_id && (
                          <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                            Sistema
                          </Badge>
                        )}
                        {desc.area && (
                           <Badge variant="outline" className="text-xs">
                             {desc.area.charAt(0).toUpperCase() + desc.area.slice(1)}
                           </Badge>
                        )}
                      </div>
                    </div>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${!desc.workshop_id ? 'bg-amber-100' : 'bg-purple-100'}`}>
                      <Briefcase className={`w-6 h-6 ${!desc.workshop_id ? 'text-amber-600' : 'text-purple-600'}`} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {desc.generated_by_ai && (
                      <Badge className="bg-blue-100 text-blue-700">
                        Gerado por IA
                      </Badge>
                    )}
                    
                    {desc.main_activities && desc.main_activities.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Atividades:</p>
                        <p className="text-sm text-gray-600">
                          {desc.main_activities.length} atividades definidas
                        </p>
                      </div>
                    )}

                    <div className="flex flex-col gap-2 mt-4">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            setSelectedDescription(desc);
                            setShowViewer(true);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Visualizar
                        </Button>
                        
                        {(desc.workshop_id || isAdminMode) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(createPageUrl("EditarDescricaoCargo") + `?id=${desc.id}`)}
                            title="Editar"
                          >
                            <FileText className="w-4 h-4" />
                          </Button>
                        )}

                        {(desc.workshop_id || isAdminMode) && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
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

                      {isAdminMode && desc.workshop_id && (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="w-full bg-blue-100 text-blue-700 hover:bg-blue-200 mt-1"
                          onClick={() => handleMakeGlobal(desc)}
                          disabled={isCloning}
                        >
                          <Globe className="w-3 h-3 mr-2" />
                          {isCloning ? "Processando..." : "Liberar para Todos (SPO)"}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
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