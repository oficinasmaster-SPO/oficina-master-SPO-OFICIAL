import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CheckCircle, XCircle, Plane, AlertCircle, Clock } from "lucide-react";

export default function UserStatsCards({ users, onCardClick }) {
  const stats = {
    total: users.length,
    ativos: users.filter(u => u.user_status === 'ativo').length,
    inativos: users.filter(u => u.user_status === 'inativo' || u.user_status === 'bloqueado').length,
    ferias: users.filter(u => u.user_status === 'ferias').length,
    aguardandoPrimeiroAcesso: users.filter(u => !u.first_login_at).length,
    inativos30dias: users.filter(u => {
      if (!u.last_login_at) return false;
      const diasSemLogin = Math.floor((Date.now() - new Date(u.last_login_at).getTime()) / (1000 * 60 * 60 * 24));
      return diasSemLogin > 30;
    }).length
  };

  const cards = [
    {
      title: "Total de Usuários",
      value: stats.total,
      icon: Users,
      color: "text-gray-600",
      bgColor: "bg-gray-50",
      filter: null
    },
    {
      title: "Usuários Ativos",
      value: stats.ativos,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50",
      filter: { user_status: 'ativo' }
    },
    {
      title: "Inativos/Bloqueados",
      value: stats.inativos,
      icon: XCircle,
      color: "text-red-600",
      bgColor: "bg-red-50",
      filter: { user_status: ['inativo', 'bloqueado'] }
    },
    {
      title: "Em Férias",
      value: stats.ferias,
      icon: Plane,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      filter: { user_status: 'ferias' }
    },
    {
      title: "Aguardando 1º Acesso",
      value: stats.aguardandoPrimeiroAcesso,
      icon: AlertCircle,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      filter: { primeiroAcesso: true }
    },
    {
      title: "Sem Login +30 dias",
      value: stats.inativos30dias,
      icon: Clock,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      filter: { inatividade30: true }
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card
            key={index}
            className={`cursor-pointer hover:shadow-lg transition-shadow ${card.bgColor}`}
            onClick={() => onCardClick(card.filter)}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-medium flex items-center gap-2">
                <Icon className={`w-4 h-4 ${card.color}`} />
                {card.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}