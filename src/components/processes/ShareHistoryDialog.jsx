import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Eye, Clock, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ShareHistoryDialog({ open, onClose, process }) {
  const { data: shares = [], isLoading } = useQuery({
    queryKey: ['process-shares', process?.id],
    queryFn: async () => {
      if (!process?.id) return [];
      return await base44.entities.ProcessShare.filter({ 
        process_id: process.id 
      });
    },
    enabled: !!process?.id && open
  });

  const getStatusBadge = (status) => {
    const config = {
      enviado: { label: "Enviado", className: "bg-blue-100 text-blue-700" },
      visualizado: { label: "Visualizado", className: "bg-green-100 text-green-700" },
      em_uso: { label: "Em Uso", className: "bg-purple-100 text-purple-700" }
    };
    const cfg = config[status] || config.enviado;
    return <Badge className={cfg.className}>{cfg.label}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" />
            Histórico de Compartilhamentos
          </DialogTitle>
          <p className="text-sm text-gray-600">
            Processo: <strong>{process?.title}</strong>
          </p>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Carregando...</div>
          ) : shares.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Mail className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p>Nenhum compartilhamento registrado ainda</p>
            </div>
          ) : (
            shares.map((share) => (
              <Card key={share.id} className="border-2">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-600" />
                      <div>
                        <p className="font-semibold text-gray-900">{share.shared_with_name}</p>
                        <p className="text-xs text-gray-500">{share.shared_with_email}</p>
                      </div>
                    </div>
                    {getStatusBadge(share.status)}
                  </div>

                  {share.message && (
                    <div className="bg-gray-50 p-3 rounded-lg mb-3">
                      <p className="text-sm text-gray-700 italic">"{share.message}"</p>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>
                        Enviado: {format(new Date(share.email_sent_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    {share.viewed_at && (
                      <div className="flex items-center gap-1">
                        <Eye className="w-3 h-3 text-green-600" />
                        <span className="text-green-600">
                          Visto: {format(new Date(share.viewed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-gray-500 mt-2">
                    Por: <strong>{share.shared_by_name}</strong>
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}