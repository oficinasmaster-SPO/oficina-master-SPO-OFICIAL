import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Send, FileText, ClipboardList, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ProposalForm from "@/components/cespe/ProposalForm";
import ProposalPreview from "@/components/cespe/ProposalPreview";
import ProposalTemplatesManager from "@/components/cespe/ProposalTemplatesManager";
import ProposalPDFGenerator from "@/components/cespe/ProposalPDFGenerator";

export default function CESPEProposta() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const candidateId = urlParams.get('candidate_id');

  const [user, setUser] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        const workshops = await base44.entities.Workshop.filter({ owner_id: currentUser.id });
        if (workshops && workshops.length > 0) {
          setWorkshop(workshops[0]);
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      }
    };
    loadData();
  }, []);

  const { data: candidate } = useQuery({
    queryKey: ['candidate', candidateId],
    queryFn: () => base44.entities.Candidate.get(candidateId),
    enabled: !!candidateId
  });

  const { data: proposal } = useQuery({
    queryKey: ['proposal', candidateId],
    queryFn: async () => {
      const proposals = await base44.entities.JobProposal.filter({ candidate_id: candidateId });
      return proposals && proposals.length > 0 ? proposals[0] : null;
    },
    enabled: !!candidateId
  });

  const saveProposalMutation = useMutation({
    mutationFn: async (data) => {
      if (proposal) {
        return await base44.entities.JobProposal.update(proposal.id, data);
      } else {
        return await base44.entities.JobProposal.create({
          ...data,
          candidate_id: candidateId,
          workshop_id: workshop.id
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal'] });
      toast.success("Proposta salva com sucesso!");
      setShowTemplates(false);
    }
  });

  const handleSelectTemplate = (template) => {
    const { id, created_date, updated_date, created_by, workshop_id, template_name, is_active, ...templateData } = template;
    saveProposalMutation.mutate(templateData);
  };

  const sendProposalMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.JobProposal.update(proposal.id, {
        status: 'enviada',
        sent_date: new Date().toISOString()
      });
      
      await base44.entities.Candidate.update(candidateId, {
        proposal_status: 'enviada'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal', 'candidate'] });
      toast.success("Proposta enviada ao candidato!");
    }
  });

  if (!candidate || !workshop) {
    return <div className="p-6">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🅿️ PROPOSTA - Inteligente e Estratégica</h1>
            <p className="text-gray-600">Candidato: {candidate.full_name}</p>
          </div>
          <div className="flex gap-2">
            {!proposal && (
              <Button variant="outline" onClick={() => setShowTemplates(true)} className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200">
                <ClipboardList className="w-4 h-4 mr-2" />
                Usar Template
              </Button>
            )}
            {proposal && (
              <Button 
                variant="outline" 
                onClick={() => ProposalPDFGenerator.generate(proposal, candidate, workshop)}
                className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
              >
                <Download className="w-4 h-4 mr-2" />
                Baixar PDF
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowPreview(!showPreview)}>
              <FileText className="w-4 h-4 mr-2" />
              {showPreview ? 'Editar' : 'Preview'}
            </Button>
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </div>
        </div>

        {showPreview ? (
          <ProposalPreview
            proposal={proposal}
            candidate={candidate}
            workshop={workshop}
            onSend={() => sendProposalMutation.mutate()}
            isLoading={sendProposalMutation.isPending}
          />
        ) : (
          <ProposalForm
            proposal={proposal}
            candidate={candidate}
            workshop={workshop}
            onSave={(data) => saveProposalMutation.mutate(data)}
            isLoading={saveProposalMutation.isPending}
          />
        )}

        <ProposalTemplatesManager
          open={showTemplates}
          onClose={() => setShowTemplates(false)}
          workshopId={workshop?.id}
          onSelectTemplate={handleSelectTemplate}
        />
      </div>
    </div>
  );
}