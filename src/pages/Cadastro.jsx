import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, CheckCircle2, Building2, Wrench, Settings, DollarSign, Target, ArrowRight, Rocket, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Importando componentes da Gestão para manter consistência visual e funcional
import DadosBasicosOficina from "../components/workshop/DadosBasicosOficina";
import ServicosEquipamentos from "../components/workshop/ServicosEquipamentos";
import ServicosTerceirizados from "../components/workshop/ServicosTerceirizados";
import MetasObjetivosCompleto from "../components/workshop/MetasObjetivosCompleto";

export default function Cadastro() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [workshop, setWorkshop] = useState(null);
  const [activeTab, setActiveTab] = useState("dados");
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      if (!currentUser) {
        base44.auth.redirectToLogin(window.location.href);
        return;
      }

      // Filtra apenas oficinas onde o usuário é dono
      const workshops = await base44.entities.Workshop.filter({ owner_id: currentUser.id });
      
      if (workshops && workshops.length > 0) {
        setWorkshop(workshops[0]);
      } else {
        setWorkshop(null); // Nenhum workshop encontrado, mostraremos tela de criação
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkshop = async () => {
    if (!user) return;
    
    setCreating(true);
    try {
      // Payload completo para evitar erros de validação nos defaults
      const newWorkshop = await base44.entities.Workshop.create({
        owner_id: user.id,
        name: "Minha Nova Oficina",
        city: "A Definir",
        state: "UF",
        status: "ativo",
        employees_count: 1,
        years_in_business: 1,
        is_franchisee: false,
        operates_franchise: false,
        capacidade_atendimento_dia: 0,
        tempo_medio_servico: 0
      });
      setWorkshop(newWorkshop);
      toast.success("Ambiente de cadastro criado com sucesso!");
    } catch (error) {
      console.error("Erro ao criar oficina:", error);
      toast.error(`Erro ao criar oficina: ${error.message || 'Tente novamente.'}`);
    } finally {
      setCreating(false);
    }
  };

  const handleWorkshopUpdate = async (updates) => {
    try {
      const updated = await base44.entities.Workshop.update(workshop.id, updates);
      setWorkshop(updated);
      toast.success("Dados salvos com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar alterações.");
    }
  };

  const handleFinish = () => {
    toast.success("Cadastro finalizado!");
    navigate(createPageUrl("GestaoOficina"));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-slate-600">Carregando seu ambiente...</p>
        </div>
      </div>
    );
  }

  if (!workshop) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
            <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md animate-in zoom-in-95 duration-300">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Rocket className="w-10 h-10 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Bem-vindo à Oficinas Master!</h2>
                <p className="text-gray-600 mb-8 leading-relaxed">
                  Vamos configurar o ambiente da sua oficina para começar a usar as ferramentas de gestão e diagnóstico.
                </p>
                <Button 
                  onClick={handleCreateWorkshop} 
                  disabled={creating}
                  className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg shadow-md transition-all hover:shadow-xl"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Preparando tudo...
                    </>
                  ) : (
                    <>
                      <PlayCircle className="w-5 h-5 mr-2" />
                      Iniciar Cadastro
                    </>
                  )}
                </Button>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Cadastro Inteligente da Oficina
          </h1>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Preencha as informações da sua oficina. Utilize o botão <strong>Editar</strong> em cada seção para inserir ou alterar os dados.
          </p>
        </div>

        <Alert className="mb-6 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-full mt-1">
              <Settings className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <AlertTitle className="text-blue-800 font-semibold">Como funciona:</AlertTitle>
              <AlertDescription className="text-blue-700">
                Este cadastro utiliza o mesmo layout da gestão completa. Navegue pelas abas abaixo e preencha cada seção. Seus dados são salvos automaticamente ao confirmar a edição em cada cartão.
              </AlertDescription>
            </div>
          </div>
        </Alert>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 bg-white shadow-sm p-1 h-auto">
            <TabsTrigger value="dados" className="py-3">
              <Building2 className="w-4 h-4 mr-2" />
              Dados
            </TabsTrigger>
            <TabsTrigger value="servicos" className="py-3">
              <Wrench className="w-4 h-4 mr-2" />
              Serviços
            </TabsTrigger>
            <TabsTrigger value="equipamentos" className="py-3">
              <Settings className="w-4 h-4 mr-2" />
              Equipamentos
            </TabsTrigger>
            <TabsTrigger value="terceirizados" className="py-3">
              <DollarSign className="w-4 h-4 mr-2" />
              Terceirizados
            </TabsTrigger>
            <TabsTrigger value="metas" className="py-3">
              <Target className="w-4 h-4 mr-2" />
              Metas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dados" className="animate-in fade-in-50 duration-300">
            <DadosBasicosOficina 
              workshop={workshop} 
              onUpdate={handleWorkshopUpdate} 
            />
            <div className="mt-6 flex justify-end">
              <Button onClick={() => setActiveTab("servicos")} className="bg-blue-600 hover:bg-blue-700">
                Próximo: Serviços <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="servicos" className="animate-in fade-in-50 duration-300">
            <ServicosEquipamentos 
              workshop={workshop} 
              onUpdate={handleWorkshopUpdate}
              showServicesOnly={true}
            />
            <div className="mt-6 flex justify-between">
              <Button variant="outline" onClick={() => setActiveTab("dados")}>Voltar</Button>
              <Button onClick={() => setActiveTab("equipamentos")} className="bg-blue-600 hover:bg-blue-700">
                Próximo: Equipamentos <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="equipamentos" className="animate-in fade-in-50 duration-300">
            <ServicosEquipamentos 
              workshop={workshop} 
              onUpdate={handleWorkshopUpdate}
              showEquipmentOnly={true}
            />
            <div className="mt-6 flex justify-between">
              <Button variant="outline" onClick={() => setActiveTab("servicos")}>Voltar</Button>
              <Button onClick={() => setActiveTab("terceirizados")} className="bg-blue-600 hover:bg-blue-700">
                Próximo: Terceirizados <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="terceirizados" className="animate-in fade-in-50 duration-300">
            <ServicosTerceirizados 
              workshop={workshop} 
              onUpdate={handleWorkshopUpdate} 
            />
            <div className="mt-6 flex justify-between">
              <Button variant="outline" onClick={() => setActiveTab("equipamentos")}>Voltar</Button>
              <Button onClick={() => setActiveTab("metas")} className="bg-blue-600 hover:bg-blue-700">
                Próximo: Metas <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="metas" className="animate-in fade-in-50 duration-300">
            <MetasObjetivosCompleto 
              workshop={workshop} 
              onUpdate={handleWorkshopUpdate} 
            />
            <div className="mt-8 pt-6 border-t border-slate-200 flex justify-between items-center">
              <Button variant="outline" onClick={() => setActiveTab("terceirizados")}>Voltar</Button>
              <div className="flex flex-col items-end gap-2">
                <p className="text-sm text-slate-500">Tudo preenchido?</p>
                <Button 
                  onClick={handleFinish} 
                  size="lg" 
                  className="bg-green-600 hover:bg-green-700 shadow-lg hover:shadow-xl transition-all text-lg px-8"
                >
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Finalizar Cadastro e Ir para Gestão
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}