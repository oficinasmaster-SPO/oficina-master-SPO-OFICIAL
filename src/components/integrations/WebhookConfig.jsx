import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Webhook, Copy, CheckCircle, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";

export default function WebhookConfig({ user }) {
  const [webhooks, setWebhooks] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newWebhook, setNewWebhook] = useState({
    name: "",
    url: "",
    secret: "",
    description: "",
    events: []
  });

  const addWebhookMutation = useMutation({
    mutationFn: async (webhook) => {
      if (!webhook.name || !webhook.url) {
        throw new Error('Preencha nome e URL do webhook');
      }
      await new Promise(resolve => setTimeout(resolve, 500));
      return webhook;
    },
    onSuccess: (webhook) => {
      setWebhooks([...webhooks, { ...webhook, id: Date.now(), enabled: true }]);
      setNewWebhook({ name: "", url: "", secret: "", description: "", events: [] });
      setShowAddForm(false);
      toast.success("Webhook adicionado!");
    },
    onError: (error) => {
      toast.error("Erro ao adicionar: " + error.message);
    }
  });

  const deleteWebhook = (id) => {
    setWebhooks(webhooks.filter(w => w.id !== id));
    toast.success("Webhook removido");
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado para área de transferência");
  };

  const handleAddWebhook = () => {
    addWebhookMutation.mutate(newWebhook);
  };

  return (
    <div className="space-y-4 border-t pt-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-sm">Webhooks Configurados</p>
          <p className="text-xs text-gray-600">
            {webhooks.length} webhook(s) ativo(s)
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Webhook
        </Button>
      </div>

      {showAddForm && (
        <Card className="bg-gray-50">
          <CardContent className="pt-4 space-y-3">
            <div>
              <Label className="text-xs">Nome do Webhook</Label>
              <Input
                value={newWebhook.name}
                onChange={(e) => setNewWebhook({ ...newWebhook, name: e.target.value })}
                placeholder="Ex: Sistema Financeiro"
                className="h-9 mt-1"
              />
            </div>

            <div>
              <Label className="text-xs">URL do Webhook</Label>
              <Input
                value={newWebhook.url}
                onChange={(e) => setNewWebhook({ ...newWebhook, url: e.target.value })}
                placeholder="https://api.seuservico.com/webhook"
                className="h-9 mt-1"
              />
            </div>

            <div>
              <Label className="text-xs">Secret (Opcional)</Label>
              <Input
                value={newWebhook.secret}
                onChange={(e) => setNewWebhook({ ...newWebhook, secret: e.target.value })}
                placeholder="Token de segurança..."
                type="password"
                className="h-9 mt-1"
              />
            </div>

            <div>
              <Label className="text-xs">Descrição</Label>
              <Textarea
                value={newWebhook.description}
                onChange={(e) => setNewWebhook({ ...newWebhook, description: e.target.value })}
                placeholder="Para que serve este webhook?"
                className="h-16 mt-1 resize-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowAddForm(false);
                  setNewWebhook({ name: "", url: "", secret: "", description: "", events: [] });
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleAddWebhook}
                disabled={addWebhookMutation.isPending}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {addWebhookMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Adicionar"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {webhooks.length > 0 && (
        <div className="space-y-3">
          {webhooks.map((webhook) => (
            <Card key={webhook.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-sm">{webhook.name}</p>
                    <p className="text-xs text-gray-600 mt-1">{webhook.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(webhook.url)}
                      title="Copiar URL"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteWebhook(webhook.id)}
                      title="Remover"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">URL:</span>
                    <code className="bg-gray-100 px-2 py-1 rounded text-xs flex-1 truncate">
                      {webhook.url}
                    </code>
                  </div>
                  {webhook.secret && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">Secret:</span>
                      <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                        ••••••••
                      </code>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-xs text-green-700">Webhook ativo</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {webhooks.length === 0 && !showAddForm && (
        <div className="text-center py-8 text-gray-500 border border-dashed rounded-lg">
          <Webhook className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">Nenhum webhook configurado</p>
          <p className="text-xs mt-1">Adicione webhooks para integrar com sistemas externos</p>
        </div>
      )}
    </div>
  );
}