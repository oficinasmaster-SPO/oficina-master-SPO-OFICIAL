import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, Loader2 } from 'lucide-react';

export default function ClientesPendentesFollowUp() {
  const { user } = useAuth();
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const buscarClientesPendentes = async () => {
      try {
        // Buscar follow-ups NÃO concluídos (pendentes/não realizados)
        const reminders = await base44.entities.FollowUpReminder.filter(
          { consultor_id: user.id, is_completed: false },
          '-reminder_date'
        );

        // Agrupar por cliente (workshop_name) e contar
        const clientesMap = new Map();
        reminders.forEach(r => {
          const nome = r.workshop_name || 'Sem cliente';
          if (!clientesMap.has(nome)) {
            clientesMap.set(nome, {
              nome,
              pendentes: 0,
              proximaDataReminder: r.reminder_date,
            });
          }
          const cliente = clientesMap.get(nome);
          cliente.pendentes += 1;
        });

        setClientes(Array.from(clientesMap.values()).sort((a, b) => b.pendentes - a.pendentes));
      } catch (error) {
        console.error('Erro ao buscar clientes pendentes:', error);
      } finally {
        setLoading(false);
      }
    };

    buscarClientesPendentes();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (clientes.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Nenhum follow-up pendente! 🎉</p>
      </div>
    );
  }

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardContent className="p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-orange-600" />
          Clientes com Follow-ups Pendentes ({clientes.length})
        </h3>
        
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {clientes.map((cliente, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 bg-white rounded border border-orange-100 hover:bg-orange-50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{cliente.nome}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Próximo: {new Date(cliente.proximaDataReminder).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div className="ml-3 px-2.5 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold flex-shrink-0">
                {cliente.pendentes}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}