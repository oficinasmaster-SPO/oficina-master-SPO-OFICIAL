import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, TrendingUp, Filter, Search, Smartphone } from "lucide-react";
import { toast } from "sonner";
import CandidateFormDialog from "@/components/cespe/CandidateFormDialog";
import CandidateCard from "@/components/cespe/CandidateCard";
import ChannelStats from "@/components/cespe/ChannelStats";
import WebhookSetupGuide from "@/components/cespe/WebhookSetupGuide";

export default function CESPECanal() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterChannel, setFilterChannel] = useState("all");
  const [showWebhookGuide, setShowWebhookGuide] = useState(false);

  React.useEffect(() => {
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

  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ['candidates', workshop?.id],
    queryFn: async () => {
      if (!workshop?.id) return [];
      const result = await base44.entities.Candidate.filter({ workshop_id: workshop.id }, '-created_date');
      return Array.isArray(result) ? result : [];
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

  const filteredCandidates = candidates.filter(c => {
    const matchesSearch = c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         c.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
    const matchesChannel = filterChannel === 'all' || c.origin_channel === filterChannel;
    return matchesSearch && matchesStatus && matchesChannel;
  });

  if (!workshop) {
    return <div className="p-6">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🅲 CANAL - Aquisição de Talentos</h1>
            <p className="text-gray-600">Centralize e gerencie leads de candidatos</p>
          </div>
          <div className="flex gap-2">
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
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border rounded-md"
              >
                <option value="all">Todos os Status</option>
                <option value="novo_lead">Novo Lead</option>
                <option value="em_entrevista">Em Entrevista</option>
                <option value="aprovado">Aprovado</option>
                <option value="contratado">Contratado</option>
              </select>
              <select
                value={filterChannel}
                onChange={(e) => setFilterChannel(e.target.value)}
                className="px-4 py-2 border rounded-md"
              >
                <option value="all">Todos os Canais</option>
                <option value="google_ads">Google Ads</option>
                <option value="facebook_ads">Facebook Ads</option>
                <option value="indicacao_interna">Indicação Interna</option>
                <option value="cadastro_manual">Cadastro Manual</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Candidatos */}
        <div className="space-y-3">
          {isLoading ? (
            <div>Carregando candidatos...</div>
          ) : filteredCandidates.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Nenhum candidato encontrado
            </div>
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
      </div>
    </div>
  );
}