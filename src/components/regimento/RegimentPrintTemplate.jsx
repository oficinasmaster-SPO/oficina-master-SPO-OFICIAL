import { format } from "date-fns";

/**
 * Gera e abre uma janela de impressão profissional para o Regimento Interno.
 * Totalmente isolada do app — sem dialogs, sidebars ou estilos do navegador.
 */
export function openRegimentPrint(regiment, workshop, employee = null) {
  const now = new Date();
  const generatedAt = format(now, "dd/MM/yyyy 'às' HH:mm");
  const effectiveDate = regiment.effective_date
    ? format(new Date(regiment.effective_date), 'dd/MM/yyyy')
    : '-';

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

  const sectionsHTML = (regiment.sections || [])
    .map(
      (s) => `
    <div class="section-block">
      <h3 class="section-title">${s.number} ${s.title}</h3>
      ${s.content ? `<div class="section-content">${replacePlaceholders(s.content)}</div>` : ''}
      ${(s.subsections || [])
        .map(
          (sub) => `
        <div class="subsection">
          <p><strong>${sub.number}</strong> ${replacePlaceholders(sub.content)}</p>
        </div>`
        )
        .join('')}
    </div>`
    )
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Regimento Interno — ${workshop?.name || 'Documento'}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 26mm 12mm 16mm 12mm;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Segoe UI', system-ui, -apple-system, Arial, sans-serif;
      font-size: 12pt;
      line-height: 1.45;
      color: #111827;
      background: white;
      counter-reset: page-num 0;
    }

    /* ═══════════════ CABEÇALHO CORPORATIVO (todas as páginas) ═══════════════ */
    .print-header {
      position: fixed;
      top: 0;
      left: 12mm;
      right: 12mm;
      height: 20mm;
      border-bottom: 1.2px solid #1e3a5f;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 2mm;
    }

    .print-header-left { font-size: 8pt; color: #374151; line-height: 1.4; }
    .print-header-left .company-name { font-size: 10pt; font-weight: 700; color: #111827; }
    .print-header-right { text-align: right; font-size: 7.5pt; color: #6b7280; line-height: 1.5; }
    .print-header-right strong { color: #374151; }

    /* ═══════════════ RODAPÉ CORPORATIVO (todas as páginas) ═══════════════ */
    .print-footer {
      position: fixed;
      bottom: 0;
      left: 12mm;
      right: 12mm;
      height: 10mm;
      border-top: 0.8px solid #d1d5db;
      padding-top: 2mm;
      text-align: center;
      font-size: 7.5pt;
      color: #6b7280;
      counter-increment: page-num;
    }

    /* ═══════════════ TÍTULO DO DOCUMENTO (primeira página) ═══════════════ */
    .doc-title-block {
      text-align: center;
      border-bottom: 1.8px solid #1e3a5f;
      padding-bottom: 14px;
      margin-bottom: 28px;
    }

    .doc-title-block img { height: 50px; display: block; margin: 0 auto 10px; }
    .doc-title-block h1 { font-size: 20pt; font-weight: 700; color: #111827; margin-bottom: 4px; letter-spacing: 2px; }
    .doc-title-block h2 { font-size: 14pt; font-weight: 600; color: #374151; margin-bottom: 6px; }
    .doc-title-block .meta-line { font-size: 9pt; color: #4b5563; margin-top: 5px; }
    .doc-title-block .meta-line strong { color: #1f2937; }
    .doc-title-block .doc-note { font-size: 7.5pt; color: #9ca3af; font-style: italic; margin-top: 3px; }

    /* ═══════════════ SEÇÕES ═══════════════ */
    .section-block { margin-bottom: 14px; page-break-inside: avoid; break-inside: avoid; }

    h3.section-title {
      font-size: 12pt;
      font-weight: 700;
      color: #1e3a5f;
      margin: 18px 0 6px 0;
      padding-bottom: 3px;
      border-bottom: 1px solid #cbd5e1;
      text-transform: uppercase;
      page-break-after: avoid;
      break-after: avoid;
    }

    .section-content { font-size: 11pt; line-height: 1.5; color: #1f2937; white-space: pre-line; margin-bottom: 8px; }

    .subsection { margin-left: 16px; margin-bottom: 4px; }
    .subsection p { font-size: 11pt; line-height: 1.5; }
    .subsection strong { font-weight: 600; color: #374151; }

    /* ═══════════════ PÁGINA DE ASSINATURAS ═══════════════ */
    .signature-page { page-break-before: always; break-before: page; }

    .signature-page h3 {
      font-size: 13pt; font-weight: 700; color: #111827; margin-bottom: 10px;
      padding-bottom: 4px; border-bottom: 2px solid #1e3a5f;
      text-transform: uppercase; text-align: center;
    }

    .signature-page .declaration { font-size: 11pt; color: #374151; text-align: center; margin-bottom: 30px; font-style: italic; }

    .sig-field { margin-bottom: 22px; }
    .sig-field .sig-label { font-size: 9pt; font-weight: 600; color: #374151; margin-top: 2px; }
    .sig-field .sig-line { border-bottom: 1px solid #6b7280; padding-bottom: 2px; min-height: 18px; }

    .sig-row { display: flex; gap: 40px; margin-bottom: 18px; }
    .sig-row .sig-field { flex: 1; margin-bottom: 0; }

    .sig-footer-note { text-align: center; font-size: 8pt; color: #9ca3af; font-style: italic; margin-top: 36px; }

    .text-center { text-align: center; }
  </style>
</head>
<body>

  <div class="print-header">
    <div class="print-header-left">
      <div class="company-name">${workshop?.name || '______________________________'}</div>
      <div>CNPJ: ${workshop?.cnpj || '______________________________'}</div>
    </div>
    <div class="print-header-right">
      <div><strong>Regimento Interno</strong></div>
      <div>Código: ${regiment.document_code || '-'}</div>
      <div>Versão: ${regiment.version || '-'}</div>
      <div>Vigência: ${effectiveDate}</div>
    </div>
  </div>

  <div class="print-footer">
    Regimento Interno &nbsp;|&nbsp; Página <span class="page-num"></span> &nbsp;|&nbsp; Emitido em ${generatedAt}
  </div>

  <div class="doc-title-block">
    ${workshop?.logo_url ? `<img src="${workshop.logo_url}" alt="Logo" />` : ''}
    <h1>REGIMENTO INTERNO</h1>
    <h2>${workshop?.name || ''}</h2>
    <div class="meta-line">
      CNPJ: ${workshop?.cnpj || '-'} &nbsp;|&nbsp; ${workshop?.endereco_completo || ''}
    </div>
    <div class="meta-line">
      Código: <strong>${regiment.document_code || '-'}</strong> &nbsp;|&nbsp;
      Versão: <strong>${regiment.version || '-'}</strong> &nbsp;|&nbsp;
      Vigência: <strong>${effectiveDate}</strong>
    </div>
    <div class="doc-note">Documento Jurídico e Operacional</div>
  </div>

  ${sectionsHTML}

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
    w.close();
  }, 600);
}