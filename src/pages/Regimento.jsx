import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Plus, Eye, Edit, Archive, FileText, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import RegimentEditor from "@/components/regimento/RegimentEditor";
import RegimentViewer from "@/components/regimento/RegimentViewer";

export default function Regimento() {
  const [user, setUser] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [selectedRegiment, setSelectedRegiment] = useState(null);
  const [showViewer, setShowViewer] = useState(false);

  React.useEffect(() => {
    const init = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        const workshops = await base44.entities.Workshop.filter({ owner_id: currentUser.id });
        const userWorkshop = workshops?.[0];
        
        if (!userWorkshop && currentUser.workshop_id) {
          const ws = await base44.entities.Workshop.get(currentUser.workshop_id);
          setWorkshop(ws);
        } else {
          setWorkshop(userWorkshop);
        }
      } catch (error) {
        console.error(error);
      }
    };
    init();
  }, []);

  const { data: regiments = [], isLoading, refetch } = useQuery({
    queryKey: ['regiments', workshop?.id],
    queryFn: async () => {
      if (!workshop?.id) return [];
      const result = await base44.entities.CompanyRegiment.filter({ workshop_id: workshop.id }, '-created_date');
      return Array.isArray(result) ? result : [];
    },
    enabled: !!workshop?.id
  });

  const activeRegiment = regiments.find(r => r.status === 'active');
  const draftRegiments = regiments.filter(r => r.status === 'draft');
  const archivedRegiments = regiments.filter(r => r.status === 'archived');

  const handleEdit = (regiment) => {
    setSelectedRegiment(regiment);
    setShowEditor(true);
  };

  const handleView = (regiment) => {
    setSelectedRegiment(regiment);
    setShowViewer(true);
  };

  const handleCreateNew = async () => {
    try {
      const response = await base44.functions.invoke('createDefaultRegiment', {
        workshop_id: workshop.id
      });
      if (response.data.success) {
        toast.success("Modelo padrão criado!");
        refetch();
      }
    } catch (error) {
      toast.error("Erro: " + error.message);
    }
  };

  if (showEditor) {
    return (
      <RegimentEditor
        regiment={selectedRegiment}
        workshop={workshop}
        onSave={() => {
          refetch();
          setShowEditor(false);
          setSelectedRegiment(null);
        }}
        onCancel={() => {
          setShowEditor(false);
          setSelectedRegiment(null);
        }}
      />
    );
  }

  if (showViewer) {
    return (
      <RegimentViewer
        regiment={selectedRegiment}
        onClose={() => {
          setShowViewer(false);
          setSelectedRegiment(null);
        }}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-600 rounded-lg">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl">Regimento Interno</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Documento jurídico e operacional que define direitos, deveres e normas de conduta
                </p>
              </div>
            </div>
            <Button onClick={handleCreateNew} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Novo Regimento
            </Button>
          </div>
        </CardHeader>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      ) : regiments.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Nenhum Regimento Cadastrado
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Crie o primeiro regimento interno da sua empresa para estabelecer normas claras e proteger juridicamente a organização.
            </p>
            <Button onClick={handleCreateNew} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeiro Regimento
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="active" className="space-y-4">
          <TabsList className="bg-white border">
            <TabsTrigger value="active" className="gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Ativo ({activeRegiment ? 1 : 0})
            </TabsTrigger>
            <TabsTrigger value="draft" className="gap-2">
              <Clock className="w-4 h-4" />
              Rascunhos ({draftRegiments.length})
            </TabsTrigger>
            <TabsTrigger value="archived" className="gap-2">
              <Archive className="w-4 h-4" />
              Arquivados ({archivedRegiments.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            {activeRegiment ? (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-green-100 rounded-lg">
                        <FileText className="w-6 h-6 text-green-700" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-bold">{activeRegiment.identification?.company_name || workshop?.name}</h3>
                          <Badge className="bg-green-100 text-green-800">Versão {activeRegiment.version}</Badge>
                          <Badge className="bg-green-600 text-white">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Ativo
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          Vigente desde: {activeRegiment.effective_date ? format(new Date(activeRegiment.effective_date), 'dd/MM/yyyy') : '-'}
                        </p>
                        {activeRegiment.published_at && (
                          <p className="text-xs text-gray-500 mt-1">
                            Publicado em {format(new Date(activeRegiment.published_at), "dd/MM/yyyy 'às' HH:mm")}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleView(activeRegiment)}>
                        <Eye className="w-4 h-4 mr-1" />
                        Visualizar
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleEdit(activeRegiment)}>
                        <Edit className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-900">
                      <strong>Objetivo:</strong> {activeRegiment.objective || 'Não definido'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600 mb-4">Nenhum regimento ativo no momento</p>
                  <Button onClick={handleCreateNew} variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Regimento
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="draft">
            {draftRegiments.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  Nenhum rascunho encontrado
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {draftRegiments.map(regiment => (
                  <Card key={regiment.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-gray-400" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{regiment.identification?.company_name || 'Rascunho'}</span>
                              <Badge variant="outline">Versão {regiment.version}</Badge>
                              <Badge className="bg-yellow-100 text-yellow-800">Rascunho</Badge>
                            </div>
                            <p className="text-xs text-gray-500">
                              Criado em {format(new Date(regiment.created_date), "dd/MM/yyyy")}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleView(regiment)}>
                            <Eye className="w-4 h-4 mr-1" />
                            Ver
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleEdit(regiment)}>
                            <Edit className="w-4 h-4 mr-1" />
                            Editar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="archived">
            {archivedRegiments.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  Nenhum regimento arquivado
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {archivedRegiments.map(regiment => (
                  <Card key={regiment.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Archive className="w-5 h-5 text-gray-400" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{regiment.identification?.company_name || 'Arquivado'}</span>
                              <Badge variant="outline">Versão {regiment.version}</Badge>
                              <Badge className="bg-gray-100 text-gray-800">Arquivado</Badge>
                            </div>
                            <p className="text-xs text-gray-500">
                              Vigente até: {regiment.effective_date ? format(new Date(regiment.effective_date), 'dd/MM/yyyy') : '-'}
                            </p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleView(regiment)}>
                          <Eye className="w-4 h-4 mr-1" />
                          Visualizar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}