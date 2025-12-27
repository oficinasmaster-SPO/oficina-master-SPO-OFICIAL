import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, User, Target, Globe, FileText, GitCompare, AlertCircle } from "lucide-react";

const actionTypeLabels = {
  profile_created: "Perfil Criado",
  profile_updated: "Perfil Atualizado",
  profile_deleted: "Perfil Deletado",
  role_created: "Role Criada",
  role_updated: "Role Atualizada",
  role_deleted: "Role Deletada",
  granular_permission_updated: "Permissão Granular Atualizada",
  permission_request_approved: "Solicitação Aprovada",
  permission_request_rejected: "Solicitação Rejeitada",
  user_permission_changed: "Permissão Alterada"
};

const ChangesDiff = ({ before, after }) => {
  const findDifferences = (obj1, obj2, path = '') => {
    const diffs = [];
    
    const allKeys = new Set([...Object.keys(obj1 || {}), ...Object.keys(obj2 || {})]);
    
    allKeys.forEach(key => {
      const currentPath = path ? `${path}.${key}` : key;
      const val1 = obj1?.[key];
      const val2 = obj2?.[key];
      
      if (JSON.stringify(val1) !== JSON.stringify(val2)) {
        diffs.push({
          field: currentPath,
          before: val1,
          after: val2
        });
      }
    });
    
    return diffs;
  };

  const differences = findDifferences(before, after);

  if (differences.length === 0) {
    return <p className="text-sm text-gray-500">Nenhuma alteração detectada</p>;
  }

  return (
    <div className="space-y-3">
      {differences.map((diff, idx) => (
        <div key={idx} className="border rounded-lg p-3 bg-gray-50">
          <div className="flex items-center gap-2 mb-2">
            <GitCompare className="w-4 h-4 text-blue-600" />
            <span className="font-mono text-xs font-semibold text-gray-700">{diff.field}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-red-50 p-2 rounded border border-red-200">
              <p className="text-xs font-semibold text-red-700 mb-1">Anterior</p>
              <pre className="text-xs text-gray-700 break-all whitespace-pre-wrap">
                {typeof diff.before === 'object' 
                  ? JSON.stringify(diff.before, null, 2) 
                  : String(diff.before || '-')}
              </pre>
            </div>
            <div className="bg-green-50 p-2 rounded border border-green-200">
              <p className="text-xs font-semibold text-green-700 mb-1">Novo</p>
              <pre className="text-xs text-gray-700 break-all whitespace-pre-wrap">
                {typeof diff.after === 'object' 
                  ? JSON.stringify(diff.after, null, 2) 
                  : String(diff.after || '-')}
              </pre>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default function RBACLogDetailsDialog({ log, open, onClose }) {
  if (!log) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Detalhes do Log de Auditoria
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="changes">Alterações</TabsTrigger>
            <TabsTrigger value="technical">Detalhes Técnicos</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <p className="text-xs font-semibold text-blue-900">Data/Hora</p>
                </div>
                <p className="text-sm font-medium">
                  {log.created_date 
                    ? format(new Date(log.created_date), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR }) 
                    : 'N/A'}
                </p>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-purple-600" />
                  <p className="text-xs font-semibold text-purple-900">Tipo de Ação</p>
                </div>
                <Badge className="bg-purple-100 text-purple-700">
                  {actionTypeLabels[log.action_type] || log.action_type || 'N/A'}
                </Badge>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-gray-600" />
                <p className="text-xs font-semibold text-gray-700">Realizado Por</p>
              </div>
              <p className="text-sm font-medium text-gray-900">{log.performed_by_name || 'N/A'}</p>
              <p className="text-xs text-gray-500 mt-1">{log.performed_by || 'N/A'}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-gray-600" />
                <p className="text-xs font-semibold text-gray-700">Recurso Afetado</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{log.target_type || 'N/A'}</Badge>
                <span className="text-sm font-medium">{log.target_name || log.target_id || 'N/A'}</span>
              </div>
            </div>

            {(log.affected_users_count || 0) > 0 && (
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-orange-600" />
                  <p className="text-xs font-semibold text-orange-900">Impacto</p>
                </div>
                <p className="text-sm font-medium text-orange-700">
                  {log.affected_users_count} usuário(s) impactado(s)
                </p>
              </div>
            )}

            {log.notes && (
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <p className="text-xs font-semibold text-yellow-900 mb-2">Observações</p>
                <p className="text-sm text-gray-700">{log.notes}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="changes" className="space-y-4 mt-4">
            {log.changes ? (
              <>
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 mb-4">
                  <p className="text-xs text-blue-700 font-medium">
                    Comparação detalhada das alterações realizadas
                  </p>
                </div>
                <ChangesDiff before={log.changes.before} after={log.changes.after} />
              </>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="font-medium">Sem detalhes de alterações</p>
                <p className="text-sm mt-1">Este log não contém dados de comparação</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="technical" className="space-y-4 mt-4">
            <div className="bg-gray-50 p-4 rounded-lg border space-y-3">
              {log.ip_address && (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Globe className="w-4 h-4 text-gray-600" />
                    <p className="text-xs font-semibold text-gray-700">Endereço IP</p>
                  </div>
                  <p className="text-sm font-mono bg-white px-2 py-1 rounded border">
                    {log.ip_address}
                  </p>
                </div>
              )}

              {log.user_agent && (
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-1">User Agent</p>
                  <p className="text-xs text-gray-600 bg-white px-2 py-1 rounded border break-all">
                    {log.user_agent}
                  </p>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-gray-700 mb-1">ID do Log</p>
                <p className="text-xs font-mono text-gray-600 bg-white px-2 py-1 rounded border">
                  {log.id}
                </p>
              </div>

              {log.target_id && (
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-1">ID do Alvo</p>
                  <p className="text-xs font-mono text-gray-600 bg-white px-2 py-1 rounded border">
                    {log.target_id}
                  </p>
                </div>
              )}
            </div>

            {log.changes && (
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-2">Payload Completo (JSON)</p>
                <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto max-h-96">
                  <pre className="text-xs">
                    {JSON.stringify(log.changes, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}