import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, Users, TrendingUp, Calendar } from "lucide-react";

export default function CamadaEstrategica({ workshopId }) {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-700 to-purple-600 rounded-xl p-5 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Target className="w-5 h-5 text-purple-200" />
          <span className="text-xs font-semibold uppercase tracking-wider text-purple-200">Camada 1 — Estratégia</span>
        </div>
        <h3 className="text-lg font-bold">Planejamento Estratégico</h3>
        <p className="text-sm text-purple-100 mt-1">Defina a visão, objetivos e estrutura geral do projeto de consultoria.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card Objetivo */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-600" />
                Objetivo Geral
              </CardTitle>
              <Badge variant="outline" className="text-xs">Estratégia</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Transformar o negócio do cliente através de implementação estruturada de processos e ferramentas de gestão.
            </p>
          </CardContent>
        </Card>

        {/* Card Duração */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Duração
              </CardTitle>
              <Badge variant="outline" className="text-xs">Tempo</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Programa de 4 fases implementadas ao longo de 12 meses, com acompanhamento mensal.
            </p>
          </CardContent>
        </Card>

        {/* Card Escopo */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Escopo
              </CardTitle>
              <Badge variant="outline" className="text-xs">Abrangência</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Diagnóstico organizacional completo</li>
              <li>• Implementação de processos</li>
              <li>• Treinamento de equipes</li>
              <li>• Acompanhamento de resultados</li>
            </ul>
          </CardContent>
        </Card>

        {/* Card Stakeholders */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-5 h-5 text-orange-600" />
                Envolvidos
              </CardTitle>
              <Badge variant="outline" className="text-xs">Pessoas</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Proprietário/Sócio</li>
              <li>• Gerente Geral</li>
              <li>• Líderes de Departamento</li>
              <li>• Consultor Responsável</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Fases da Consultoria */}
      <div>
        <h4 className="font-semibold text-gray-800 mb-4">Fases da Consultoria</h4>
        <div className="space-y-3">
          {[
            {
              numero: 1,
              nome: "Diagnóstico",
              descricao: "Levantamento completo da situação atual",
              duracao: "1 mês"
            },
            {
              numero: 2,
              nome: "Planejamento",
              descricao: "Definição de objetivos e mapa de ações",
              duracao: "2 meses"
            },
            {
              numero: 3,
              nome: "Implementação",
              descricao: "Execução dos processos e treinamento",
              duracao: "6 meses"
            },
            {
              numero: 4,
              nome: "Consolidação",
              descricao: "Acompanhamento e ajustes finais",
              duracao: "3 meses"
            }
          ].map((fase) => (
            <div key={fase.numero} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold flex-shrink-0">
                  {fase.numero}
                </div>
                <div className="flex-1">
                  <h5 className="font-semibold text-gray-900">{fase.nome}</h5>
                  <p className="text-sm text-gray-600 mt-1">{fase.descricao}</p>
                  <p className="text-xs text-gray-500 mt-2">Duração: {fase.duracao}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}