import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Mail, Send, FileText } from "lucide-react";

export default function RelatoriosTab() {
  return (
    <div className="space-y-6">
      <div className="text-center py-8 text-gray-500">
        <BarChart className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="font-medium">Relatórios de Massa</p>
        <p className="text-xs mt-1">Os relatórios aparecerão aqui após registros/envios</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Atendimentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">0</p>
            <p className="text-xs text-gray-600">criados em massa</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Send className="w-4 h-4" />
              WhatsApp
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">0</p>
            <p className="text-xs text-gray-600">mensagens enviadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Emails
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">0</p>
            <p className="text-xs text-gray-600">mensagens enviadas</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}