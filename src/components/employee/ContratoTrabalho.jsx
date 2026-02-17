import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Upload, Download, CheckCircle2, AlertCircle, Printer, Edit, PenTool, Loader2, Shield, Award } from "lucide-react";
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

CLÁUSULA 5ª – DA CONFIDENCIALIDADE COM MULTA
O EMPREGADO compromete-se a manter absoluto sigilo sobre:
- Cadastro de clientes
- Estrutura de custos
- Margens de lucro
- Estratégias comerciais
- Processos internos
- Fornecedores e negociações
- Métodos operacionais da oficina

A obrigação de confidencialidade permanece por prazo indeterminado, mesmo após o término do contrato.

Parágrafo 1º: O descumprimento implicará multa equivalente a 5 (cinco) vezes a última remuneração mensal, além de indenização por eventuais prejuízos comprovados.

Parágrafo 2º: A multa não substitui eventual responsabilidade civil ou penal cabível.

CLÁUSULA 6ª – DO NÃO ALICIAMENTO DE CLIENTES
O EMPREGADO compromete-se, pelo prazo de 24 (vinte e quatro) meses após o término do vínculo empregatício, a não praticar, direta ou indiretamente, qualquer ato que implique:

I – Contatar clientes ativos ou inativos da empresa com o objetivo de oferecer serviços concorrentes;
II – Induzir ou incentivar clientes a rescindirem contratos ou deixarem de contratar serviços da empresa;
III – Utilizar informações comerciais, listas de clientes, histórico de serviços, precificação ou estratégias comerciais obtidas durante o vínculo empregatício.

Parágrafo 1º: Consideram-se clientes aqueles que tenham contratado serviços da empresa nos últimos 24 meses anteriores ao desligamento.

Parágrafo 2º: O descumprimento desta cláusula sujeitará o EMPREGADO ao pagamento de multa equivalente a 3 (três) vezes sua última remuneração mensal, sem prejuízo de indenização por perdas e danos comprovados.

CLÁUSULA 7ª – DO NÃO ALICIAMENTO DE COLABORADORES
O EMPREGADO compromete-se, pelo prazo de 24 (vinte e quatro) meses após o término do contrato, a não:

I – Convidar, incentivar ou intermediar a saída de colaboradores da empresa;
II – Induzir empregados a migrarem para empresa concorrente ou empreendimento próprio;
III – Utilizar sua influência para desestruturar a equipe técnica ou administrativa.

Parágrafo único: O descumprimento implicará multa equivalente a 3 (três) salários da última remuneração percebida por cada colaborador aliciado, sem prejuízo de indenização adicional.

CLÁUSULA 8ª – DA PROPRIEDADE INTELECTUAL
Procedimentos internos, manuais, treinamentos, métodos de gestão, estratégias comerciais e quaisquer materiais desenvolvidos durante o vínculo pertencem exclusivamente ao EMPREGADOR.

CLÁUSULA 9ª – DO REGULAMENTO INTERNO E SEGURANÇA
O EMPREGADO declara ciência e concordância com:
- Regulamento interno da oficina
- Normas de segurança do trabalho
- Uso obrigatório de EPIs quando necessário
- Normas ambientais e de descarte de resíduos automotivos
- Política de proteção de dados (LGPD)

CLÁUSULA 10ª – DOS EQUIPAMENTOS
Caso sejam fornecidos equipamentos, sistemas ou softwares de gestão automotiva, o EMPREGADO compromete-se a utilizá-los exclusivamente para fins profissionais.

CLÁUSULA 11ª – DA AUTORIZAÇÃO DE USO DE IMAGEM
O EMPREGADO autoriza, de forma gratuita e por prazo indeterminado, o uso de sua imagem, voz e nome pelo EMPREGADOR, exclusivamente para fins institucionais, publicitários e comerciais relacionados às atividades da oficina mecânica.

A autorização inclui, mas não se limita a:
- Fotografias
- Vídeos institucionais
- Redes sociais
- Website
- Materiais promocionais
- Campanhas publicitárias
- Treinamentos internos

Parágrafo 1º – Finalidade
O uso da imagem deverá estar relacionado às atividades profissionais desempenhadas pelo EMPREGADO e à divulgação institucional da empresa.

Parágrafo 2º – Limitação
Fica vedado o uso da imagem em contexto que possa gerar exposição vexatória, constrangimento ou desvio de finalidade.

Parágrafo 3º – Revogação
A autorização poderá ser revogada mediante solicitação formal do EMPREGADO, não gerando direito a indenização sobre materiais já produzidos ou divulgados anteriormente.

Parágrafo 4º – LGPD
O EMPREGADOR compromete-se a tratar a imagem e os dados pessoais do EMPREGADO conforme a Lei Geral de Proteção de Dados (LGPD).

CLÁUSULA 12ª – DO FORO
Fica eleito o foro da Justiça do Trabalho da Comarca de ${workshop.comarca || workshop.city || "Maringá"}/${workshop.state || "PR"}.

E por estarem assim justos e contratados, assinam o presente instrumento em 02 (duas) vias de igual teor.

${workshop.city || "Cidade"}, ${dataAtual}.

_________________________________________________
${empresa.razao} (Empregador)

_________________________________________________
${colab.nome} (Empregado)
`;
    } else if (contractType === "confianca") {
      template = `CONTRATO DE TRABALHO - CARGO DE CONFIANÇA

IDENTIFICAÇÃO DAS PARTES

EMPREGADOR: ${empresa.razao}, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº ${empresa.cnpj}, sediada em ${empresa.endereco}.

EMPREGADO: ${colab.nome}, portador(a) do RG nº ${colab.rg} e CPF nº ${colab.cpf}, residente e domiciliado(a) em ${colab.endereco}, Telefone: ${colab.telefone}, Email: ${colab.email}.

As partes acima identificadas têm, entre si, justo e acertado o presente Contrato Individual de Trabalho para Cargo de Confiança, que se regerá pelas cláusulas seguintes:

CLÁUSULA 1ª – DA DESCRIÇÃO DE CARGO E PODERES DE GESTÃO
O EMPREGADO exercerá a função de CONFIANÇA de “${colab.cargo}”, possuindo poderes de gestão e mando, conforme atribuições específicas descritas no documento interno “Descrição de Cargo”, integrante das políticas internas da empresa.

Parágrafo Único: O EMPREGADO declara estar ciente de que o exercício desta função pressupõe a investidura de mandato, com poderes para intervir na gestão do negócio em nome do EMPREGADOR.

CLÁUSULA 2ª – DA JORNADA DE TRABALHO (ART. 62, II, CLT)
O EMPREGADO não estará sujeito a controle de horário ou jornada de trabalho, enquadrando-se na exceção prevista no artigo 62, inciso II, da Consolidação das Leis do Trabalho (CLT), dada a natureza de suas atribuições e a autonomia inerente ao cargo de confiança.

Parágrafo 1º: Não haverá pagamento de horas extraordinárias, adicional noturno ou quaisquer outros adicionais relacionados à jornada, visto que a remuneração pactuada já engloba a gratificação de função superior a 40% (quarenta por cento) do salário efetivo, conforme exigência legal.

Parágrafo 2º: O EMPREGADO deverá zelar pelo bom andamento dos serviços, organizando seu tempo de forma a cumprir suas metas e responsabilidades.

CLÁUSULA 3ª – DA REMUNERAÇÃO
O EMPREGADO receberá a remuneração composta da seguinte forma:

1. Salário Base + Gratificação de Função (40%): ${salarioFixo}
2. Comissão Mensal Estimada: ${comissaoMensal}
3. Bonificação/Prêmio: ${bonificacao}

Vales e Benefícios:
${beneficiosTexto}

Regras de Comissionamento:
${regrasComissaoTexto}

O pagamento será efetuado até o 5º dia útil do mês subsequente.

Parágrafo 1º: A remuneração fixada compreende o salário base acrescido da gratificação de função, remunerando a maior responsabilidade do cargo.

Parágrafo 2º: Sobre o salário incidirão os descontos legais (INSS, IRRF, contribuição sindical, quando aplicável).

CLÁUSULA 4ª – DO PRAZO
O contrato é celebrado por prazo indeterminado, iniciando-se em ${employee.hire_date ? new Date(employee.hire_date).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')}.

CLÁUSULA 5ª – DA CONFIDENCIALIDADE COM MULTA
O EMPREGADO compromete-se a manter absoluto sigilo sobre:
- Cadastro de clientes
- Estrutura de custos
- Margens de lucro
- Estratégias comerciais
- Processos internos
- Fornecedores e negociações
- Métodos operacionais da oficina

A obrigação de confidencialidade permanece por prazo indeterminado, mesmo após o término do contrato.

Parágrafo 1º: O descumprimento implicará multa equivalente a 5 (cinco) vezes a última remuneração mensal, além de indenização por eventuais prejuízos comprovados.

Parágrafo 2º: A multa não substitui eventual responsabilidade civil ou penal cabível.

CLÁUSULA 6ª – DO NÃO ALICIAMENTO DE CLIENTES
O EMPREGADO compromete-se, pelo prazo de 24 (vinte e quatro) meses após o término do vínculo empregatício, a não praticar, direta ou indiretamente, qualquer ato que implique:

I – Contatar clientes ativos ou inativos da empresa com o objetivo de oferecer serviços concorrentes;
II – Induzir ou incentivar clientes a rescindirem contratos ou deixarem de contratar serviços da empresa;
III – Utilizar informações comerciais, listas de clientes, histórico de serviços, precificação ou estratégias comerciais obtidas durante o vínculo empregatício.

Parágrafo 1º: Consideram-se clientes aqueles que tenham contratado serviços da empresa nos últimos 24 meses anteriores ao desligamento.

Parágrafo 2º: O descumprimento desta cláusula sujeitará o EMPREGADO ao pagamento de multa equivalente a 3 (três) vezes sua última remuneração mensal, sem prejuízo de indenização por perdas e danos comprovados.

CLÁUSULA 7ª – DO NÃO ALICIAMENTO DE COLABORADORES
O EMPREGADO compromete-se, pelo prazo de 24 (vinte e quatro) meses após o término do contrato, a não:

I – Convidar, incentivar ou intermediar a saída de colaboradores da empresa;
II – Induzir empregados a migrarem para empresa concorrente ou empreendimento próprio;
III – Utilizar sua influência para desestruturar a equipe técnica ou administrativa.

Parágrafo único: O descumprimento implicará multa equivalente a 3 (três) salários da última remuneração percebida por cada colaborador aliciado, sem prejuízo de indenização adicional.

CLÁUSULA 8ª – DA PROPRIEDADE INTELECTUAL
Procedimentos internos, manuais, treinamentos, métodos de gestão, estratégias comerciais e quaisquer materiais desenvolvidos durante o vínculo pertencem exclusivamente ao EMPREGADOR.

CLÁUSULA 9ª – DO REGULAMENTO INTERNO E SEGURANÇA
O EMPREGADO declara ciência e concordância com:
- Regulamento interno da oficina
- Normas de segurança do trabalho
- Uso obrigatório de EPIs quando necessário
- Política de proteção de dados (LGPD)

CLÁUSULA 10ª – DA REVERSIBILIDADE
O EMPREGADOR poderá, a qualquer tempo, reverter o EMPREGADO ao cargo efetivo anteriormente ocupado, deixando de ser devida a gratificação de função, nos termos do parágrafo único do art. 468 da CLT.

CLÁUSULA 11ª – DA AUTORIZAÇÃO DE USO DE IMAGEM
O EMPREGADO autoriza, de forma gratuita e por prazo indeterminado, o uso de sua imagem, voz e nome pelo EMPREGADOR, exclusivamente para fins institucionais, publicitários e comerciais relacionados às atividades da oficina mecânica.

A autorização inclui, mas não se limita a:
- Fotografias
- Vídeos institucionais
- Redes sociais
- Website
- Materiais promocionais
- Campanhas publicitárias
- Treinamentos internos

Parágrafo 1º – Finalidade
O uso da imagem deverá estar relacionado às atividades profissionais desempenhadas pelo EMPREGADO e à divulgação institucional da empresa.

Parágrafo 2º – Limitação
Fica vedado o uso da imagem em contexto que possa gerar exposição vexatória, constrangimento ou desvio de finalidade.

Parágrafo 3º – Revogação
A autorização poderá ser revogada mediante solicitação formal do EMPREGADO, não gerando direito a indenização sobre materiais já produzidos ou divulgados anteriormente.

Parágrafo 4º – LGPD
O EMPREGADOR compromete-se a tratar a imagem e os dados pessoais do EMPREGADO conforme a Lei Geral de Proteção de Dados (LGPD).

CLÁUSULA 12ª – DO FORO
Fica eleito o foro da Justiça do Trabalho da Comarca de ${workshop.comarca || workshop.city || "Maringá"}/${workshop.state || "PR"}.

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
                <div className="p-4 bg-white rounded-lg border border-blue-100 shadow-sm">
                    <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                        <Award className="w-4 h-4 text-amber-500"/>
                        Contrato Cargo de Confiança
                    </h4>
                    <p className="text-xs text-gray-600 mb-3">Modelo para cargos de gestão (Art. 62 CLT) sem controle de jornada.</p>
                    <Button variant="outline" size="sm" className="w-full" onClick={() => { setContractType('confianca'); setShowGenerator(true); }}>
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
                            <SelectItem value="confianca">Contrato Cargo de Confiança</SelectItem>
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