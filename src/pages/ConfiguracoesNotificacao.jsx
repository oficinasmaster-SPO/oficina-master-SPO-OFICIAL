import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Bell, FileText, AlertTriangle, Calendar, Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ConfiguracoesNotificacao() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  const [preferences, setPreferences] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const workshops = await base44.entities.Workshop.filter({ owner_id: currentUser.id });
      const userWorkshop = workshops[0];
      setWorkshop(userWorkshop);

      const prefs = await base44.entities.DocumentNotificationPreference.filter({
        user_id: currentUser.id,
        workshop_id: userWorkshop.id
      });

      if (prefs && prefs.length > 0) {
        setPreferences(prefs[0]);
      } else {
        const defaultPrefs = {
          user_id: currentUser.id,
          workshop_id: userWorkshop.id,
          expiring_documents_enabled: true,
          expiring_documents_days: [7, 15, 30],
          new_documents_enabled: true,
          interested_categories: [],
          legal_updates_enabled: true,
          high_legal_impact_enabled: true,
          weekly_summary_enabled: true,
          weekly_summary_day: "monday",
          email_notifications: false,
          in_app_notifications: true
        };
        const created = await base44.entities.DocumentNotificationPreference.create(defaultPrefs);
        setPreferences(created);
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar preferências");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.DocumentNotificationPreference.update(preferences.id, preferences);
      toast.success("Preferências salvas com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar preferências");
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = (category) => {
    const categories = preferences.interested_categories || [];
    const updated = categories.includes(category)
      ? categories.filter(c => c !== category)
      : [...categories, category];
    setPreferences({ ...preferences, interested_categories: updated });
  };

  const toggleDay = (day) => {
    const days = preferences.expiring_documents_days || [];
    const updated = days.includes(day)
      ? days.filter(d => d !== day)
      : [...days, day].sort((a, b) => a - b);
    setPreferences({ ...preferences, expiring_documents_days: updated });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const categoryLabels = {
    governanca: "Governança",
    juridico_regimento: "Jurídico / Regimento",
    rh_pessoas: "RH / Pessoas",
    operacional: "Operacional",
    tecnico: "Técnico",
    comercial: "Comercial",
    financeiro: "Financeiro",
    treinamento: "Treinamento",
    auditoria_dados: "Auditoria / Dados"
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Bell className="w-8 h-8 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">Configurações de Notificação</h1>
          </div>
          <p className="text-gray-600">
            Personalize quando e como você quer ser notificado sobre documentos
          </p>
        </div>

        <div className="space-y-6">
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <CardTitle>Documentos Próximos do Vencimento</CardTitle>
              </div>
              <CardDescription>
                Receba alertas sobre documentos que estão prestes a expirar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="expiring-enabled">Habilitar notificações de vencimento</Label>
                <Switch
                  id="expiring-enabled"
                  checked={preferences?.expiring_documents_enabled}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, expiring_documents_enabled: checked })
                  }
                />
              </div>

              {preferences?.expiring_documents_enabled && (
                <div>
                  <Label className="mb-2 block">Notificar com antecedência de:</Label>
                  <div className="flex flex-wrap gap-2">
                    {[7, 15, 30, 45, 60, 90].map((day) => (
                      <Badge
                        key={day}
                        variant={preferences?.expiring_documents_days?.includes(day) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleDay(day)}
                      >
                        {day} dias
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-green-600" />
                <CardTitle>Novos Documentos</CardTitle>
              </div>
              <CardDescription>
                Seja notificado quando novos documentos forem adicionados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="new-docs">Habilitar notificações de novos documentos</Label>
                <Switch
                  id="new-docs"
                  checked={preferences?.new_documents_enabled}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, new_documents_enabled: checked })
                  }
                />
              </div>

              {preferences?.new_documents_enabled && (
                <div>
                  <Label className="mb-2 block">Categorias de interesse:</Label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(categoryLabels).map(([key, label]) => (
                      <Badge
                        key={key}
                        variant={preferences?.interested_categories?.includes(key) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleCategory(key)}
                      >
                        {label}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Deixe em branco para receber sobre todas as categorias
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-lg border-l-4 border-red-500">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <CardTitle>Alertas Legais e Jurídicos</CardTitle>
              </div>
              <CardDescription>
                Receba notificações prioritárias sobre documentos com impacto legal
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="legal-updates">Mudanças legais e atualizações</Label>
                <Switch
                  id="legal-updates"
                  checked={preferences?.legal_updates_enabled}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, legal_updates_enabled: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="high-impact">Documentos de alto impacto jurídico</Label>
                <Switch
                  id="high-impact"
                  checked={preferences?.high_legal_impact_enabled}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, high_legal_impact_enabled: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                <CardTitle>Resumo Semanal</CardTitle>
              </div>
              <CardDescription>
                Receba um resumo das atividades e documentos importantes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="weekly">Habilitar resumo semanal</Label>
                <Switch
                  id="weekly"
                  checked={preferences?.weekly_summary_enabled}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, weekly_summary_enabled: checked })
                  }
                />
              </div>

              {preferences?.weekly_summary_enabled && (
                <div>
                  <Label className="mb-2 block">Enviar resumo toda:</Label>
                  <Select
                    value={preferences?.weekly_summary_day}
                    onValueChange={(value) =>
                      setPreferences({ ...preferences, weekly_summary_day: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monday">Segunda-feira</SelectItem>
                      <SelectItem value="friday">Sexta-feira</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-indigo-600" />
                <CardTitle>Canais de Notificação</CardTitle>
              </div>
              <CardDescription>
                Escolha onde receber as notificações
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="in-app">Notificações no sistema (in-app)</Label>
                <Switch
                  id="in-app"
                  checked={preferences?.in_app_notifications}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, in_app_notifications: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="email">Notificações por e-mail</Label>
                <Switch
                  id="email"
                  checked={preferences?.email_notifications}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, email_notifications: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => window.history.back()}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar Preferências
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}