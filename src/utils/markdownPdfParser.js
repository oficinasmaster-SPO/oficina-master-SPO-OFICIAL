import { marked } from "marked";

/**
 * Sanitiza texto removendo markdown inline (bold, italic, links, etc.)
 * para uso em jsPDF que nao suporta formatacao rich text.
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
    // Remove múltiplos espaços horizontais (preserva \n)
    .replace(/[^\S\n]+/g, ' ')
    // Remove espaços no início/fim de cada linha
    .replace(/^ +| +$/gm, '');
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
  
  // Normalizar para NFC primeiro (combina caracteres decompostos)
  text = text.normalize('NFC');
  
  // Remover TODOS os emojis silenciosamente (sem substituir por [texto])
  text = text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2702}-\u{27B0}\u{231A}-\u{231B}\u{23E9}-\u{23F3}\u{23F8}-\u{23FA}\u{25AA}-\u{25AB}\u{25B6}\u{25C0}\u{25FB}-\u{25FE}\u{2614}-\u{2615}\u{2648}-\u{2653}\u{267F}\u{2693}\u{2694}\u{2696}-\u{2697}\u{2699}\u{269B}-\u{269C}\u{26A1}\u{26AA}-\u{26AB}\u{26B0}-\u{26B1}\u{26BD}-\u{26BE}\u{26C4}-\u{26C5}\u{26CE}\u{26CF}\u{26D1}\u{26D3}-\u{26D4}\u{26E9}-\u{26EA}\u{26F0}-\u{26F5}\u{26F7}-\u{26FA}\u{26FD}\u{2702}\u{2705}\u{2708}-\u{270D}\u{270F}\u{2712}\u{2714}\u{2716}\u{271D}\u{2721}\u{2728}\u{2733}-\u{2734}\u{2744}\u{2747}\u{274C}\u{274E}\u{2753}-\u{2755}\u{2757}\u{2763}-\u{2764}\u{2795}-\u{2797}\u{27A1}\u{27B0}\u{27BF}\u{2934}-\u{2935}\u{2B05}-\u{2B07}\u{2B1B}-\u{2B1C}\u{2B50}\u{2B55}\u{3030}\u{303D}\u{3297}\u{3299}]/gu, '');
  
  // Substituir caracteres tipograficos problemticos por equivalentes ASCII
  // Aspas curvas -> aspas retas
  text = text.replace(/[\u2018\u2019\u201A\u201B]/g, "'");
  text = text.replace(/[\u201C\u201D\u201E\u201F]/g, '"');
  // Travessao / En-dash / Em-dash -> hifen
  text = text.replace(/[\u2013\u2014\u2015]/g, '-');
  // Ellipsis -> 3 pontos
  text = text.replace(/\u2026/g, '...');
  // Bullet point -> hifen
  text = text.replace(/[\u2022\u2023\u25E6\u2043\u2219]/g, '-');
  // Setas
  text = text.replace(/[\u2192\u2190\u2191\u2193\u21D2\u21D0]/g, '->');
  // Simbolo de grau e outros
  text = text.replace(/\u00B0/g, 'o');
  // Superscript 2 (como em TCMP2)
  text = text.replace(/\u00B2/g, '2');
  // Multiplicacao
  text = text.replace(/\u00D7/g, 'x');
  // Divisao
  text = text.replace(/\u00F7/g, '/');
  // Copyright, Registered, Trademark
  text = text.replace(/\u00A9/g, '(c)');
  text = text.replace(/\u00AE/g, '(R)');
  text = text.replace(/\u2122/g, '(TM)');
  // Non-breaking space -> espaco normal
  text = text.replace(/\u00A0/g, ' ');
  // Zero-width chars (podem causar quebra de fonte)
  text = text.replace(/[\u200B\u200C\u200D\u200E\u200F\uFEFF]/g, '');
  
  // Remover qualquer caractere fora do range WinAnsiEncoding que jsPDF suporta
  // WinAnsi suporta: 0x20-0x7E (ASCII basico) + 0xA0-0xFF (Latin-1 Supplement)
  // Isso inclui: a-z, A-Z, 0-9, acentos PT-BR (a, e, i, o, u, c, A, etc.)
  text = text.replace(/[^\x20-\x7E\xA0-\xFF\n\r\t]/g, '');
  
  // Limpar espacos multiplos resultantes (preserva \n)
  text = text.replace(/ {2,}/g, ' ').replace(/^ +| +$/gm, '').replace(/^\n+|\n+$/g, '');
  
  return text;
}

export function parseMarkdownToPdf(content) {
  if (!content) return [];
  
  // Sanitizar o conteudo inteiro antes de parsear
  const safeContent = safeText(String(content));
  
  let tokens;
  try {
    tokens = marked.lexer(safeContent);
  } catch {
    // Fallback: retorna como texto simples
    return [{
      text: safeContent,
      marginTop: 0,
      marginBottom: 3,
      marginLeft: 0
    }];
  }
  
  const pdfContent = [];

  tokens.forEach((token) => {
    if (token.type === 'heading') {
      pdfContent.push({
        text: stripInlineMarkdown(token.text),
        style: token.depth === 1 ? 'header' : 'subheader',
        marginTop: 6,
        marginBottom: 3,
        marginLeft: 0
      });
    }

    if (token.type === 'list') {
      token.items.forEach((item) => {
        const cleanText = stripInlineMarkdown(item.text);
        if (cleanText.trim()) {
          pdfContent.push({
            text: '- ' + cleanText,
            marginTop: 1,
            marginBottom: 1,
            marginLeft: 5
          });
        }
      });
    }

    if (token.type === 'paragraph') {
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
    
    if (token.type === 'table') {
      if (token.header && token.header.length > 0) {
        const headerText = token.header.map(h => stripInlineMarkdown(h.text)).join(' | ');
        pdfContent.push({
          text: headerText,
          style: 'subheader',
          marginTop: 4,
          marginBottom: 2,
          marginLeft: 0
        });
      }
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
    
    if (token.type === 'code') {
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