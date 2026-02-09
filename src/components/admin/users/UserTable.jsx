import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, Clock, Eye, Edit, Key, Trash2, Mail, FileText } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function UserTable({ 
  users, 
  profiles, 
  admins,
  onViewDetails,
  onEdit, 
  onResetPassword,
  onResendAccess,
  onViewAudit, 
  onDelete 
}) {
  const getStatusBadge = (status) => {
    const badges = {
      active: { label: "✅ Ativo", color: "bg-green-100 text-green-700" },
      pending: { label: "⏳ Aprovação", color: "bg-yellow-100 text-yellow-700" },
      inactive: { label: "⏸️ Inativo", color: "bg-gray-100 text-gray-700" },
      blocked: { label: "🔒 Bloqueado", color: "bg-red-100 text-red-700" }
    };
    return badges[status] || badges.pending;
  };

  const getProfileName = (profileId) => {
    const profile = profiles.find(p => p.id === profileId);
    return profile?.name || "Sem perfil";
  };

  const getAdminName = (adminId) => {
    const admin = admins.find(a => a.id === adminId);
    return admin?.full_name || admin?.email || "Não definido";
  };

  const getLastLoginDisplay = (user) => {
    if (!user.last_login_at) return "Nunca acessou";
    const diasAtras = differenceInDays(new Date(), new Date(user.last_login_at));
    if (diasAtras === 0) return "Hoje";
    if (diasAtras === 1) return "Ontem";
    if (diasAtras <= 7) return `${diasAtras} dias atrás`;
    return format(new Date(user.last_login_at), "dd/MM/yyyy", { locale: ptBR });
  };

  const getAlerts = (user) => {
    const alerts = [];
    if (!user.first_login_at) {
      alerts.push({ type: "primeiro_acesso", label: "Aguardando 1º acesso", color: "bg-orange-100 text-orange-700" });
    }
    if (user.last_login_at) {
      const diasSemLogin = differenceInDays(new Date(), new Date(user.last_login_at));
      if (diasSemLogin > 30) {
        alerts.push({ type: "inatividade", label: `${diasSemLogin}d sem login`, color: "bg-purple-100 text-purple-700" });
      }
    }
    return alerts;
  };

  if (users.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
        <p>Nenhum usuário encontrado com os filtros aplicados.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b-2 border-gray-200">
            <th className="text-left py-3 px-4 font-semibold text-gray-700">Usuário</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-700">Cargo</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-700">Perfil</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-700">Último Login</th>
            <th className="text-center py-3 px-4 font-semibold text-gray-700">Ações</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const statusBadge = getStatusBadge(user.user_status);
            const alerts = getAlerts(user);

            return (
              <tr 
                key={user.id} 
                className="border-b hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => onViewDetails(user)}
              >
                <td className="py-3 px-4">
                  <div>
                    <p className="font-medium text-gray-900">{user.full_name}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                </td>
                <td className="py-3 px-4 text-sm text-gray-700">{user.position}</td>
                <td className="py-3 px-4">
                  <Badge variant="outline">{getProfileName(user.profile_id)}</Badge>
                </td>
                <td className="py-3 px-4">
                  <div className="flex flex-col gap-2">
                    <div className="text-sm text-gray-700">
                      {getLastLoginDisplay(user)}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={statusBadge.color}>{statusBadge.label}</Badge>
                      {alerts.map((alert, idx) => (
                        <Badge key={idx} className={alert.color}>
                          {alert.type === "primeiro_acesso" && <AlertCircle className="w-3 h-3 mr-1" />}
                          {alert.type === "inatividade" && <Clock className="w-3 h-3 mr-1" />}
                          {alert.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onViewDetails(user)}
                      title="Ver detalhes"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onEdit(user)}
                      title="Editar"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-purple-600"
                      onClick={() => onViewAudit(user)}
                      title="Ver Auditoria"
                    >
                      <FileText className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onResetPassword(user)}
                      title="Resetar senha"
                    >
                      <Key className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-blue-600"
                      onClick={() => onResendAccess(user)}
                      title="Reenviar acesso"
                    >
                      <Mail className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600"
                      onClick={() => onDelete(user)}
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}