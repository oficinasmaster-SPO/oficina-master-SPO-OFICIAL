import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Video, CheckCircle, AlertCircle, Loader2, Settings, CreditCard, Wallet, Webhook } from "lucide-react";
import IntegrationModal from "@/components/integrations/IntegrationModal";

export default function Integracoes() {
  const [user, setUser] = useState(null);
  const [selectedIntegration, setSelectedIntegration] = useState(null);

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
    queryKey: ["integrations-list"],
    queryFn: async () => {
      return [
        {
          id: "google_calendar",
          name: "Google Calendar",
          description: "Sincronize agendas dos consultores e mentores",
          icon: Calendar,
          status: "disconnected",
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
        },
        {
          id: "kiwify",
          name: "Kiwify",
          description: "Plataforma de cursos e gestão de conteúdo",
          icon: CreditCard,
          status: "disconnected",
          lastSync: null,
          features: [
            "Gestão de cursos e conteúdos",
            "Controle de assinaturas",
            "Avisos automáticos de cobrança",
            "Bloqueio por inadimplência"
          ]
        },
        {
          id: "asas",
          name: "Asas",
          description: "Plataforma de gestão de pagamentos",
          icon: Wallet,
          status: "disconnected",
          lastSync: null,
          features: [
            "Processamento de pagamentos",
            "Gestão de cobranças recorrentes",
            "Avisos de renovação",
            "Webhooks de pagamento"
          ]
        },
        {
          id: "webhook",
          name: "Webhook Genérico",
          description: "Integre com qualquer sistema via webhooks personalizados",
          icon: Webhook,
          status: "connected",
          lastSync: null,
          features: [
            "Webhooks customizados",
            "Integração com ERP/Financeiro",
            "Notificações de eventos",
            "Autenticação com Secret"
          ]
        }
      ];
    },
    enabled: !!user
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
          Conecte serviços externos para automatizar processos
        </p>
      </div>

      {/* Tabela de Integrações */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Integração
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Descrição
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {integrations.map((integration) => {
                  const Icon = integration.icon;
                  const isConnected = integration.status === "connected";
                  const hasError = integration.status === "error";

                  return (
                    <tr 
                      key={integration.id} 
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => setSelectedIntegration(integration)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${isConnected ? 'bg-green-50' : 'bg-gray-50'}`}>
                            <Icon className={`w-5 h-5 ${isConnected ? 'text-green-600' : 'text-gray-600'}`} />
                          </div>
                          <span className="font-medium text-gray-900">{integration.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">{integration.description}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge 
                          variant={isConnected ? "default" : hasError ? "destructive" : "secondary"}
                          className={isConnected ? "bg-green-600" : ""}
                        >
                          {isConnected ? (
                            <>
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Conectado
                            </>
                          ) : hasError ? (
                            <>
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Erro
                            </>
                          ) : (
                            "Desconectado"
                          )}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedIntegration(integration);
                          }}
                          className="gap-2"
                        >
                          <Settings className="w-4 h-4" />
                          {isConnected ? "Configurar" : "Integrar"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <IntegrationModal
        open={!!selectedIntegration}
        onClose={() => setSelectedIntegration(null)}
        integration={selectedIntegration}
        user={user}
      />
    </div>
  );
}