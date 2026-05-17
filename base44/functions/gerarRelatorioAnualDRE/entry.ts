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

    // Buscar dados DRE anual
    const dreResponse = await base44.functions.invoke('getDREDataAnual', { ano, workshop_id });
    const dreData = dreResponse.data;

    // Buscar ano anterior para comparativo
    const anoAnterior = ano - 1;
    let dreAnterior = null;
    try {
      const responseAnterior = await base44.functions.invoke('getDREDataAnual', { ano: anoAnterior, workshop_id });
      dreAnterior = responseAnterior.data;
    } catch {
      // Ano anterior não tem dados
    }

    // Gerar PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = 15;

    // Cabeçalho
    doc.setFont('Helvetica', 'normal');
    doc.setFillColor(51, 51, 51);
    doc.rect(0, 0, pageWidth, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text('OFICINAS MASTER', 15, 12);
    doc.setFontSize(11);
    doc.text('Relatório DRE Anual', 15, 23);

    doc.setTextColor(0, 0, 0);
    yPos = 40;

    // Título e Período
    doc.setFontSize(16);
    doc.text(`Exercício de ${ano}`, 15, yPos);
    yPos += 10;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 15, yPos);
    yPos += 10;
    doc.setTextColor(0, 0, 0);

    // KPIs Anuais
    doc.setFontSize(10);
    doc.setFillColor(240, 248, 245);
    doc.rect(15, yPos, 60, 25, 'F');
    doc.setTextColor(51, 51, 51);
    doc.text('Receitas', 18, yPos + 8);
    doc.setFontSize(16);
    doc.setTextColor(34, 197, 94);
    doc.text(formatarMoeda(dreData.total_anual.receitas), 18, yPos + 18);
    
    doc.setFillColor(254, 245, 245);
    doc.rect(80, yPos, 60, 25, 'F');
    doc.setFontSize(10);
    doc.setTextColor(51, 51, 51);
    doc.text('Despesas', 83, yPos + 8);
    doc.setFontSize(16);
    doc.setTextColor(239, 68, 68);
    doc.text(formatarMoeda(dreData.total_anual.despesas), 83, yPos + 18);

    doc.setFillColor(240, 248, 255);
    doc.rect(145, yPos, 60, 25, 'F');
    doc.setFontSize(10);
    doc.setTextColor(51, 51, 51);
    doc.text('Lucro', 148, yPos + 8);
    doc.setFontSize(16);
    doc.setTextColor(59, 130, 246);
    doc.text(formatarMoeda(dreData.total_anual.lucro), 148, yPos + 18);

    yPos += 35;

    // Margem
    doc.setFontSize(13);
    doc.text('Margem de Lucro', 15, yPos);
    yPos += 8;
    doc.setFontSize(24);
    doc.setTextColor(51, 51, 51);
    doc.text(`${dreData.total_anual.margem.toFixed(1)}%`, 15, yPos);
    yPos += 15;

    // Comparativo Ano Anterior (se disponível)
    if (dreAnterior) {
      doc.setFontSize(12);
      doc.text(`Comparativo com ${anoAnterior}`, 15, yPos);
      yPos += 8;

      const variacaoReceitas = ((dreData.total_anual.receitas - dreAnterior.total_anual.receitas) / dreAnterior.total_anual.receitas) * 100;
      const variacaoDespesas = ((dreData.total_anual.despesas - dreAnterior.total_anual.despesas) / dreAnterior.total_anual.despesas) * 100;
      const variacaoLucro = ((dreData.total_anual.lucro - dreAnterior.total_anual.lucro) / dreAnterior.total_anual.lucro) * 100;

      const comparativoData = [
        ['Receitas', formatarMoeda(dreAnterior.total_anual.receitas), formatarMoeda(dreData.total_anual.receitas), `${variacaoReceitas >= 0 ? '+' : ''}${variacaoReceitas.toFixed(1)}%`],
        ['Despesas', formatarMoeda(dreAnterior.total_anual.despesas), formatarMoeda(dreData.total_anual.despesas), `${variacaoDespesas >= 0 ? '+' : ''}${variacaoDespesas.toFixed(1)}%`],
        ['Lucro', formatarMoeda(dreAnterior.total_anual.lucro), formatarMoeda(dreData.total_anual.lucro), `${variacaoLucro >= 0 ? '+' : ''}${variacaoLucro.toFixed(1)}%`]
      ];

      doc.autoTable({
        startY: yPos,
        head: [['Item', anoAnterior.toString(), ano.toString(), 'Variação']],
        body: comparativoData,
        margin: { left: 15, right: 15 },
        theme: 'striped',
        headStyles: { fillColor: [51, 51, 51], textColor: 255, fontSize: 9, fontStyle: 'bold' },
        bodyStyles: { fontSize: 9 },
        columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 50 }, 2: { cellWidth: 50 }, 3: { cellWidth: 35 } }
      });

      yPos = doc.lastAutoTable.finalY + 15;
    }

    // Evolução Mensal
    doc.setFontSize(12);
    doc.text('Evolução Mensal', 15, yPos);
    yPos += 8;

    const mesesData = dreData.meses.map(m => [
      m.mes_nome,
      formatarMoeda(m.receitas),
      formatarMoeda(m.despesas),
      formatarMoeda(m.lucro),
      `${m.margem.toFixed(1)}%`
    ]);

    doc.autoTable({
      startY: yPos,
      head: [['Mês', 'Receitas', 'Despesas', 'Lucro', 'Margem']],
      body: mesesData,
      margin: { left: 15, right: 15 },
      theme: 'striped',
      headStyles: { fillColor: [51, 51, 51], textColor: 255, fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 35 }, 2: { cellWidth: 35 }, 3: { cellWidth: 35 }, 4: { cellWidth: 20 } }
    });

    yPos = doc.lastAutoTable.finalY + 15;

    // Categorias (Top 10)
    doc.addPage();
    yPos = 15;

    doc.setFontSize(12);
    doc.text('Principais Categorias', 15, yPos);
    yPos += 8;

    const categoriasData = dreData.categorias.slice(0, 10).map(c => [
      normalizarTexto(c.label),
      c.tipo === 'receita' ? 'Receita' : 'Despesa',
      formatarMoeda(c.total),
      `${((c.total / (c.tipo === 'receita' ? dreData.total_anual.receitas : dreData.total_anual.despesas)) * 100).toFixed(1)}%`
    ]);

    doc.autoTable({
      startY: yPos,
      head: [['Categoria', 'Tipo', 'Total', '% do Total']],
      body: categoriasData,
      margin: { left: 15, right: 15 },
      theme: 'striped',
      headStyles: { fillColor: [51, 51, 51], textColor: 255, fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 25 }, 2: { cellWidth: 40 }, 3: { cellWidth: 30 } }
    });

    // Rodapé
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Relatório DRE Anual ${ano} · ${dreData.total_lancamentos} lançamentos`,
      15,
      pageHeight - 10
    );

    const pdfBlob = doc.output('blob');
    return new Response(pdfBlob, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="dre-anual-${ano}.pdf"`
      }
    });
  } catch (error) {
    console.error('Erro ao gerar PDF DRE:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});