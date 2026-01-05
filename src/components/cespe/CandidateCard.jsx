import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Phone, Briefcase, ArrowRight } from "lucide-react";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";

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

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="pt-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-bold text-lg">{candidate.full_name}</h3>
            <Badge className={statusColors[candidate.status]}>
              {statusLabels[candidate.status]}
            </Badge>
          </div>
          {candidate.lead_score && (
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">{candidate.lead_score}</div>
              <div className="text-xs text-gray-500">Score</div>
            </div>
          )}
        </div>
        <div className="space-y-2 text-sm text-gray-600 mb-4">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            {candidate.desired_position}
          </div>
          {candidate.email && (
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              {candidate.email}
            </div>
          )}
          {candidate.phone && (
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              {candidate.phone}
            </div>
          )}
        </div>
        <Button 
          className="w-full" 
          size="sm"
          onClick={() => navigate(createPageUrl("CESPEEntrevista") + `?candidate_id=${candidate.id}`)}
        >
          Ver Detalhes <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}