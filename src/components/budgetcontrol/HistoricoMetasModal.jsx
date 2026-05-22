import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, Lock, Unlock, User, Calendar, FileText, Shield } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function HistoricoMetasModal({ metaId, workshopId, mes }) {
  const [open, setOpen] = useState(false);

  const { data: historico, isLoading } = useQuery({
    queryKey: ['historico-metas', metaId, mes],
    queryFn: async () => {
      const response = await base44.functions.invoke('getHistoricoMetas', {
        meta_id: metaId,
        workshop_id: workshopId,
        mes
      });
      return response.data;
    },
    enabled: open && !!metaId && !!workshopId
  });

  if (!metaId) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <History className="w-4 h-4 mr-2" />
          Histórico
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            📜 Histórico de Alterações
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="text-center py-8">Carregando histórico...</div>
        ) : !historico || historico.total_versoes === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma alteração registrada
          </div>
        ) : (
          <ScrollArea className="h-[60vh]">
            <div className="space-y-4">
              {historico.historico.map((versao) => (
                <Card key={versao.version} className={versao.is_locked_change ? "border-amber-300 bg-amber-50" : ""}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant={versao.is_locked_change ? "destructive" : "secondary"}>
                          {versao.is_locked_change ? (
                            <><Lock className="w-3 h-3 mr-1" /> Mês Fechado</>
                          ) : (
                            `Versão ${versao.version}`
                          )}
                        </Badge>
                        {versao.version === 1 && (
                          <Badge variant="outline">Criação</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        {versao.formatted_date}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{versao.changed_by_nome}</span>
                        <span className="text-sm text-muted-foreground">({versao.changed_by_email})</span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div className="bg-red-50 p-3 rounded-lg">
                          <p className="text-xs text-red-700 font-semibold mb-1">Valor Anterior</p>
                          <p className="text-sm font-mono text-red-900">{versao.old_value || '—'}</p>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg">
                          <p className="text-xs text-green-700 font-semibold mb-1">Novo Valor</p>
                          <p className="text-sm font-mono text-green-900">{versao.new_value || '—'}</p>
                        </div>
                      </div>

                      <div className="mt-3">
                        <p className="text-xs text-muted-foreground mb-1">Campo alterado:</p>
                        <Badge variant="outline">{versao.field_changed}</Badge>
                      </div>

                      {versao.reason && (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <FileText className="w-4 h-4 text-blue-600" />
                            <p className="text-xs font-semibold text-blue-700">Justificativa</p>
                          </div>
                          <p className="text-sm text-blue-900">{versao.reason}</p>
                        </div>
                      )}

                      {versao.is_locked_change && (
                        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-amber-600" />
                            <p className="text-xs font-semibold text-amber-700">
                              ⚠️ Alteração em mês fechado
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}