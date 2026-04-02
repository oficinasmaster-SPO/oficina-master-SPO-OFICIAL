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
  return stripInlineMarkdown(String(value));
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