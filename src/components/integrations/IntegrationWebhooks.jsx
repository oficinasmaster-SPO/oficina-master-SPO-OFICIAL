import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Webhook, Plus, Trash2, Copy, Check } from "lucide-react";
import { toast } from "sonner";

export default function IntegrationWebhooks({ integration, webhooks, onChange }) {
  const [localWebhooks, setLocalWebhooks] = useState(webhooks || []);
  const [copiedId, setCopiedId] = useState(null);

  const eventTypes = [
    { value: "sync_started", label: "Sincronização Iniciada" },
    { value: "sync_completed", label: "Sincronização Concluída" },
    { value: "sync_error", label: "Erro na Sincronização" },
    { value: "new_event", label: "Novo Evento Criado" },
    { value: "event_updated", label: "Evento Atualizado" },
    { value: "event_deleted", label: "Evento Excluído" },
  ];

  const addWebhook = () => {
    const newWebhook = {
      id: Date.now().toString(),
      name: "",
      url: "",
      events: [],
      active: true,
      secret: generateSecret(),
    };
    const updated = [...localWebhooks, newWebhook];
    setLocalWebhooks(updated);
    onChange(updated);
  };

  const removeWebhook = (id) => {
    const updated = localWebhooks.filter((w) => w.id !== id);
    setLocalWebhooks(updated);
    onChange(updated);
  };

  const updateWebhook = (id, field, value) => {
    const updated = localWebhooks.map((w) =>
      w.id === id ? { ...w, [field]: value } : w
    );
    setLocalWebhooks(updated);
    onChange(updated);
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copiado para a área de transferência");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const generateSecret = () => {
    return Array.from({ length: 32 }, () =>
      "0123456789abcdef"[Math.floor(Math.random() * 16)]
    ).join("");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="w-5 h-5" />
              Webhooks de Notificação
            </CardTitle>
            <CardDescription>
              Configure webhooks para receber notificações de eventos
            </CardDescription>
          </div>
          <Button onClick={addWebhook} size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            Adicionar Webhook
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {localWebhooks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Webhook className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>Nenhum webhook configurado</p>
              <p className="text-sm mt-1">
                Adicione um webhook para receber notificações em tempo real
              </p>
            </div>
          ) : (
            localWebhooks.map((webhook) => (
              <Card key={webhook.id} className="border-2">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="space-y-2">
                        <Label>Nome do Webhook</Label>
                        <Input
                          placeholder="Ex: Notificações de Sincronização"
                          value={webhook.name}
                          onChange={(e) =>
                            updateWebhook(webhook.id, "name", e.target.value)
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>URL de Destino</Label>
                        <Input
                          placeholder="https://seu-sistema.com/webhook"
                          value={webhook.url}
                          onChange={(e) =>
                            updateWebhook(webhook.id, "url", e.target.value)
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Eventos</Label>
                        <Select
                          value={webhook.events[0] || ""}
                          onValueChange={(value) =>
                            updateWebhook(webhook.id, "events", [value])
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecionar eventos..." />
                          </SelectTrigger>
                          <SelectContent>
                            {eventTypes.map((event) => (
                              <SelectItem key={event.value} value={event.value}>
                                {event.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Secret Key (para validação)</Label>
                        <div className="flex gap-2">
                          <Input
                            value={webhook.secret}
                            readOnly
                            className="font-mono text-sm"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() =>
                              copyToClipboard(webhook.secret, webhook.id)
                            }
                          >
                            {copiedId === webhook.id ? (
                              <Check className="w-4 h-4 text-green-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <Badge variant={webhook.active ? "default" : "secondary"}>
                          {webhook.active ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeWebhook(webhook.id)}
                      className="ml-4"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}