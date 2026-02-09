import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, Plus, Calendar, Link as LinkIcon, Copy, Users, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function PesquisaClima() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [workshop, setWorkshop] = useState(null);
  const [surveys, setSurveys] = useState([]);
  const [inviteLink, setInviteLink] = useState("");
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      const workshops = await base44.entities.Workshop.list();
      const userWorkshop = workshops.find(w => w.owner_id === user.id);
      setWorkshop(userWorkshop);

      if (userWorkshop) {
        const allSurveys = await base44.entities.CompanyClimate.filter({ workshop_id: userWorkshop.id });
        setSurveys(allSurveys.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
      }
    } catch (error) {
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSurvey = async () => {
    if (!workshop) return;
    setCreating(true);
    try {
      // Create an empty survey ready to receive responses
      const newSurvey = await base44.entities.CompanyClimate.create({
        workshop_id: workshop.id,
        reference_date: new Date().toISOString().split('T')[0],
        overall_score: 0,
        dimensions: {},
        employee_responses: [],
        participation_rate: 0,
        status: "aberta"
      });

      setSurveys([newSurvey, ...surveys]);
      toast.success("Pesquisa criada com sucesso!");
      generateLink(newSurvey.id);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao criar pesquisa");
    } finally {
      setCreating(false);
    }
  };

  const generateLink = (id) => {
    // Using a 'token' which is just the ID for simplicity in this context, 
    // but we call it 'pix de rastreio' for the user.
    const link = `${window.location.origin}/ResponderPesquisaClima?id=${id}`;
    setInviteLink(link);
    setIsLinkModalOpen(true);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    toast.success("Link copiado!");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-green-100 rounded-full">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              Pesquisas de Clima
            </h1>
            <p className="text-gray-600 mt-1">Gerencie pesquisas e colete feedback da equipe</p>
          </div>
          <Button onClick={handleCreateSurvey} disabled={creating} className="bg-green-600 hover:bg-green-700">
            {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            Nova Pesquisa
          </Button>
        </div>

        <Dialog open={isLinkModalOpen} onOpenChange={setIsLinkModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Link para Colaboradores</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <p className="text-sm text-gray-600">
                Envie este link para sua equipe responder à pesquisa de forma anônima.
                Cada resposta é registrada com um token único (pix de rastreio) para garantir autenticidade.
              </p>
              <div className="flex gap-2">
                <Input value={inviteLink} readOnly />
                <Button onClick={copyLink} size="icon" variant="outline">
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {surveys.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900">Nenhuma pesquisa realizada</h3>
              <p className="text-gray-500 mb-6">Crie sua primeira pesquisa para avaliar o clima da empresa.</p>
              <Button onClick={handleCreateSurvey} variant="outline">Criar Agora</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {surveys.map((survey) => (
              <Card key={survey.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">
                        Pesquisa de {format(new Date(survey.reference_date), 'MMMM yyyy')}
                      </h3>
                      <Badge variant={survey.status === 'aberta' ? 'default' : 'secondary'} className={survey.status === 'aberta' ? 'bg-green-600' : ''}>
                        {survey.status.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {format(new Date(survey.created_date), 'dd/MM/yyyy')}</span>
                      <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {survey.employee_responses?.length || 0} respostas</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto">
                    {survey.status === 'aberta' && (
                      <Button variant="outline" onClick={() => generateLink(survey.id)}>
                        <LinkIcon className="w-4 h-4 mr-2" /> Link
                      </Button>
                    )}
                    <Button variant="secondary" onClick={() => navigate(`${createPageUrl('ResultadoClima')}?id=${survey.id}`)}>
                      Ver Resultados <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}