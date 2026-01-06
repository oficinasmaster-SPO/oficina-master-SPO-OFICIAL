import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";
import { Star, Eye, FileText, Edit } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import CandidateDetailsModal from "./CandidateDetailsModal";
import InterviewReportDialog from "./InterviewReportDialog";
import CandidateEditDialog from "./CandidateEditDialog";
import AssignInterviewerButton from "./AssignInterviewerButton";
import DisqualifyButton from "./DisqualifyButton";

const statusColors = {
  novo_lead: "bg-blue-100 text-blue-800",
  em_entrevista: "bg-yellow-100 text-yellow-800",
  aprovado: "bg-green-100 text-green-800",
  reprovado: "bg-red-100 text-red-800",
  contratado: "bg-purple-100 text-purple-800"
};

const statusLabels = {
  novo_lead: "Novo Lead",
  em_entrevista: "Em Entrevista",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
  contratado: "Contratado"
};

export default function CandidateCard({ candidate }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showDetails, setShowDetails] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const updateCandidateMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.Candidate.update(candidate.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      setShowEditDialog(false);
      toast.success("Candidato atualizado com sucesso!");
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao atualizar candidato");
    }
  });

  const { data: interview } = useQuery({
    queryKey: ['candidate-interview', candidate.id],
    queryFn: async () => {
      const interviews = await base44.entities.CandidateInterview.filter({ 
        candidate_id: candidate.id 
      });
      return interviews && interviews.length > 0 ? interviews[0] : null;
    },
    enabled: candidate.status === 'em_entrevista' || candidate.status === 'aprovado'
  });

  return (
    <>
      <CandidateDetailsModal
        open={showDetails}
        onClose={() => setShowDetails(false)}
        candidate={candidate}
      />
      
      {interview && (
        <InterviewReportDialog
          open={showReport}
          onClose={() => setShowReport(false)}
          interview={interview}
          candidate={candidate}
        />
      )}

      <CandidateEditDialog
        open={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        candidate={candidate}
        onSave={(data) => updateCandidateMutation.mutate(data)}
        isLoading={updateCandidateMutation.isPending}
      />
    <div className="flex items-center gap-4 px-4 py-3 bg-white border-b border-gray-200 hover:bg-gray-50 transition-colors">
      {/* Nome */}
      <div className="w-[180px]">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold text-gray-900 text-sm">{candidate.full_name}</h3>
        </div>
        <Badge className={`${statusColors[candidate.status]} text-xs`}>
          {statusLabels[candidate.status]}
        </Badge>
      </div>

      {/* Cargo */}
      <div className="w-[140px]">
        <p className="text-sm text-gray-700 font-medium">{candidate.desired_position}</p>
      </div>

      {/* Contato */}
      <div className="w-[180px]">
        <p className="text-sm text-gray-600">{candidate.phone}</p>
        <p className="text-xs text-gray-500">{candidate.email || "-"}</p>
      </div>

      {/* Score */}
      <div className="w-[80px]">
        {candidate.lead_score !== null && candidate.lead_score !== undefined ? (
          <div className="flex items-center gap-1 text-yellow-600 font-semibold">
            <Star className="w-4 h-4 fill-current" />
            <span>{candidate.lead_score}</span>
          </div>
        ) : (
          <span className="text-gray-400 text-sm">-</span>
        )}
      </div>

      {/* Entrevistador/Gestor */}
      <div className="w-[150px]">
        <p className="text-sm text-gray-700">
          {candidate.assigned_interviewer_name || (
            <span className="text-gray-400">Não atribuído</span>
          )}
        </p>
      </div>

      {/* Ações */}
      <div className="flex items-center gap-2 ml-auto">
        <AssignInterviewerButton 
          candidateId={candidate.id}
          currentInterviewer={candidate.assigned_interviewer_id}
          workshopId={candidate.workshop_id}
        />
        <DisqualifyButton candidateId={candidate.id} />
        <Button
          onClick={() => setShowEditDialog(true)}
          size="sm"
          variant="outline"
          className="text-gray-600 hover:bg-gray-50"
        >
          <Edit className="w-4 h-4" />
        </Button>
        <Button
          onClick={() => setShowDetails(true)}
          size="sm"
          variant="outline"
        >
          <Eye className="w-4 h-4" />
        </Button>
        {interview && (
          <Button
            onClick={() => setShowReport(true)}
            size="sm"
            variant="outline"
            className="border-green-600 text-green-600 hover:bg-green-50"
          >
            <FileText className="w-4 h-4" />
          </Button>
        )}
        <Button 
          onClick={() => navigate(createPageUrl("CESPEEntrevista") + `?candidate_id=${candidate.id}`)}
          size="sm"
          variant="outline"
        >
          Avaliar
        </Button>
        <Button 
          onClick={() => navigate(createPageUrl("CESPEProposta") + `?candidate_id=${candidate.id}`)}
          size="sm"
          variant="outline"
          className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
        >
          Proposta
        </Button>
      </div>
    </div>
        </>
        );
        }