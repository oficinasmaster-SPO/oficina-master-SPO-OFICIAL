import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Loader2, Plus, X, Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';

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

  // Fetch Kiwify settings
  const { data: settings, isLoading, isError } = useQuery({
    queryKey: ['kiwifySettings'],
    queryFn: async () => {
      const response = await base44.entities.KiwifySettings.list();
      return response[0] || {};
    },
  });

  // Fetch existing plans for mapping options
  const { data: plans } = useQuery({
    queryKey: ['plansList'],
    queryFn: async () => {
      const response = await base44.entities.Plan.list();
      return response;
    },
    staleTime: Infinity,
  });

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

            {/* Plan Mappings */}
            <div className="space-y-4 border-t pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Mapeamento de Planos</h3>
                  <p className="text-sm text-gray-500">
                    Associe seus planos internos aos produtos correspondentes na Kiwify.
                  </p>
                </div>
                <Button type="button" variant="outline" onClick={addPlanMapping} size="sm" className="gap-2">
                  <Plus className="h-4 w-4" /> Adicionar
                </Button>
              </div>

              {formData.plan_mappings.length === 0 ? (
                <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
                  <p>Nenhum mapeamento configurado.</p>
                  <p className="text-sm">Clique em "Adicionar" para criar um mapeamento.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {formData.plan_mappings.map((mapping, index) => (
                    <div key={index} className="flex items-end gap-3 border p-4 rounded-lg bg-gray-50">
                      <div className="flex-1 space-y-2">
                        <Label htmlFor={`internal_plan_id-${index}`}>Plano Interno</Label>
                        <select
                          id={`internal_plan_id-${index}`}
                          name="internal_plan_id"
                          value={mapping.internal_plan_id}
                          onChange={(e) => handlePlanMappingChange(index, 'internal_plan_id', e.target.value)}
                          className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          required
                        >
                          <option value="">Selecione um plano</option>
                          {plans?.map((plan) => (
                            <option key={plan.id} value={plan.id}>
                              {plan.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex-1 space-y-2">
                        <Label htmlFor={`kiwify_product_id-${index}`}>ID do Produto Kiwify</Label>
                        <Input
                          id={`kiwify_product_id-${index}`}
                          name="kiwify_product_id"
                          value={mapping.kiwify_product_id}
                          onChange={(e) => handlePlanMappingChange(index, 'kiwify_product_id', e.target.value)}
                          placeholder="Ex: prod_abc123"
                          required
                        />
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={() => removePlanMapping(index)}
                        className="shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
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
            <code className="bg-blue-200 px-2 py-1 rounded ml-2">https://sua-app.base44.app/kiwifyWebhookHandler</code>
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
            <strong>3. Teste:</strong> Após configurar, teste a integração fazendo um pagamento de teste.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}