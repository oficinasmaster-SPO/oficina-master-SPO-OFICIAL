import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  CreditCard, Calendar, TrendingUp, Download, 
  CheckCircle2, XCircle, Loader2, ArrowUpCircle, History
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import DynamicHelpSystem from "@/components/help/DynamicHelpSystem";
import QuickTipsBar from "@/components/help/QuickTipsBar";

export default function MeuPlano() {
  const navigate = useNavigate();
  const [loadingUpgrade, setLoadingUpgrade] = useState(false);

  const { data: user, isLoading: isUserLoading } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: workshops = [], isLoading: isWorkshopsLoading } = useQuery({
    queryKey: ['workshops', user?.id],
    queryFn: () => base44.entities.Workshop.filter({ owner_id: user.id }),
    enabled: !!user
  });

  const workshop = workshops[0];

  const { data: plans = [], isLoading: isPlansLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: () => base44.entities.Plan.list('ordem')
  });

  const { data: paymentHistory = [], isLoading: loadingHistory } = useQuery({
    queryKey: ['payment-history', workshop?.id],
    queryFn: () => base44.entities.PaymentHistory.filter({ 
      workshop_id: workshop.id 
    }, '-payment_date'),
    enabled: !!workshop
  });

  const currentPlan = plans.find(p => p.nome === (workshop?.planoAtual || 'FREE'));

  const meuPlanoTips = [
    "Monitore o uso dos seus recursos para evitar atingir os limites do plano",
    "Faça upgrade quando necessário para desbloquear recursos avançados",
    "O histórico de pagamentos pode ser usado para comprovação fiscal",
    "Entre em contato com o suporte se tiver problemas com pagamentos"
  ];

  const getUsagePercentage = (used, limit) => {
    if (limit === -1) return 0; // ilimitado
    return Math.min((used / limit) * 100, 100);
  };

  const getStatusColor = (status) => {
    const colors = {
      approved: "bg-green-100 text-green-700",
      pending: "bg-yellow-100 text-yellow-700",
      failed: "bg-red-100 text-red-700",
      refunded: "bg-gray-100 text-gray-700",
      cancelled: "bg-gray-100 text-gray-700"
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  const getStatusLabel = (status) => {
    const labels = {
      approved: "Aprovado",
      pending: "Pendente",
      failed: "Falhou",
      refunded: "Reembolsado",
      cancelled: "Cancelado"
    };
    return labels[status] || status;
  };

  // Determine overall loading state for initial data
  const isLoading = isUserLoading || isWorkshopsLoading || isPlansLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // ❌ Bloquear acesso se não tem workshop
  if (!workshop) {
    navigate(createPageUrl("Cadastro"), { replace: true });
    return null;
  }

  // ❌ Bloquear acesso se não tem plano válido
  if (!currentPlan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Plano não encontrado</h2>
          <p className="text-gray-600 mb-6">Não conseguimos carregar as informações do seu plano.</p>
          <button
            onClick={() => navigate(createPageUrl("Home"))}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  const limites = currentPlan.limites;
  const utilizados = workshop.limitesUtilizados || { diagnosticosMes: 0, colaboradores: 0, filiais: 0 };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4">
      <DynamicHelpSystem pageName="MeuPlano" />
      
      <div className="max-w-6xl mx-auto">
        <QuickTipsBar tips={meuPlanoTips} pageName="meu-plano" />

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Meu Plano</h1>
          <p className="text-gray-600">Gerencie sua assinatura e acompanhe o uso de recursos</p>
        </div>

        <div className="flex items-center justify-between mb-8">
          {/* This div was holding the h1 and p tags before, now moved outside this container */}
          <div></div> 
          <Button 
            onClick={() => navigate(createPageUrl("Planos"))}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <ArrowUpCircle className="w-4 h-4 mr-2" />
            Fazer Upgrade
          </Button>
        </div>

        {/* Plano Atual */}
        <Card className="mb-6 shadow-lg border-2 border-blue-500">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl mb-2">Plano {currentPlan.nome}</CardTitle>
                <p className="text-blue-100">{currentPlan.descricao}</p>
              </div>
              {currentPlan.preco && (
                <div className="text-right">
                  <div className="text-3xl font-bold">R$ {currentPlan.preco.toFixed(2)}</div>
                  <div className="text-blue-100">por mês</div>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {workshop.dataAssinatura && (
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <div>
                    <div className="text-sm text-gray-600">Data de Assinatura</div>
                    <div className="font-medium">
                      {format(new Date(workshop.dataAssinatura), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </div>
                  </div>
                </div>
              )}
              {workshop.dataRenovacao && (
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <div>
                    <div className="text-sm text-gray-600">Próxima Renovação</div>
                    <div className="font-medium">
                      {format(new Date(workshop.dataRenovacao), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Uso dos Limites */}
        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Uso dos Recursos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Diagnósticos este mês</span>
                <span className="text-sm text-gray-600">
                  {utilizados.diagnosticosMes} / {limites.diagnosticosMes === -1 ? '∞' : limites.diagnosticosMes}
                </span>
              </div>
              <Progress 
                value={getUsagePercentage(utilizados.diagnosticosMes, limites.diagnosticosMes)} 
                className="h-2"
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Colaboradores cadastrados</span>
                <span className="text-sm text-gray-600">
                  {utilizados.colaboradores} / {limites.colaboradores === -1 ? '∞' : limites.colaboradores}
                </span>
              </div>
              <Progress 
                value={getUsagePercentage(utilizados.colaboradores, limites.colaboradores)} 
                className="h-2"
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Filiais</span>
                <span className="text-sm text-gray-600">
                  {utilizados.filiais} / {limites.filiais === -1 ? '∞' : limites.filiais}
                </span>
              </div>
              <Progress 
                value={getUsagePercentage(utilizados.filiais, limites.filiais)} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Recursos Disponíveis */}
        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <CardTitle>Recursos Disponíveis no Seu Plano</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {limites.exportarPDF && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Exportar PDF
                </div>
              )}
              {limites.rhCompleto && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  RH Completo
                </div>
              )}
              {limites.cdc && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  CDC
                </div>
              )}
              {limites.coex && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  COEX
                </div>
              )}
              {limites.iaBasica && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  IA Básica
                </div>
              )}
              {limites.iaIntermediaria && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  IA Intermediária
                </div>
              )}
              {limites.iaPreditiva && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  IA Preditiva
                </div>
              )}
              {limites.iaCoach && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  IA Coach
                </div>
              )}
              {limites.multilojas && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Multilojas
                </div>
              )}
              {limites.treinamentosPremium && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Treinamentos Premium
                </div>
              )}
              {limites.rankingNacional && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Ranking Nacional
                </div>
              )}
              {limites.gamificacao && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Gamificação
                </div>
              )}
            </div>
          </CardContent>
        </Card>



        {/* Histórico de Pagamentos */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-blue-600" />
              Histórico de Pagamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : paymentHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Nenhum pagamento registrado ainda
              </div>
            ) : (
              <div className="space-y-3">
                {paymentHistory.map((payment) => (
                  <div 
                    key={payment.id} 
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <CreditCard className="w-5 h-5 text-gray-400" />
                      <div>
                        <div className="font-medium">Plano {payment.plan_name}</div>
                        <div className="text-sm text-gray-600">
                          {format(new Date(payment.payment_date), "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-bold text-lg">R$ {payment.amount.toFixed(2)}</div>
                        <div className="text-xs text-gray-500 capitalize">{payment.payment_method}</div>
                      </div>
                      <Badge className={getStatusColor(payment.payment_status)}>
                        {getStatusLabel(payment.payment_status)}
                      </Badge>
                      {payment.invoice_url && (
                        <Button variant="ghost" size="sm" onClick={() => window.open(payment.invoice_url, '_blank')}>
                          <Download className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}