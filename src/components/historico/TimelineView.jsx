import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Calendar, CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function TimelineView({ items, onViewDetails, getTypeIcon }) {
  const getStatusBadge = (status) => {
    if (status === 'concluido') {
      return <Badge className="bg-green-100 text-green-700 border-green-200 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Concluído</Badge>;
    }
    return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 flex items-center gap-1"><Clock className="w-3 h-3" /> Pendente</Badge>;
  };

  // Group by date
  const groupedByDate = React.useMemo(() => {
    const groups = {};
    items.forEach(item => {
      const dateKey = format(new Date(item.date), "MMMM yyyy", { locale: ptBR });
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(item);
    });
    return groups;
  }, [items]);

  return (
    <div className="space-y-8">
      {Object.entries(groupedByDate).map(([dateKey, groupItems]) => (
        <div key={dateKey} className="relative">
          <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg shadow-md mb-4 z-10">
            <h3 className="text-lg font-bold capitalize">{dateKey}</h3>
          </div>

          <div className="relative space-y-4 pl-8 border-l-4 border-blue-200">
            {groupItems.map((item, index) => {
              const TypeIcon = getTypeIcon(item.type);
              
              return (
                <div key={`${item.type}-${item.id}`} className="relative">
                  <div className="absolute -left-10 top-6 w-6 h-6 rounded-full bg-blue-600 border-4 border-white shadow-md"></div>
                  
                  <Card className="shadow-lg hover:shadow-xl transition-shadow ml-4">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                          <TypeIcon className="w-6 h-6" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center flex-wrap gap-2 mb-2">
                            <Badge variant="secondary" className="font-normal">
                              {item.typeName}
                            </Badge>
                            {getStatusBadge(item.status)}
                            <span className="text-xs text-gray-500 flex items-center">
                              <Calendar className="w-3 h-3 mr-1" />
                              {format(new Date(item.date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                          <h3 className="font-bold text-gray-900 text-lg mb-1">
                            {item.title}
                          </h3>
                          {item.score && (
                            <p className="text-sm text-gray-600">
                              Resultado: <span className="font-medium">{item.score}</span>
                            </p>
                          )}
                        </div>

                        <Button
                          size="sm"
                          onClick={() => onViewDetails(item)}
                          className="bg-blue-600 hover:bg-blue-700 flex-shrink-0"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Ver
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}