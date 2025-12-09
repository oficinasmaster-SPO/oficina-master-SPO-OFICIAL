import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, MessageSquare, User, ThumbsUp, ThumbsDown, Users, Target } from "lucide-react";
import AdvancedFilter from "@/components/shared/AdvancedFilter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import DynamicHelpSystem from "@/components/help/DynamicHelpSystem";

export default function Feedbacks() {
  const [filterParams, setFilterParams] = useState({ search: "", type: "all", status: "all" });

  // Fetch feedbacks and employees
  const { data: feedbacksData = [], isLoading } = useQuery({
    queryKey: ['all-feedbacks'],
    queryFn: async () => {
      try {
        const fbs = await base44.entities.EmployeeFeedback.list('-created_date', 100);
        const emps = await base44.entities.Employee.list();
        
        const empMap = {};
        if(Array.isArray(emps)) emps.forEach(e => empMap[e.id] = e);
        
        return Array.isArray(fbs) ? fbs.map(fb => ({
          ...fb,
          employee_name: empMap[fb.employee_id]?.full_name || "Desconhecido",
          employee_position: empMap[fb.employee_id]?.position || "-"
        })) : [];
      } catch (error) {
        console.error("Error fetching feedbacks:", error);
        return [];
      }
    }
  });

  // Filter logic (Frontend for now, backend optimization would be next step)
  const filteredFeedbacks = feedbacksData.filter(item => {
    const matchesSearch = 
      item.content.toLowerCase().includes(filterParams.search.toLowerCase()) ||
      item.employee_name.toLowerCase().includes(filterParams.search.toLowerCase());
    
    const matchesType = filterParams.type === 'all' || item.type === filterParams.type;
    
    // Status filter logic
    const itemStatus = item.action_plan_status || 'pendente';
    const matchesStatus = filterParams.status === 'all' || itemStatus === filterParams.status;

    return matchesSearch && matchesType && matchesStatus;
  });

  const filterConfig = [
    {
      key: "type",
      label: "Tipo de Feedback",
      type: "select",
      defaultValue: "all",
      options: [
        { value: "all", label: "Todos" },
        { value: "positivo", label: "Positivo" },
        { value: "negativo", label: "Negativo" },
        { value: "one_on_one", label: "1:1" }
      ]
    },
    {
      key: "status",
      label: "Status Plano Ação",
      type: "select",
      defaultValue: "all",
      options: [
        { value: "all", label: "Todos" },
        { value: "pendente", label: "Pendente" },
        { value: "em_andamento", label: "Em Andamento" },
        { value: "concluido", label: "Concluído" }
      ]
    }
  ];

  const feedbackIcons = {
    positivo: ThumbsUp,
    negativo: ThumbsDown,
    one_on_one: Users
  };

  const feedbackColors = {
    positivo: "bg-green-50 border-green-200 text-green-700",
    negativo: "bg-red-50 border-red-200 text-red-700",
    one_on_one: "bg-blue-50 border-blue-200 text-blue-700"
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
      <DynamicHelpSystem pageName="Feedbacks" />
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Central de Feedbacks</h1>
                <p className="text-gray-600">Acompanhe o desenvolvimento de toda a equipe</p>
            </div>
        </div>

        <AdvancedFilter 
            onFilter={setFilterParams} 
            filterConfig={filterConfig} 
            placeholder="Buscar por conteúdo ou colaborador..."
        />

        {isLoading ? (
           <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
        ) : (
            <div className="grid grid-cols-1 gap-4">
                {filteredFeedbacks.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 bg-white rounded-lg shadow-sm">
                        <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>Nenhum feedback encontrado.</p>
                    </div>
                ) : (
                    filteredFeedbacks.map(fb => {
                        const Icon = feedbackIcons[fb.type] || MessageSquare;
                        return (
                            <Card key={fb.id} className="hover:shadow-md transition-shadow">
                                <CardContent className="p-5">
                                    <div className="flex items-start gap-4">
                                        <div className={`p-3 rounded-full ${feedbackColors[fb.type]} shrink-0`}>
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between mb-2">
                                                <div>
                                                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                                        {fb.employee_name}
                                                        <Badge variant="outline" className="font-normal text-xs">
                                                            {fb.employee_position}
                                                        </Badge>
                                                    </h3>
                                                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                                       <User className="w-3 h-3" />
                                                       {fb.created_by} • {fb.created_date ? format(new Date(fb.created_date), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR }) : 'Data não disponível'}
                                                    </p>
                                                </div>
                                                <div className="mt-2 md:mt-0">
                                                    <Badge variant="secondary" className="capitalize">
                                                        {fb.type.replace('_', ' ')}
                                                    </Badge>
                                                </div>
                                            </div>
                                            
                                            <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded border border-gray-100">
                                                {fb.content}
                                            </div>

                                            {fb.action_plan && (
                                                <div className="mt-3 flex items-center gap-3 text-sm bg-blue-50 p-2 rounded text-blue-800 border border-blue-100">
                                                    <Target className="w-4 h-4" />
                                                    <span className="font-medium">Plano:</span>
                                                    <span className="flex-1 truncate">{fb.action_plan}</span>
                                                    <Badge className={
                                                        fb.action_plan_status === 'concluido' ? 'bg-green-100 text-green-800' : 
                                                        fb.action_plan_status === 'em_andamento' ? 'bg-blue-100 text-blue-800' : 
                                                        'bg-yellow-100 text-yellow-800'
                                                    }>
                                                        {fb.action_plan_status?.replace('_', ' ') || 'Pendente'}
                                                    </Badge>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })
                )}
            </div>
        )}
      </div>
    </div>
  );
}