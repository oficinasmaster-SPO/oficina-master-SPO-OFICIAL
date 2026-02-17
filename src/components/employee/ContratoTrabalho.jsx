import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Upload, Download, CheckCircle2, AlertCircle, Printer, Edit, PenTool, Loader2, Shield } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { jsPDF } from "jspdf";

export default function ContratoTrabalho({ employee, onUpdate }) {
  const [uploading, setUploading] = useState(false);
  const [sendingSignature, setSendingSignature] = useState(false);
  const [file, setFile] = useState(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [workshop, setWorkshop] = useState(null);
  const [contractType, setContractType] = useState("trabalho");
  const [contractText, setContractText] = useState("");
  const [metrics, setMetrics] = useState([]);

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        const result = await base44.entities.ProductivityMetric.filter({ is_active: true });
        setMetrics(result);
      } catch (error) {
        console.error("Erro ao carregar métricas:", error);
      }
    };
    loadMetrics();
  }, []);

  useEffect(() => {
    const loadWorkshop = async () => {
      if (employee?.workshop_id) {
        try {
          const ws = await base44.entities.Workshop.get(employee.workshop_id);
          setWorkshop(ws);
        } catch (error) {
          console.error("Erro ao carregar oficina:", error);
        }
      }
    };
    loadWorkshop();
  }, [employee?.workshop_id]);

  useEffect(() => {
    if (workshop) {
      updateTemplate();
    }
  }, [workshop, contractType, employee, metrics]);

  const getAddressString = (addr) => {
    if (!addr) return "_______________________";
    return `${addr.rua || ""}, ${addr.numero || ""}, ${addr.bairro || ""} - ${addr.cidade || ""}/${addr.estado || ""} - CEP: ${addr.cep || ""}`;
  };

  const getWorkshopAddress = (ws) => {
    if (ws.endereco_completo) return ws.endereco_completo;
    return `${ws.city || ""}/${ws.state || ""} - CEP: ${ws.cep || ""}`;
  };

  const updateTemplate = () => {
    if (!workshop) return;

    const dataAtual = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
    
    // Dados da Empresa
    const empresa = {
      razao: workshop.razao_social || workshop.name || "_______________________",
      cnpj: workshop.cnpj || "_______________________",
      endereco: getWorkshopAddress(workshop)
    };

    // Dados do Colaborador
    const colab = {
      nome: employee.full_name || "_______________________",
      cpf: employee.cpf || "_______________________",
      rg: employee.rg || "_______________________",
      email: employee.email || "_______________________",
      telefone: employee.telefone || "_______________________",
      cargo: employee.position || "_______________________",
      endereco: getAddressString(employee.endereco)
    };

    // Horários da Oficina
    const h = workshop.horario_funcionamento || {};
    const horarios = {
      abertura: h.abertura || "___",
      fechamento: h.fechamento || "___",
      almoco_inicio: h.almoco_inicio || "___",
      almoco_fim: h.almoco_fim || "___"
    };

    // Detalhes da Remuneração
    const salarioFixo = employee.salary ? `R$ ${parseFloat(employee.salary).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : "R$ _______";
    const comissaoMensal = employee.commission ? `R$ ${parseFloat(employee.commission).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : "R$ 0,00";
    const bonificacao = employee.bonus ? `R$ ${parseFloat(employee.bonus).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : "R$ 0,00";

    let beneficiosTexto = "Nenhum benefício cadastrado.";
    if (Array.isArray(employee.benefits) && employee.benefits.length > 0) {
        beneficiosTexto = employee.benefits.map(b => `- ${b.nome || "Benefício"}: R$ ${parseFloat(b.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`).join("\n");
    }

    let regrasComissaoTexto = "Nenhuma regra de comissão cadastrada.";
    if (Array.isArray(employee.commission_rules) && employee.commission_rules.length > 0) {
        regrasComissaoTexto = employee.commission_rules.map(r => {
            const metricName = metrics.find(m => m.code === r.metric_code)?.name || r.metric_code || "Métrica";
            const typeLabel = r.type === 'percentage' ? '%' : 'R$';
            const valueLabel = r.type === 'percentage' ? `${r.value}%` : `R$ ${parseFloat(r.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
            return `- ${metricName} (${typeLabel}): ${valueLabel}`;
        }).join("\n");
    }

    let template = "";

    if (contractType === "trabalho") {
      template = `CONTRATO INDIVIDUAL DE TRABALHO

IDENTIFICAÇÃO DAS PARTES

EMPREGADOR: ${empresa.razao}, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº ${empresa.cnpj}, sediada em ${empresa.endereco}.

EMPREGADO: ${colab.nome}, portador(a) do RG nº ${colab.rg} e CPF nº ${colab.cpf}, residente e domiciliado(a) em ${colab.endereco}, Telefone: ${colab.telefone}, Email: ${colab.email}.

As partes acima identificadas têm, entre si, justo e acertado o presente Contrato Individual de Trabalho, que se regerá pelas cláusulas seguintes:

CLÁUSULA 1ª – DA DESCRIÇÃO DE CARGO
O EMPREGADO exercerá a função conforme atribuições específicas descritas no documento interno denominado “Descrição de Cargo – ${colab.cargo}”, integrante das políticas internas da empresa.

Parágrafo 1º: A Descrição de Cargo poderá ser atualizada para adequação operacional, tecnológica ou estratégica da oficina, desde que mantida a compatibilidade com a função contratada e sem prejuízo salarial.

Parágrafo 2º: O EMPREGADO declara ciência das metas operacionais, indicadores de desempenho (KPIs) e responsabilidades inerentes ao cargo.

CLÁUSULA 2ª – DA JORNADA DE TRABALHO
A jornada será de 44 (quarenta e quatro) horas semanais, distribuídas de segunda a sexta-feira, das ${horarios.abertura} às ${horarios.fechamento}, com intervalo das ${horarios.almoco_inicio} às ${horarios.almoco_fim}, e aos sábados das ___ às ___, conforme prática do setor automotivo, respeitando os limites legais.

Parágrafo 1º: O controle de jornada será realizado por sistema eletrônico ou manual autorizado.

Parágrafo 2º: As horas extraordinárias, quando previamente autorizadas, serão remuneradas com adicional legal mínimo de 50% ou compensadas por meio de banco de horas, conforme legislação vigente.

Parágrafo 3º: Será concedido intervalo mínimo de 1 (uma) hora para repouso e alimentação.

CLÁUSULA 3ª – DA REMUNERAÇÃO
O EMPREGADO receberá a remuneração composta da seguinte forma:

1. Salário Fixo: ${salarioFixo}
2. Comissão Mensal Estimada: ${comissaoMensal}
3. Bonificação/Prêmio: ${bonificacao}

Vales e Benefícios:
${beneficiosTexto}

Regras de Comissionamento:
${regrasComissaoTexto}

O pagamento será efetuado até o 5º dia útil do mês subsequente.

Parágrafo 1º: Poderá haver remuneração variável vinculada ao desempenho da oficina, metas de faturamento ou indicadores previamente definidos.

Parágrafo 2º: Sobre o salário incidirão os descontos legais (INSS, IRRF, contribuição sindical, quando aplicável).

CLÁUSULA 4ª – DO PRAZO
O contrato é celebrado por prazo indeterminado, iniciando-se em ${employee.hire_date ? new Date(employee.hire_date).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')}.

CLÁUSULA 5ª – DA CONFIDENCIALIDADE
O EMPREGADO compromete-se a manter sigilo sobre:
- Cadastro de clientes e fornecedores
- Estratégias comerciais
- Precificação de serviços
- Margens de lucro
- Métodos operacionais da oficina
- Informações financeiras

A obrigação permanece mesmo após o término do contrato.

CLÁUSULA 6ª – DA PROPRIEDADE INTELECTUAL
Procedimentos internos, manuais, treinamentos, métodos de gestão, estratégias comerciais e quaisquer materiais desenvolvidos durante o vínculo pertencem exclusivamente ao EMPREGADOR.

CLÁUSULA 7ª – DO REGULAMENTO INTERNO E SEGURANÇA
O EMPREGADO declara ciência e concordância com:
- Regulamento interno da oficina
- Normas de segurança do trabalho
- Uso obrigatório de EPIs quando necessário
- Normas ambientais e de descarte de resíduos automotivos
- Política de proteção de dados (LGPD)

CLÁUSULA 8ª – DOS EQUIPAMENTOS
Caso sejam fornecidos equipamentos, sistemas ou softwares de gestão automotiva, o EMPREGADO compromete-se a utilizá-los exclusivamente para fins profissionais.

CLÁUSULA 9ª – DO FORO
Fica eleito o foro da Justiça do Trabalho de ${workshop.city || "Maringá"}/${workshop.state || "PR"}.

E por estarem assim justos e contratados, assinam o presente instrumento em 02 (duas) vias de igual teor.

${workshop.city || "Cidade"}, ${dataAtual}.

_________________________________________________
${empresa.razao} (Empregador)

_________________________________________________
${colab.nome} (Empregado)
`;
    } else if (contractType === "confidencialidade") {
      template = `TERMO DE CONFIDENCIALIDADE E SIGILO

IDENTIFICAÇÃO DAS PARTES

EMPRESA: ${empresa.razao}, inscrita no CNPJ nº ${empresa.cnpj}.
COLABORADOR: ${colab.nome}, CPF nº ${colab.cpf}, Cargo: ${colab.cargo}.

O COLABORADOR, em razão de seu vínculo com a EMPRESA, terá acesso a informações confidenciais, estratégicas e técnicas ("Informações Confidenciais").

CLÁUSULA 1ª - DO OBJETO
O objetivo deste termo é garantir o sigilo e a proteção das Informações Confidenciais da EMPRESA a que o COLABORADOR tiver acesso.

CLÁUSULA 2ª - DAS OBRIGAÇÕES DO COLABORADOR
O COLABORADOR obriga-se a:
I - Manter o mais absoluto sigilo sobre as Informações Confidenciais;
II - Não utilizar as Informações Confidenciais em benefício próprio ou de terceiros;
III - Não copiar, reproduzir ou divulgar as Informações Confidenciais sem autorização expressa;
IV - Zelar pela guarda e segurança dos documentos e materiais que lhe forem confiados.

CLÁUSULA 3ª - DA VIGÊNCIA
A obrigação de confidencialidade permanecerá vigente mesmo após o término do vínculo entre as partes, por prazo indeterminado.

CLÁUSULA 4ª - DAS PENALIDADES
O descumprimento deste termo sujeitará o COLABORADOR às sanções legais cabíveis, incluindo demissão por justa causa, além de reparação por perdas e danos.

E por estar de acordo, assina o presente termo.

${workshop.city || "Cidade"}, ${dataAtual}.

_________________________________________________
${colab.nome} (Colaborador)
`;
    }

    setContractText(template);
  };

  const addClause = (title, text) => {
    const newClause = `\nCLÁUSULA ADICIONAL - ${title}\n${text}\n`;
    setContractText(prev => prev + newClause);
  };

  const generatePDFBlob = () => {
    const doc = new jsPDF();
    
    // Configuração de fonte para suportar acentos
    doc.setFont("helvetica");
    doc.setFontSize(11);
    
    const splitText = doc.splitTextToSize(contractText, 180);
    
    let y = 20;
    const pageHeight = doc.internal.pageSize.height;
    
    // Título
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    const title = contractType === "trabalho" ? "CONTRATO DE TRABALHO" : "TERMO DE CONFIDENCIALIDADE";
    doc.text(title, 105, y, { align: "center" });
    y += 15;
    
    // Corpo
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    
    splitText.forEach(line => {
      if (y > pageHeight - 20) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, 15, y);
      y += 6;
    });
    
    return doc.output('blob');
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Selecione um arquivo");
      return;
    }

    setUploading(true);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await onUpdate({ work_contract_url: file_url });
      
      setFile(null);
      toast.success("Contrato enviado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao fazer upload");
    } finally {
      setUploading(false);
    }
  };

  const handlePrintContract = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Contrato - ${employee.full_name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; white-space: pre-wrap; font-size: 12pt; }
            h1 { text-align: center; font-size: 14pt; margin-bottom: 30px; }
          </style>
        </head>
        <body>
          <pre style="font-family: Arial, sans-serif; white-space: pre-wrap;">${contractText}</pre>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleSendToClickSign = async () => {
    if (!workshop) {
        toast.error("Dados da oficina não carregados");
        return;
    }
    
    setSendingSignature(true);
    try {
        // 1. Gerar PDF
        const pdfBlob = generatePDFBlob();
        const fileName = `Contrato_${contractType}_${employee.full_name.replace(/\s+/g, '_')}.pdf`;
        const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

        // 2. Upload para Base44
        toast.info("Gerando documento...");
        const { file_url } = await base44.integrations.Core.UploadFile({ file: pdfFile });

        // 3. Upload para ClickSign
        toast.info("Enviando para ClickSign...");
        const uploadResponse = await base44.functions.invoke('uploadDocumentToClickSign', {
            fileName,
            filePath: file_url
        });

        if (!uploadResponse.data.success) {
            throw new Error(uploadResponse.data.error || "Erro no upload para ClickSign");
        }

        const documentKey = uploadResponse.data.document.key;

        // 4. Criar solicitação de assinatura
        toast.info("Criando solicitação de assinatura...");
        const signers = [
            {
                email: employee.email,
                name: employee.full_name,
                cpf: employee.cpf,
                phone: employee.telefone
            }
            // Pode adicionar o empregador aqui também se tiver os dados do responsável
        ];

        const signatureResponse = await base44.functions.invoke('createClickSignSignatureRequest', {
            documentKey,
            signers,
            message: `Olá ${employee.full_name}, por favor assine o seu ${contractType === 'trabalho' ? 'Contrato de Trabalho' : 'Termo de Confidencialidade'}.`
        });

        if (!signatureResponse.data.success) {
            throw new Error(signatureResponse.data.error || "Erro ao solicitar assinatura");
        }

        toast.success("✅ Documento enviado para assinatura com sucesso!");
        
        // Salvar URL do contrato no perfil (opcional, pode ser o link do clicksign ou o gerado)
        // await onUpdate({ work_contract_url: file_url }); // Se quiser salvar o gerado

    } catch (error) {
        console.error("Erro ClickSign:", error);
        toast.error(`Erro: ${error.message}`);
    } finally {
        setSendingSignature(false);
    }
  };

  const hasContract = !!employee.work_contract_url;

  return (
    <div className="space-y-6">
      <Card className={`shadow-lg border-2 ${hasContract ? 'border-green-200' : 'border-orange-200'}`}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 ${hasContract ? 'bg-green-100' : 'bg-orange-100'} rounded-lg flex items-center justify-center`}>
              <FileText className={`w-6 h-6 ${hasContract ? 'text-green-600' : 'text-orange-600'}`} />
            </div>
            <div>
              <CardTitle>Contrato Registrado</CardTitle>
              <CardDescription>
                {hasContract ? "Contrato atual anexado ao perfil" : "Nenhum contrato anexado manualmente"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {hasContract ? (
            <div className="space-y-4">
              <div className="bg-green-50 rounded-lg p-4 border border-green-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-semibold text-sm text-green-900">Contrato Anexado</p>
                    <p className="text-xs text-green-700">Clique para visualizar</p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(employee.work_contract_url, '_blank')}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Baixar
                </Button>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-gray-600 mb-3">Atualizar arquivo manualmente:</p>
                <div className="flex gap-2">
                  <Input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setFile(e.target.files[0])}
                    className="flex-1"
                  />
                  <Button onClick={handleUpload} disabled={uploading || !file}>
                    {uploading ? "Enviando..." : "Atualizar"}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-orange-50 rounded-lg p-4 border border-orange-200 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                <p className="text-sm text-orange-900">
                  Nenhum contrato anexado. Use o gerador abaixo ou faça upload.
                </p>
              </div>

              <div>
                <Label>Anexar Contrato Manualmente</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setFile(e.target.files[0])}
                    className="flex-1"
                  />
                  <Button onClick={handleUpload} disabled={uploading || !file}>
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? "Enviando..." : "Enviar"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gerador de Contrato */}
      <Card className="shadow-lg border-2 border-blue-200 bg-gradient-to-br from-white to-blue-50">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-blue-800">Gerador de Contrato Padrão</CardTitle>
              <CardDescription>
                Gere contratos automaticamente com os dados do colaborador e envie para assinatura digital.
              </CardDescription>
            </div>
            <Button onClick={() => setShowGenerator(true)} className="bg-blue-600 hover:bg-blue-700">
              <Edit className="w-4 h-4 mr-2" />
              Abrir Gerador
            </Button>
          </div>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-white rounded-lg border border-blue-100 shadow-sm">
                    <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-500"/>
                        Contrato de Trabalho
                    </h4>
                    <p className="text-xs text-gray-600 mb-3">Modelo completo com cláusulas de função, remuneração e horário.</p>
                    <Button variant="outline" size="sm" className="w-full" onClick={() => { setContractType('trabalho'); setShowGenerator(true); }}>
                        Gerar Modelo
                    </Button>
                </div>
                <div className="p-4 bg-white rounded-lg border border-blue-100 shadow-sm">
                    <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-purple-500"/>
                        Termo de Confidencialidade
                    </h4>
                    <p className="text-xs text-gray-600 mb-3">Proteção de dados e informações estratégicas da empresa.</p>
                    <Button variant="outline" size="sm" className="w-full" onClick={() => { setContractType('confidencialidade'); setShowGenerator(true); }}>
                        Gerar Modelo
                    </Button>
                </div>
            </div>
        </CardContent>
      </Card>

      <Dialog open={showGenerator} onOpenChange={setShowGenerator}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="flex items-center gap-2">
                <PenTool className="w-5 h-5 text-blue-600" />
                Editor de Contrato
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 flex flex-col gap-4 p-6 pt-2 overflow-hidden">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-gray-50 p-3 rounded-lg border">
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Label>Tipo de Documento:</Label>
                    <Select value={contractType} onValueChange={(v) => setContractType(v)}>
                        <SelectTrigger className="w-[250px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="trabalho">Contrato de Trabalho</SelectItem>
                            <SelectItem value="confidencialidade">Termo de Confidencialidade</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => addClause("ADICIONAL", "Insira o texto da cláusula aqui...")}>+ Cláusula</Button>
                </div>
            </div>

            <div className="flex-1 border rounded-md overflow-hidden relative">
                <Textarea 
                value={contractText}
                onChange={(e) => setContractText(e.target.value)}
                className="w-full h-full resize-none border-0 p-6 font-mono text-sm leading-relaxed focus-visible:ring-0"
                style={{ whiteSpace: 'pre-wrap' }}
                />
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mt-2 bg-blue-50 p-4 rounded-lg border border-blue-100">
              <div className="text-xs text-blue-800">
                <strong>Dados preenchidos automaticamente:</strong> Nome, CPF, RG, Endereço, Cargo, Salário, Dados da Empresa, Horário de Funcionamento e Dias.
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowGenerator(false)}>Cancelar</Button>
                
                <Button variant="outline" onClick={handlePrintContract}>
                    <Printer className="w-4 h-4 mr-2" />
                    Imprimir / PDF
                </Button>

                <Button onClick={handleSendToClickSign} disabled={sendingSignature} className="bg-green-600 hover:bg-green-700 text-white">
                    {sendingSignature ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                        <PenTool className="w-4 h-4 mr-2" />
                    )}
                    {sendingSignature ? "Enviando..." : "Enviar para Assinatura (ClickSign)"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}