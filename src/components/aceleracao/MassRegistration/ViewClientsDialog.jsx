import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function ViewClientsDialog({ open, onOpenChange, clientIds, groupName }) {
  const { data: clientsData = [] } = useQuery({
    queryKey: ["clients-in-group", clientIds],
    queryFn: async () => {
      if (!clientIds || clientIds.length === 0) return [];
      const data = await Promise.all(
        clientIds.map(id => base44.entities.Workshop.get(id).catch(() => null))
      );
      return data.filter(Boolean);
    },
    enabled: open && clientIds && clientIds.length > 0
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Clientes do Grupo: {groupName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {clientsData.length > 0 ? (
            <div className="space-y-2">
              {clientsData.map((client, idx) => (
                <div key={client.id} className="p-3 border rounded-lg bg-gray-50 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-sm">{idx + 1}. {client.name}</p>
                    <p className="text-xs text-gray-600">{client.city} • {client.planoAtual}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-600">Nenhum cliente encontrado</p>
          )}
          <div className="text-right text-xs text-gray-600 pt-2 border-t">
            Total: {clientsData.length} cliente(s)
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}