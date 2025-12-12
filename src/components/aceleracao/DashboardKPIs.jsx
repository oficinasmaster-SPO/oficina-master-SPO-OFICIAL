import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Clock, CheckCircle2, Calendar, XCircle } from "lucide-react";

export default function DashboardKPIs({ 
  clientesAtivos, 
  horasDisponiveis, 
  reunioesRealizadas, 
  proximasReunioes,
  reunioesCanceladas,
  loading 
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Clientes Ativos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-blue-900">
            {loading ? "..." : clientesAtivos}
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Horas Disponíveis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-green-900">
            {loading ? "..." : `${horasDisponiveis}h`}
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-purple-700 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Reuniões Realizadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-purple-900">
            {loading ? "..." : reunioesRealizadas}
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-orange-700 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Próximas Reuniões
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-orange-900">
            {loading ? "..." : proximasReunioes}
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-red-700 flex items-center gap-2">
            <XCircle className="w-4 h-4" />
            Reuniões Canceladas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-red-900">
            {loading ? "..." : reunioesCanceladas}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}