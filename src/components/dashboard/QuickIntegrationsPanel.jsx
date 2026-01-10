import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Video, CreditCard, Wallet, Webhook, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function QuickIntegrationsPanel() {
  const quickActions = [
    { 
      id: "calendar", 
      name: "Agenda", 
      icon: Calendar, 
      connected: true,
      color: "text-blue-600 bg-blue-50"
    },
    { 
      id: "meet", 
      name: "Reuniões", 
      icon: Video, 
      connected: false,
      color: "text-purple-600 bg-purple-50"
    },
    { 
      id: "kiwify", 
      name: "Kiwify", 
      icon: CreditCard, 
      connected: false,
      color: "text-green-600 bg-green-50"
    },
    { 
      id: "asas", 
      name: "Asas", 
      icon: Wallet, 
      connected: true,
      color: "text-indigo-600 bg-indigo-50"
    }
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Acesso Rápido</CardTitle>
        <Link to={createPageUrl("Integracoes")}>
          <Button variant="ghost" size="sm" className="h-8 gap-1">
            <Settings className="w-3 h-3" />
            Ver Todas
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link 
                key={action.id} 
                to={createPageUrl("Integracoes")}
                className="block"
              >
                <div className={`p-3 rounded-lg border transition-all hover:shadow-md cursor-pointer ${
                  action.connected ? "border-green-200 bg-green-50" : "border-gray-200"
                }`}>
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded ${action.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">
                        {action.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {action.connected ? "Ativo" : "Configurar"}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}