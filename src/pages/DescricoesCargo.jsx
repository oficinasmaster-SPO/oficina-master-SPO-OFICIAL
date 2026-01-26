import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, FileText, Search, Briefcase, Download, Eye } from "lucide-react";
import JobDescriptionViewer from "@/components/job-description/JobDescriptionViewer";

export default function DescricoesCargo() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDescription, setSelectedDescription] = useState(null);
  const [showViewer, setShowViewer] = useState(false);

  const { data: jobDescriptions = [], isLoading } = useQuery({
    queryKey: ['job-descriptions'],
    queryFn: () => base44.entities.JobDescription.list('-created_date')
  });

  const { data: workshops = [] } = useQuery({
    queryKey: ['workshops'],
    queryFn: () => base44.entities.Workshop.list()
  });

  const filteredDescriptions = jobDescriptions.filter(desc =>
    desc.job_title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getWorkshopName = (workshopId) => {
    const workshop = workshops.find(w => w.id === workshopId);
    return workshop?.name || "Não informado";
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

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Buscar por cargo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
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
                      <p className="text-sm text-gray-600">
                        {getWorkshopName(desc.workshop_id)}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Briefcase className="w-6 h-6 text-purple-600" />
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

                    <div className="flex gap-2 mt-4">
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(createPageUrl("EditarDescricaoCargo") + `?id=${desc.id}`)}
                      >
                        <FileText className="w-4 h-4" />
                      </Button>
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