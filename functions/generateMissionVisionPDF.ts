import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { workshop_id } = body;

    if (!workshop_id) {
      return Response.json({ error: 'workshop_id is required' }, { status: 400 });
    }

    // Buscar dados da oficina
    const workshop = await base44.entities.Workshop.get(workshop_id);
    
    if (!workshop) {
      return Response.json({ error: 'Workshop not found' }, { status: 404 });
    }

    // Buscar histórico MVV mais recente
    const history = await base44.entities.MissionVisionValues.filter(
      { workshop_id },
      '-created_date',
      1
    );

    const mvv = history?.[0] || {};
    const mission = mvv.mission_statement || workshop.mission || '';
    const vision = mvv.vision_statement || workshop.vision || '';
    const coreValues = mvv.core_values || [];

    // Gerar HTML
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Missão, Visão e Valores - ${workshop.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Arial', sans-serif; 
      padding: 40px; 
      color: #333;
      line-height: 1.6;
    }
    .header { 
      text-align: center; 
      margin-bottom: 40px; 
      padding-bottom: 20px;
      border-bottom: 3px solid #3b82f6;
    }
    .logo { 
      max-height: 80px; 
      max-width: 200px;
      object-fit: contain;
      margin-bottom: 15px; 
    }
    h1 { 
      color: #3b82f6; 
      font-size: 28px; 
      margin: 10px 0;
    }
    .subtitle { 
      color: #666; 
      font-size: 14px; 
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .section { 
      margin-bottom: 40px; 
      page-break-inside: avoid;
    }
    .section-title {
      font-size: 20px;
      font-weight: bold;
      color: #3b82f6;
      margin-bottom: 15px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .statement { 
      font-style: italic; 
      font-size: 15px; 
      line-height: 1.8;
      color: #333;
      background: #f0f4ff;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #3b82f6;
    }
    .value-item { 
      margin-bottom: 25px; 
      padding: 20px;
      background: #f8f8ff;
      border-radius: 6px;
      page-break-inside: avoid;
    }
    .value-name { 
      font-weight: bold; 
      font-size: 16px; 
      color: #3b82f6;
      margin-bottom: 8px;
    }
    .value-definition { 
      margin-bottom: 12px; 
      color: #444;
      font-size: 14px;
    }
    .evidence { 
      margin-left: 15px; 
      color: #555;
      font-size: 13px;
    }
    .evidence-item { 
      margin-bottom: 6px;
      padding-left: 5px;
    }
    @media print {
      body { background: white; }
    }
  </style>
</head>
<body>
  <div class="header">
    ${workshop.logo_url ? `<img src="${workshop.logo_url}" class="logo" alt="Logo" />` : ''}
    <h1>${workshop.name || 'Oficina'}</h1>
    <p class="subtitle">Cultura Organizacional</p>
    <p style="margin-top: 10px; color: #999; font-size: 12px;">Documento gerado pela Oficinas Master</p>
  </div>
  
  <div class="section">
    <div class="section-title">🎯 Missão</div>
    <div class="statement">${mission || '(Não definida)'}</div>
  </div>
  
  <div class="section">
    <div class="section-title">👁️ Visão</div>
    <div class="statement">${vision || '(Não definida)'}</div>
  </div>
  
  ${coreValues.length > 0 ? `
  <div class="section">
    <div class="section-title">❤️ Valores</div>
    ${coreValues.map(value => `
      <div class="value-item">
        <div class="value-name">${value.name || 'Valor'}</div>
        <div class="value-definition">${value.definition || ''}</div>
        <div class="evidence">
          ${(value.behavioral_evidence || []).map(ev => `
            <div class="evidence-item">• ${ev}</div>
          `).join('')}
        </div>
      </div>
    `).join('')}
  </div>
  ` : ''}
</body>
</html>
    `;

    return new Response(htmlContent, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="MVV_${workshop.name}.html"`
      }
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});