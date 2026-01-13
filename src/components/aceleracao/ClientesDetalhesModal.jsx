import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Building2, User, Calendar, TrendingUp, TrendingDown, Minus, MessageCircleOff, Eye, MapPin, DollarSign, Users, Phone, Mail, Briefcase, Clock, Target, ExternalLink } from "lucide-react";
import ClientDetailPanel from "./ClientDetailPanel";

export default function ClientesDetalhesModal({ isOpen, onClose, clientes, tipo, atendimentos = [] }) {
  const getStatusIcon = (status) => {
    const icons = {
      crescente: <TrendingUp className="w-4 h-4 text-green-600" />,
      decrescente: <TrendingDown className="w-4 h-4 text-red-600" />,
      estagnado: <Minus className="w-4 h-4 text-yellow-600" />,
      nao_responde: <MessageCircleOff className="w-4 h-4 text-gray-600" />
    };
    return icons[status] || null;
  };

  const getTitulo = () => {
    if (tipo === 'ativos') return 'Clientes Ativos';
    if (tipo === 'crescente') return 'Clientes - Desempenho Crescente';
    if (tipo === 'decrescente') return 'Clientes - Desempenho Decrescente';
    if (tipo === 'estagnado') return 'Clientes - Desempenho Estagnado';
    if (tipo === 'nao_responde') return 'Clientes - Não Respondem';
    return 'Clientes';
  };

  const getUltimoAtendimento = (workshopId) => {
    const atendimentosCliente = atendimentos.filter(a => a.workshop_id === workshopId);
    if (atendimentosCliente.length === 0) return null;
    
    const atendimentosRealizados = atendimentosCliente
      .filter(a => a.status === 'realizado')
      .sort((a, b) => new Date(b.data_realizada) - new Date(a.data_realizada));
    
    return atendimentosRealizados[0];
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {tipo && getStatusIcon(tipo)}
            {getTitulo()}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3">
          {clientes && clientes.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Nenhum cliente encontrado</p>
          ) : (
            clientes?.map((cliente) => {
              const ultimoAtendimento = getUltimoAtendimento(cliente.id);
              
              return (
                <div key={cliente.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Building2 className="w-5 h-5 text-blue-600" />
                      <div>
                        <h3 className="font-semibold text-gray-900">{cliente.name}</h3>
                        <p className="text-sm text-gray-600">{cliente.city} - {cliente.state}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      {cliente.planoAtual || 'FREE'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <User className="w-4 h-4" />
                      <span>Fase {cliente.maturity_level || 1}</span>
                    </div>
                    {ultimoAtendimento ? (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>
                          Último contato: {format(new Date(ultimoAtendimento.data_realizada), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-gray-400">
                        <Calendar className="w-4 h-4" />
                        <span>Sem atendimentos</span>
                      </div>
                    )}
                  </div>

                  {cliente.segment && (
                    <div className="mt-2">
                      <Badge variant="outline" className="text-xs">{cliente.segment}</Badge>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}