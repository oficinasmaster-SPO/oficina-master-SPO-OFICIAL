import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Edit } from "lucide-react";

export default function ExternalUserList({ users, onEditUser }) {
  if (!users || users.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <User className="w-12 h-12 mx-auto mb-3 text-gray-400" />
        <p>Nenhum usuário externo nesta oficina.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {users.map((user) => (
        <div
          key={user.employee_id || user.user_id}
          className="border rounded-lg p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">{user.full_name}</p>
              <p className="text-sm text-gray-600">{user.email}</p>
              <div className="flex gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {user.job_role || 'Sem cargo'}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Perfil: {user.profile_id || 'Não definido'}
                </Badge>
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEditUser(user)}
            className="flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Gerenciar Exceções
          </Button>
        </div>
      ))}
    </div>
  );
}