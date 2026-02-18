import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.1';
import 'npm:jspdf-autotable@3.8.2';

// Fonte Roboto Regular em Base64 (Subset Latin-1 para reduzir tamanho)
// Devido ao limite de tamanho, vamos usar uma abordagem de conversão para Latin-1 que funciona com as fontes padrão
// As fontes padrão do PDF (Helvetica) suportam WinAnsi (cp1252), que cobre a maioria dos acentos do português.
// O segredo é converter a string JS (UTF-16) para os códigos de byte corretos do WinAnsi.

const encodeToWinAnsi = (str) => {
    if (str === null || str === undefined) return '';
    const winAnsi = {
        '€': 128, '‚': 130, 'ƒ': 131, '„': 132, '…': 133, '†': 134, '‡': 135,
        'ˆ': 136, '‰': 137, 'Š': 138, '‹': 139, 'Œ': 140, 'Ž': 142,
        '‘': 145, '’': 146, '“': 147, '”': 148, '•': 149, '–': 150, '—': 151,
        '˜': 152, '™': 153, 'š': 154, '›': 155, 'œ': 156, 'ž': 158, 'Ÿ': 159,
        ' ': 160, '¡': 161, '¢': 162, '£': 163, '¤': 164, '¥': 165, '¦': 166,
        '§': 167, '¨': 168, '©': 169, 'ª': 170, '«': 171, '¬': 172, '®': 174,
        '¯': 175, '°': 176, '±': 177, '²': 178, '³': 179, '´': 180, 'µ': 181,
        '¶': 182, '·': 183, '¸': 184, '¹': 185, 'º': 186, '»': 187, '¼': 188,
        '½': 189, '¾': 190, '¿': 191, 'À': 192, 'Á': 193, 'Â': 194, 'Ã': 195,
        'Ä': 196, 'Å': 197, 'Æ': 198, 'Ç': 199, 'È': 200, 'É': 201, 'Ê': 202,
        'Ë': 203, 'Ì': 204, 'Í': 205, 'Î': 206, 'Ï': 207, 'Ð': 208, 'Ñ': 209,
        'Ò': 210, 'Ó': 211, 'Ô': 212, 'Õ': 213, 'Ö': 214, '×': 215, 'Ø': 216,
        'Ù': 217, 'Ú': 218, 'Û': 219, 'Ü': 220, 'Ý': 221, 'Þ': 222, 'ß': 223,
        'à': 224, 'á': 225, 'â': 226, 'ã': 227, 'ä': 228, 'å': 229, 'æ': 230,
        'ç': 231, 'è': 232, 'é': 233, 'ê': 234, 'ë': 235, 'ì': 236, 'í': 237,
        'î': 238, 'ï': 239, 'ð': 240, 'ñ': 241, 'ò': 242, 'ó': 243, 'ô': 244,
        'õ': 245, 'ö': 246, '÷': 247, 'ø': 248, 'ù': 249, 'ú': 250, 'û': 251,
        'ü': 252, 'ý': 253, 'þ': 254, 'ÿ': 255
    };

    return str.split('').map(char => {
        const code = char.charCodeAt(0);
        // Se for ASCII padrão (0-127), retorna direto
        if (code >= 0 && code <= 127) return char;
        
        // Se estiver no mapa WinAnsi, retorna o caractere correspondente pelo código
        if (winAnsi[char]) {
            return String.fromCharCode(winAnsi[char]);
        }
        
        // Fallback: tenta converter para ASCII simples ou substitui
        // Normalização Unicode pode ajudar a separar acentos (ex: Á -> A + acento)
        // Mas para simplificar, se não estiver no mapa, retorna ? ou o próprio char (que vai sair errado, mas é o fallback)
        return char;
    }).join('');
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
        doc.text(encodeToWinAnsi('Relatório Customizado'), 14, 22);
        
        doc.setFontSize(10);
        const userName = user.full_name || user.email || '';
        doc.text(encodeToWinAnsi(`Gerado por: ${userName}`), 14, 30);
        doc.text(encodeToWinAnsi(`Data: ${new Date().toLocaleDateString('pt-BR')}`), 14, 35);
        
        if (filters?.dateRange?.from && filters?.dateRange?.to) {
            const from = new Date(filters.dateRange.from).toLocaleDateString('pt-BR');
            const to = new Date(filters.dateRange.to).toLocaleDateString('pt-BR');
            doc.text(encodeToWinAnsi(`Período: ${from} até ${to}`), 14, 40);
        }

        // Buscar dados
        const workshops = await base44.entities.Workshop.list();
        
        let yPos = 50;

        // Tabela de Workshops
        const tableData = workshops.map(w => {
            const row = [encodeToWinAnsi(w.name)];
            
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
        if (selectedMetrics.includes('ticket_medio')) tableHeaders.push(encodeToWinAnsi('Ticket Médio'));
        if (selectedMetrics.includes('satisfacao_cliente')) tableHeaders.push(encodeToWinAnsi('Satisfação'));

        doc.autoTable({
            startY: yPos,
            head: [tableHeaders],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [41, 128, 185] },
            styles: { fontSize: 8 },
            // Importante: autotable geralmente lida bem, mas se falhar, podemos aplicar o encode nos dados
            // Como aplicamos manualmente nos dados acima, deve funcionar.
            // Se usarmos fonte padrão (helvetica), ela espera winansi.
        });

        // Rodapé
        const pageCount = doc.internal.getNumberOfPages();
        for(let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.text(encodeToWinAnsi('Página ' + i + ' de ' + pageCount), doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 10, {align: 'right'});
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