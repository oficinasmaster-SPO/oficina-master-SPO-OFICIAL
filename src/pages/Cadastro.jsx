import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, CheckCircle2, Building2, Wrench, Settings, DollarSign, Target, ArrowRight, Rocket, PlayCircle, User } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Importando componentes da Gestão para manter consistência visual e funcional
import DadosBasicosOficina from "../components/workshop/DadosBasicosOficina";
import ServicosEquipamentos from "../components/workshop/ServicosEquipamentos";
import ServicosTerceirizados from "../components/workshop/ServicosTerceirizados";
import MetasObjetivosCompleto from "../components/workshop/MetasObjetivosCompleto";
import CadastroPerfilSocio from "../components/workshop/CadastroPerfilSocio";

export default function Cadastro() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [workshop, setWorkshop] = useState(null);
  const [activeTab, setActiveTab] = useState("perfil-socio");
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
        // Se não é owner e já tem workshop_id (colaborador), redirecionar para Home
        if (currentUser.workshop_id) {
          toast.info("Você já está vinculado a uma oficina!");
          navigate(createPageUrl("Home"));
          return;
        }
        setWorkshop(null); // Nenhum workshop encontrado, mostraremos tela de criação
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  };

  const [errorMsg, setErrorMsg] = useState(null);

  const handleCreateWorkshop = async () => {
    if (!user) return;
    
    setCreating(true);
    setErrorMsg(null);
    try {
      // Gerar ID sequencial para a nova oficina
      const idResponse = await base44.functions.invoke('generateWorkshopId', {});
      
      if (!idResponse.data.success) {
        throw new Error("Erro ao gerar ID da oficina");
      }

      const workshopId = idResponse.data.workshop_id;

      // Payload completo para evitar erros de validação nos defaults
      const newWorkshop = await base44.entities.Workshop.create({
        identificador: workshopId,
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
      toast.success(`Ambiente criado! Código: ${workshopId}`);
    } catch (error) {
      console.error("Erro ao criar oficina:", error);
      const msg = error.message || JSON.stringify(error);
      setErrorMsg(msg);
      toast.error(`Erro ao criar oficina: ${msg}`);
    } finally {
      setCreating(false);
    }
  };

  const [saving, setSaving] = useState(false);

  const handleWorkshopUpdate = async (updates) => {
    setSaving(true);
    try {
      const updated = await base44.entities.Workshop.update(workshop.id, updates);
      setWorkshop(updated);
      toast.success("Dados salvos com sucesso!");
      return true;
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar alterações.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleNextTab = async (nextTab) => {
    // Auto-save antes de trocar de aba
    setSaving(true);
    try {
      await base44.entities.Workshop.update(workshop.id, workshop);
      setActiveTab(nextTab);
      toast.success("Progresso salvo!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar. Verifique os dados.");
    } finally {
      setSaving(false);
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

                {errorMsg && (
                  <Alert className="mt-4 bg-red-50 border-red-200 text-left">
                      <AlertTitle className="text-red-800 font-bold">Erro ao criar</AlertTitle>
                      <AlertDescription className="text-red-700 text-sm break-words">
                          {errorMsg}
                      </AlertDescription>
                  </Alert>
                )}
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

        {saving && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white p-4 rounded-lg shadow-xl flex items-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className="text-slate-700 font-medium">Salvando alterações...</span>
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 bg-white shadow-sm p-1 h-auto">
            <TabsTrigger value="perfil-socio" className="py-3">
              <User className="w-4 h-4 mr-2" />
              Meu Perfil
            </TabsTrigger>
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

          <TabsContent value="perfil-socio" className="animate-in fade-in-50 duration-300">
            <CadastroPerfilSocio 
              workshop={workshop}
              user={user}
              onComplete={handleFinish}
              onBack={() => {}}
            />
            <div className="mt-6 flex justify-end">
              <Button onClick={() => handleNextTab("dados")} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Próximo: Dados <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="dados" className="animate-in fade-in-50 duration-300">
            <DadosBasicosOficina 
              workshop={workshop} 
              onUpdate={handleWorkshopUpdate} 
            />
            <div className="mt-6 flex justify-between">
              <Button variant="outline" onClick={() => setActiveTab("perfil-socio")}>Voltar</Button>
              <Button onClick={() => handleNextTab("servicos")} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
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
              <Button onClick={() => handleNextTab("equipamentos")} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
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
              <Button onClick={() => handleNextTab("terceirizados")} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
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
              <Button onClick={() => handleNextTab("metas")} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
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
                  disabled={saving}
                  className="bg-green-600 hover:bg-green-700 shadow-lg"
                >
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Finalizar Cadastro
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}