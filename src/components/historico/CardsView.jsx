import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Calendar, CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function CardsView({ items, onViewDetails, getTypeIcon }) {
  const getStatusBadge = (status) => {
    if (status === 'concluido') {
      return <Badge className="bg-green-100 text-green-700 border-green-200 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Concluído</Badge>;
    }
    return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 flex items-center gap-1"><Clock className="w-3 h-3" /> Pendente</Badge>;
  };

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const TypeIcon = getTypeIcon(item.type);

        return (
          <Card key={`${item.type}-${item.id}`} className="shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                    <TypeIcon className="w-6 h-6" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-2 mb-1">
                      <Badge variant="secondary" className="font-normal">
                        {item.typeName}
                      </Badge>
                      {getStatusBadge(item.status)}
                      <span className="text-xs text-gray-500 flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {format(new Date(item.date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg truncate">
                      {item.title}
                    </h3>
                    {item.score && (
                      <p className="text-sm text-gray-600">
                        Resultado: <span className="font-medium">{item.score}</span>
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  onClick={() => onViewDetails(item)}
                  className="bg-blue-600 hover:bg-blue-700 w-full md:w-auto whitespace-nowrap"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Ver Detalhes
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}