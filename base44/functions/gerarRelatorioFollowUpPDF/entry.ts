import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import jsPDF from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tipo = 'diario', data, workshop_id } = await req.json();

    // Busca dados baseado no tipo de relatório
    let reminders = [];
    let concludidos = [];
    const today = new Date().toISOString().split('T')[0];

    if (tipo === 'diario') {
      reminders = await base44.entities.FollowUpReminder.filter(
        { consultor_id: user.id, reminder_date: data || today },
        '-reminder_date'
      );
      concludidos = await base44.entities.FollowUpConcluido.filter(
        { consultor_id: user.id },
        '-completedAt'
      ).then(items => items.filter(c => c.completedAt?.startsWith(data || today)));
    } else if (tipo === 'semanal') {
      const startDate = new Date(data || today);
      startDate.setDate(startDate.getDate() - startDate.getDay());
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
      
      reminders = await base44.entities.FollowUpReminder.filter(
        { consultor_id: user.id },
        '-reminder_date'
      );
      concludidos = await base44.entities.FollowUpConcluido.filter(
        { consultor_id: user.id },
        '-completedAt'
      );
    } else if (tipo === 'cliente' && workshop_id) {
      reminders = await base44.entities.FollowUpReminder.filter(
        { workshop_id, consultor_id: user.id },
        '-reminder_date'
      );
      concludidos = await base44.entities.FollowUpConcluido.filter(
        { workshop_id, consultor_id: user.id },
        '-completedAt'
      );
    } else if (tipo === 'riscos') {
      // Relatório de riscos: follow-ups vencidos + clientes com baixa realização
      reminders = await base44.entities.FollowUpReminder.filter(
        { consultor_id: user.id, is_completed: false },
        'reminder_date'
      ).then(items => items.filter(r => r.reminder_date < today));
    }

    // Cálculos de métricas
    const totalRealizado = concludidos.length;
    const totalPendente = reminders.filter(r => !r.is_completed).length;
    const totalAtrasado = reminders.filter(r => !r.is_completed && r.reminder_date < today).length;
    const taxaRealizacao = totalRealizado + totalPendente > 0 
      ? Math.round((totalRealizado / (totalRealizado + totalPendente)) * 100) 
      : 0;

    // Gera PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = 15;

    // Cabeçalho
    doc.setFillColor(51, 51, 51);
    doc.rect(0, 0, pageWidth, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text('OFICINAS MASTER', 15, 12);
    doc.setFontSize(11);
    doc.text('Relatório de Follow-up', 15, 23);

    doc.setTextColor(0, 0, 0);
    yPos = 40;

    // Título
    doc.setFontSize(16);
    doc.text(`Relatório ${tipo.toUpperCase()} - ${new Date().toLocaleDateString('pt-BR')}`, 15, yPos);
    yPos += 12;

    // KPIs
    doc.setFontSize(11);
    doc.setFillColor(240, 240, 240);
    doc.rect(15, yPos, 60, 25, 'F');
    doc.text('✓ Realizados', 18, yPos + 8);
    doc.setFontSize(18);
    doc.setTextColor(34, 197, 94);
    doc.text(totalRealizado.toString(), 18, yPos + 20);
    
    doc.setFillColor(245, 245, 245);
    doc.rect(80, yPos, 60, 25, 'F');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('⏳ Pendentes', 83, yPos + 8);
    doc.setFontSize(18);
    doc.setTextColor(217, 119, 6);
    doc.text(totalPendente.toString(), 83, yPos + 20);

    doc.setFillColor(254, 240, 240);
    doc.rect(145, yPos, 60, 25, 'F');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('⚠ Atrasados', 148, yPos + 8);
    doc.setFontSize(18);
    doc.setTextColor(239, 68, 68);
    doc.text(totalAtrasado.toString(), 148, yPos + 20);

    yPos += 35;

    // Taxa de Realização
    doc.setFontSize(13);
    doc.text('Taxa de Realização', 15, yPos);
    yPos += 8;
    doc.setFontSize(24);
    doc.setTextColor(51, 51, 51);
    doc.text(`${taxaRealizacao}%`, 15, yPos);

    yPos += 15;

    // Tabela de detalhes
    if (concludidos.length > 0) {
      doc.setFontSize(12);
      doc.text('Atendimentos Realizados', 15, yPos);
      yPos += 8;

      const tableData = concludidos.slice(0, 10).map(c => [
        new Date(c.completedAt || '').toLocaleDateString('pt-BR'),
        c.workshop_name || '—',
        c.canal || '—',
        c.resultado || '—'
      ]);

      doc.autoTable({
        startY: yPos,
        head: [['Data', 'Cliente', 'Canal', 'Resultado']],
        body: tableData,
        margin: { left: 15, right: 15 },
        theme: 'grid',
        headStyles: { fillColor: [51, 51, 51], textColor: 255, fontSize: 10 },
        bodyStyles: { fontSize: 9 },
        columnStyles: { 0: { cellWidth: 30 }, 1: { cellWidth: 60 }, 2: { cellWidth: 35 }, 3: { cellWidth: 40 } }
      });

      yPos = doc.internal.pageSize.getHeight() - 20;
    }

    // Rodapé
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`,
      15,
      pageHeight - 10
    );

    const pdfBlob = doc.output('blob');
    return new Response(pdfBlob, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="relatorio-followup-${tipo}-${data || today}.pdf"`
      }
    });
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});