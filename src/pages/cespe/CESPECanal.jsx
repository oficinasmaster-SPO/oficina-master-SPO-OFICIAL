import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, TrendingUp, Filter, Search, Smartphone, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import CandidateFormDialog from "@/components/cespe/CandidateFormDialog";
import CandidateCard from "@/components/cespe/CandidateCard";
import ChannelStats from "@/components/cespe/ChannelStats";
import WebhookSetupGuide from "@/components/cespe/WebhookSetupGuide";
import DreamScriptModal from "@/components/cespe/DreamScriptModal";
import InterviewFormsManager from "@/components/cespe/InterviewFormsManager";
import ProposalTemplatesManager from "@/components/cespe/ProposalTemplatesManager";
import HiringGoalsManager from "@/components/cespe/HiringGoalsManager";
import { CESPE_CARGOS, CESPE_STATUS_CANDIDATO, CESPE_CANAIS_ORIGEM } from "@/components/cespe/constants";

export default function CESPECanal() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterChannel, setFilterChannel] = useState("all");
  const [filterCargo, setFilterCargo] = useState("all");
  const [showWebhookGuide, setShowWebhookGuide] = useState(false);
  const [showDreamScript, setShowDreamScript] = useState(false);
  const [showQuestionForms, setShowQuestionForms] = useState(false);
  const [showProposalTemplates, setShowProposalTemplates] = useState(false);
  const [showHiringGoals, setShowHiringGoals] = useState(false);

  React.useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        const workshops = await base44.entities.Workshop.filter({ owner_id: currentUser.id });
        if (workshops && workshops.length > 0) {
          const userWorkshop = workshops[0];
          setWorkshop(userWorkshop);
          console.log('🏭 Workshop carregado:', userWorkshop.id, userWorkshop.name);
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      }
    };
    loadData();
  }, []);

  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ['candidates', workshop?.id],
    queryFn: async () => {
      if (!workshop?.id) return [];
      const result = await base44.entities.Candidate.filter({ workshop_id: workshop.id }, '-created_date');
      return Array.isArray(result) ? result : [];
    },
    enabled: !!workshop?.id
  });

  const { data: cultureScript } = useQuery({
    queryKey: ['culture-script', workshop?.id],
    queryFn: async () => {
      if (!workshop?.id) return null;
      const scripts = await base44.entities.CultureScript.filter({
        workshop_id: workshop.id,
        is_active: true
      });
      return Array.isArray(scripts) && scripts.length > 0 ? scripts[0] : null;
    },
    enabled: !!workshop?.id
  });

  const createCandidateMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.Candidate.create({
        ...data,
        workshop_id: workshop.id,
        status: 'novo_lead',
        timeline: [{
          timestamp: new Date().toISOString(),
          action: 'Lead cadastrado',
          user_id: user.id,
          details: `Via ${data.origin_channel}`
        }]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      setShowForm(false);
      toast.success("Candidato cadastrado com sucesso!");
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao cadastrar candidato");
    }
  });

  const saveCultureScriptMutation = useMutation({
    mutationFn: async (data) => {
      if (cultureScript?.id) {
        return await base44.entities.CultureScript.update(cultureScript.id, data);
      } else {
        return await base44.entities.CultureScript.create({
          ...data,
          workshop_id: workshop.id,
          is_active: true
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['culture-script'] });
    }
  });

  const filteredCandidates = candidates.filter(c => {
    const matchesSearch = c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         c.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
    const matchesChannel = filterChannel === 'all' || c.origin_channel === filterChannel;
    const matchesCargo = filterCargo === 'all' || c.desired_position === filterCargo;
    return matchesSearch && matchesStatus && matchesChannel && matchesCargo;
  });

  if (!workshop) {
    return <div className="p-6">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <div className="bg-black text-white w-12 h-12 rounded flex items-center justify-center text-2xl font-bold">
              C
            </div>
            <h1 className="text-3xl font-bold text-gray-900">CANAL - Aquisição de Talentos</h1>
          </div>
          <p className="text-gray-600 text-lg">Centralize e gerencie leads de candidatos</p>

          <div className="flex gap-2 justify-center flex-wrap">
            <Button onClick={() => setShowQuestionForms(true)} variant="outline">
              <ClipboardList className="w-4 h-4 mr-2" />
              PPE
            </Button>
            <Button onClick={() => setShowDreamScript(true)} variant="outline">
              <TrendingUp className="w-4 h-4 mr-2" />
              Script de Sonho
            </Button>
            <Button onClick={() => setShowProposalTemplates(true)} variant="outline" className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200">
              <ClipboardList className="w-4 h-4 mr-2" />
              Propostas
            </Button>
            <Button onClick={() => setShowHiringGoals(true)} variant="outline" className="bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200">
              <TrendingUp className="w-4 h-4 mr-2" />
              Metas
            </Button>
            <Button onClick={() => setShowWebhookGuide(true)} variant="outline">
              <Smartphone className="w-4 h-4 mr-2" />
              Captura WhatsApp
            </Button>
            <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Novo Lead
            </Button>
          </div>
        </div>

        {/* Stats */}
        <ChannelStats candidates={candidates} />

        {/* Filtros */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar por nome ou email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <select
                value={filterCargo}
                onChange={(e) => setFilterCargo(e.target.value)}
                className="px-4 py-2 border rounded-md"
              >
                <option value="all">Todos os Cargos</option>
                {CESPE_CARGOS.map(cargo => (
                  <option key={cargo} value={cargo}>{cargo}</option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border rounded-md"
              >
                <option value="all">Todos os Status</option>
                {CESPE_STATUS_CANDIDATO.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <select
                value={filterChannel}
                onChange={(e) => setFilterChannel(e.target.value)}
                className="px-4 py-2 border rounded-md"
              >
                <option value="all">Todos os Canais</option>
                {CESPE_CANAIS_ORIGEM.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Candidatos */}
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          {/* Header da Tabela */}
          <div className="flex items-center gap-4 px-4 py-3 bg-gray-100 border-b border-gray-300 font-semibold text-sm text-gray-700">
            <div className="w-[180px]">Nome</div>
            <div className="w-[140px]">Cargo</div>
            <div className="w-[180px]">Contato</div>
            <div className="w-[80px]">Score</div>
            <div className="w-[150px]">Entrevistador</div>
            <div className="ml-auto">Ações</div>
          </div>
          
          {/* Linhas */}
          {isLoading ? (
            <div className="p-6 text-center text-gray-500">Carregando candidatos...</div>
          ) : filteredCandidates.length === 0 ? (
            <div className="p-6 text-center text-gray-500">Nenhum candidato encontrado</div>
          ) : (
            filteredCandidates.map(candidate => (
              <CandidateCard key={candidate.id} candidate={candidate} />
            ))
          )}
        </div>

        {/* Dialogs */}
        {showForm && (
          <CandidateFormDialog
            open={showForm}
            onClose={() => setShowForm(false)}
            onSubmit={(data) => createCandidateMutation.mutate(data)}
            isLoading={createCandidateMutation.isPending}
          />
        )}

        <WebhookSetupGuide
          open={showWebhookGuide}
          onClose={() => setShowWebhookGuide(false)}
          workshopId={workshop?.id}
        />

        <DreamScriptModal
          open={showDreamScript}
          onClose={() => setShowDreamScript(false)}
          workshop={workshop}
          script={cultureScript}
          onSave={(data) => saveCultureScriptMutation.mutate(data)}
        />

        <InterviewFormsManager
          open={showQuestionForms}
          onClose={() => setShowQuestionForms(false)}
          workshopId={workshop?.id}
        />

        <ProposalTemplatesManager
          open={showProposalTemplates}
          onClose={() => setShowProposalTemplates(false)}
          workshopId={workshop?.id}
        />

        <HiringGoalsManager
          open={showHiringGoals}
          onClose={() => setShowHiringGoals(false)}
          workshopId={workshop?.id}
        />
        </div>
        </div>
        );
        }
