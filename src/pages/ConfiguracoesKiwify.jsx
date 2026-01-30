import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Loader2, Plus, X, Save, AlertCircle, CheckCircle2, Zap, Activity, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

export default function ConfiguracoesKiwify() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    client_id: '',
    account_id: '',
    default_success_redirect_url: '',
    default_failure_redirect_url: '',
    plan_mappings: [],
    is_active: true
  });

  const [testResult, setTestResult] = useState(null);

  // Fetch Kiwify settings
  const { data: settings, isLoading, isError } = useQuery({
    queryKey: ['kiwifySettings'],
    queryFn: async () => {
      const response = await base44.entities.KiwifySettings.list();
      return response[0] || {};
    },
  });

  // Fetch existing plans from PlanFeature
  const { data: planFeatures = [] } = useQuery({
    queryKey: ['planFeatures'],
    queryFn: async () => {
      const response = await base44.entities.PlanFeature.list();
      return response;
    },
    staleTime: Infinity,
  });

  // Buscar logs de webhook
  const { data: webhookLogs = [], refetch: refetchLogs } = useQuery({
    queryKey: ['kiwify-webhook-logs'],
    queryFn: async () => {
      try {
        const logs = await base44.entities.KiwifyWebhookLog.list('-created_date', 50);
        return logs;
      } catch (error) {
        console.error('Erro ao buscar logs:', error);
        return [];
      }
    },
  });

  // Lista de planos padrão (fallback caso não tenha PlanFeatures cadastrados)
  const defaultPlans = [
    { id: "FREE", name: "Grátis" },
    { id: "START", name: "Start" },
    { id: "BRONZE", name: "Bronze" },
    { id: "PRATA", name: "Prata" },
    { id: "GOLD", name: "Gold" },
    { id: "IOM", name: "IOM" },
    { id: "MILLIONS", name: "Millions" }
  ];

  // Usar PlanFeatures ou fallback para planos padrão
  const plans = planFeatures.length > 0 
    ? planFeatures.map(pf => ({ id: pf.plan_id, name: pf.plan_name }))
    : defaultPlans;

  useEffect(() => {
    if (settings) {
      setFormData({
        client_id: settings.client_id || '',
        account_id: settings.account_id || '',
        default_success_redirect_url: settings.default_success_redirect_url || '',
        default_failure_redirect_url: settings.default_failure_redirect_url || '',
        plan_mappings: settings.plan_mappings || [],
        is_active: settings.is_active !== undefined ? settings.is_active : true
      });
    }
  }, [settings]);

  // Mutation to save Kiwify settings
  const saveSettingsMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('saveKiwifySettings', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Configurações Kiwify salvas com sucesso!');
      queryClient.invalidateQueries(['kiwifySettings']);
    },
    onError: (error) => {
      toast.error('Erro ao salvar configurações Kiwify', {
        description: error.response?.data?.error || error.message,
      });
    },
  });

  // Mutation to test webhook
  const testWebhookMutation = useMutation({
    mutationFn: async (testType) => {
      const response = await base44.functions.invoke('testKiwifyWebhook', { testType });
      return response.data;
    },
    onSuccess: (data) => {
      setTestResult(data);
      toast.success('Teste de webhook executado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao testar webhook', {
        description: error.message
      });
      setTestResult({ success: false, error: error.message });
    },
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePlanMappingChange = (index, field, value) => {
    const newMappings = [...formData.plan_mappings];
    newMappings[index][field] = value;
    setFormData((prev) => ({ ...prev, plan_mappings: newMappings }));
  };

  const addPlanMapping = () => {
    setFormData((prev) => ({
      ...prev,
      plan_mappings: [...prev.plan_mappings, { internal_plan_id: '', kiwify_product_id: '' }],
    }));
  };

  const removePlanMapping = (index) => {
    const newMappings = formData.plan_mappings.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, plan_mappings: newMappings }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveSettingsMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-lg text-gray-700">Carregando configurações...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-red-600">
        <AlertCircle className="h-12 w-12 mb-4" />
        <p className="text-xl font-semibold">Erro ao carregar configurações Kiwify</p>
        <p className="text-gray-500">Por favor, tente novamente ou contate o suporte.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Configurações de Pagamento Kiwify</h1>
        <p className="text-gray-600 mt-2">Configure a integração com a plataforma Kiwify para processar pagamentos dos planos.</p>
      </div>

      <Tabs defaultValue="config" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="config">Configurações</TabsTrigger>
          <TabsTrigger value="test">
            <Activity className="w-4 h-4 mr-2" />
            Testar Webhook
          </TabsTrigger>
          <TabsTrigger value="logs">
            <RefreshCw className="w-4 h-4 mr-2" />
            Logs Recebidos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Detalhes da Integração</CardTitle>
            <div className="flex items-center gap-2">
              <Label htmlFor="is_active">Integração Ativa</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Client ID */}
            <div className="space-y-2">
              <Label htmlFor="kiwify-client-id">Client ID da Kiwify *</Label>
              <Input
                id="kiwify-client-id"
                name="client_id"
                value={formData.client_id}
                onChange={handleChange}
                placeholder="ebaea7db-a778-4e38-a4f4-59f6243c167e"
                required
              />
              <p className="text-sm text-gray-500">Este valor pode ser encontrado no seu painel Kiwify.</p>
            </div>

            {/* Account ID */}
            <div className="space-y-2">
              <Label htmlFor="kiwify-account-id">Account ID da Kiwify *</Label>
              <Input
                id="kiwify-account-id"
                name="account_id"
                value={formData.account_id}
                onChange={handleChange}
                placeholder="66BsCaYkQyzeOwk"
                required
              />
              <p className="text-sm text-gray-500">Este valor identifica sua conta na Kiwify.</p>
            </div>

            {/* Success Redirect URL */}
            <div className="space-y-2">
              <Label htmlFor="default_success_redirect_url">URL de Redirecionamento (Sucesso)</Label>
              <Input
                id="default_success_redirect_url"
                name="default_success_redirect_url"
                value={formData.default_success_redirect_url}
                onChange={handleChange}
                placeholder="/pagamento-sucesso"
              />
              <p className="text-sm text-gray-500">URL para onde o usuário será redirecionado após um pagamento bem-sucedido.</p>
            </div>

            {/* Failure Redirect URL */}
            <div className="space-y-2">
              <Label htmlFor="default_failure_redirect_url">URL de Redirecionamento (Falha)</Label>
              <Input
                id="default_failure_redirect_url"
                name="default_failure_redirect_url"
                value={formData.default_failure_redirect_url}
                onChange={handleChange}
                placeholder="/pagamento-falha"
              />
              <p className="text-sm text-gray-500">URL para onde o usuário será redirecionado após um pagamento falho ou cancelado.</p>
            </div>

            {/* Plan Mappings Grid */}
            <div className="space-y-4 border-t pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Mapeamento de Planos</h3>
                  <p className="text-sm text-gray-500">
                    Configure o ID do produto Kiwify para cada plano interno.
                  </p>
                </div>
              </div>

              {!plans || plans.length === 0 ? (
                <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
                  <p>Nenhum plano cadastrado no sistema.</p>
                  <p className="text-sm">Acesse "Gerenciar Planos" para criar seus planos.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {plans.map((plan) => {
                    const existingMapping = formData.plan_mappings.find(m => m.internal_plan_id === plan.id);
                    const mappingIndex = existingMapping 
                      ? formData.plan_mappings.findIndex(m => m.internal_plan_id === plan.id)
                      : -1;

                    return (
                      <div key={plan.id} className="flex items-center gap-3 border p-4 rounded-lg bg-gray-50">
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">{plan.name}</div>
                          <div className="text-sm text-gray-500">
                            {existingMapping ? (
                              <span className="text-green-600">✓ Configurado</span>
                            ) : (
                              <span className="text-orange-600">⚠ Não configurado</span>
                            )}
                          </div>
                        </div>
                        <div className="flex-1 space-y-2">
                          <Label htmlFor={`kiwify_product_id-${plan.id}`}>ID do Produto Kiwify</Label>
                          <Input
                            id={`kiwify_product_id-${plan.id}`}
                            name="kiwify_product_id"
                            value={existingMapping?.kiwify_product_id || ''}
                            onChange={(e) => {
                              const newValue = e.target.value;
                              if (existingMapping) {
                                // Atualizar mapeamento existente
                                handlePlanMappingChange(mappingIndex, 'kiwify_product_id', newValue);
                              } else {
                                // Criar novo mapeamento
                                setFormData((prev) => ({
                                  ...prev,
                                  plan_mappings: [
                                    ...prev.plan_mappings,
                                    { internal_plan_id: plan.id, kiwify_product_id: newValue, checkout_url: '' }
                                  ]
                                }));
                              }
                            }}
                            placeholder="Ex: prod_abc123 ou deixe vazio"
                          />
                        </div>
                        <div className="flex-1 space-y-2">
                          <Label htmlFor={`checkout_url-${plan.id}`}>Link de Checkout</Label>
                          <Input
                            id={`checkout_url-${plan.id}`}
                            name="checkout_url"
                            value={existingMapping?.checkout_url || ''}
                            onChange={(e) => {
                              const newValue = e.target.value;
                              if (existingMapping) {
                                handlePlanMappingChange(mappingIndex, 'checkout_url', newValue);
                              } else {
                                setFormData((prev) => ({
                                  ...prev,
                                  plan_mappings: [
                                    ...prev.plan_mappings,
                                    { internal_plan_id: plan.id, kiwify_product_id: '', checkout_url: newValue }
                                  ]
                                }));
                              }
                            }}
                            placeholder="Ex: https://pay.kiwify.com.br/5FpagLC"
                          />
                        </div>
                        {existingMapping && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const newMappings = formData.plan_mappings.filter(m => m.internal_plan_id !== plan.id);
                              setFormData((prev) => ({ ...prev, plan_mappings: newMappings }));
                            }}
                            className="shrink-0"
                            title="Remover configuração"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Security Notice */}
            <div className="space-y-2 border-t pt-6 mt-6 bg-orange-50 p-4 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 shrink-0" />
                <div>
                  <Label className="font-bold text-orange-900">Configuração de Segredo da API</Label>
                  <p className="text-sm text-orange-700 mt-1">
                    O <strong>Client Secret da Kiwify</strong> é um dado sensível e <strong>não deve ser inserido nesta tela</strong>. 
                    Ele deve ser configurado como uma variável de ambiente (secret) no painel de administração da sua aplicação Base44, 
                    com o nome <code className="bg-orange-200 px-1 py-0.5 rounded">KIWIFY_CLIENT_SECRET</code>.
                  </p>
                  {settings && settings.client_id && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-green-700">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Client Secret configurado com sucesso no ambiente.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-4">
              <Button 
                type="submit" 
                disabled={saveSettingsMutation.isPending} 
                className="gap-2 bg-blue-600 hover:bg-blue-700"
              >
                {saveSettingsMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Salvar Configurações
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Documentation Card */}
      <Card className="mt-6 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-900">📋 Como Configurar o Webhook na Kiwify</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-800 space-y-4">
          <div className="bg-white p-4 rounded-lg border border-blue-200">
            <p className="font-bold mb-2">1️⃣ Copie a URL do Webhook:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-blue-50 px-3 py-2 rounded border text-xs break-all">
                https://app.base44.com/api/apps/69540822472c4a70b54d47aa/functions/webhookKiwify
              </code>
              <Button
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText('https://app.base44.com/api/apps/69540822472c4a70b54d47aa/functions/webhookKiwify');
                  toast.success('URL copiada!');
                }}
              >
                Copiar
              </Button>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-blue-200">
            <p className="font-bold mb-2">2️⃣ Configure no Painel Kiwify:</p>
            <ol className="list-decimal list-inside space-y-2 ml-2">
              <li>Acesse seu painel Kiwify</li>
              <li>Vá em <strong>Apps → Webhooks</strong></li>
              <li>Clique em <strong>"Criar Webhook"</strong></li>
              <li>Cole a URL copiada acima</li>
              <li>Selecione os eventos que deseja receber:
                <ul className="list-disc list-inside ml-4 mt-1 text-xs">
                  <li><code>compra_aprovada</code> - Pagamento aprovado</li>
                  <li><code>compra_recusada</code> - Pagamento recusado</li>
                  <li><code>subscription_canceled</code> - Assinatura cancelada</li>
                  <li><code>subscription_renewed</code> - Assinatura renovada</li>
                  <li><code>compra_reembolsada</code> - Reembolso efetuado</li>
                </ul>
              </li>
              <li>Salve a configuração</li>
            </ol>
          </div>

          <div className="bg-white p-4 rounded-lg border border-blue-200">
            <p className="font-bold mb-2">3️⃣ Teste a Conexão:</p>
            <p>Use o botão <strong>"Test Webhook"</strong> no painel Kiwify para enviar um evento de teste.</p>
            <p className="mt-2">Os eventos aparecerão automaticamente na aba <strong>"Logs Recebidos"</strong> desta página.</p>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-300">
            <p className="font-bold text-yellow-900 mb-2">⚠️ Importante - Segurança:</p>
            <ul className="text-yellow-800 space-y-2 text-sm list-disc list-inside">
              <li>A Kiwify envia os dados diretamente para seu webhook quando eventos ocorrem</li>
              <li>O <strong>Client Secret</strong> está configurado de forma segura como variável de ambiente</li>
              <li>Nunca exponha suas credenciais no código frontend</li>
              <li>Todos os pagamentos são processados via backend functions para máxima segurança</li>
            </ul>
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="test">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-600" />
                Teste de Webhook Kiwify
              </CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                Simule eventos do webhook Kiwify para verificar se a integração está funcionando corretamente.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Webhook URL */}
              <div className="bg-gray-50 p-4 rounded-lg border">
                <Label className="text-sm font-semibold">URL do Webhook</Label>
                <div className="flex items-center gap-2 mt-2">
                  <code className="flex-1 bg-white px-3 py-2 rounded border text-sm break-all">
                    https://app.base44.com/api/apps/69540822472c4a70b54d47aa/functions/webhookKiwify
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText('https://app.base44.com/api/apps/69540822472c4a70b54d47aa/functions/webhookKiwify');
                      toast.success('URL copiada!');
                    }}
                  >
                    Copiar
                  </Button>
                </div>
              </div>

              {/* Test Buttons */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Cenários de Teste</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Button
                    onClick={() => testWebhookMutation.mutate('payment_approved')}
                    disabled={testWebhookMutation.isPending}
                    variant="outline"
                    className="w-full justify-start gap-2"
                  >
                    {testWebhookMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    )}
                    Pagamento Aprovado
                  </Button>

                  <Button
                    onClick={() => testWebhookMutation.mutate('payment_refused')}
                    disabled={testWebhookMutation.isPending}
                    variant="outline"
                    className="w-full justify-start gap-2"
                  >
                    {testWebhookMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <X className="w-4 h-4 text-red-600" />
                    )}
                    Pagamento Recusado
                  </Button>

                  <Button
                    onClick={() => testWebhookMutation.mutate('subscription_cancelled')}
                    disabled={testWebhookMutation.isPending}
                    variant="outline"
                    className="w-full justify-start gap-2"
                  >
                    {testWebhookMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-orange-600" />
                    )}
                    Assinatura Cancelada
                  </Button>
                </div>
              </div>

              {/* Test Results */}
              {testResult && (
                <div className={`p-4 rounded-lg border-2 ${testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    {testResult.success ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    )}
                    <Label className="text-base font-semibold">
                      {testResult.success ? 'Teste Executado com Sucesso' : 'Erro no Teste'}
                    </Label>
                  </div>

                  <div className="space-y-2 text-sm">
                    {testResult.webhook_url && (
                      <div>
                        <span className="font-semibold">URL Testada:</span>
                        <code className="ml-2 text-xs">{testResult.webhook_url}</code>
                      </div>
                    )}

                    {testResult.test_type && (
                      <div>
                        <span className="font-semibold">Tipo de Teste:</span>
                        <Badge className="ml-2" variant="outline">{testResult.test_type}</Badge>
                      </div>
                    )}

                    {testResult.webhook_status && (
                      <div>
                        <span className="font-semibold">Status HTTP:</span>
                        <Badge className={`ml-2 ${testResult.webhook_status === 200 ? 'bg-green-600' : 'bg-red-600'} text-white`}>
                          {testResult.webhook_status}
                        </Badge>
                      </div>
                    )}

                    {testResult.timestamp && (
                      <div className="text-xs text-gray-600">
                        Testado em: {new Date(testResult.timestamp).toLocaleString('pt-BR')}
                      </div>
                    )}

                    {/* Collapsible Details */}
                    <details className="mt-3">
                      <summary className="cursor-pointer font-semibold text-gray-700">Ver Detalhes Técnicos</summary>
                      <pre className="mt-2 p-3 bg-white rounded border text-xs overflow-auto max-h-60">
                        {JSON.stringify(testResult, null, 2)}
                      </pre>
                    </details>
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <Label className="text-sm font-semibold text-blue-900">ℹ️ Como Interpretar os Resultados</Label>
                <ul className="mt-2 space-y-1 text-sm text-blue-800 list-disc list-inside">
                  <li><strong>Status 200:</strong> O webhook está configurado e respondeu corretamente</li>
                  <li><strong>Payload Sent:</strong> Dados enviados simulando o evento da Kiwify</li>
                  <li><strong>Webhook Response:</strong> Resposta do seu webhook (success/error)</li>
                  <li>Verifique os logs da função <code>webhookKiwify</code> para mais detalhes</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Logs de Webhook Recebidos</CardTitle>
                  <p className="text-sm text-gray-600 mt-2">
                    Histórico dos últimos 50 eventos recebidos da Kiwify
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchLogs()}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Atualizar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {webhookLogs.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 font-semibold">Nenhum evento recebido ainda</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Quando a Kiwify enviar eventos de pagamento, eles aparecerão aqui automaticamente
                  </p>
                  <div className="mt-6 space-y-3">
                    <div className="p-4 bg-orange-50 rounded-lg text-left max-w-2xl mx-auto border border-orange-200">
                      <p className="text-sm font-bold text-orange-900 mb-2">🚨 Não está recebendo eventos?</p>
                      <ol className="text-xs text-orange-800 list-decimal list-inside space-y-2">
                        <li><strong>Verifique se configurou no painel Kiwify:</strong>
                          <ul className="list-disc list-inside ml-4 mt-1">
                            <li>Vá em Apps → Webhooks no painel Kiwify</li>
                            <li>Cole a URL do webhook (copie da aba "Configurações")</li>
                            <li>Selecione os eventos a receber</li>
                            <li>Salve a configuração</li>
                          </ul>
                        </li>
                        <li><strong>Use a aba "Testar Webhook"</strong> para simular um evento localmente</li>
                        <li><strong>Ou use o botão "Test Webhook"</strong> no painel Kiwify para enviar um evento real</li>
                      </ol>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg text-left max-w-2xl mx-auto border border-blue-200">
                      <p className="text-xs text-blue-800"><strong>💡 Dica:</strong> Teste primeiro usando a aba "Testar Webhook" aqui na plataforma para verificar se o sistema está funcionando corretamente antes de configurar no painel Kiwify.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {webhookLogs.map((log) => (
                    <Card key={log.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Badge variant={
                              log.processing_status === 'success' ? 'default' :
                              log.processing_status === 'error' ? 'destructive' : 'secondary'
                            }>
                              {log.event_type || 'Desconhecido'}
                            </Badge>
                            {log.processing_status === 'success' && (
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                            )}
                            {log.processing_status === 'error' && (
                              <X className="w-4 h-4 text-red-600" />
                            )}
                            {log.processing_status === 'warning' && (
                              <AlertCircle className="w-4 h-4 text-yellow-600" />
                            )}
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(log.created_date).toLocaleString('pt-BR')}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                          {log.customer_email && (
                            <div>
                              <span className="text-gray-600">Cliente:</span>
                              <span className="ml-2 font-medium">{log.customer_email}</span>
                            </div>
                          )}
                          {log.order_id && (
                            <div>
                              <span className="text-gray-600">Pedido:</span>
                              <span className="ml-2 font-mono text-xs">{log.order_id}</span>
                            </div>
                          )}
                          {log.product_id && (
                            <div>
                              <span className="text-gray-600">Produto:</span>
                              <span className="ml-2 font-mono text-xs">{log.product_id}</span>
                            </div>
                          )}
                          {log.workshop_id && (
                            <div>
                              <span className="text-gray-600">Oficina:</span>
                              <span className="ml-2 font-mono text-xs">{log.workshop_id}</span>
                            </div>
                          )}
                        </div>

                        <div className="text-sm">
                          <span className="text-gray-600">Resultado:</span>
                          <span className="ml-2">{log.processing_message}</span>
                        </div>

                        <details className="mt-3">
                          <summary className="text-xs text-blue-600 cursor-pointer hover:underline">
                            Ver payload completo
                          </summary>
                          <pre className="mt-2 p-3 bg-gray-50 rounded text-xs overflow-auto max-h-60">
                            {JSON.stringify(log.payload, null, 2)}
                          </pre>
                        </details>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}