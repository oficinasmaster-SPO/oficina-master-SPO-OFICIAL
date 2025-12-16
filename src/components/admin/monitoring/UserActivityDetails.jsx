import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, MousePointer, Eye } from "lucide-react";

export default function UserActivityDetails({ user, activities }) {
  const getActivityIcon = (type) => {
    switch(type) {
      case 'page_view': return <Eye className="w-4 h-4" />;
      case 'action': return <MousePointer className="w-4 h-4" />;
      case 'idle_start': return <Clock className="w-4 h-4" />;
      default: return <Eye className="w-4 h-4" />;
    }
  };

  const getActivityColor = (type) => {
    switch(type) {
      case 'page_view': return 'bg-blue-100 text-blue-700';
      case 'action': return 'bg-green-100 text-green-700';
      case 'idle_start': return 'bg-yellow-100 text-yellow-700';
      case 'idle_end': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Atividades de {user.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.length === 0 ? (
            <p className="text-center py-8 text-gray-500">
              Nenhuma atividade registrada
            </p>
          ) : (
            <div className="space-y-2">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className={`p-2 rounded-lg ${getActivityColor(activity.activity_type)}`}>
                    {getActivityIcon(activity.activity_type)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900">
                        {activity.page_name || activity.activity_type}
                      </p>
                      <span className="text-xs text-gray-500">
                        {activity.timestamp 
                          ? format(new Date(activity.timestamp), "HH:mm:ss", { locale: ptBR })
                          : '-'}
                      </span>
                    </div>
                    
                    {activity.page_url && (
                      <p className="text-sm text-gray-600 mt-1">{activity.page_url}</p>
                    )}
                    
                    {activity.time_spent_seconds > 0 && (
                      <Badge variant="outline" className="mt-2 text-xs">
                        {Math.floor(activity.time_spent_seconds / 60)}min {activity.time_spent_seconds % 60}s
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}