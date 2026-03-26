import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  CreditCard, Calendar, TrendingUp, Download, 
  CheckCircle2, XCircle, Loader2, ArrowUpCircle, History, AlertCircle
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
    queryKey: ['platform-plans'],
    queryFn: () => base44.entities.PlatformPlan.list()
  });

  const { data: tenantUsages = [], isLoading: isUsagesLoading } = useQuery({
    queryKey: ['tenant-usage', workshop?.id],
    queryFn: () => base44.entities.TenantUsage.filter({ tenant_id: workshop?.id }),
    enabled: !!workshop
  });

  const { data: paymentHistory = [], isLoading: loadingHistory } = useQuery({
    queryKey: ['payment-history', workshop?.id],
    queryFn: () => base44.entities.PaymentHistory.filter({ 
      workshop_id: workshop.id 
    }, '-payment_date'),
    enabled: !!workshop
  });

  const currentPlan = plans.find(p => p.internal_id?.toLowerCase() === (workshop?.planId?.toLowerCase() || 'free')) || {
    name: workshop?.planId || 'Free',
    limits: null,
    price: 0
  };

  const meuPlanoTips = [
    "Monitore o uso dos seus recursos para evitar atingir os limites do plano",
    "Faça upgrade quando necessário para desbloquear recursos avançados",
    "O histórico de pagamentos pode ser usado para comprovação fiscal",
    "Entre em contato com o suporte se tiver problemas com pagamentos"
  ];

  const getUsagePercentage = (used, limit) => {
    if (!limit || limit === Infinity || limit === -1) return 0;
    return Math.min((used / limit) * 100, 100);
  };

  const formatLimit = (limit) => {
    if (limit === null || limit === undefined || limit === Infinity || limit === -1) return '∞';
    return limit;
  };

  const getResourceUsage = (resourceName) => {
    const usage = tenantUsages.find(u => u.resource === resourceName);
    return usage ? usage.count : 0;
  };

  const PLAN_LIMITS_FALLBACK = {
    free: { clientes: 10, usuarios: 1, reports: 5, integrations: 1, whatsappMessages: 100 },
    pro: { clientes: 100, usuarios: 5, reports: 50, integrations: 5, whatsappMessages: 1000 },
    elite: { clientes: Infinity, usuarios: Infinity, reports: Infinity, integrations: Infinity, whatsappMessages: Infinity },
    start: { clientes: 100, usuarios: 5, reports: 20, integrations: 2, whatsappMessages: 500 },
    bronze: { clientes: Infinity, usuarios: 10, reports: 50, integrations: 5, whatsappMessages: 2000 },
    prata: { clientes: Infinity, usuarios: 20, reports: 100, integrations: 10, whatsappMessages: 5000 },
    gold: { clientes: Infinity, usuarios: 50, reports: Infinity, integrations: Infinity, whatsappMessages: 10000 },
    iom: { clientes: Infinity, usuarios: Infinity, reports: Infinity, integrations: Infinity, whatsappMessages: Infinity },
    millions: { clientes: Infinity, usuarios: Infinity, reports: Infinity, integrations: Infinity, whatsappMessages: Infinity },
  };

  const getLimit = (resourceName) => {
    if (currentPlan.limits && currentPlan.limits[resourceName] !== undefined) {
      return currentPlan.limits[resourceName];
    }
    const fallbackId = (workshop?.planId || 'free').toLowerCase();
    const fallbackLimits = PLAN_LIMITS_FALLBACK[fallbackId] || PLAN_LIMITS_FALLBACK['free'];
    return fallbackLimits[resourceName] !== undefined ? fallbackLimits[resourceName] : Infinity;
  };

  const translateStatus = (status) => {
    if (status === 'active') return 'Ativo';
    if (status === 'trial') return 'Em Teste (Trial)';
    if (status === 'canceled') return 'Cancelado';
    if (!status) return 'Inativo';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getStatusColorBadge = (status) => {
    if (status === 'active') return 'bg-green-600 text-white';
    if (status === 'trial') return 'bg-blue-600 text-white';
    return 'bg-red-600 text-white';
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
  const isLoading = isUserLoading || isWorkshopsLoading || isPlansLoading || isUsagesLoading;

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

  const isInactive = workshop.planStatus !== 'active' && workshop.planStatus !== 'trial';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4">
      <DynamicHelpSystem pageName="MeuPlano" />
      
      <div className="max-w-6xl mx-auto">
        <QuickTipsBar tips={meuPlanoTips} pageName="meu-plano" />

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Meu Plano</h1>
          <p className="text-gray-600">Gerencie sua assinatura e acompanhe o uso de recursos</p>
        </div>

        {isInactive && (
          <div className="mb-8 bg-red-50 border border-red-200 rounded-xl p-6 shadow-sm flex items-start gap-4">
            <AlertCircle className="w-8 h-8 text-red-600 flex-shrink-0" />
            <div>
              <h2 className="text-lg font-bold text-red-800 mb-1">Acesso Suspenso - Plano Inativo</h2>
              <p className="text-red-700 mb-4">
                O plano da sua oficina está inativo, suspenso ou cancelado. As funcionalidades do sistema estão bloqueadas.
                Por favor, regularize sua assinatura via Kiwify para continuar acessando.
              </p>
              <Button 
                onClick={() => navigate(createPageUrl("Planos"))}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Ver Planos e Assinar
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div></div> 
          <Button 
            onClick={() => navigate(createPageUrl("Planos"))}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 font-bold shadow-md"
          >
            <ArrowUpCircle className="w-5 h-5 mr-2" />
            Fazer Upgrade / Mudar Plano
          </Button>
        </div>

        {/* Plano Atual */}
        <Card className={`mb-6 shadow-lg border-2 ${isInactive ? 'border-red-500' : 'border-blue-500'}`}>
          <CardHeader className={`rounded-t-lg ${isInactive ? 'bg-gradient-to-r from-red-600 to-red-700' : 'bg-gradient-to-r from-blue-600 to-blue-700'} text-white`}>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl mb-2 flex items-center gap-3">
                  Plano: <span className="uppercase">{currentPlan.name}</span>
                  <Badge className={`ml-2 ${getStatusColorBadge(workshop.planStatus)} border-0 text-sm py-1`}>
                    {translateStatus(workshop.planStatus)}
                  </Badge>
                </CardTitle>
                <p className="text-blue-100 opacity-90">
                  Gerenciado via integração Kiwify
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
              {workshop.billingCycleStart && (
                <div className="flex items-center gap-3">
                  <Calendar className={`w-5 h-5 ${isInactive ? 'text-red-600' : 'text-blue-600'}`} />
                  <div>
                    <div className="text-sm text-gray-600">Início do Ciclo</div>
                    <div className="font-medium">
                      {format(new Date(workshop.billingCycleStart), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </div>
                  </div>
                </div>
              )}
              {workshop.billingCycleEnd && (
                <div className="flex items-center gap-3">
                  <Calendar className={`w-5 h-5 ${isInactive ? 'text-red-600' : 'text-blue-600'}`} />
                  <div>
                    <div className="text-sm text-gray-600">Fim do Ciclo / Próxima Renovação</div>
                    <div className="font-medium">
                      {format(new Date(workshop.billingCycleEnd), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </div>
                  </div>
                </div>
              )}
            </div>
            {workshop.trialEndsAt && workshop.planStatus === 'trial' && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100 flex items-center gap-2 text-blue-800">
                <AlertCircle className="w-5 h-5" />
                <span>
                  Seu período de teste (trial) expira em <strong>{format(new Date(workshop.trialEndsAt), "dd/MM/yyyy", { locale: ptBR })}</strong>.
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Uso dos Limites */}
        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Uso de Recursos (Consolidado)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Clientes</span>
                <span className="text-sm text-gray-600">
                  {getResourceUsage('clientes')} / {formatLimit(getLimit('clientes'))}
                </span>
              </div>
              <Progress 
                value={getUsagePercentage(getResourceUsage('clientes'), getLimit('clientes'))} 
                className="h-2"
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Usuários / Colaboradores</span>
                <span className="text-sm text-gray-600">
                  {getResourceUsage('usuarios')} / {formatLimit(getLimit('usuarios'))}
                </span>
              </div>
              <Progress 
                value={getUsagePercentage(getResourceUsage('usuarios'), getLimit('usuarios'))} 
                className="h-2"
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Mensagens WhatsApp</span>
                <span className="text-sm text-gray-600">
                  {getResourceUsage('whatsappMessages')} / {formatLimit(getLimit('whatsappMessages'))}
                </span>
              </div>
              <Progress 
                value={getUsagePercentage(getResourceUsage('whatsappMessages'), getLimit('whatsappMessages'))} 
                className="h-2"
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Relatórios</span>
                <span className="text-sm text-gray-600">
                  {getResourceUsage('reports')} / {formatLimit(getLimit('reports'))}
                </span>
              </div>
              <Progress 
                value={getUsagePercentage(getResourceUsage('reports'), getLimit('reports'))} 
                className="h-2"
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Integrações Ativas</span>
                <span className="text-sm text-gray-600">
                  {getResourceUsage('integrations')} / {formatLimit(getLimit('integrations'))}
                </span>
              </div>
              <Progress 
                value={getUsagePercentage(getResourceUsage('integrations'), getLimit('integrations'))} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Features Booleanas do Plano */}
        {currentPlan.features && Object.keys(currentPlan.features).length > 0 && (
          <Card className="mb-6 shadow-lg">
            <CardHeader>
              <CardTitle>Recursos Habilitados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(currentPlan.features).map(([featureName, isEnabled]) => (
                  isEnabled && (
                    <div key={featureName} className="flex items-center gap-2 text-sm capitalize">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      {featureName.replace(/_/g, ' ')}
                    </div>
                  )
                ))}
              </div>
            </CardContent>
          </Card>
        )}



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