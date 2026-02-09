import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Plus, Trash2 } from "lucide-react";

export default function NotificationSchedulerModal({ onClose, onSave }) {
  const [notificacoes, setNotificacoes] = useState([
    { 
      tipo: "lembrete",
      prazo_valor: 1,
      prazo_unidade: "dias",
      mensagem: "",
      enviar_email: true,
      enviar_whatsapp: false,
      enviar_plataforma: true
    }
  ]);

  const addNotificacao = () => {
    setNotificacoes([
      ...notificacoes,
      { 
        tipo: "lembrete",
        prazo_valor: 1,
        prazo_unidade: "horas",
        mensagem: "",
        enviar_email: true,
        enviar_whatsapp: false,
        enviar_plataforma: true
      }
    ]);
  };

  const removeNotificacao = (index) => {
    setNotificacoes(notificacoes.filter((_, i) => i !== index));
  };

  const updateNotificacao = (index, field, value) => {
    const updated = [...notificacoes];
    updated[index][field] = value;
    setNotificacoes(updated);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-auto">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle>Programar Notificações Automáticas</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {notificacoes.map((notif, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">Notificação {index + 1}</h4>
                {notificacoes.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeNotificacao(index)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Tipo
                  </label>
                  <Select
                    value={notif.tipo}
                    onValueChange={(value) => updateNotificacao(index, 'tipo', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lembrete">Lembrete</SelectItem>
                      <SelectItem value="confirmacao">Confirmação</SelectItem>
                      <SelectItem value="follow_up">Follow-up</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Enviar antes do atendimento
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="1"
                      value={notif.prazo_valor}
                      onChange={(e) => updateNotificacao(index, 'prazo_valor', parseInt(e.target.value))}
                      className="w-20"
                    />
                    <Select
                      value={notif.prazo_unidade}
                      onValueChange={(value) => updateNotificacao(index, 'prazo_unidade', value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="horas">Hora(s)</SelectItem>
                        <SelectItem value="dias">Dia(s)</SelectItem>
                        <SelectItem value="semanas">Semana(s)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Mensagem
                </label>
                <Textarea
                  value={notif.mensagem}
                  onChange={(e) => updateNotificacao(index, 'mensagem', e.target.value)}
                  rows={3}
                  placeholder="Digite a mensagem da notificação..."
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Canais de envio
                </label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={notif.enviar_email}
                      onCheckedChange={(checked) => updateNotificacao(index, 'enviar_email', checked)}
                    />
                    <span className="text-sm">Email</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={notif.enviar_whatsapp}
                      onCheckedChange={(checked) => updateNotificacao(index, 'enviar_whatsapp', checked)}
                    />
                    <span className="text-sm">WhatsApp</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={notif.enviar_plataforma}
                      onCheckedChange={(checked) => updateNotificacao(index, 'enviar_plataforma', checked)}
                    />
                    <span className="text-sm">Plataforma (Notificação interna)</span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={addNotificacao}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Notificação
          </Button>

          <div className="flex gap-3 justify-end pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={() => onSave(notificacoes)} className="bg-blue-600 hover:bg-blue-700">
              Salvar Programação
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}