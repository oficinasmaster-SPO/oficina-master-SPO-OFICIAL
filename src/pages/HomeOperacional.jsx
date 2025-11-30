import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wrench, ListTodo, ClipboardList, Clock, AlertTriangle } from "lucide-react";

export default function HomeOperacional() {
  const navigate = useNavigate();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Painel Técnico</h1>
          <p className="text-gray-500">Visão geral das suas atividades e ordens de serviço</p>
        </div>
        <Button onClick={() => navigate(createPageUrl('Tarefas'))}>
          <ListTodo className="w-4 h-4 mr-2" />
          Minhas Tarefas
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <ClipboardList className="w-5 h-5" />
              Ordens de Serviço
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900">0</div>
            <p className="text-sm text-blue-600">Atribuídas a você hoje</p>
          </CardContent>
        </Card>

        <Card className="bg-amber-50 border-amber-200">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-amber-700">
              <Clock className="w-5 h-5" />
              Horas Produtivas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-900">0h</div>
            <p className="text-sm text-amber-600">Registradas esta semana</p>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-green-700">
              <Wrench className="w-5 h-5" />
              Eficiência
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900">-%</div>
            <p className="text-sm text-green-600">Meta atingida</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Atividades Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
            <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-gray-400" />
            <p>Nenhuma atividade registrada recentemente.</p>
            <Button variant="link" className="mt-2">Iniciar nova OS</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}