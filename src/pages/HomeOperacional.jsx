import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Wrench, 
  ListTodo, 
  ClipboardList, 
  Clock, 
  AlertTriangle,
  Sparkles,
  BookOpen,
  Trophy,
  Target,
  Stethoscope,
  UserCheck,
  Edit3,
  Save
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function HomeOperacional() {
  const navigate = useNavigate();
  const [quickTips, setQuickTips] = useState([
    "Lembre-se de limpar as ferramentas após o uso",
    "Verifique o estoque de óleo antes de iniciar a troca"
  ]);
  const [isEditingTips, setIsEditingTips] = useState(false);
  const [tempTips, setTempTips] = useState([...quickTips]);

  const handleSaveTips = () => {
    setQuickTips(tempTips);
    setIsEditingTips(false);
    toast.success("Dicas operacionais atualizadas!");
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Dicas Rápidas Operacionais */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-100">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-green-800 flex items-center gap-2 text-lg">
            <Wrench className="w-5 h-5" />
            Dicas do Dia
          </CardTitle>
          {/* Botão de editar visível apenas para gestores (mockado aqui, na real validaria role) */}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => isEditingTips ? handleSaveTips() : setIsEditingTips(true)}
            className="text-green-700 hover:text-green-900"
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
              <Button size="sm" variant="outline" onClick={() => setTempTips([...tempTips, ""])}>+ Adicionar Dica</Button>
            </div>
          ) : (
            <ul className="list-disc pl-5 space-y-1 text-green-900">
              {quickTips.map((tip, idx) => (
                <li key={idx}>{tip}</li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

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

      {/* Acesso Rápido */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Button 
          variant="outline" 
          className="h-auto py-4 flex flex-col gap-2 hover:bg-purple-50 hover:border-purple-200"
          onClick={() => navigate(createPageUrl('IAAnalyticsOperacional'))}
        >
          <Sparkles className="w-6 h-6 text-purple-600" />
          <span>IA Operacional</span>
        </Button>
        <Button 
          variant="outline" 
          className="h-auto py-4 flex flex-col gap-2 hover:bg-blue-50 hover:border-blue-200"
          onClick={() => navigate(createPageUrl('SeletorDiagnosticos') + '?role=colaborador')}
        >
          <Stethoscope className="w-6 h-6 text-blue-600" />
          <span>Diagnósticos</span>
        </Button>
        <Button 
          variant="outline" 
          className="h-auto py-4 flex flex-col gap-2 hover:bg-green-50 hover:border-green-200"
          onClick={() => navigate(createPageUrl('Gamificacao'))}
        >
          <Trophy className="w-6 h-6 text-green-600" />
          <span>Ranking & XP</span>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <ClipboardList className="w-5 h-5" />
              Ordens de Serviço
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900">3</div>
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
            <div className="text-3xl font-bold text-amber-900">6h 30m</div>
            <p className="text-sm text-amber-600">Registradas hoje</p>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-green-700">
              <Target className="w-5 h-5" />
              Eficiência
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900">92%</div>
            <p className="text-sm text-green-600">Meta atingida</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* Maturidade (Autoavaliação) */}
         <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(createPageUrl('DiagnosticoMaturidade'))}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-800">
                    <UserCheck className="w-5 h-5 text-purple-600" />
                    Minha Maturidade
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-lg font-semibold text-purple-700">Nível: Adolescente</p>
                        <p className="text-sm text-gray-500">Próxima avaliação em 15 dias</p>
                    </div>
                    <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center text-2xl">
                        👦
                    </div>
                </div>
            </CardContent>
         </Card>
         
         <Card>
            <CardHeader>
                <CardTitle>Atividades Recentes</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                        <span>OS #1234 - Troca de Óleo</span>
                        <span className="text-green-600 font-semibold">Concluída</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span>Checklist Diário</span>
                        <span className="text-blue-600 font-semibold">Em andamento</span>
                    </div>
                </div>
            </CardContent>
         </Card>
      </div>
    </div>
  );
}