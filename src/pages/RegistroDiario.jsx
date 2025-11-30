import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, Save, Loader2, Upload, CheckCircle2, AlertCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function RegistroDiario() {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(new Date());
  const [currentUser, setCurrentUser] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [formData, setFormData] = useState({});
  const [evidences, setEvidences] = useState({});
  const [notes, setNotes] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Carregar usuário e colaborador vinculado
  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);

        // Buscar registro de colaborador
        const employees = await base44.entities.Employee.filter({ email: user.email });
        if (employees.length > 0) {
          setEmployee(employees[0]);
          // Buscar oficina
          const workshops = await base44.entities.Workshop.filter({ id: employees[0].workshop_id });
          if (workshops.length > 0) setWorkshop(workshops[0]);
          
          // Tentar inferir categoria inicial baseada na área
          if (employees[0].area) {
             const areaMap = {
               'vendas': 'vendas',
               'comercial': 'comercial',
               'tecnico': 'tecnico',
               'financeiro': 'financeiro',
               'administrativo': 'rh', 
               'gerencia': 'gestao'
             };
             if (areaMap[employees[0].area]) {
               setSelectedCategory(areaMap[employees[0].area]);
             }
          }
        }
      } catch (error) {
        console.error("Erro ao carregar usuário:", error);
      }
    };
    loadUser();
  }, []);

  // Buscar métricas ativas
  const { data: metrics = [] } = useQuery({
    queryKey: ['productivity-metrics'],
    queryFn: async () => {
      const result = await base44.entities.ProductivityMetric.filter({ is_active: true });
      return result.sort((a, b) => a.code.localeCompare(b.code));
    }
  });

  // Buscar registro existente para a data
  const { data: existingLog, isLoading: isLoadingLog } = useQuery({
    queryKey: ['daily-log', date, employee?.id],
    queryFn: async () => {
      if (!employee) return null;
      const formattedDate = format(date, 'yyyy-MM-dd');
      const logs = await base44.entities.DailyProductivityLog.filter({
        date: formattedDate,
        employee_id: employee.id
      });
      return logs[0] || null;
    },
    enabled: !!employee,
  });

  // Atualizar form quando carregar registro existente
  useEffect(() => {
    if (existingLog) {
      const newFormData = {};
      const newEvidences = {};
      
      existingLog.entries.forEach(entry => {
        newFormData[entry.metric_code] = entry.value;
        if (entry.evidence_url) {
          newEvidences[entry.metric_code] = entry.evidence_url;
        }
      });
      
      setFormData(newFormData);
      setEvidences(newEvidences);
      setNotes(existingLog.notes || "");
    } else {
      setFormData({});
      setEvidences({});
      setNotes("");
    }
  }, [existingLog, date]);

  const handleInputChange = (code, value) => {
    setFormData(prev => ({ ...prev, [code]: value }));
  };

  const handleFileUpload = async (code, file) => {
    if (!file) return;
    
    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setEvidences(prev => ({ ...prev, [code]: file_url }));
      toast.success("Arquivo enviado com sucesso");
    } catch (error) {
      console.error("Erro upload:", error);
      toast.error("Erro ao enviar arquivo");
    } finally {
      setIsUploading(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (existingLog) {
        return base44.entities.DailyProductivityLog.update(existingLog.id, data);
      } else {
        return base44.entities.DailyProductivityLog.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['daily-log']);
      toast.success("Registro salvo com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao salvar registro");
    }
  });

  const handleSubmit = () => {
    if (!employee || !workshop) {
      toast.error("Colaborador ou oficina não identificados");
      return;
    }

    // Filtrar apenas métricas preenchidas
    const entries = Object.entries(formData).map(([code, value]) => {
      const metric = metrics.find(m => m.code === code);
      return {
        metric_code: code,
        metric_name: metric?.name || code,
        value: value?.toString() || "",
        evidence_url: evidences[code] || null
      };
    }).filter(entry => entry.value !== "");

    if (entries.length === 0) {
      toast.error("Preencha pelo menos uma métrica");
      return;
    }

    saveMutation.mutate({
      date: format(date, 'yyyy-MM-dd'),
      employee_id: employee.id,
      workshop_id: workshop.id,
      entries,
      notes,
      status: "submitted"
    });
  };

  // Filtrar métricas pela categoria
  const filteredMetrics = metrics.filter(m => 
    selectedCategory === "all" || m.category === selectedCategory
  );

  const categories = [
    { value: "all", label: "Todas as Categorias" },
    { value: "gestao", label: "Gestão" },
    { value: "vendas", label: "Vendas" },
    { value: "comercial", label: "Comercial" },
    { value: "tecnico", label: "Técnico" },
    { value: "estoque", label: "Estoque" },
    { value: "financeiro", label: "Financeiro" },
    { value: "rh", label: "RH" },
    { value: "zeladoria", label: "Zeladoria" },
    { value: "lava_jato", label: "Lava Jato" },
  ];

  if (!employee && currentUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <AlertCircle className="w-12 h-12 text-yellow-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Perfil de Colaborador Não Encontrado</h2>
        <p className="text-gray-600 max-w-md">
          Para registrar sua produtividade diária, seu usuário precisa estar vinculado a um cadastro de colaborador.
          Peça ao administrador para verificar seu cadastro.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Diário de Produção</h1>
          <p className="text-gray-600">Registre suas atividades e resultados diários</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white p-1 rounded-lg border shadow-sm">
            <Popover>
            <PopoverTrigger asChild>
                <Button
                variant={"outline"}
                className={cn(
                    "w-[240px] justify-start text-left font-normal border-none",
                    !date && "text-muted-foreground"
                )}
                >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => d && setDate(d)}
                initialFocus
                disabled={(date) => date > new Date()}
                />
            </PopoverContent>
            </Popover>
        </div>
      </div>

      <Card className="mb-8 shadow-md border-t-4 border-t-blue-600">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <CardTitle>Registro de {format(date, "dd/MM/yyyy")}</CardTitle>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filtrar Categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <CardDescription>
            {existingLog ? "Editando registro existente" : "Novo registro para esta data"}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {isLoadingLog ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : filteredMetrics.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Nenhuma métrica encontrada para esta categoria.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredMetrics.map((metric) => (
                <div key={metric.code} className="p-4 border rounded-lg bg-slate-50 hover:bg-white hover:shadow-sm transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <Label className="text-base font-semibold text-gray-800 block mb-1">
                        {metric.name}
                      </Label>
                      <span className="text-xs text-gray-500 uppercase tracking-wider bg-gray-200 px-2 py-0.5 rounded-full">
                        {metric.category}
                      </span>
                    </div>
                    {metric.requires_evidence && (
                      <Badge variant="outline" className="text-xs border-orange-200 text-orange-700 bg-orange-50">
                        Requer Evidência
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-xs text-gray-500 mb-3 min-h-[2.5em]">{metric.description}</p>

                  <div className="space-y-3">
                    {metric.data_type === 'boolean' ? (
                      <Select 
                        value={formData[metric.code] || ""} 
                        onValueChange={(val) => handleInputChange(metric.code, val)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">Sim / Realizado</SelectItem>
                          <SelectItem value="false">Não / Não Realizado</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : metric.data_type === 'text' ? (
                      <Textarea 
                        value={formData[metric.code] || ""}
                        onChange={(e) => handleInputChange(metric.code, e.target.value)}
                        placeholder="Descreva aqui..."
                        className="min-h-[80px]"
                      />
                    ) : (
                      <div className="relative">
                         <Input 
                            type="number" 
                            value={formData[metric.code] || ""}
                            onChange={(e) => handleInputChange(metric.code, e.target.value)}
                            placeholder={metric.data_type === 'currency' ? "0.00" : "0"}
                            step={metric.data_type === 'percentage' || metric.data_type === 'currency' ? "0.01" : "1"}
                         />
                         {metric.data_type === 'percentage' && (
                            <span className="absolute right-3 top-2.5 text-gray-400">%</span>
                         )}
                         {metric.data_type === 'currency' && (
                            <span className="absolute left-3 top-2.5 text-gray-400">R$</span>
                         )}
                         {metric.data_type === 'currency' && (
                           <style jsx>{`
                             input { padding-left: 2.5rem; }
                           `}</style>
                         )}
                      </div>
                    )}

                    {metric.requires_evidence && (
                      <div className="mt-2">
                        {evidences[metric.code] ? (
                          <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 p-2 rounded border border-green-100">
                            <CheckCircle2 className="w-4 h-4" />
                            <a href={evidences[metric.code]} target="_blank" rel="noopener noreferrer" className="underline truncate max-w-[150px]">
                              Ver anexo
                            </a>
                            <Button 
                              variant="ghost" 
                              size="xs" 
                              className="h-6 w-6 p-0 ml-auto text-red-500 hover:text-red-700"
                              onClick={() => {
                                const newEvidences = {...evidences};
                                delete newEvidences[metric.code];
                                setEvidences(newEvidences);
                              }}
                            >
                              X
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`file-${metric.code}`} className="cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 w-full">
                              <Upload className="w-4 h-4" />
                              Anexar Comprovante
                            </Label>
                            <Input 
                              id={`file-${metric.code}`}
                              type="file" 
                              className="hidden"
                              onChange={(e) => handleFileUpload(metric.code, e.target.files[0])}
                              disabled={isUploading}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6">
            <Label>Observações Gerais do Dia</Label>
            <Textarea 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Algo mais a relatar sobre o dia de hoje?"
              className="mt-2 h-24"
            />
          </div>

          <div className="flex justify-end gap-4 mt-8">
            <Button 
              onClick={handleSubmit} 
              disabled={saveMutation.isPending || isUploading}
              className="w-full md:w-auto bg-green-600 hover:bg-green-700"
              size="lg"
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar Registro Diário
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}