import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, ExternalLink, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import WhatsAppConnectionManager from "./WhatsAppConnectionManager";
import KeywordManager from "./KeywordManager";

export default function WebhookSetupGuide({ open, onClose, workshopId }) {
  const [copiedUrl, setCopiedUrl] = useState(null);

  const webhookUrls = {
    meta: `${window.location.origin}/api/webhookMetaLeads`,
    evolution: `${window.location.origin}/api/webhookEvolutionAPI`
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(type);
    toast.success('URL copiada!');
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Captura Automática de Leads via WhatsApp</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="meta" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="meta">Meta Ads (Oficial)</TabsTrigger>
            <TabsTrigger value="evolution">Evolution API</TabsTrigger>
          </TabsList>

          <TabsContent value="meta" className="space-y-4">
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-green-900">Método Oficial (Recomendado)</p>
                    <p className="text-sm text-green-700 mt-1">
                      Integração oficial com Facebook/Instagram Ads. Sem riscos de bloqueio.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <h3 className="font-semibold">Passo a Passo:</h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex gap-3">
                  <div className="bg-blue-100 text-blue-900 w-6 h-6 rounded-full flex items-center justify-center font-bold flex-shrink-0">1</div>
                  <div>
                    <p className="font-medium">Criar campanha de Leads no Meta Ads</p>
                    <p className="text-gray-600">Acesse Meta Business Suite → Criar anúncio → Objetivo: Geração de Leads</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="bg-blue-100 text-blue-900 w-6 h-6 rounded-full flex items-center justify-center font-bold flex-shrink-0">2</div>
                  <div>
                    <p className="font-medium">Criar formulário de leads</p>
                    <p className="text-gray-600">Adicione campos: Nome, Telefone, Email, Cargo pretendido</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="bg-blue-100 text-blue-900 w-6 h-6 rounded-full flex items-center justify-center font-bold flex-shrink-0">3</div>
                  <div>
                    <p className="font-medium">Configurar Webhook</p>
                    <p className="text-gray-600 mb-2">Vá em Configurações → Webhooks → Adicionar URL de callback:</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={webhookUrls.meta}
                        readOnly
                        className="flex-1 px-3 py-2 border rounded-lg bg-gray-50 text-sm"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(webhookUrls.meta, 'meta')}
                      >
                        {copiedUrl === 'meta' ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                    <p className="text-gray-600 mt-2">Token de verificação: <code className="bg-gray-200 px-2 py-1 rounded">cespe_leads_2025</code></p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="bg-blue-100 text-blue-900 w-6 h-6 rounded-full flex items-center justify-center font-bold flex-shrink-0">4</div>
                  <div>
                    <p className="font-medium">Ativar integração</p>
                    <p className="text-gray-600">Inscrever-se nos eventos: <code className="bg-gray-200 px-1">leadgen</code></p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="bg-green-100 text-green-900 w-6 h-6 rounded-full flex items-center justify-center font-bold flex-shrink-0">✓</div>
                  <div>
                    <p className="font-medium">Pronto! Leads chegarão automaticamente</p>
                    <p className="text-gray-600">A cada novo lead, um candidato será criado no CESPE</p>
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.open('https://business.facebook.com', '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Abrir Meta Business Suite
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="evolution" className="space-y-4">
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-yellow-900">Método Não-Oficial (Risco de Ban)</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      Viola os termos do WhatsApp. Use por sua conta e risco. Pode resultar em bloqueio.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <h3 className="font-semibold">Passo a Passo:</h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex gap-3">
                  <div className="bg-blue-100 text-blue-900 w-6 h-6 rounded-full flex items-center justify-center font-bold flex-shrink-0">1</div>
                  <div>
                    <p className="font-medium">Instalar Evolution API</p>
                    <p className="text-gray-600">Deploy via Docker ou serviço em nuvem (Exemplo: EvolutionAPI Cloud)</p>
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 h-auto"
                      onClick={() => window.open('https://github.com/EvolutionAPI/evolution-api', '_blank')}
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Ver documentação
                    </Button>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="bg-blue-100 text-blue-900 w-6 h-6 rounded-full flex items-center justify-center font-bold flex-shrink-0">2</div>
                  <div>
                    <p className="font-medium">Conectar WhatsApp via QR Code</p>
                    <p className="text-gray-600">Crie uma instância na Evolution API e leia o QR Code com seu WhatsApp</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="bg-blue-100 text-blue-900 w-6 h-6 rounded-full flex items-center justify-center font-bold flex-shrink-0">3</div>
                  <div>
                    <p className="font-medium">Configurar Webhook</p>
                    <p className="text-gray-600 mb-2">Na Evolution API, configure o webhook para:</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={webhookUrls.evolution}
                        readOnly
                        className="flex-1 px-3 py-2 border rounded-lg bg-gray-50 text-sm"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(webhookUrls.evolution, 'evolution')}
                      >
                        {copiedUrl === 'evolution' ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                    <p className="text-gray-600 mt-2">Ativar evento: <code className="bg-gray-200 px-2 py-1 rounded">messages.upsert</code></p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="bg-blue-100 text-blue-900 w-6 h-6 rounded-full flex items-center justify-center font-bold flex-shrink-0">4</div>
                  <div className="w-full">
                    <KeywordManager workshopId={workshopId} />
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="bg-green-100 text-green-900 w-6 h-6 rounded-full flex items-center justify-center font-bold flex-shrink-0">✓</div>
                  <div>
                    <p className="font-medium">Pronto! Leads do WhatsApp serão capturados</p>
                    <p className="text-gray-600">Quando alguém mandar "quero trabalhar", vira lead automaticamente</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t">
              <h3 className="font-semibold mb-4">🔌 Conectar WhatsApp Agora:</h3>
              <WhatsAppConnectionManager workshopId={workshopId} />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}