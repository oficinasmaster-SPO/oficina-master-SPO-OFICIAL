import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Building2, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ClientesStatusModal({ clientes, status, onClose }) {
  const getStatusInfo = () => {
    switch(status) {
      case 'crescente':
        return { title: 'Clientes Crescendo', color: 'green' };
      case 'decrescente':
        return { title: 'Clientes Decrescendo', color: 'red' };
      case 'estagnado':
        return { title: 'Clientes Estagnados', color: 'yellow' };
      case 'nao_responde':
        return { title: 'Clientes que Não Respondem', color: 'gray' };
      default:
        return { title: 'Clientes', color: 'blue' };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <CardHeader className="border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">{statusInfo.title}</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Total: {clientes.length} cliente(s)
          </p>
        </CardHeader>
        <CardContent className="pt-6 overflow-y-auto flex-1">
          {clientes.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>Nenhum cliente encontrado nesta categoria.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {clientes.map((cliente) => (
                <div
                  key={cliente.workshop_id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {cliente.workshop_name}
                        </h3>
                        <Badge className={`bg-${statusInfo.color}-100 text-${statusInfo.color}-800`}>
                          {cliente.plano || 'Não definido'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-gray-400" />
                          <span>{cliente.workshop_cidade}/{cliente.workshop_estado}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {cliente.ultimo_atendimento ? (
                            <span>Último: {format(new Date(cliente.ultimo_atendimento), "dd/MM/yyyy", { locale: ptBR })}</span>
                          ) : (
                            <span className="text-gray-400">Sem atendimento</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span>{cliente.consultor_nome || 'Não atribuído'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}