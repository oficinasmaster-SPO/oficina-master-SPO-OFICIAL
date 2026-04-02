import { marked } from "marked";

/**
 * Sanitiza texto removendo markdown inline (bold, italic, links, etc.)
 * para uso em jsPDF que não suporta formatação rich text.
 */
function stripInlineMarkdown(text) {
  if (!text) return '';
  return String(text)
    // Remove bold **text** ou __text__
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    // Remove italic *text* ou _text_
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    // Remove strikethrough ~~text~~
    .replace(/~~(.+?)~~/g, '$1')
    // Remove inline code `text`
    .replace(/`(.+?)`/g, '$1')
    // Remove links [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove images ![alt](url) -> alt
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    // Remove heading markers no início
    .replace(/^#{1,6}\s+/gm, '')
    // Remove HTML tags residuais
    .replace(/<[^>]*>/g, '')
    // Remove múltiplos espaços
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Converte string para texto seguro para jsPDF
 * Trata objetos, arrays, null, undefined
 * Também normaliza caracteres UTF-8 problemáticos para a fonte padrão do jsPDF
 */
export function safeText(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      return value.map(v => safeText(v)).join(', ');
    }
    // Tenta extrair campos comuns
    if (value.descricao) return safeText(value.descricao);
    if (value.name) return safeText(value.name);
    if (value.titulo) return safeText(value.titulo);
    if (value.text) return safeText(value.text);
    return JSON.stringify(value);
  }
  let text = stripInlineMarkdown(String(value));
  // Substituir emojis comuns por equivalentes texto
  text = text
    .replace(/\u{1F4CB}/gu, '[Lista]')
    .replace(/\u{1F4CD}/gu, '[Local]')
    .replace(/\u{1F3AC}/gu, '[Video]')
    .replace(/\u{1F4CE}/gu, '[Anexo]')
    .replace(/\u{1F4C4}/gu, '[Doc]')
    .replace(/\u{1F517}/gu, '[Link]')
    .replace(/\u{1F5BC}/gu, '[Img]')
    .replace(/\u{2705}/gu, '[OK]')
    .replace(/\u{274C}/gu, '[X]')
    .replace(/\u{26A0}/gu, '[!]')
    .replace(/\u{1F534}/gu, '[!]')
    .replace(/\u{1F7E2}/gu, '[OK]')
    .replace(/\u{1F4C8}/gu, '[Grafico]')
    .replace(/\u{1F4DD}/gu, '[Nota]')
    .replace(/\u{1F916}/gu, '[IA]')
    .replace(/\u{2B50}/gu, '[*]')
    .replace(/\u{1F4A1}/gu, '[Ideia]');
  // Remover emojis restantes que a fonte não suporta
  text = text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu, '');
  // Normalizar acentos problemáticos para jsPDF (substituir compostos)
  text = text.normalize('NFC');
  return text;
}

export function parseMarkdownToPdf(content) {
  if (!content) return [];
  
  const safeContent = String(content);
  
  let tokens;
  try {
    tokens = marked.lexer(safeContent);
  } catch {
    // Fallback: retorna como texto simples
    return [{
      text: stripInlineMarkdown(safeContent),
      marginTop: 0,
      marginBottom: 3,
      marginLeft: 0
    }];
  }
  
  const pdfContent = [];

  tokens.forEach((token) => {
    if (token.type === "heading") {
      pdfContent.push({
        text: stripInlineMarkdown(token.text),
        style: token.depth === 1 ? "header" : token.depth === 2 ? "subheader" : "subheader",
        marginTop: 6,
        marginBottom: 3,
        marginLeft: 0
      });
    }

    if (token.type === "list") {
      token.items.forEach((item) => {
        const cleanText = stripInlineMarkdown(item.text);
        if (cleanText.trim()) {
          pdfContent.push({
            text: "• " + cleanText,
            marginTop: 1,
            marginBottom: 1,
            marginLeft: 5
          });
        }
      });
    }

    if (token.type === "paragraph") {
      const cleanText = stripInlineMarkdown(token.text);
      if (cleanText.trim()) {
        pdfContent.push({
          text: cleanText,
          marginTop: 2,
          marginBottom: 3,
          marginLeft: 0
        });
      }
    }
    
    if (token.type === "table") {
      // Extrair cabeçalho
      if (token.header && token.header.length > 0) {
        const headerText = token.header.map(h => stripInlineMarkdown(h.text)).join(' | ');
        pdfContent.push({
          text: headerText,
          style: "subheader",
          marginTop: 4,
          marginBottom: 2,
          marginLeft: 0
        });
      }
      // Extrair linhas
      if (token.rows) {
        token.rows.forEach(row => {
          const rowText = row.map(cell => stripInlineMarkdown(cell.text)).join(' | ');
          if (rowText.trim()) {
            pdfContent.push({
              text: rowText,
              marginTop: 1,
              marginBottom: 1,
              marginLeft: 3
            });
          }
        });
      }
    }
    
    if (token.type === "code") {
      const cleanText = stripInlineMarkdown(token.text);
      if (cleanText.trim()) {
        pdfContent.push({
          text: cleanText,
          marginTop: 2,
          marginBottom: 3,
          marginLeft: 3
        });
      }
    }

    if (token.type === 'space') {
      pdfContent.push({
        text: ' ',
        marginTop: 2,
        marginBottom: 2,
        marginLeft: 0
      });
    }
    
    if (token.type === 'hr') {
      pdfContent.push({
        text: '---',
        style: 'separator',
        marginTop: 4,
        marginBottom: 4,
        marginLeft: 0
      });
    }
  });

  return pdfContent;
}