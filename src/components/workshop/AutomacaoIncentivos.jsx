import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { MessageCircle, Save, Loader2, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AutomacaoIncentivos({ workshop }) {
  const queryClient = useQueryClient();
  const [configId, setConfigId] = useState(null);
  const [enabled, setEnabled] = useState(false);
  const [frequency, setFrequency] = useState("apenas_eventos");
  const [recipients, setRecipients] = useState([]);

  // Carregar colaboradores da oficina
  const { data: employees = [] } = useQuery({
    queryKey: ['workshop-employees', workshop?.id],
    queryFn: async () => {
      const result = await base44.entities.Employee.filter({ workshop_id: workshop.id });
      return Array.isArray(result) ? result : [];
    },
    enabled: !!workshop?.id
  });

  // Carregar configurações de automação
  const { data: automationConfig, isLoading } = useQuery({
    queryKey: ['workshop-automation', workshop?.id],
    queryFn: async () => {
      const result = await base44.entities.WorkshopAutomation.filter({ workshop_id: workshop.id });
      return result.length > 0 ? result[0] : null;
    },
    enabled: !!workshop?.id
  });

  useEffect(() => {
    if (automationConfig) {
      setConfigId(automationConfig.id);
      setEnabled(automationConfig.enabled);
      setFrequency(automationConfig.frequency || "apenas_eventos");
      
      // Mesclar com a lista atual de funcionários para garantir que todos apareçam
      if (employees.length > 0) {
        const currentRecipients = automationConfig.recipients || [];
        const merged = employees.map(emp => {
          const existing = currentRecipients.find(r => r.employee_id === emp.id);
          return {
            employee_id: emp.id,
            name: emp.full_name,
            phone: emp.telefone || existing?.phone || "",
            active: existing ? existing.active : false // Default false for new employees
          };
        });
        setRecipients(merged);
      }
    } else if (employees.length > 0) {
      // Configuração inicial padrão
      setRecipients(employees.map(emp => ({
        employee_id: emp.id,
        name: emp.full_name,
        phone: emp.telefone || "",
        active: false
      })));
    }
  }, [automationConfig, employees]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        workshop_id: workshop.id,
        enabled,
        frequency,
        recipients: recipients.map(r => ({
          employee_id: r.employee_id,
          phone: r.phone,
          active: r.active
        }))
      };

      if (configId) {
        return await base44.entities.WorkshopAutomation.update(configId, payload);
      } else {
        return await base44.entities.WorkshopAutomation.create(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['workshop-automation']);
      toast.success("Configurações de automação salvas!");
    },
    onError: (e) => toast.error("Erro ao salvar: " + e.message)
  });

  const toggleRecipient = (employeeId) => {
    setRecipients(prev => prev.map(r => 
      r.employee_id === employeeId ? { ...r, active: !r.active } : r
    ));
  };

  const updatePhone = (employeeId, newPhone) => {
    setRecipients(prev => prev.map(r => 
      r.employee_id === employeeId ? { ...r, phone: newPhone } : r
    ));
  };

  if (isLoading) return <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <MessageCircle className="w-6 h-6 text-green-600" />
              Automação de Incentivos
            </h2>
            <p className="text-gray-600 mt-1">
              Envie mensagens automáticas de motivação e reconhecimento para sua equipe.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Switch 
              id="automation-mode" 
              checked={enabled}
              onCheckedChange={setEnabled}
            />
            <Label htmlFor="automation-mode" className="font-medium">
              {enabled ? 'Sistema Ativo' : 'Sistema Pausado'}
            </Label>
          </div>
        </div>

        <div className={`space-y-6 transition-opacity ${enabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Frequência de Envios</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="diario">Diário (Bom dia / Motivação)</SelectItem>
                    <SelectItem value="semanal">Semanal (Resumo / Metas)</SelectItem>
                    <SelectItem value="apenas_eventos">Apenas Eventos (Meta Batida / Aniversário)</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Canais de Envio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 p-3 bg-green-50 text-green-800 rounded-md">
                  <Smartphone className="w-5 h-5" />
                  <span className="font-medium">WhatsApp (Via Link/Integração)</span>
                  <Badge className="ml-auto bg-green-200 text-green-800 hover:bg-green-200">Ativo</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Selecionar Colaboradores</h3>
            <div className="grid gap-3">
              {recipients.map(recipient => (
                <div key={recipient.employee_id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors bg-white">
                  <div className="flex items-center gap-3">
                    <Checkbox 
                      id={`recipient-${recipient.employee_id}`}
                      checked={recipient.active}
                      onCheckedChange={() => toggleRecipient(recipient.employee_id)}
                    />
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={employees.find(e => e.id === recipient.employee_id)?.profile_picture_url} />
                      <AvatarFallback className="bg-blue-100 text-blue-700">
                        {recipient.name?.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <Label 
                        htmlFor={`recipient-${recipient.employee_id}`}
                        className="text-base font-medium cursor-pointer"
                      >
                        {recipient.name}
                      </Label>
                      <p className="text-xs text-gray-500">
                        {employees.find(e => e.id === recipient.employee_id)?.position || 'Colaborador'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      placeholder="(00) 00000-0000"
                      value={recipient.phone}
                      onChange={(e) => updatePhone(recipient.employee_id, e.target.value)}
                      className="text-sm border-b border-gray-300 focus:border-green-500 outline-none bg-transparent w-32 py-1"
                    />
                  </div>
                </div>
              ))}
              {recipients.length === 0 && (
                <p className="text-center text-gray-500 py-4">Nenhum colaborador encontrado nesta oficina.</p>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button 
              onClick={() => saveMutation.mutate()} 
              disabled={saveMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Save className="w-4 h-4 mr-2" />
              Salvar Configurações
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}