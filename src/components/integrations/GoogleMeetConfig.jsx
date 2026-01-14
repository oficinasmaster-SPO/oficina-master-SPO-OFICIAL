import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video, CheckCircle2, XCircle, Calendar, Users } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function GoogleMeetConfig() {
  const [isConnected, setIsConnected] = useState(false);
  const [testing, setTesting] = useState(false);

  const testConnection = async () => {
    setTesting(true);
    try {
      const response = await base44.functions.invoke('createGoogleMeetEvent', {
        summary: 'Teste de Conexão - Google Meet',
        description: 'Evento de teste criado automaticamente',
        startDateTime: new Date(Date.now() + 3600000).toISOString(),
        endDateTime: new Date(Date.now() + 7200000).toISOString(),
        attendees: [],
      });

      if (response.data.success) {
        setIsConnected(true);
        toast.success('Conexão estabelecida! Link do Meet: ' + response.data.meetLink);
      } else {
        setIsConnected(false);
        toast.error('Falha na conexão: ' + response.data.error);
      }
    } catch (error) {
      setIsConnected(false);
      toast.error('Erro ao testar conexão: ' + error.message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Video className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <CardTitle>Google Meet</CardTitle>
              <CardDescription>Crie reuniões automaticamente ao agendar atendimentos</CardDescription>
            </div>
          </div>
          {isConnected ? (
            <Badge className="bg-green-100 text-green-700">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Conectado
            </Badge>
          ) : (
            <Badge variant="outline" className="text-gray-500">
              <XCircle className="w-3 h-3 mr-1" />
              Não conectado
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
            <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-sm text-gray-900">Criação Automática</h4>
              <p className="text-sm text-gray-600">
                Links do Google Meet serão criados automaticamente ao agendar consultorias
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
            <Users className="w-5 h-5 text-green-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-sm text-gray-900">Convites Automáticos</h4>
              <p className="text-sm text-gray-600">
                Os participantes recebem convites por e-mail com o link da reunião
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button onClick={testConnection} disabled={testing} className="flex-1">
            {testing ? 'Testando...' : 'Testar Conexão'}
          </Button>
        </div>

        {isConnected && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              ✓ Integração ativa! As reuniões serão criadas automaticamente no Google Calendar com links do Meet.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}