import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import PptxGenJS from "npm@3.12.0";

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { workshop_id } = await req.json();

        if (!workshop_id) {
            return Response.json({ error: 'Workshop ID required' }, { status: 400 });
        }

        // Fetch Data
        const workshop = await base44.entities.Workshop.filter({ id }).then(res => res[0]);
        const manual = await base44.entities.CultureManual.filter({ workshop_id }).then(res => res[0]);
        const rituals = await base44.entities.Ritual.filter({ workshop_id });
        const employees = await base44.entities.Employee.filter({ workshop_id, status: 'ativo' });

        if (!manual) {
            return Response.json({ error: 'Manual de Cultura não encontrado' }, { status: 404 });
        }

        // Initialize PPTX
        const pptx = new PptxGenJS();
        pptx.layout = 'LAYOUT_16x9';
        
        // Theme Colors
        const primaryColor = workshop?.brand_colors?.primary || '000000';
        const secondaryColor = workshop?.brand_colors?.secondary || '808080';

        // 1. Cover Slide
        const slide1 = pptx.addSlide();
        slide1.background = { color: 'F1F1F1' };
        slide1.addText("MANUAL DA CULTURA", { x: 0.5, y: 2, fontSize: 40, bold, color });
        slide1.addText(workshop?.name || "Oficina", { x: 0.5, y: 3, fontSize: 24, color });
        if (workshop?.logo_url) {
            try {
                slide1.addImage({ path.logo_url, x: 7, y: 2, w: 2, h: 2 });
            } catch (e) { console.log("Error adding logo", e); }
        }

        // 2. Mission, Vision, Values
        const slide2 = pptx.addSlide();
        slide2.addText("Nossa Identidade", { x: 0.5, y: 0.5, fontSize: 24, bold, color });
        
        slide2.addText("Missão", { x: 0.5, y: 1.5, fontSize: 18, bold, color });
        slide2.addText(manual.mission || "Não definida", { x: 0.5, y: 2, w: 9, fontSize: 14, color: '363636' });

        slide2.addText("Visão", { x: 0.5, y: 3.5, fontSize: 18, bold, color });
        slide2.addText(manual.vision || "Não definida", { x: 0.5, y: 4, w: 9, fontSize: 14, color: '363636' });

        slide2.addText("Valores", { x: 0.5, y: 5.5, fontSize: 18, bold, color });
        const valuesText = (manual.values || []).join(", ");
        slide2.addText(valuesText, { x: 0.5, y: 6, w: 9, fontSize: 14, color: '363636' });

        // 3. Pillars
        if (manual.culture_pillars && manual.culture_pillars.length > 0) {
            const slide3 = pptx.addSlide();
            slide3.addText("Pilares da Cultura", { x: 0.5, y: 0.5, fontSize: 24, bold, color });
            
            let yPos = 1.5;
            manual.culture_pillars.slice(0, 4).forEach(pillar => {
                slide3.addText(`• ${pillar.title}`, { x: 0.5, y, fontSize: 16, bold });
                slide3.addText(pillar.description || "", { x: 1, y + 0.4, w: 8, fontSize: 12, color: '666666' });
                yPos += 1.2;
            });
        }

        // 4. Expectations
        const slide4 = pptx.addSlide();
        slide4.addText("Expectativas", { x: 0.5, y: 0.5, fontSize: 24, bold, color });
        
        slide4.addText("O que a empresa oferece:", { x: 0.5, y: 1.5, fontSize: 16, bold, color });
        (manual.expectations?.from_company || []).slice(0, 5).forEach((item, i) => {
            slide4.addText(`- ${item}`, { x: 0.5, y: 2 + (i * 0.4), fontSize: 12 });
        });

        slide4.addText("O que esperamos:", { x: 5.5, y: 1.5, fontSize: 16, bold, color });
        (manual.expectations?.from_employees || []).slice(0, 5).forEach((item, i) => {
            slide4.addText(`- ${item}`, { x: 5.5, y: 2 + (i * 0.4), fontSize: 12 });
        });

        // 5. Rituals
        const slide5 = pptx.addSlide();
        slide5.addText("Rituais e Cerimônias", { x: 0.5, y: 0.5, fontSize: 24, bold, color });
        
        // Use passed rituals or manual rituals
        const activeRituals = rituals.length > 0 ? rituals : (manual.rituals || []);
        
        let rY = 1.5;
        activeRituals.slice(0, 8).forEach(r => {
            slide5.addText(`• ${r.name} (${r.frequency || 'Recorrente'})`, { x: 0.5, y, fontSize: 14 });
            rY += 0.5;
        });

        // 6. Team & Partners
        const slide6 = pptx.addSlide();
        slide6.addText("Nossa Equipe", { x: 0.5, y: 0.5, fontSize: 24, bold, color });
        
        const partners = employees.filter(e => ['diretor', 'sócio', 'proprietário'].includes(e.job_role?.toLowerCase()) || e.position?.toLowerCase().includes('sócio'));
        const others = employees.filter(e => !partners.includes(e));

        slide6.addText("Sócios / Direção:", { x: 0.5, y: 1.5, fontSize: 16, bold, color });
        let pX = 0.5;
        partners.forEach((p, i) => {
            if (i > 3) return;
            if (p.profile_picture_url) {
                try { slide6.addImage({ path.profile_picture_url, x, y: 2, w: 1.5, h: 1.5, sizing: { type: 'contain', w: 1.5, h: 1.5 } }); } catch (e) {}
            }
            slide6.addText(p.full_name, { x, y: 3.6, w: 2, fontSize: 12, align: 'center' });
            pX += 2.5;
        });

        slide6.addText("Colaboradores:", { x: 0.5, y: 4.5, fontSize: 16, bold, color });
        const teamNames = others.map(e => e.full_name).join(", ");
        slide6.addText(teamNames, { x: 0.5, y: 5, w: 9, fontSize: 12 });

        // Generate
        const buffer = await pptx.write("arraybuffer");
        
        return new Response(buffer, {
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                "Content-Disposition": `attachment; filename="Manual_Cultura_${workshop.name}.pptx"`,
            },
        });

    } catch (error) {
        return Response.json({ error.message }, { status: 500 });
    }
});
