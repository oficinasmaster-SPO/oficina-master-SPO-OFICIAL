import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { jsPDF } from 'npm:jspdf@2.5.2';
import 'npm:jspdf-autotable@3.8.2';

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

    // Título e Consultor
    doc.setFontSize(16);
    doc.text(`Relatório ${tipo.toUpperCase()} - ${new Date().toLocaleDateString('pt-BR')}`, 15, yPos);
    yPos += 10;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Consultor: ${user.full_name || user.email}`, 15, yPos);
    yPos += 10;
    doc.setTextColor(0, 0, 0);

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

    // Tabela de detalhes - REALIZADOS
    if (concludidos.length > 0) {
      doc.setFontSize(12);
      doc.text('✓ Atendimentos Realizados', 15, yPos);
      yPos += 8;

      const tableData = concludidos.slice(0, 10).map(c => {
        const dateObj = new Date(c.completedAt || '');
        const data = dateObj.toLocaleDateString('pt-BR');
        const hora = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        return [
          data,
          hora,
          c.workshop_name || '—',
          c.canal || '—',
          c.resultado || '—',
          c.consultor_nome || user.full_name || '—',
          c.observacoes ? c.observacoes.substring(0, 20) + '...' : '—'
        ];
      });

      doc.autoTable({
        startY: yPos,
        head: [['Data', 'Hora', 'Cliente', 'Canal', 'Resultado', 'Consultor', 'Obs.']],
        body: tableData,
        margin: { left: 15, right: 15 },
        theme: 'grid',
        headStyles: { fillColor: [51, 51, 51], textColor: 255, fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        columnStyles: { 0: { cellWidth: 18 }, 1: { cellWidth: 16 }, 2: { cellWidth: 40 }, 3: { cellWidth: 24 }, 4: { cellWidth: 24 }, 5: { cellWidth: 35 }, 6: { cellWidth: 30 } }
      });

      yPos = doc.lastAutoTable.finalY + 10;
    }

    // Tabela de PENDENTES (desde quando está pendente)
    if (reminders.filter(r => !r.is_completed).length > 0) {
      doc.addPage();
      yPos = 15;
      
      doc.setFontSize(12);
      doc.text('⏳ Follow-ups Pendentes', 15, yPos);
      yPos += 8;

      const pendingData = reminders.filter(r => !r.is_completed).slice(0, 10).map(r => {
        const reminderDate = new Date(r.reminder_date);
        const today = new Date();
        const daysAgo = Math.floor((today - reminderDate) / (1000 * 60 * 60 * 24));
        return [
          reminderDate.toLocaleDateString('pt-BR'),
          `${daysAgo} dias`,
          r.workshop_name || '—',
          `#${r.sequence_number}` || '—',
          r.message ? r.message.substring(0, 30) + '...' : '—'
        ];
      });

      doc.autoTable({
        startY: yPos,
        head: [['Data Prevista', 'Tempo Pendente', 'Cliente', 'Seq.', 'Descrição']],
        body: pendingData,
        margin: { left: 15, right: 15 },
        theme: 'grid',
        headStyles: { fillColor: [217, 119, 6], textColor: 255, fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 30 }, 2: { cellWidth: 60 }, 3: { cellWidth: 20 }, 4: { cellWidth: 50 } }
      });
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