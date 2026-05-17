import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { jsPDF } from 'npm:jspdf@2.5.2';
import 'npm:jspdf-autotable@3.8.2';

const formatarMoeda = (valor) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
};

const normalizarTexto = (texto) => {
  if (!texto) return '—';
  return String(texto).normalize('NFC');
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ano, workshop_id } = await req.json();

    if (!ano || !workshop_id) {
      return Response.json({ error: 'ano e workshop_id são obrigatórios' }, { status: 400 });
    }

    // Buscar dados DFC anual
    const dfcResponse = await base44.functions.invoke('getDFCDataAnual', { ano, workshop_id });
    const dfcData = dfcResponse.data;

    // Gerar PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 15;

    // Cabeçalho
    doc.setFont('Helvetica', 'normal');
    doc.setFillColor(51, 51, 51);
    doc.rect(0, 0, pageWidth, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text('OFICINAS MASTER', 15, 12);
    doc.setFontSize(11);
    doc.text('Relatório DFC Anual', 15, 23);

    doc.setTextColor(0, 0, 0);
    yPos = 40;

    // Título
    doc.setFontSize(16);
    doc.text(`Fluxo de Caixa - Exercício de ${ano}`, 15, yPos);
    yPos += 10;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`, 15, yPos);
    yPos += 15;

    // KPIs por Grupo
    const grupos = [
      { label: 'Operacional', valor: dfcData.total_anual.operacional, color: [34, 197, 94] },
      { label: 'Investimento', valor: dfcData.total_anual.investimento, color: [59, 130, 246] },
      { label: 'Financiamento', valor: dfcData.total_anual.financiamento, color: [217, 119, 6] }
    ];

    grupos.forEach((grupo, idx) => {
      doc.setFillColor(...grupo.color);
      doc.rect(15 + (idx * 65), yPos, 60, 25, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.text(grupo.label, 18 + (idx * 65), yPos + 8);
      doc.setFontSize(16);
      doc.text(formatarMoeda(grupo.valor), 18 + (idx * 65), yPos + 18);
      doc.setTextColor(0, 0, 0);
    });

    yPos += 35;

    // Saldo Final
    doc.setFontSize(13);
    doc.text('Saldo Final do Ano', 15, yPos);
    yPos += 8;
    doc.setFontSize(24);
    doc.setTextColor(dfcData.total_anual.saldo_final >= 0 ? 34 : 239);
    doc.text(formatarMoeda(dfcData.total_anual.saldo_final), 15, yPos);
    yPos += 15;

    // Evolução Mensal por Grupo
    doc.setFontSize(12);
    doc.text('Evolução Mensal por Grupo', 15, yPos);
    yPos += 8;

    const mesesData = dfcData.meses.map(m => [
      m.mes_nome,
      formatarMoeda(m.operacional),
      formatarMoeda(m.investimento),
      formatarMoeda(m.financiamento),
      formatarMoeda(m.saldo_final)
    ]);

    doc.autoTable({
      startY: yPos,
      head: [['Mês', 'Operacional', 'Investimento', 'Financiamento', 'Saldo']],
      body: mesesData,
      margin: { left: 15, right: 15 },
      theme: 'striped',
      headStyles: { fillColor: [51, 51, 51], textColor: 255, fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 35 }, 2: { cellWidth: 35 }, 3: { cellWidth: 35 }, 4: { cellWidth: 30 } }
    });

    yPos = doc.lastAutoTable.finalY + 15;

    // Detalhamento por Grupo
    doc.addPage();
    yPos = 15;

    doc.setFontSize(12);
    doc.text('Detalhamento por Grupo', 15, yPos);
    yPos += 8;

    const gruposData = dfcData.grupos.map(g => [
      normalizarTexto(g.label),
      formatarMoeda(g.entradas),
      formatarMoeda(g.saidas),
      formatarMoeda(g.total),
      `${g.entradas > 0 ? ((g.total / g.entradas) * 100).toFixed(1) : 0}%`
    ]);

    doc.autoTable({
      startY: yPos,
      head: [['Grupo', 'Entradas', 'Saídas', 'Saldo Líquido', '%']],
      body: gruposData,
      margin: { left: 15, right: 15 },
      theme: 'striped',
      headStyles: { fillColor: [51, 51, 51], textColor: 255, fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fontSize: 9 },
      columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 35 }, 2: { cellWidth: 35 }, 3: { cellWidth: 40 }, 4: { cellWidth: 25 } }
    });

    // Médias Mensais
    yPos = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(11);
    doc.text('Médias Mensais', 15, yPos);
    yPos += 8;

    const mediasData = [
      ['Operacional', formatarMoeda(dfcData.media_mensal.operacional)],
      ['Investimento', formatarMoeda(dfcData.media_mensal.investimento)],
      ['Financiamento', formatarMoeda(dfcData.media_mensal.financiamento)],
      ['Saldo Final', formatarMoeda(dfcData.media_mensal.saldo_final)]
    ];

    doc.autoTable({
      startY: yPos,
      body: mediasData,
      margin: { left: 15, right: 15 },
      theme: 'plain',
      bodyStyles: { fontSize: 9 },
      columnStyles: { 0: { cellWidth: 60, fontStyle: 'bold' }, 1: { cellWidth: 100 } }
    });

    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Relatório DFC Anual ${ano} · ${dfcData.total_lancamentos} lançamentos`,
      15,
      pageHeight - 10
    );

    const pdfBlob = doc.output('blob');
    return new Response(pdfBlob, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="dfc-anual-${ano}.pdf"`
      }
    });
  } catch (error) {
    console.error('Erro ao gerar PDF DFC:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});