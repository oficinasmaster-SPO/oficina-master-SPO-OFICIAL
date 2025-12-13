import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Mail, MessageCircle, Share2, Loader2, Download, Settings, FileEdit } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function ExportCronogramaModal({ 
  open, 
  onClose, 
  cronogramaData, 
  workshop,
  onGeneratePDF 
}) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [telefone, setTelefone] = useState("");
  
  // Filtros avançados
  const [filters, setFilters] = useState({
    status: "todos",
    tipo: "todos",
    dataInicio: "",
    dataFim: ""
  });
  
  // Personalização do PDF
  const [customNotes, setCustomNotes] = useState("");
  const [includeContactInfo, setIncludeContactInfo] = useState(true);
  const [selectedCollaborators, setSelectedCollaborators] = useState([]);

  // Buscar colaboradores da oficina
  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores-export', workshop?.id],
    queryFn: async () => {
      if (!workshop?.id) return [];
      return await base44.entities.Employee.filter({ 
        workshop_id: workshop.id,
        status: 'ativo'
      });
    },
    enabled: !!workshop?.id
  });

  const applyFilters = (items) => {
    return items.filter(item => {
      const statusMatch = filters.status === "todos" || item.status === filters.status;
      const tipoMatch = filters.tipo === "todos" || item.item_tipo === filters.tipo;
      
      let dateMatch = true;
      if (filters.dataInicio && item.data_inicio_real) {
        dateMatch = new Date(item.data_inicio_real) >= new Date(filters.dataInicio);
      }
      if (filters.dataFim && item.data_termino_previsto && dateMatch) {
        dateMatch = new Date(item.data_termino_previsto) <= new Date(filters.dataFim);
      }
      
      return statusMatch && tipoMatch && dateMatch;
    });
  };

  const getPDFOptions = () => ({
    filters,
    customNotes,
    includeContactInfo,
    contactInfo: {
      telefone: workshop.telefone || '',
      email: workshop.email || '',
      endereco: workshop.endereco_completo || ''
    }
  });

  const handlePrintPDF = () => {
    const filteredItems = applyFilters(cronogramaData.items);
    onGeneratePDF('print', { ...cronogramaData, items: filteredItems }, getPDFOptions());
    toast.success("Abrindo visualização de impressão...");
  };

  const handleDownloadPDF = () => {
    const filteredItems = applyFilters(cronogramaData.items);
    onGeneratePDF('download', { ...cronogramaData, items: filteredItems }, getPDFOptions());
    toast.success("PDF baixado com sucesso!");
  };

  const handleSendEmail = async () => {
    // Validar destinatários
    const destinatarios = email ? [email] : [];
    const emailsColaboradores = selectedCollaborators
      .map(id => colaboradores.find(c => c.id === id)?.email)
      .filter(e => e);
    
    if (destinatarios.length === 0 && emailsColaboradores.length === 0) {
      toast.error("Por favor, informe pelo menos um destinatário");
      return;
    }

    setIsLoading(true);
    try {
      const filteredItems = applyFilters(cronogramaData.items);
      const pdfBlob = await onGeneratePDF('blob', { ...cronogramaData, items: filteredItems }, getPDFOptions());
      
      // Converter blob para base64
      const reader = new FileReader();
      reader.readAsDataURL(pdfBlob);
      reader.onloadend = async () => {
        try {
          const base64data = reader.result.split(',')[1];
          
          const response = await base44.functions.invoke('enviarCronogramaEmail', {
            email_destino: email || '',
            emails_colaboradores: emailsColaboradores,
            email_empresa: workshop.email || '',
            workshop_nome: workshop.name,
            pdf_base64: base64data,
            stats: cronogramaData.stats
          });

          if (response.data?.success) {
            const total = destinatarios.length + emailsColaboradores.length;
            toast.success(`Relatório enviado para ${total} destinatário(s)`);
            setEmail("");
            setSelectedCollaborators([]);
            onClose();
          } else {
            throw new Error(response.data?.error || 'Erro ao enviar e-mail');
          }
        } catch (emailError) {
          console.error("Erro ao enviar e-mail:", emailError);
          toast.error("Erro ao enviar e-mail: " + (emailError.message || 'Erro desconhecido'));
        } finally {
          setIsLoading(false);
        }
      };
      reader.onerror = () => {
        toast.error("Erro ao processar PDF");
        setIsLoading(false);
      };
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar PDF");
      setIsLoading(false);
    }
  };

  const handleSendWhatsApp = (telefoneParam = null) => {
    const tel = telefoneParam || telefone;
    if (!tel) {
      toast.error("Por favor, informe o número do WhatsApp");
      return;
    }

    // Gera mensagem com resumo
    const { stats } = cronogramaData;
    const mensagem = `📊 *Cronograma de Implementação - ${workshop.name}*\n\n` +
      `📈 *Resumo do Projeto:*\n` +
      `✅ Total de Itens: ${stats.total}\n` +
      `🟢 Concluídos: ${stats.concluidos}\n` +
      `🟡 Em Andamento: ${stats.em_andamento}\n` +
      `🔴 Atrasados: ${stats.atrasados}\n\n` +
      `Acesse o sistema para mais detalhes!`;

    const telefoneFormatado = tel.replace(/\D/g, '');
    const url = `https://wa.me/${telefoneFormatado}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
    
    toast.success("Abrindo WhatsApp...");
  };

  const handleQuickEmailSend = async (colaboradorEmail, colaboradorNome) => {
    if (!colaboradorEmail) {
      toast.error("Colaborador sem e-mail cadastrado");
      return;
    }

    setIsLoading(true);
    try {
      const filteredItems = applyFilters(cronogramaData.items);
      const pdfBlob = await onGeneratePDF('blob', { ...cronogramaData, items: filteredItems }, getPDFOptions());
      
      const reader = new FileReader();
      reader.readAsDataURL(pdfBlob);
      reader.onloadend = async () => {
        try {
          const base64data = reader.result.split(',')[1];
          
          const response = await base44.functions.invoke('enviarCronogramaEmail', {
            email_destino: '',
            emails_colaboradores: [colaboradorEmail],
            email_empresa: workshop.email || '',
            workshop_nome: workshop.name,
            pdf_base64: base64data,
            stats: cronogramaData.stats
          });

          if (response.data?.success) {
            toast.success(`Enviado para ${colaboradorNome}`);
          } else {
            throw new Error(response.data?.error || 'Erro ao enviar');
          }
        } catch (error) {
          toast.error("Erro ao enviar: " + error.message);
        } finally {
          setIsLoading(false);
        }
      };
    } catch (error) {
      toast.error("Erro ao gerar PDF");
      setIsLoading(false);
    }
  };

  const handleSharePlatform = async () => {
    setIsLoading(true);
    try {
      const user = await base44.auth.me();
      
      // Salvar notificação interna com link para o cronograma
      await base44.entities.Notification.create({
        user_id: user.id,
        type: 'relatorio_compartilhado',
        title: 'Relatório de Cronograma Compartilhado',
        message: `Relatório do cronograma de implementação foi gerado em ${new Date().toLocaleDateString('pt-BR')}`,
        is_read: false
      });

      toast.success("Relatório salvo nas notificações!");
    } catch (error) {
      console.error("Erro ao compartilhar na plataforma:", error);
      toast.error("Erro ao compartilhar");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Exportar Cronograma</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="personalizar" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="personalizar">
              <Settings className="w-4 h-4 mr-2" />
              Personalizar
            </TabsTrigger>
            <TabsTrigger value="pdf">
              <FileText className="w-4 h-4 mr-2" />
              PDF
            </TabsTrigger>
            <TabsTrigger value="email">
              <Mail className="w-4 h-4 mr-2" />
              E-mail
            </TabsTrigger>
            <TabsTrigger value="whatsapp">
              <MessageCircle className="w-4 h-4 mr-2" />
              WhatsApp
            </TabsTrigger>
            <TabsTrigger value="plataforma">
              <Share2 className="w-4 h-4 mr-2" />
              Plataforma
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personalizar" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Filtros de Dados
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Status</Label>
                    <Select value={filters.status} onValueChange={(val) => setFilters({...filters, status: val})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="a_fazer">A Fazer</SelectItem>
                        <SelectItem value="em_andamento">Em Andamento</SelectItem>
                        <SelectItem value="concluido">Concluído</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Tipo</Label>
                    <Select value={filters.tipo} onValueChange={(val) => setFilters({...filters, tipo: val})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="processo">Processos</SelectItem>
                        <SelectItem value="diagnostico">Diagnósticos</SelectItem>
                        <SelectItem value="ferramenta">Ferramentas</SelectItem>
                        <SelectItem value="teste">Testes</SelectItem>
                        <SelectItem value="modulo">Módulos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Data Início (Mín.)</Label>
                    <Input 
                      type="date" 
                      value={filters.dataInicio}
                      onChange={(e) => setFilters({...filters, dataInicio: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Data Término (Máx.)</Label>
                    <Input 
                      type="date" 
                      value={filters.dataFim}
                      onChange={(e) => setFilters({...filters, dataFim: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <FileEdit className="w-4 h-4" />
                  Notas Personalizadas
                </h3>
                <Textarea 
                  placeholder="Adicione observações, metas ou comentários que deseja incluir no relatório..."
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>

              <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                <Checkbox 
                  id="contact-info"
                  checked={includeContactInfo}
                  onCheckedChange={setIncludeContactInfo}
                />
                <Label htmlFor="contact-info" className="cursor-pointer">
                  Incluir informações de contato da oficina no rodapé
                </Label>
              </div>

              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Destinatários do Relatório
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="text-left p-2 font-medium text-gray-700">Selecionar</th>
                          <th className="text-left p-2 font-medium text-gray-700">Nome</th>
                          <th className="text-left p-2 font-medium text-gray-700">E-mail</th>
                          <th className="text-left p-2 font-medium text-gray-700">WhatsApp</th>
                          <th className="text-center p-2 font-medium text-gray-700">Envio Rápido</th>
                        </tr>
                      </thead>
                      <tbody>
                        {colaboradores.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="text-center p-4 text-gray-500">
                              Nenhum colaborador encontrado
                            </td>
                          </tr>
                        ) : (
                          colaboradores.map((colab) => (
                            <tr key={colab.id} className="border-t hover:bg-gray-50">
                              <td className="p-2">
                                <Checkbox
                                  checked={selectedCollaborators.includes(colab.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedCollaborators([...selectedCollaborators, colab.id]);
                                    } else {
                                      setSelectedCollaborators(selectedCollaborators.filter(id => id !== colab.id));
                                    }
                                  }}
                                />
                              </td>
                              <td className="p-2">{colab.full_name}</td>
                              <td className="p-2 text-gray-600">{colab.email || '-'}</td>
                              <td className="p-2 text-gray-600">{colab.telefone || '-'}</td>
                              <td className="p-2">
                                <div className="flex justify-center gap-1">
                                  {colab.email && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleQuickEmailSend(colab.email, colab.full_name)}
                                      disabled={isLoading}
                                      className="h-7 w-7 p-0"
                                      title="Enviar por E-mail"
                                    >
                                      <Mail className="w-4 h-4 text-blue-600" />
                                    </Button>
                                  )}
                                  {colab.telefone && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleSendWhatsApp(colab.telefone)}
                                      className="h-7 w-7 p-0"
                                      title="Enviar por WhatsApp"
                                    >
                                      <MessageCircle className="w-4 h-4 text-green-600" />
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                {selectedCollaborators.length > 0 && (
                  <p className="text-xs text-blue-600 mt-2">
                    {selectedCollaborators.length} colaborador(es) selecionado(s)
                  </p>
                )}
              </div>

              <div className="text-xs text-gray-500 p-3 bg-blue-50 rounded-lg">
                <strong>Dica:</strong> As configurações acima serão aplicadas em todas as formas de exportação (PDF, E-mail, WhatsApp).
              </div>
              </div>
              </TabsContent>

          <TabsContent value="pdf" className="space-y-4 mt-4">
            <div className="text-sm text-gray-600 mb-4">
              Gere o relatório em PDF para impressão ou download.
            </div>
            <div className="flex gap-3">
              <Button onClick={handlePrintPDF} className="flex-1">
                <FileText className="w-4 h-4 mr-2" />
                Imprimir
              </Button>
              <Button onClick={handleDownloadPDF} variant="outline" className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                Baixar PDF
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="email" className="space-y-4 mt-4">
            <div>
              <Label htmlFor="email">E-mail de Destino</Label>
              <Input
                id="email"
                type="email"
                placeholder="exemplo@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2"
              />
            </div>
            <Button 
              onClick={handleSendEmail} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Enviar por E-mail
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="whatsapp" className="space-y-4 mt-4">
            <div>
              <Label htmlFor="telefone">Número do WhatsApp</Label>
              <Input
                id="telefone"
                type="tel"
                placeholder="+55 11 99999-9999"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                className="mt-2"
              />
              <p className="text-xs text-gray-500 mt-2">
                Inclua o código do país (ex: +55 para Brasil)
              </p>
            </div>
            <Button onClick={handleSendWhatsApp} className="w-full">
              <MessageCircle className="w-4 h-4 mr-2" />
              Enviar por WhatsApp
            </Button>
          </TabsContent>

          <TabsContent value="plataforma" className="space-y-4 mt-4">
            <div className="text-sm text-gray-600 mb-4">
              Salvar o relatório nas notificações da plataforma para acesso rápido.
            </div>
            <Button 
              onClick={handleSharePlatform} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 mr-2" />
                  Salvar na Plataforma
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}