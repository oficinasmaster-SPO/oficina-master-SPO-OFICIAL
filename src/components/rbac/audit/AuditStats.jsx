import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Activity, CheckCircle, XCircle, Edit } from "lucide-react";

export default function AuditStats({ logs = [] }) {
  const totalChanges = logs.length;
  const approvedChanges = logs.filter(l => l.action?.includes('approved')).length;
  const rejectedChanges = logs.filter(l => l.action?.includes('rejected')).length;
  const profileChanges = logs.filter(l => l.action === 'profile_changed').length;

  const stats = [
    {
      label: 'Total de Alterações',
      value: totalChanges,
      icon: Activity,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      label: 'Mudanças Aprovadas',
      value: approvedChanges,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      label: 'Mudanças Rejeitadas',
      value: rejectedChanges,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    },
    {
      label: 'Mudanças de Perfil',
      value: profileChanges,
      icon: Edit,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{stat.label}</p>
                <p className="text-3xl font-bold mt-2">{stat.value}</p>
              </div>
              <div className={`${stat.bgColor} p-3 rounded-lg`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}