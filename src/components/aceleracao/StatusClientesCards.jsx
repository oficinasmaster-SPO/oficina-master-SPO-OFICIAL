import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Minus, UserX } from "lucide-react";

export default function StatusClientesCards({ 
  crescendo, 
  decrescendo, 
  estagnados, 
  naoRespondem,
  loading,
  onViewDetails 
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card 
        className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 hover:border-green-300 hover:shadow-lg transition-all cursor-pointer"
        onClick={() => onViewDetails('crescente')}
      >
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Crescendo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold text-green-900 mb-3">
            {loading ? "..." : crescendo}
          </p>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-green-700 hover:text-green-900 hover:bg-green-100"
          >
            Ver Detalhes →
          </Button>
        </CardContent>
      </Card>

      <Card 
        className="bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-200 hover:border-red-300 hover:shadow-lg transition-all cursor-pointer"
        onClick={() => onViewDetails('decrescente')}
      >
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-red-700 flex items-center gap-2">
            <TrendingDown className="w-5 h-5" />
            Decrescendo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold text-red-900 mb-3">
            {loading ? "..." : decrescendo}
          </p>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-red-700 hover:text-red-900 hover:bg-red-100"
          >
            Ver Detalhes →
          </Button>
        </CardContent>
      </Card>

      <Card 
        className="bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-200 hover:border-yellow-300 hover:shadow-lg transition-all cursor-pointer"
        onClick={() => onViewDetails('estagnado')}
      >
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-yellow-700 flex items-center gap-2">
            <Minus className="w-5 h-5" />
            Estagnados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold text-yellow-900 mb-3">
            {loading ? "..." : estagnados}
          </p>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-yellow-700 hover:text-yellow-900 hover:bg-yellow-100"
          >
            Ver Detalhes →
          </Button>
        </CardContent>
      </Card>

      <Card 
        className="bg-gradient-to-br from-gray-50 to-slate-50 border-2 border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all cursor-pointer"
        onClick={() => onViewDetails('nao_responde')}
      >
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <UserX className="w-5 h-5" />
            Não Respondem
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold text-gray-900 mb-3">
            {loading ? "..." : naoRespondem}
          </p>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-gray-700 hover:text-gray-900 hover:bg-gray-100"
          >
            Ver Detalhes →
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}