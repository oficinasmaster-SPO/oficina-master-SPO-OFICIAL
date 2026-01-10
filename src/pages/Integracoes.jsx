import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Calendar, Video, CheckCircle, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import GoogleCalendarConfig from "@/components/integrations/GoogleCalendarConfig";
import GoogleMeetConfig from "@/components/integrations/GoogleMeetConfig";

export default function Integracoes() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Erro ao carregar usuário:", error);
      }
    };
    loadUser();
  }, []);

  const { data: integrations = [], isLoading } = useQuery({
    queryKey: ["integrations-status"],
    queryFn: async () => {
      // Verificar status das integrações
      return [
        {
          id: "google_calendar",
          name: "Google Calendar",
          description: "Sincronize agendas dos consultores e mentores",
          icon: Calendar,
          status: "disconnected", // connected | disconnected | error
          lastSync: null,
          features: [
            "Sincronização bidirecional de eventos",
            "Filtro por consultor/mentor",
            "Atualização automática de status",
            "Visualização de disponibilidade"
          ]
        },
        {
          id: "google_meet",
          name: "Google Meet",
          description: "Gere links e obtenha transcrições automáticas",
          icon: Video,
          status: "disconnected",
          lastSync: null,
          features: [
            "Geração automática de links",
            "Transcrição automática de reuniões",
            "Extração de pontos principais",
            "Geração de ATAs inteligentes"
          ]
        }
      ];
    },
    enabled: !!user
  });

  const syncMutation = useMutation({
    mutationFn: async (integrationId) => {
      // Simular sincronização
      await new Promise(resolve => setTimeout(resolve, 2000));
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations-status"] });
      toast.success("Sincronização concluída!");
    },
    onError: (error) => {
      toast.error("Erro na sincronização: " + error.message);
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Integrações</h1>
        <p className="text-gray-600 mt-2">
          Conecte serviços externos para automatizar processos e aumentar a produtividade
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Integrações Ativas</p>
                <p className="text-2xl font-bold text-gray-900">
                  {integrations.filter(i => i.status === "connected").length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Disponíveis</p>
                <p className="text-2xl font-bold text-gray-900">{integrations.length}</p>
              </div>
              <RefreshCw className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Com Problemas</p>
                <p className="text-2xl font-bold text-gray-900">
                  {integrations.filter(i => i.status === "error").length}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Integrations List */}
      <div className="grid grid-cols-1 gap-6">
        {integrations.map((integration) => {
          const Icon = integration.icon;
          const isConnected = integration.status === "connected";
          const hasError = integration.status === "error";

          return (
            <Card key={integration.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${isConnected ? 'bg-green-50' : 'bg-gray-50'}`}>
                      <Icon className={`w-6 h-6 ${isConnected ? 'text-green-600' : 'text-gray-600'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle>{integration.name}</CardTitle>
                        <Badge variant={isConnected ? "success" : hasError ? "destructive" : "secondary"}>
                          {isConnected ? "Conectado" : hasError ? "Erro" : "Desconectado"}
                        </Badge>
                      </div>
                      <CardDescription className="mt-1">{integration.description}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isConnected && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => syncMutation.mutate(integration.id)}
                        disabled={syncMutation.isPending}
                      >
                        {syncMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Recursos:</p>
                  <ul className="space-y-1">
                    {integration.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Config Component */}
                {integration.id === "google_calendar" && (
                  <GoogleCalendarConfig user={user} />
                )}
                {integration.id === "google_meet" && (
                  <GoogleMeetConfig user={user} />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}