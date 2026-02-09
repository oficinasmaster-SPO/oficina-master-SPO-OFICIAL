import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, XCircle, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function IntegrationStatusWidget() {
  const { data: integrations = [] } = useQuery({
    queryKey: ["integrations-status"],
    queryFn: async () => {
      // Mock data - substituir por chamada real
      return [
        { id: "google_calendar", name: "Google Calendar", status: "connected" },
        { id: "google_meet", name: "Google Meet", status: "disconnected" },
        { id: "kiwify", name: "Kiwify", status: "disconnected" },
        { id: "asas", name: "Asas", status: "connected" },
        { id: "webhook", name: "Webhook", status: "connected" }
      ];
    }
  });

  const connectedCount = integrations.filter(i => i.status === "connected").length;
  const disconnectedCount = integrations.filter(i => i.status === "disconnected").length;
  const errorCount = integrations.filter(i => i.status === "error").length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Status das Integrações</CardTitle>
        <Link to={createPageUrl("Integracoes")}>
          <ArrowRight className="w-4 h-4 text-gray-400 hover:text-gray-600" />
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm text-gray-600">Conectadas</span>
            </div>
            <Badge className="bg-green-600">{connectedCount}</Badge>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">Desconectadas</span>
            </div>
            <Badge variant="secondary">{disconnectedCount}</Badge>
          </div>

          {errorCount > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span className="text-sm text-gray-600">Com Erro</span>
              </div>
              <Badge variant="destructive">{errorCount}</Badge>
            </div>
          )}

          <div className="pt-2 border-t">
            <div className="text-xs text-gray-500">
              {connectedCount} de {integrations.length} integrações ativas
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}