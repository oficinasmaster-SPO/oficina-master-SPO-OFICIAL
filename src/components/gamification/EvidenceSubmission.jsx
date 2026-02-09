import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, FileText, CheckCircle2, Loader2, Camera } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";

export default function EvidenceSubmission({ activeChallenges, user }) {
  const [selectedChallengeId, setSelectedChallengeId] = useState("");
  const [evidenceType, setEvidenceType] = useState("upload");
  const [file, setFile] = useState(null);
  const [selectedLogId, setSelectedLogId] = useState("");
  const queryClient = useQueryClient();

  // Fetch recent daily logs for the user
  const { data: recentLogs = [] } = useQuery({
    queryKey: ['recent-logs', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      // Fetch last 10 logs
      const logs = await base44.entities.DailyProductivityLog.filter({
        employee_id: user.id
      }, '-date', 10);
      return logs;
    },
    enabled: !!user?.id
  });

  const uploadFileMutation = useMutation({
    mutationFn: async (fileToUpload) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: fileToUpload });
      return file_url;
    }
  });

  const submitEvidenceMutation = useMutation({
    mutationFn: async (data) => {
      const challenge = activeChallenges.find(c => c.id === selectedChallengeId);
      if (!challenge) throw new Error("Desafio não encontrado");

      const participants = challenge.participants || [];
      const userIndex = participants.findIndex(p => p.user_id === user.id);
      
      const newParticipantData = {
        user_id: user.id,
        current_value: participants[userIndex]?.current_value || 0,
        completed: participants[userIndex]?.completed || false,
        completed_date: participants[userIndex]?.completed_date,
        evidence_url: data.evidence_url,
        evidence_type: data.evidence_type,
        evidence_ref_id: data.evidence_ref_id,
        evidence_date: new Date().toISOString()
      };

      let updatedParticipants;
      if (userIndex >= 0) {
        updatedParticipants = [...participants];
        updatedParticipants[userIndex] = newParticipantData;
      } else {
        updatedParticipants = [...participants, newParticipantData];
      }

      await base44.entities.Challenge.update(challenge.id, {
        participants: updatedParticipants
      });
    },
    onSuccess: () => {
      toast.success("Evidência enviada com sucesso!");
      setFile(null);
      setSelectedLogId("");
      setSelectedChallengeId("");
      queryClient.invalidateQueries(['challenges']);
    },
    onError: (error) => {
      toast.error("Erro ao enviar evidência: " + error.message);
    }
  });

  const handleSubmit = async () => {
    if (!selectedChallengeId) {
      toast.error("Selecione um desafio");
      return;
    }

    try {
      let evidenceUrl = "";
      let refId = "";

      if (evidenceType === "upload") {
        if (!file) {
          toast.error("Selecione um arquivo");
          return;
        }
        evidenceUrl = await uploadFileMutation.mutateAsync(file);
      } else {
        if (!selectedLogId) {
          toast.error("Selecione um registro diário");
          return;
        }
        // Find the log to get a link or reference (using log ID as ref and maybe a generated link)
        refId = selectedLogId;
        evidenceUrl = `log:${selectedLogId}`; // Internal reference format
      }

      await submitEvidenceMutation.mutateAsync({
        evidence_url: evidenceUrl,
        evidence_type: evidenceType,
        evidence_ref_id: refId
      });

    } catch (error) {
      console.error(error);
      toast.error("Falha no processo de envio");
    }
  };

  return (
    <Card className="border-2 border-blue-100 bg-white shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg text-blue-800">
          <Camera className="w-5 h-5" />
          Evidenciar Participação
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Selecione o Desafio</Label>
            <Select value={selectedChallengeId} onValueChange={setSelectedChallengeId}>
              <SelectTrigger>
                <SelectValue placeholder="Qual desafio você está evidenciando?" />
              </SelectTrigger>
              <SelectContent>
                {activeChallenges.map(challenge => (
                  <SelectItem key={challenge.id} value={challenge.id}>
                    {challenge.title} ({challenge.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedChallengeId && (
            <Tabs defaultValue="upload" value={evidenceType} onValueChange={setEvidenceType} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload">Upload de Arquivo</TabsTrigger>
                <TabsTrigger value="daily_log">Vincular Produção Diária</TabsTrigger>
              </TabsList>
              
              <TabsContent value="upload" className="space-y-4 mt-4">
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors">
                  <Input 
                    type="file" 
                    onChange={(e) => setFile(e.target.files[0])} 
                    className="hidden" 
                    id="evidence-file"
                    accept="image/*,application/pdf"
                  />
                  <Label htmlFor="evidence-file" className="cursor-pointer flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-gray-400" />
                    <span className="text-sm font-medium text-gray-600">
                      {file ? file.name : "Clique para selecionar foto ou documento"}
                    </span>
                  </Label>
                </div>
              </TabsContent>

              <TabsContent value="daily_log" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Selecione um Registro Diário</Label>
                  <Select value={selectedLogId} onValueChange={setSelectedLogId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha um registro recente" />
                    </SelectTrigger>
                    <SelectContent>
                      {recentLogs.map(log => (
                        <SelectItem key={log.id} value={log.id}>
                          {format(new Date(log.date), 'dd/MM/yyyy')} - {log.status}
                        </SelectItem>
                      ))}
                      {recentLogs.length === 0 && (
                        <SelectItem value="none" disabled>Nenhum registro recente encontrado</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    Vincule um Diário de Produção já enviado como prova de cumprimento da meta.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          )}

          <Button 
            onClick={handleSubmit} 
            disabled={!selectedChallengeId || (evidenceType === 'upload' ? !file : !selectedLogId) || uploadFileMutation.isPending || submitEvidenceMutation.isPending}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {(uploadFileMutation.isPending || submitEvidenceMutation.isPending) ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4 mr-2" />
            )}
            Enviar Evidência
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}