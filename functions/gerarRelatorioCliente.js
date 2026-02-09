import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { jsPDF } from 'npm@2.5.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workshop_id } = await req.json();

    if (!workshop_id) {
      return Response.json({ error: 'workshop_id é obrigatório' }, { status: 400 });
    }

    // Buscar dados da oficina
    const workshop = await base44.entities.Workshop.get(workshop_id);
    const employees = await base44.entities.Employee.filter({ workshop_id });
    const atendimentos = await base44.entities.ConsultoriaAtendimento.filter({ workshop_id });
    const atas = atendimentos.filter(a => a.ata_ia);

    // Criar PDF
    const doc = new jsPDF();
    let y = 20;

    // Título
    doc.setFontSize(20);
    doc.text('Relatório Completo do Cliente', 20, y);
    y += 15;

    // Informações da Oficina
    doc.setFontSize(14);
    doc.text('Dados da Oficina', 20, y);
    y += 10;

    doc.setFontSize(10);
    doc.text(`Nome: ${workshop.name}`, 20, y);
    y += 7;
    doc.text(`Cidade/Estado: ${workshop.city}/${workshop.state}`, 20, y);
    y += 7;
    doc.text(`Plano: ${workshop.planoAtual || 'FREE'}`, 20, y);
    y += 7;
    doc.text(`Fase: ${workshop.maturity_level || 1}`, 20, y);
    y += 15;

    // Colaboradores
    doc.setFontSize(14);
    doc.text('Equipe', 20, y);
    y += 10;

    doc.setFontSize(10);
    employees.slice(0, 10).forEach(emp => {
      doc.text(`• ${emp.full_name} - ${emp.position}`, 25, y);
      y += 6;
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });

    y += 10;

    // Atendimentos
    doc.setFontSize(14);
    doc.text('Atendimentos Realizados', 20, y);
    y += 10;

    doc.setFontSize(10);
    const realizados = atendimentos.filter(a => a.status === 'realizado');
    doc.text(`Total: ${realizados.length}`, 20, y);
    y += 10;

    realizados.slice(0, 5).forEach(a => {
      const data = new Date(a.data_realizada || a.data_agendada).toLocaleDateString('pt-BR');
      doc.text(`• ${a.tipo_atendimento} - ${data}`, 25, y);
      y += 6;
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });

    // Áreas Incompletas
    y += 15;
    if (y > 250) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(14);
    doc.text('Status das Áreas', 20, y);
    y += 10;

    doc.setFontSize(10);
    const areas = [
      { nome: 'Cadastro Básico', completo: !!workshop.name && !!workshop.city },
      { nome: 'Metas Mensais', completo: !!workshop.monthly_goals },
      { nome: 'Cultura Organizacional', completo: !!workshop.mission },
      { nome: 'DRE Atualizado', completo }, // Verificar via entidade DREMonthly
      { nome: 'Equipe Completa', completo.length > 0 }
    ];

    areas.forEach(area => {
      const status = area.completo ? '✓' : '⚠ Pendente';
      const color = area.completo ? [34, 197, 94] : [239, 68, 68];
      doc.setTextColor(...color);
      doc.text(`${status} ${area.nome}`, 25, y);
      doc.setTextColor(0, 0, 0);
      y += 7;
    });

    // Observação final
    const pendentes = areas.filter(a => !a.completo);
    if (pendentes.length > 0) {
      y += 10;
      doc.setFontSize(9);
      doc.setTextColor(200, 0, 0);
      doc.text('⚠ Cliente ainda possui tarefas pendentes. Aguardando conclusão.', 20, y);
    }

    // Gerar e retornar PDF
    const pdfBuffer = doc.output('arraybuffer');

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=Relatorio_${workshop.name.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
      }
    });

  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    return Response.json({ 
      error: 'Erro ao gerar relatório', 
      details.message 
    }, { status: 500 });
  }
});
