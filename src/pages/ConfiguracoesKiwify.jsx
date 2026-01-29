import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Loader2, Plus, X, Save, AlertCircle, CheckCircle2, Zap, Activity } from 'lucide-react';
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
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="config">Configurações</TabsTrigger>
          <TabsTrigger value="test">
            <Activity className="w-4 h-4 mr-2" />
            Testar Webhook
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
                                    { internal_plan_id: plan.id, kiwify_product_id: newValue }
                                  ]
                                }));
                              }
                            }}
                            placeholder="Ex: prod_abc123 ou deixe vazio"
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
          <CardTitle className="text-blue-900">Documentação e Próximos Passos</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-800 space-y-2">
          <p>
            <strong>1. Webhook da Kiwify:</strong> Configure o webhook da Kiwify para apontar para: 
            <code className="bg-blue-200 px-2 py-1 rounded ml-2">{window.location.origin}/api/functions/webhookKiwify</code>
          </p>
          <p>
            <strong>2. Documentação:</strong> Consulte a{' '}
            <a 
              href="https://docs.kiwify.com.br/api-reference/general" 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline font-semibold"
            >
              documentação oficial da Kiwify
            </a>
            {' '}para mais detalhes sobre a integração.
          </p>
          <p>
            <strong>3. Teste:</strong> Use a aba "Testar Webhook" para verificar se a integração está funcionando corretamente.
          </p>
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
                  <code className="flex-1 bg-white px-3 py-2 rounded border text-sm">
                    {window.location.origin}/api/functions/webhookKiwify
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/api/functions/webhookKiwify`);
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
      </Tabs>
    </div>
  );
}