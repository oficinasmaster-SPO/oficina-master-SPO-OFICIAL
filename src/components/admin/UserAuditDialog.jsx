import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Clock, User } from "lucide-react";
import { format } from "date-fns";

export default function UserAuditDialog({ open, onClose, user }) {
  const auditLog = user?.audit_log || [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Auditoria: {user?.full_name}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-96">
          {auditLog.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Nenhuma alteração registrada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {auditLog.map((log, index) => (
                <div 
                  key={index} 
                  className="border rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <Badge className={
                      log.action === 'created' ? 'bg-green-100 text-green-700' :
                      log.action === 'profile_changed' ? 'bg-orange-100 text-orange-700' :
                      log.action === 'status_changed' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }>
                      {log.action === 'created' && '✨ Criado'}
                      {log.action === 'profile_changed' && '🔄 Perfil Alterado'}
                      {log.action === 'status_changed' && '📊 Status Alterado'}
                      {log.action === 'updated' && '✏️ Atualizado'}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      {format(new Date(log.changed_at), 'dd/MM/yyyy HH:mm')}
                    </div>
                  </div>

                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2 text-gray-700">
                      <User className="w-3 h-3" />
                      <span className="font-medium">{log.changed_by}</span>
                      <span className="text-gray-500">({log.changed_by_email})</span>
                    </div>

                    {log.field_changed && (
                      <div className="mt-2 p-2 bg-white rounded border">
                        <p className="text-xs font-semibold text-gray-600 mb-1">
                          Campo: {log.field_changed}
                        </p>
                        {log.old_value && (
                          <p className="text-xs text-red-600">
                            ❌ Antes: {log.old_value}
                          </p>
                        )}
                        {log.new_value && (
                          <p className="text-xs text-green-600">
                            ✅ Depois: {log.new_value}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}