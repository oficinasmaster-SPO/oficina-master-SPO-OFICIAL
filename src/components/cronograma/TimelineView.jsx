import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, CheckCircle2, AlertCircle, Eye } from "lucide-react";
import { format, isToday, isPast, isFuture } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function TimelineView({ activities, onStatusChange, onViewDetails }) {
  const today = new Date();
  
  const categorizedActivities = {
    atrasadas: activities.filter(a => 
      isPast(new Date(a.scheduled_date)) && 
      !isToday(new Date(a.scheduled_date)) && 
      a.status === 'pendente'
    ),
    hoje: activities.filter(a => isToday(new Date(a.scheduled_date))),
    proximas: activities.filter(a => 
      isFuture(new Date(a.scheduled_date)) && 
      !isToday(new Date(a.scheduled_date))
    ),
    realizadas: activities.filter(a => a.status === 'concluida')
  };

  const getStatusBadge = (status) => {
    const variants = {
      pendente: { color: "bg-yellow-100 text-yellow-800 border-yellow-300", icon: Clock, label: "Pendente" },
      em_andamento: { color: "bg-blue-100 text-blue-800 border-blue-300", icon: AlertCircle, label: "Em Andamento" },
      concluida: { color: "bg-green-100 text-green-800 border-green-300", icon: CheckCircle2, label: "Concluída" }
    };
    const variant = variants[status] || variants.pendente;
    const Icon = variant.icon;
    return (
      <Badge className={`${variant.color} border`}>
        <Icon className="w-3 h-3 mr-1" />
        {variant.label}
      </Badge>
    );
  };

  const renderSection = (title, items, colorClass, icon) => {
    if (items.length === 0) return null;
    
    return (
      <div className="mb-8">
        <div className={`flex items-center gap-3 mb-4 pb-2 border-b-2 ${colorClass}`}>
          {React.createElement(icon, { className: "w-5 h-5" })}
          <h3 className="text-lg font-bold">{title}</h3>
          <Badge variant="secondary">{items.length}</Badge>
        </div>
        
        <div className="space-y-3 pl-6 border-l-4" style={{ borderColor: colorClass.includes('red') ? '#ef4444' : colorClass.includes('blue') ? '#3b82f6' : colorClass.includes('green') ? '#22c55e' : '#8b5cf6' }}>
          {items.map((activity) => (
            <Card key={activity.id} className="hover:shadow-md transition-all ml-4 relative">
              <div className="absolute -left-10 top-6 w-4 h-4 rounded-full bg-white border-4" style={{ borderColor: colorClass.includes('red') ? '#ef4444' : colorClass.includes('blue') ? '#3b82f6' : colorClass.includes('green') ? '#22c55e' : '#8b5cf6' }} />
              
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-gray-900">{activity.title}</h4>
                      {activity.auto_generated && (
                        <Badge variant="outline" className="text-xs">Auto</Badge>
                      )}
                    </div>
                    
                    {activity.description && (
                      <p className="text-sm text-gray-600 mb-3">{activity.description}</p>
                    )}
                    
                    <div className="flex flex-wrap items-center gap-2">
                      {getStatusBadge(activity.status)}
                      <Badge variant="outline" className="text-xs">
                        {activity.type}
                      </Badge>
                      <Badge variant="outline" className="flex items-center gap-1 text-xs">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(activity.scheduled_date), "dd/MM/yyyy", { locale: ptBR })}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onViewDetails(activity)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    
                    {activity.status === "pendente" && (
                      <Button
                        size="sm"
                        onClick={() => onStatusChange(activity.id, "em_andamento")}
                      >
                        Iniciar
                      </Button>
                    )}
                    {activity.status === "em_andamento" && (
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => onStatusChange(activity.id, "concluida")}
                      >
                        Concluir
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {renderSection(
        "⚠️ Atrasadas", 
        categorizedActivities.atrasadas, 
        "border-red-500 text-red-700",
        AlertCircle
      )}
      
      {renderSection(
        "📅 Hoje", 
        categorizedActivities.hoje, 
        "border-blue-500 text-blue-700",
        Calendar
      )}
      
      {renderSection(
        "🔜 Próximas", 
        categorizedActivities.proximas, 
        "border-purple-500 text-purple-700",
        Clock
      )}
      
      {renderSection(
        "✅ Realizadas", 
        categorizedActivities.realizadas, 
        "border-green-500 text-green-700",
        CheckCircle2
      )}
      
      {activities.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Nenhuma atividade encontrada</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}