import React from "react";
import { base44 } from '@/api/base44Client';
import AuditLogViewer from "@/components/admin/audit/AuditLogViewer";
import { Loader2 } from "lucide-react";

export default function AuditLogs() {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (error) {
      console.error("Erro ao carregar usuÃ¡rio:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Acesso Negado</h2>
          <p className="text-gray-600">Apenas administradores podem acessar os logs de auditoria.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <AuditLogViewer />
    </div>
  );
}


