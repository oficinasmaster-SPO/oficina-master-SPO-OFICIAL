import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { type, employee_name, items } = await req.json();
        const doc = new jsPDF();

        // Header
        doc.setFontSize(16);
        doc.text(`Relatório de ${type === 'feedbacks' ? 'Feedbacks' : 'Advertências'}`, 20, 20);
        doc.setFontSize(12);
        doc.text(`Colaborador: ${employee_name}`, 20, 30);
        doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 20, 38);

        let y = 50;

        if (type === 'feedbacks') {
            items.forEach((fb) => {
                if (y > 270) { doc.addPage(); y = 20; }
                doc.setFont(undefined, 'bold');
                const date = new Date(fb.date).toLocaleDateString('pt-BR');
                const typeLabel = (fb.type || '').toUpperCase().replace('_', ' ');
                doc.text(`${date} - ${typeLabel}`, 20, y);
                y += 7;
                
                doc.setFont(undefined, 'normal');
                doc.setFontSize(10);
                const splitText = doc.splitTextToSize(fb.content || '', 170);
                doc.text(splitText, 20, y);
                y += splitText.length * 5 + 10;
                doc.setFontSize(12);
            });
        } else if (type === 'warnings') {
             items.forEach((w) => {
                if (y > 270) { doc.addPage(); y = 20; }
                doc.setFont(undefined, 'bold');
                const date = new Date(w.date).toLocaleDateString('pt-BR');
                const severityMap = { leve: "Leve", grave: "Grave", gravissima: "Gravíssima" };
                const severity = severityMap[w.severity] || w.severity;
                
                doc.text(`${date} - ${severity} - ${w.reason}`, 20, y);
                y += 7;
                
                doc.setFont(undefined, 'normal');
                doc.setFontSize(10);
                const splitText = doc.splitTextToSize(w.description || '', 170);
                doc.text(splitText, 20, y);
                y += splitText.length * 5 + 10;
                doc.setFontSize(12);
            });
        }

        const pdfBytes = doc.output('arraybuffer');

        return new Response(pdfBytes, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename=relatorio_${type}.pdf`
            }
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});