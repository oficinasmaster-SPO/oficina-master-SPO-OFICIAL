import { format } from "date-fns";

/**
 * Abre uma janela de impressão CORPORATIVA para o Regimento Interno.
 *
 * REGRAS:
 * - Cabeçalho institucional APENAS na primeira página
 * - Rodapé "Regimento Interno | Página X de Y" em TODAS as páginas
 * - NUNCA exibe "Empresa não identificada", "CNPJ não informado", "about:blank", data/hora do navegador
 * - Dados ausentes = não renderiza nada (sem placeholder)
 */
export function openRegimentPrint(regiment, workshop, employee = null) {
  const now = new Date();
  const effectiveDate = regiment.effective_date
    ? format(new Date(regiment.effective_date), 'dd/MM/yyyy')
    : null;

  const workshopName = workshop?.name || null;
  const workshopCnpj = workshop?.cnpj || null;
  const documentCode = regiment.document_code || null;
  const version = regiment.version || null;

  const hasHeaderData = workshopName || workshopCnpj || documentCode || version || effectiveDate;

  const replacePlaceholders = (text) => {
    if (!text || !employee) return text || '';
    let t = text;
    const fmtDate = format(now, 'dd/MM/yyyy');
    const admDate = employee.hire_date ? format(new Date(employee.hire_date), 'dd/MM/yyyy') : '__/__/____';
    const loc = workshop ? `${workshop.city || ''}/${workshop.state || ''}` : '';
    t = t.replace(/Nome completo:\s*\[X+\]/g, `Nome completo: ${employee.full_name || '________________________________'}`);
    t = t.replace(/CPF:\s*\[X+\.?X+\.?X+\-?X+\]/g, `CPF: ${employee.cpf || '___________'}`);
    t = t.replace(/RG:\s*\[X+\]/g, `RG: ${employee.rg || '___________'}`);
    t = t.replace(/Cargo\/Função:\s*\[X+\]/g, `Cargo/Função: ${employee.position || '____________________'}`);
    t = t.replace(/Data de Admissão:\s*\[X+\/X+\/X+\]/g, `Data de Admissão: ${admDate}`);
    t = t.replace(/Data de Ciência do Regimento:\s*\[X+\/X+\/X+\]/g, `Data de Ciência do Regimento: ${fmtDate}`);
    t = t.replace(/Local:\s*\[X+\]/g, `Local: ${loc || '____________________'}`);
    return t;
  };

  const headerMetaLines = [];
  if (workshopCnpj) headerMetaLines.push(`CNPJ: ${workshopCnpj}`);
  if (documentCode) headerMetaLines.push(`Código: ${documentCode}`);
  if (version) headerMetaLines.push(`Versão: ${version}`);
  if (effectiveDate) headerMetaLines.push(`Vigência: ${effectiveDate}`);

  const headerHTML = hasHeaderData ? `
  <div class="cover-header">
    ${workshopName ? `<h1>${workshopName}</h1>` : ''}
    <h2>REGIMENTO INTERNO</h2>
    ${headerMetaLines.length > 0 ? `<div class="cover-meta">${headerMetaLines.join(' &nbsp;|&nbsp; ')}</div>` : ''}
  </div>` : '';

  const logoHTML = workshop?.logo_url
    ? `<div class="cover-logo"><img src="${workshop.logo_url}" alt="" /></div>`
    : '';

  const sectionsHTML = (regiment.sections || [])
    .map((s) => `
    <section class="reg-section">
      <h3 class="reg-section-title">${s.number} ${s.title}</h3>
      ${s.content ? `<div class="reg-section-content">${replacePlaceholders(s.content)}</div>` : ''}
      ${(s.subsections || [])
        .map((sub) => `
        <div class="reg-subsection">
          <p><strong>${sub.number}</strong> ${replacePlaceholders(sub.content)}</p>
        </div>`)
        .join('')}
    </section>`)
    .join('');

  const fileName = workshopName
    ? `Regimento Interno - ${workshopName}`
    : 'Regimento Interno';

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${fileName}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 18mm 16mm 18mm 16mm;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Segoe UI', system-ui, -apple-system, Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.45;
      color: #1f2937;
      background: white;
      counter-reset: page;
    }

    /* ═══════════ RODAPÉ (TODAS AS PÁGINAS) ═══════════ */
    .print-footer {
      position: fixed;
      bottom: 0;
      left: 16mm;
      right: 16mm;
      height: 10mm;
      border-top: 0.8px solid #d1d5db;
      padding-top: 2mm;
      text-align: center;
      font-size: 7.5pt;
      color: #4b5563;
      background: white;
    }
    .print-footer::after {
      counter-increment: page;
      content: "Regimento Interno | Página " counter(page);
    }

    /* ═══════════ CAPA (PRIMEIRA PÁGINA) ═══════════ */
    .cover-logo {
      text-align: center;
      margin-bottom: 10px;
    }
    .cover-logo img {
      height: 52px;
      object-fit: contain;
    }

    .cover-header {
      text-align: center;
      border-bottom: 2px solid #1e3a5f;
      padding-bottom: 16px;
      margin-bottom: 28px;
    }
    .cover-header h1 {
      font-size: 16pt;
      font-weight: 700;
      color: #111827;
      letter-spacing: 1px;
      margin-bottom: 4px;
    }
    .cover-header h2 {
      font-size: 20pt;
      font-weight: 700;
      color: #111827;
      letter-spacing: 2px;
      margin-bottom: 8px;
    }
    .cover-header .cover-meta {
      font-size: 8pt;
      color: #4b5563;
      line-height: 1.6;
    }

    /* ═══════════ SEÇÕES ═══════════ */
    .reg-section {
      break-inside: avoid;
      page-break-inside: avoid;
      margin-bottom: 14px;
    }

    .reg-section-title {
      font-size: 11pt;
      font-weight: 700;
      color: #111827;
      margin: 20px 0 6px 0;
      padding-bottom: 3px;
      border-bottom: 1px solid #d1d5db;
      text-transform: uppercase;
      break-after: avoid;
      page-break-after: avoid;
    }

    .reg-section-content {
      font-size: 10.5pt;
      line-height: 1.55;
      color: #1f2937;
      white-space: pre-line;
      margin-bottom: 8px;
    }

    .reg-subsection {
      margin-left: 16px;
      margin-bottom: 3px;
    }
    .reg-subsection p {
      font-size: 10.5pt;
      line-height: 1.55;
    }
    .reg-subsection strong {
      font-weight: 600;
      color: #374151;
    }

    /* ═══════════ ASSINATURAS (NOVA PÁGINA) ═══════════ */
    .signature-page {
      break-before: page;
      page-break-before: always;
      margin-top: 20px;
    }
    .signature-page h3 {
      font-size: 12pt;
      font-weight: 700;
      color: #111827;
      margin-bottom: 14px;
      padding-bottom: 5px;
      border-bottom: 2px solid #1e3a5f;
      text-transform: uppercase;
      text-align: center;
      break-after: avoid;
      page-break-after: avoid;
    }
    .signature-page .declaration {
      font-size: 10.5pt;
      color: #374151;
      text-align: center;
      margin-bottom: 30px;
      font-style: italic;
    }
    .sig-field {
      margin-bottom: 20px;
    }
    .sig-field .sig-label {
      font-size: 8pt;
      color: #4b5563;
      margin-top: 2px;
    }
    .sig-field .sig-line {
      border-bottom: 1px solid #6b7280;
      min-height: 18px;
    }
    .sig-row {
      display: flex;
      gap: 40px;
      margin-bottom: 16px;
    }
    .sig-row .sig-field {
      flex: 1;
      margin-bottom: 0;
    }
    .sig-footer-note {
      text-align: center;
      font-size: 7.5pt;
      color: #9ca3af;
      font-style: italic;
      margin-top: 32px;
    }
  </style>
</head>
<body>

  ${logoHTML}
  ${headerHTML}

  ${sectionsHTML}

  <div class="print-footer"></div>

  <div class="signature-page">
    <h3>CIÊNCIA E ASSINATURA</h3>
    <p class="declaration">
      Declaro que li, compreendi e estou ciente de todas as normas deste Regimento Interno,
      comprometendo-me a cumpri-las integralmente no exercício de minhas funções.
    </p>

    <div class="sig-row">
      <div class="sig-field">
        <div class="sig-line"></div>
        <div class="sig-label">Nome do Colaborador</div>
      </div>
      <div class="sig-field">
        <div class="sig-line"></div>
        <div class="sig-label">CPF</div>
      </div>
    </div>

    <div class="sig-row">
      <div class="sig-field">
        <div class="sig-line"></div>
        <div class="sig-label">Assinatura</div>
      </div>
      <div class="sig-field">
        <div class="sig-line"></div>
        <div class="sig-label">Data</div>
      </div>
    </div>

    <div class="sig-field" style="margin-top:28px;">
      <div class="sig-line"></div>
      <div class="sig-label">Representante Legal da Empresa</div>
    </div>

    <p class="sig-footer-note">
      Este documento é parte integrante do contrato de trabalho e deve ser mantido arquivado.
    </p>
  </div>

</body>
</html>`;

  const w = window.open('', '_blank', 'width=900,height=700');
  w.document.write(html);
  w.document.close();
  w.focus();

  setTimeout(() => {
    w.print();
    // Não fecha automaticamente — o usuário decide após a impressão
  }, 500);
}