import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, MousePointer, Eye, LogIn, LogOut, Search, Filter } from "lucide-react";

export default function UserActivityDetails({ user, activities }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activityTypeFilter, setActivityTypeFilter] = useState("all");
  
  const filteredActivities = activities.filter(a => {
    const matchSearch = a.page_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       a.page_url?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       a.action_description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchType = activityTypeFilter === "all" || a.activity_type === activityTypeFilter;
    
    return matchSearch && matchType;
  });
  const getActivityIcon = (type) => {
    switch(type) {
      case 'page_view': return <Eye className="w-4 h-4" />;
      case 'action': return <MousePointer className="w-4 h-4" />;
      case 'login': return <LogIn className="w-4 h-4" />;
      case 'logout': return <LogOut className="w-4 h-4" />;
      case 'idle_start': return <Clock className="w-4 h-4" />;
      case 'idle_end': return <Clock className="w-4 h-4" />;
      default: return <Eye className="w-4 h-4" />;
    }
  };

  const getActivityColor = (type) => {
    switch(type) {
      case 'page_view': return 'bg-blue-100 text-blue-700';
      case 'action': return 'bg-green-100 text-green-700';
      case 'login': return 'bg-green-100 text-green-700';
      case 'logout': return 'bg-red-100 text-red-700';
      case 'idle_start': return 'bg-yellow-100 text-yellow-700';
      case 'idle_end': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };
  
  const getActivityLabel = (type) => {
    switch(type) {
      case 'page_view': return 'Visualização';
      case 'action': return 'Ação';
      case 'login': return 'Login';
      case 'logout': return 'Logout';
      case 'idle_start': return 'Inativo';
      case 'idle_end': return 'Retornou';
      default: return type;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <CardTitle>Atividades de {user.name}</CardTitle>
            <Badge variant="outline">{filteredActivities.length} atividades</Badge>
          </div>
          
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar página ou ação..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={activityTypeFilter} onValueChange={setActivityTypeFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="page_view">Páginas</SelectItem>
                <SelectItem value="login">Login</SelectItem>
                <SelectItem value="logout">Logout</SelectItem>
                <SelectItem value="action">Ações</SelectItem>
                <SelectItem value="idle_start">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {filteredActivities.length === 0 ? (
            <p className="text-center py-8 text-gray-500">
              {activities.length === 0 ? "Nenhuma atividade registrada" : "Nenhuma atividade encontrada com os filtros aplicados"}
            </p>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className={`p-2 rounded-lg ${getActivityColor(activity.activity_type)}`}>
                    {getActivityIcon(activity.activity_type)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">
                          {activity.page_name || getActivityLabel(activity.activity_type)}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {getActivityLabel(activity.activity_type)}
                        </Badge>
                      </div>
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