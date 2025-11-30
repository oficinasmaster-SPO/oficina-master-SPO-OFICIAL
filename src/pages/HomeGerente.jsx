import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";

export default function HomeGerente() {
  const navigate = useNavigate();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Visão do Gerente</h1>
          <p className="text-gray-500">Acompanhamento operacional e de equipe</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate(createPageUrl('Colaboradores'))}>
            <Users className="w-4 h-4 mr-2" />
            Minha Equipe
          </Button>
          <Button onClick={() => navigate(createPageUrl('Tarefas'))}>
            Delegar Tarefa
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">OS em Aberto</p>
                <h3 className="text-2xl font-bold mt-1">0</h3>
              </div>
              <div className="bg-blue-100 p-2 rounded-full">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Atrasos</p>
                <h3 className="text-2xl font-bold mt-1 text-red-600">0</h3>
              </div>
              <div className="bg-red-100 p-2 rounded-full">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Finalizadas Hoje</p>
                <h3 className="text-2xl font-bold mt-1 text-green-600">0</h3>
              </div>
              <div className="bg-green-100 p-2 rounded-full">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Equipe Presente</p>
                <h3 className="text-2xl font-bold mt-1">0/0</h3>
              </div>
              <div className="bg-purple-100 p-2 rounded-full">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="h-96 flex items-center justify-center border-dashed">
          <p className="text-gray-400">Gráfico de Produção Diária (Fase 2)</p>
        </Card>
        <Card className="h-96 flex items-center justify-center border-dashed">
          <p className="text-gray-400">Lista de Prioridades da Oficina (Fase 2)</p>
        </Card>
      </div>
    </div>
  );
}