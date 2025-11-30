import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  Target, 
  Trophy, 
  Clock, 
  Calculator,
  FileText,
  BrainCircuit,
  Stethoscope,
  BookOpen,
  Edit3,
  Save
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function HomeGerente() {
  const navigate = useNavigate();
  const [quickTips, setQuickTips] = useState([
    "Reunião semanal de alinhamento na segunda-feira às 08h",
    "Lembre-se de validar os pontos da equipe até sexta"
  ]);
  const [isEditingTips, setIsEditingTips] = useState(false);
  const [tempTips, setTempTips] = useState([...quickTips]);

  const handleSaveTips = () => {
    setQuickTips(tempTips);
    setIsEditingTips(false);
    toast.success("Dicas atualizadas!");
    // Aqui salvaria em InternalNotice
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Dicas Rápidas Editáveis */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-blue-800 flex items-center gap-2 text-lg">
            <FileText className="w-5 h-5" />
            Mural de Avisos da Diretoria
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => isEditingTips ? handleSaveTips() : setIsEditingTips(true)}
          >
            {isEditingTips ? <Save className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
          </Button>
        </CardHeader>
        <CardContent>
          {isEditingTips ? (
            <div className="space-y-2">
              {tempTips.map((tip, idx) => (
                <Input 
                  key={idx}
                  value={tip} 
                  onChange={(e) => {
                    const newTips = [...tempTips];
                    newTips[idx] = e.target.value;
                    setTempTips(newTips);
                  }}
                />
              ))}
              <Button size="sm" variant="outline" onClick={() => setTempTips([...tempTips, ""])}>+ Adicionar Aviso</Button>
            </div>
          ) : (
            <ul className="list-disc pl-5 space-y-1 text-blue-900">
              {quickTips.map((tip, idx) => (
                <li key={idx}>{tip}</li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

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

      {/* Acesso Rápido */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Button 
          variant="outline" 
          className="h-auto py-4 flex flex-col gap-2 hover:bg-purple-50 hover:border-purple-200"
          onClick={() => navigate(createPageUrl('IAAnalyticsGestao'))}
        >
          <BrainCircuit className="w-6 h-6 text-purple-600" />
          <span>IA Analytics</span>
        </Button>
        <Button 
          variant="outline" 
          className="h-auto py-4 flex flex-col gap-2 hover:bg-blue-50 hover:border-blue-200"
          onClick={() => navigate(createPageUrl('SeletorDiagnosticos') + '?role=gestor')}
        >
          <Stethoscope className="w-6 h-6 text-blue-600" />
          <span>Novo Diagnóstico</span>
        </Button>
        <Button 
          variant="outline" 
          className="h-auto py-4 flex flex-col gap-2 hover:bg-green-50 hover:border-green-200"
          onClick={() => navigate(createPageUrl('Gamificacao'))}
        >
          <Trophy className="w-6 h-6 text-green-600" />
          <span>Desafios & Ranking</span>
        </Button>
        <Button 
          variant="outline" 
          className="h-auto py-4 flex flex-col gap-2 hover:bg-amber-50 hover:border-amber-200"
          onClick={() => navigate(createPageUrl('ManualCultura'))}
        >
          <BookOpen className="w-6 h-6 text-amber-600" />
          <span>Manual da Cultura</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">OS em Aberto</p>
                <h3 className="text-2xl font-bold mt-1">12</h3>
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
                <h3 className="text-2xl font-bold mt-1 text-red-600">3</h3>
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
                <h3 className="text-2xl font-bold mt-1 text-green-600">8</h3>
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
                <h3 className="text-2xl font-bold mt-1">5/6</h3>
              </div>
              <div className="bg-purple-100 p-2 rounded-full">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Widgets Fase 2 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-green-600" />
              TCMP² em Tempo Real
            </CardTitle>
          </CardHeader>
          <CardContent>
             <div className="text-center py-8">
                <p className="text-4xl font-bold text-green-700">R$ 280,00</p>
                <p className="text-sm text-gray-500 mt-1">Valor Hora Ideal do Time</p>
                <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 w-3/4"></div>
                </div>
                <p className="text-xs text-gray-400 mt-2">75% da meta mensal atingida</p>
             </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              R70 / I30 (Eficiência)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <span>R70 (Produtividade)</span>
                    <span className="font-bold text-blue-700">72%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 w-[72%]"></div>
                </div>

                <div className="flex justify-between items-center">
                    <span>I30 (Ociosidade/Retrabalho)</span>
                    <span className="font-bold text-red-600">15%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 w-[15%]"></div>
                </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              Ranking de Colaboradores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${i === 1 ? 'bg-yellow-100 text-yellow-700' : i === 2 ? 'bg-gray-200 text-gray-700' : 'bg-orange-100 text-orange-700'}`}>
                                {i}º
                            </div>
                            <div>
                                <p className="font-medium">Técnico {i}</p>
                                <p className="text-xs text-gray-500">Mecânico</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="font-bold text-green-600">{1000 + (i * 250)} XP</p>
                            <p className="text-xs text-gray-500">98% Eficiência</p>
                        </div>
                    </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}