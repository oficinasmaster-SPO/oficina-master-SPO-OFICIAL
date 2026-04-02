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
  
  // Mapeamento de emojis comuns para equivalentes ASCII
  const emojiMap = {
    '\uD83D\uDCCA': '[Grafico]', '\uD83D\uDCC8': '[+]', '\uD83D\uDCC9': '[-]', '\uD83D\uDCCC': '[*]',
    '\uD83D\uDCCD': '[Local]', '\uD83D\uDCDD': '[Nota]', '\uD83D\uDCCB': '[Lista]',
    '\uD83D\uDCB0': '[$]', '\uD83D\uDCB2': '[$]', '\uD83D\uDCB5': '[$]', '\uD83D\uDCB9': '[ROI]',
    '\uD83D\uDCE7': '[Email]', '\uD83D\uDCDE': '[Tel]', '\uD83D\uDCF1': '[Cel]',
    '\uD83D\uDCA1': '[Ideia]', '\uD83D\uDCA5': '[!]', '\uD83D\uDD25': '[!]',
    '\uD83D\uDEA8': '[Alerta]', '\uD83D\uDEAB': '[X]', '\uD83D\uDD12': '[Bloq]', '\uD83D\uDD13': '[Aberto]',
    '\uD83C\uDFAF': '[Alvo]', '\uD83C\uDFC6': '[Trofeu]',
    '\uD83D\uDC4D': '[OK]', '\uD83D\uDC4E': '[NOK]', '\uD83D\uDC4B': '[Ola]',
    '\uD83D\uDC4F': '[Parabens]', '\uD83D\uDE4F': '[Obrigado]',
    '\uD83D\uDC49': '>', '\uD83D\uDC48': '<', '\uD83D\uDC46': '^', '\uD83D\uDC47': 'v',
    '\u261D': '^',
    '\u2705': '[OK]', '\u274C': '[X]', '\u274E': '[X]',
    '\u2714': '[OK]', '\u2716': '[X]',
    '\u26A0': '[Atencao]', '\u2757': '[!]', '\u2753': '[?]', '\u2755': '[!]',
    '\u2B50': '[*]', '\uD83C\uDF1F': '[*]', '\u2728': '[*]',
    '\u27A1': '->', '\u2B05': '<-', '\u2B06': '^', '\u2B07': 'v',
    '\uD83D\uDD04': '[Ciclo]', '\uD83D\uDD03': '[Ciclo]',
    '\uD83D\uDCAF': '[100%]', '\uD83D\uDCAA': '[Forca]',
    '\uD83D\uDE80': '[Lancamento]', '\uD83C\uDF89': '[Parabens]', '\uD83C\uDF88': '[Festa]',
    '\uD83D\uDCC5': '[Data]', '\uD83D\uDCC6': '[Data]', '\u23F0': '[Hora]', '\u231A': '[Hora]',
    '\uD83D\uDCCE': '[Anexo]', '\uD83D\uDCC1': '[Pasta]', '\uD83D\uDCC2': '[Pasta]',
    '\uD83D\uDCE2': '[Aviso]', '\uD83D\uDCE3': '[Aviso]',
    '\uD83D\uDEE0': '[Ferramenta]', '\u2699': '[Config]', '\uD83D\uDD27': '[Ferramenta]', '\uD83D\uDD29': '[Ferramenta]',
    '\u2764': '[<3]', '\uD83D\uDC94': '[</3]', '\uD83D\uDC99': '[<3]', '\uD83D\uDC9A': '[<3]',
    '\uD83D\uDCAC': '[Chat]', '\uD83D\uDCAD': '[Pensamento]',
    '\uD83D\uDCBC': '[Negocio]',
    '\uD83E\uDD14': '[Hmm]', '\uD83E\uDD37': '[?]',
    '\uD83D\uDC4A': '[Bora]', '\u270C': '[V]', '\uD83E\uDD1D': '[Acordo]',
    '\uD83D\uDCF0': '[Noticia]', '\uD83D\uDCDA': '[Livros]', '\uD83D\uDCD6': '[Livro]',
    '\uD83C\uDFE2': '[Empresa]', '\uD83C\uDFED': '[Fabrica]', '\uD83C\uDFE0': '[Casa]',
    '\uD83D\uDED2': '[Carrinho]', '\uD83D\uDCB3': '[Cartao]',
    '\uD83D\uDC65': '[Equipe]', '\uD83D\uDC64': '[Pessoa]',
  };
  for (const [emoji, replacement] of Object.entries(emojiMap)) {
    text = text.split(emoji).join(replacement);
  }

  // Remover emojis restantes que nao tem mapeamento
  // (line 131 already strips all non-WinAnsi chars, so this is a targeted pre-pass)
  text = text.replace(/[\uD800-\uDFFF]/g, '');
  
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
  
  // Limpar espacos multiplos resultantes
  text = text.replace(/  +/g, ' ').trim();
  
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