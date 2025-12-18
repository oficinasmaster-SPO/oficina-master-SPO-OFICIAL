import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, UserCheck, Lock, LogIn, AlertTriangle } from "lucide-react";

export default function AuditLogStats({ logs }) {
  const stats = {
    total: logs.length,
    logins: logs.filter(l => l.action === 'login').length,
    approvals: logs.filter(l => l.action === 'user_approved').length,
    blocks: logs.filter(l => l.action === 'user_blocked').length,
    critical: logs.filter(l => 
      ['user_blocked', 'user_deleted', 'password_reset'].includes(l.action)
    ).length
  };

  const cards = [
    { label: 'Total de Eventos', value: stats.total, icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Logins', value: stats.logins, icon: LogIn, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Aprovações', value: stats.approvals, icon: UserCheck, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Bloqueios', value: stats.blocks, icon: Lock, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Ações Críticas', value: stats.critical, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{card.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-lg ${card.bg} flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}