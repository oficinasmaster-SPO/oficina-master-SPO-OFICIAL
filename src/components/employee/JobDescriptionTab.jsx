import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { FileText, Link, ExternalLink, Loader2, CheckCircle, AlertCircle, History } from "lucide-react";
import JobDescriptionViewer from "../job-description/JobDescriptionViewer";

export default function JobDescriptionTab({ employee, onUpdate }) {
  const [jobDescriptions, setJobDescriptions] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(employee?.job_description_id || "");
  const [currentJob, setCurrentJob] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isLinking, setIsLinking] = useState(false);

  useEffect(() => {
    loadJobDescriptions();
  }, []);

  useEffect(() => {
    if (jobDescriptions.length > 0 && employee?.job_description_id) {
      const found = jobDescriptions.find(jd => jd.id === employee.job_description_id);
      setCurrentJob(found || null);
      setSelectedJobId(employee.job_description_id);
    }
  }, [jobDescriptions, employee?.job_description_id]);

  const loadJobDescriptions = async () => {
    setLoading(true);
    try {
      // List all job descriptions available (created by user or system/admin)
      // Note: RLS might filter this, but assume user can read what's available
      const list = await base44.entities.JobDescription.list();
      setJobDescriptions(list);
    } catch (error) {
      console.error("Error loading job descriptions:", error);
      toast.error("Erro ao carregar descrições de cargo");
    } finally {
      setLoading(false);
    }
  };

  const handleLinkJob = async () => {
    if (!selectedJobId) {
        // If unlinking
        if (employee.job_description_id) {
            // Confirm unlink?
        }
        return;
    }

    setIsLinking(true);
    try {
      await onUpdate({ job_description_id: selectedJobId });
      const found = jobDescriptions.find(jd => jd.id === selectedJobId);
      setCurrentJob(found);
      toast.success("Descrição de cargo vinculada com sucesso!");
    } catch (error) {
      console.error("Error linking job description:", error);
      toast.error("Erro ao vincular descrição de cargo");
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlink = async () => {
      if(!window.confirm("Tem certeza que deseja desvincular este cargo?")) return;
      
      setIsLinking(true);
      try {
          const historyEntry = {
            job_description_id: currentJob.id,
            job_title: currentJob.job_title,
            end_date: new Date().toISOString(),
            reason: "Desvinculação manual"
          };

          const newHistory = [...(employee.career_history || []), historyEntry];

          await onUpdate({ 
            job_description_id: null,
            career_history: newHistory
          });

          setCurrentJob(null);
          setSelectedJobId("");
          toast.success("Descrição de cargo desvinculada e histórico atualizado.");
      } catch (error) {
          console.error(error);
          toast.error("Erro ao desvincular.");
      } finally {
          setIsLinking(false);
      }
  }

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-600" />
            Descrição de Cargo (DC)
          </CardTitle>
          <CardDescription>
            A Descrição de Cargo define as responsabilidades, atividades e expectativas para o colaborador.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentJob ? (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                  <h3 className="text-xl font-bold text-purple-900">{currentJob.job_title}</h3>
                  <p className="text-purple-700 mt-1">{currentJob.area ? `Área: ${currentJob.area.charAt(0).toUpperCase() + currentJob.area.slice(1)}` : 'Área não definida'}</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setIsViewerOpen(true)} className="bg-purple-600 hover:bg-purple-700">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Visualizar Completo
                  </Button>
                  {/* Only show unlink if user has permission to edit - assuming onUpdate is passed, they can edit */}
                  <Button variant="outline" onClick={handleUnlink} className="text-red-600 hover:bg-red-50 border-red-200">
                      Desvincular
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-purple-900 mb-2">Principais Atividades</h4>
                  <ul className="space-y-1">
                    {currentJob.main_activities?.slice(0, 5).map((activity, idx) => (
                      <li key={idx} className="text-sm text-purple-800 flex items-start gap-2">
                        <span className="text-purple-500 mt-0.5">•</span>
                        {typeof activity === 'string' ? activity : activity.item}
                      </li>
                    ))}
                    {(currentJob.main_activities?.length || 0) > 5 && (
                      <li className="text-xs text-purple-600 italic">+ {currentJob.main_activities.length - 5} outras atividades...</li>
                    )}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-purple-900 mb-2">Responsabilidades</h4>
                  <p className="text-sm text-purple-800 line-clamp-6 whitespace-pre-line">
                    {currentJob.main_responsibilities || "Não informado"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <div className="flex justify-center mb-4">
                <AlertCircle className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma Descrição de Cargo Vinculada</h3>
              <p className="text-gray-600 max-w-md mx-auto mb-6">
                Vincule uma descrição de cargo existente a este colaborador para definir suas atribuições e expectativas.
              </p>
              
              <div className="max-w-md mx-auto flex gap-2">
                <div className="flex-1">
                  <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cargo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {jobDescriptions.map(jd => (
                        <SelectItem key={jd.id} value={jd.id}>
                          {jd.job_title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleLinkJob} disabled={!selectedJobId || isLinking}>
                  {isLinking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link className="w-4 h-4 mr-2" />}
                  Vincular
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {currentJob && (
        <JobDescriptionViewer 
          open={isViewerOpen} 
          onClose={() => setIsViewerOpen(false)} 
          jobDescription={currentJob} 
          // Assuming we might have workshop details somewhere, but viewer handles missing workshop gracefully
        />
      )}

      {employee.career_history && employee.career_history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="w-5 h-5 text-gray-500" />
              Histórico de Cargos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {employee.career_history.map((item, index) => (
                <div key={index} className="flex justify-between items-start border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium text-gray-900">{item.job_title}</p>
                    <p className="text-sm text-gray-500 mt-1">{item.reason}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      Encerrado em {new Date(item.end_date).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}