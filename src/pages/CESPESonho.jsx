import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Save, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ScriptEditor from "@/components/cespe/ScriptEditor";
import ScriptPreview from "@/components/cespe/ScriptPreview";

export default function CESPESonho() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const candidateId = urlParams.get('candidate_id');

  const [user, setUser] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [candidateReaction, setCandidateReaction] = useState("");

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

  const { data: script } = useQuery({
    queryKey: ['culture-script', workshop?.id, candidate?.desired_position],
    queryFn: async () => {
      if (!workshop?.id) return null;
      const scripts = await base44.entities.CultureScript.filter({
        workshop_id: workshop.id,
        is_active: true
      });
      
      const positionScript = scripts.find(s => s.position === candidate?.desired_position);
      const generalScript = scripts.find(s => !s.position);
      
      return positionScript || generalScript;
    },
    enabled: !!workshop?.id && !!candidate
  });

  const saveReactionMutation = useMutation({
    mutationFn: async (reaction) => {
      await base44.entities.Candidate.update(candidateId, {
        script_reaction: reaction
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate'] });
      toast.success("Reação registrada com sucesso!");
    }
  });

  if (!candidate || !workshop) {
    return <div className="p-6">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🆂 SONHO - Script de Cultura</h1>
            <p className="text-gray-600">Candidato: {candidate.full_name}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowPreview(!showPreview)}>
              <Eye className="w-4 h-4 mr-2" />
              {showPreview ? 'Editar' : 'Preview'}
            </Button>
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </div>
        </div>

        {showPreview ? (
          <ScriptPreview
            script={script}
            candidate={candidate}
            workshop={workshop}
            onReactionChange={setCandidateReaction}
            candidateReaction={candidateReaction}
            onSave={() => saveReactionMutation.mutate(candidateReaction)}
            isLoading={saveReactionMutation.isPending}
          />
        ) : (
          <ScriptEditor
            script={script}
            workshopId={workshop.id}
            position={candidate.desired_position}
          />
        )}
      </div>
    </div>
  );
}