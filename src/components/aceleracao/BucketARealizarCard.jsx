import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Inbox } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function BucketARealizarCard() {
  const { data: bucketItems = [] } = useQuery({
    queryKey: ['bucket-atendimentos'],
    queryFn: async () => {
      const items = await base44.entities.ContractAttendance.filter(
        { status: 'pendente' },
        'scheduled_date',
        500
      );
      return items.filter(i => !i.consultoria_atendimento_id);
    },
    staleTime: 2 * 60 * 1000
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Inbox className="w-4 h-4 text-indigo-600" />
          Bucket de Novos Atendimentos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-indigo-600">{bucketItems.length}</div>
        <p className="text-xs text-gray-600 mt-1">
          {bucketItems.length === 0 
            ? 'Nenhum atendimento pendente'
            : `aguardando agendamento por consultor`}
        </p>
        {bucketItems.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {bucketItems.slice(0, 3).map((item) => (
              <div key={item.id} className="flex items-center justify-between text-xs">
                <span className="text-gray-700 truncate flex-1">{item.attendance_type_name?.replace(/_/g, ' ') || 'Tipo'}</span>
                <Badge variant="outline" className="text-[10px] ml-2 shrink-0">#{item.sequence_number || '-'}</Badge>
              </div>
            ))}
            {bucketItems.length > 3 && (
              <p className="text-xs text-indigo-500 font-medium">+{bucketItems.length - 3} mais</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}