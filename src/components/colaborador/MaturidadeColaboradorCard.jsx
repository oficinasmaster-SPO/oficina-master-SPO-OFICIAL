import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, User, Lock, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const nivelLabels = {
  bebe: { 
    nome: "Bebê", 
    cor: "bg-red-100 text-red-700 border-red-300",
    descricao: "Nível inicial - necessita desenvolvimento básico"
  },
  crianca: { 
    nome: "Criança", 
    cor: "bg-orange-100 text-orange-700 border-orange-300",
    descricao: "Nível intermediário - em desenvolvimento"
  },
  adolescente: { 
    nome: "Adolescente", 
    cor: "bg-blue-100 text-blue-700 border-blue-300",
    descricao: "Nível avançado - quase autônomo"
  },
  adulto: { 
    nome: "Adulto", 
    cor: "bg-green-100 text-green-700 border-green-300",
    descricao: "Nível máximo - totalmente autônomo"
  }
};

const proximoNivel = {
  bebe: "crianca",
  crianca: "adolescente",
  adolescente: "adulto",
  adulto: null
};

export default function MaturidadeColaboradorCard({ employee, diagnostic }) {
  const navigate = useNavigate();

  if (!employee) return null;
  
  const nivelAtual = diagnostic?.maturity_level || "bebe";
  const nivelInfo = nivelLabels[nivelAtual] || nivelLabels.bebe;
  const dataAnalise = diagnostic?.created_date 
    ? new Date(diagnostic.created_date).toLocaleDateString('pt-BR')
    : 'Não realizada';

  const proximoNivelKey = proximoNivel[nivelAtual];
  const proximoNivelInfo = proximoNivelKey ? nivelLabels[proximoNivelKey] : null;

  const handleIniciarDiagnostico = () => {
    navigate(createPageUrl("DiagnosticoMaturidade"));
  };

  const handleVerResultado = () => {
    if (diagnostic?.id) {
      navigate(createPageUrl("ResultadoMaturidade") + `?id=${diagnostic.id}`);
    }
  };

  return (
    <Card className="border-2 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <User className="w-5 h-5 text-purple-600" />
          Maturidade do Colaborador
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Nível Atual</span>
          <Badge className={`${nivelInfo.cor} border text-base px-4 py-1`}>
            {nivelInfo.nome}
          </Badge>
        </div>
        
        <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
          <p className="font-semibold text-purple-900 mb-1">{nivelInfo.descricao}</p>
          <p className="text-sm text-gray-600">Última análise: {dataAnalise}</p>
        </div>

        {!diagnostic?.completed && (
          <div className="flex items-start gap-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
            <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-orange-800">
              Diagnóstico pendente. Realize a avaliação para identificar o nível de maturidade.
            </p>
          </div>
        )}

        {proximoNivelInfo && (
          <div className="p-4 rounded-lg border-2 bg-blue-50 border-blue-300">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <p className="text-sm font-semibold text-blue-900">
                Próximo Nível: {proximoNivelInfo.nome}
              </p>
            </div>
            <p className="text-xs text-blue-700">
              {proximoNivelInfo.descricao}
            </p>
          </div>
        )}

        {!proximoNivelInfo && diagnostic?.completed && (
          <div className="p-4 rounded-lg border-2 bg-green-50 border-green-300">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <p className="text-sm font-semibold text-green-900">
                Nível máximo alcançado! 🎉
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          {diagnostic?.completed ? (
            <>
              <Button 
                onClick={handleVerResultado}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                Ver Resultado
              </Button>
              <Button 
                onClick={handleIniciarDiagnostico}
                variant="outline"
                className="flex-1"
              >
                Refazer Diagnóstico
              </Button>
            </>
          ) : (
            <Button 
              onClick={handleIniciarDiagnostico}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              Iniciar Diagnóstico
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}