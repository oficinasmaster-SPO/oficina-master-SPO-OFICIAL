import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";
import { Star, Eye, FileText, Edit } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import CandidateDetailsModal from "./CandidateDetailsModal";
import InterviewReportDialog from "./InterviewReportDialog";
import PrimaryInfoForm from "./PrimaryInfoForm";

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
  const [showPrimaryInfo, setShowPrimaryInfo] = useState(false);

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

      <PrimaryInfoForm
        open={showPrimaryInfo}
        onClose={() => setShowPrimaryInfo(false)}
        candidate={candidate}
        onUpdate={() => {
          queryClient.invalidateQueries({ queryKey: ['candidates'] });
        }}
      />
    <div className="grid grid-cols-2 gap-4 px-4 py-3 bg-white border-b border-gray-200 hover:bg-gray-50 transition-colors items-center">
      {/* Coluna 1 */}
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-gray-900">{candidate.full_name}</h3>
          <Badge className={`${statusColors[candidate.status]} text-xs`}>
            {statusLabels[candidate.status]}
          </Badge>
        </div>
        <p className="text-sm text-gray-600">{candidate.desired_position}</p>
      </div>

      {/* Coluna 2 */}
      <div className="flex items-center justify-between">
        <div className="space-y-1 text-sm text-gray-600">
          <p>{candidate.phone}</p>
          <p>{candidate.email || "Sem email"}</p>
        </div>
        <div className="flex items-center gap-3">
          {candidate.lead_score !== null && candidate.lead_score !== undefined ? (
            <div className="flex items-center gap-1 text-yellow-600 font-semibold">
              <Star className="w-4 h-4 fill-current" />
              <span>{candidate.lead_score}</span>
            </div>
          ) : (
            <span className="text-gray-400 text-sm">Sem score</span>
          )}
          <Button
            onClick={() => setShowPrimaryInfo(true)}
            size="sm"
            variant="outline"
            className="border-blue-600 text-blue-600 hover:bg-blue-50"
            title="Informações Primárias"
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
        </div>
        </div>
        </div>
        </>
        );
        }