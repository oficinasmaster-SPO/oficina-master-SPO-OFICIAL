import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { jsPDF } from 'npm:jspdf@2.5.1';
import 'npm:jspdf-autotable@3.8.2';

// Função para remover acentos e caracteres especiais
const removeAccents = (str) => {
    if (str === null || str === undefined) return '';
    return String(str).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { filters, selectedMetrics } = await req.json();

        // Inicializar documento PDF
        const doc = new jsPDF();
        
        // Cabeçalho
        doc.setFontSize(18);
        doc.text(removeAccents('Relatório Customizado'), 14, 22);
        
        doc.setFontSize(10);
        const userName = user.full_name || user.email || '';
        doc.text(removeAccents(`Gerado por: ${userName}`), 14, 30);
        doc.text(removeAccents(`Data: ${new Date().toLocaleDateString('pt-BR')}`), 14, 35);
        
        if (filters?.dateRange?.from && filters?.dateRange?.to) {
            const from = new Date(filters.dateRange.from).toLocaleDateString('pt-BR');
            const to = new Date(filters.dateRange.to).toLocaleDateString('pt-BR');
            doc.text(removeAccents(`Período: ${from} até ${to}`), 14, 40);
        }

        // Buscar dados
        let workshops;

        // Tentar identificar a oficina do usuário para filtrar o relatório
        let userWorkshopId = user.workshop_id;

        // Se não tiver no usuário, busca no cadastro de colaboradores
        if (!userWorkshopId) {
            const employees = await base44.entities.Employee.filter({ user_id: user.id });
            if (employees && employees.length > 0) {
                userWorkshopId = employees[0].workshop_id;
            }
        }

        // Se identificou uma oficina vinculada, filtra apenas ela
        if (userWorkshopId) {
            workshops = await base44.entities.Workshop.filter({ id: userWorkshopId });
        } else {
            // Caso contrário (admin global sem vínculo), lista todas
            workshops = await base44.entities.Workshop.list();
        }
        
        let yPos = 50;

        // Tabela de Workshops
        const tableData = workshops.map(w => {
            const row = [removeAccents(w.name)];
            
            if (selectedMetrics.includes('faturamento')) {
                const fat = w.best_month_history?.revenue_total || 0;
                row.push(`R$ ${fat.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
            }
            if (selectedMetrics.includes('lucratividade')) {
                const luc = w.best_month_history?.profit_percentage || 0;
                row.push(`${luc.toFixed(1)}%`);
            }
            if (selectedMetrics.includes('ticket_medio')) {
                const tm = w.best_month_history?.average_ticket || 0;
                row.push(`R$ ${tm.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
            }
            if (selectedMetrics.includes('satisfacao_cliente')) {
                row.push('N/A'); 
            }
            
            return row;
        });

        const tableHeaders = ['Oficina'];
        if (selectedMetrics.includes('faturamento')) tableHeaders.push('Faturamento');
        if (selectedMetrics.includes('lucratividade')) tableHeaders.push('Lucratividade');
        if (selectedMetrics.includes('ticket_medio')) tableHeaders.push(removeAccents('Ticket Médio'));
        if (selectedMetrics.includes('satisfacao_cliente')) tableHeaders.push(removeAccents('Satisfação'));

        doc.autoTable({
            startY: yPos,
            head: [tableHeaders],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [41, 128, 185] },
            styles: { fontSize: 8 },
        });

        // Rodapé
        const pageCount = doc.internal.getNumberOfPages();
        for(let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.text(removeAccents('Página ' + i + ' de ' + pageCount), doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 10, {align: 'right'});
        }

        // Output como ArrayBuffer
        const pdfOutput = doc.output('arraybuffer');

        return new Response(pdfOutput, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'attachment; filename=relatorio_customizado.pdf'
            }
        });

    } catch (error) {
        console.error('Error generating report:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});