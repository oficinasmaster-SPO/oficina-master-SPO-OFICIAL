import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Clock, Mail, MessageCircle, Bell } from "lucide-react";

export default function DispatchHistoryReport({ open, onOpenChange, disparoId }) {
  const [selectedType, setSelectedType] = useState("all");

  const { data: deliveries = [], isLoading } = useQuery({
    queryKey: ["dispatch-deliveries", disparoId],
    queryFn: async () => {
      try {
        const items = await base44.entities.DispatchDelivery.filter({
          batch_dispatch_id: disparoId
        });
        return items || [];
      } catch (error) {
        return [];
      }
    },
    enabled: open && !!disparoId
  });

  const stats = {
    total: deliveries.length,
    enviado: deliveries.filter(d => d.status === "enviado").length,
    falha: deliveries.filter(d => d.status === "falha").length,
    lido: deliveries.filter(d => d.status === "lido").length,
    pendente: deliveries.filter(d => d.status === "pendente").length,
    email: deliveries.filter(d => d.delivery_type === "email").length,
    whatsapp: deliveries.filter(d => d.delivery_type === "whatsapp").length,
    notificacao: deliveries.filter(d => d.delivery_type === "notification").length
  };

  const filteredDeliveries = selectedType === "all" 
    ? deliveries 
    : deliveries.filter(d => d.delivery_type === selectedType);

  const getStatusIcon = (status) => {
    switch (status) {
      case "enviado": return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case "falha": return <AlertCircle className="w-4 h-4 text-red-600" />;
      case "lido": return <CheckCircle2 className="w-4 h-4 text-blue-600" />;
      case "pendente": return <Clock className="w-4 h-4 text-amber-600" />;
      default: return null;
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "email": return <Mail className="w-4 h-4" />;
      case "whatsapp": return <MessageCircle className="w-4 h-4" />;
      case "notification": return <Bell className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Histórico de Envios</DialogTitle>
        </DialogHeader>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-xs text-blue-600 font-semibold">TOTAL</p>
            <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <p className="text-xs text-green-600 font-semibold">ENVIADOS</p>
            <p className="text-2xl font-bold text-green-900">{stats.enviado}</p>
          </div>
          <div className="bg-red-50 p-3 rounded-lg">
            <p className="text-xs text-red-600 font-semibold">FALHAS</p>
            <p className="text-2xl font-bold text-red-900">{stats.falha}</p>
          </div>
          <div className="bg-amber-50 p-3 rounded-lg">
            <p className="text-xs text-amber-600 font-semibold">PENDENTES</p>
            <p className="text-2xl font-bold text-amber-900">{stats.pendente}</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={selectedType} onValueChange={setSelectedType}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">Todos ({stats.total})</TabsTrigger>
            <TabsTrigger value="email">E-mail ({stats.email})</TabsTrigger>
            <TabsTrigger value="whatsapp">WhatsApp ({stats.whatsapp})</TabsTrigger>
            <TabsTrigger value="notification">Notif ({stats.notificacao})</TabsTrigger>
          </TabsList>

          <TabsContent value={selectedType} className="mt-4">
            {isLoading ? (
              <div className="text-center py-8">Carregando...</div>
            ) : filteredDeliveries.length === 0 ? (
              <div className="text-center py-8 text-gray-500">Nenhum envio registrado</div>
            ) : (
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {filteredDeliveries.map((delivery) => (
                  <div key={delivery.id} className="border rounded-lg p-3 flex items-start justify-between hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getTypeIcon(delivery.delivery_type)}
                        <p className="font-medium text-sm">{delivery.workshop_name}</p>
                        <Badge variant="outline" className="text-xs">
                          {delivery.delivery_type}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600">{delivery.recipient}</p>
                      {delivery.sent_at && (
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(delivery.sent_at).toLocaleString("pt-BR")}
                        </p>
                      )}
                      {delivery.error_message && (
                        <p className="text-xs text-red-600 mt-1">❌ {delivery.error_message}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        className={`text-xs ${
                          delivery.status === "enviado" ? "bg-green-100 text-green-800" :
                          delivery.status === "falha" ? "bg-red-100 text-red-800" :
                          delivery.status === "lido" ? "bg-blue-100 text-blue-800" :
                          "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {delivery.status}
                      </Badge>
                      {getStatusIcon(delivery.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}