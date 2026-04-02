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
    // Remove heading markers no inicio
    .replace(/^#{1,6}\s+/gm, '')
    // Remove HTML tags residuais
    .replace(/<[^>]*>/g, '')
    // Remove multiplos espacos horizontais (preserva \n)
    .replace(/[^\S\n]+/g, ' ')
    // Remove espacos no inicio/fim de cada linha
    .replace(/^ +| +$/gm, '');
}

/**
 * Mapeamento de emojis comuns para equivalentes ASCII.
 * Usa codepoints para construir as strings em runtime, evitando problemas de parse.
 */
function buildEmojiMap() {
  // Helper: converte codepoint(s) para string
  var cp = function() {
    return String.fromCodePoint.apply(null, arguments);
  };
  
  return [
    [cp(0x1F4CA), '[Grafico]'], [cp(0x1F4C8), '[+]'], [cp(0x1F4C9), '[-]'], [cp(0x1F4CC), '[*]'],
    [cp(0x1F4CD), '[Local]'], [cp(0x1F4DD), '[Nota]'], [cp(0x1F4CB), '[Lista]'],
    [cp(0x1F4B0), '[$]'], [cp(0x1F4B2), '[$]'], [cp(0x1F4B5), '[$]'], [cp(0x1F4B9), '[ROI]'],
    [cp(0x1F4E7), '[Email]'], [cp(0x1F4DE), '[Tel]'], [cp(0x1F4F1), '[Cel]'],
    [cp(0x1F4A1), '[Ideia]'], [cp(0x1F4A5), '[!]'], [cp(0x1F525), '[!]'],
    [cp(0x1F6A8), '[Alerta]'], [cp(0x1F6AB), '[X]'], [cp(0x1F512), '[Bloq]'], [cp(0x1F513), '[Aberto]'],
    [cp(0x1F3AF), '[Alvo]'], [cp(0x1F3C6), '[Trofeu]'],
    [cp(0x1F44D), '[OK]'], [cp(0x1F44E), '[NOK]'], [cp(0x1F44B), '[Ola]'],
    [cp(0x1F44F), '[Parabens]'], [cp(0x1F64F), '[Obrigado]'],
    [cp(0x1F449), '>'], [cp(0x1F448), '<'], [cp(0x1F446), '^'], [cp(0x1F447), 'v'],
    [cp(0x261D), '^'],
    [cp(0x2705), '[OK]'], [cp(0x274C), '[X]'], [cp(0x274E), '[X]'],
    [cp(0x2714), '[OK]'], [cp(0x2716), '[X]'],
    [cp(0x26A0), '[Atencao]'], [cp(0x2757), '[!]'], [cp(0x2753), '[?]'], [cp(0x2755), '[!]'],
    [cp(0x2B50), '[*]'], [cp(0x1F31F), '[*]'], [cp(0x2728), '[*]'],
    [cp(0x27A1), '->'], [cp(0x2B05), '<-'], [cp(0x2B06), '^'], [cp(0x2B07), 'v'],
    [cp(0x1F504), '[Ciclo]'], [cp(0x1F503), '[Ciclo]'],
    [cp(0x1F4AF), '[100%]'], [cp(0x1F4AA), '[Forca]'],
    [cp(0x1F680), '[Lancamento]'], [cp(0x1F389), '[Parabens]'], [cp(0x1F388), '[Festa]'],
    [cp(0x1F4C5), '[Data]'], [cp(0x1F4C6), '[Data]'], [cp(0x23F0), '[Hora]'], [cp(0x231A), '[Hora]'],
    [cp(0x1F4CE), '[Anexo]'], [cp(0x1F4C1), '[Pasta]'], [cp(0x1F4C2), '[Pasta]'],
    [cp(0x1F4E2), '[Aviso]'], [cp(0x1F4E3), '[Aviso]'],
    [cp(0x1F6E0), '[Ferramenta]'], [cp(0x2699), '[Config]'], [cp(0x1F527), '[Ferramenta]'], [cp(0x1F529), '[Ferramenta]'],
    [cp(0x2764), '[<3]'], [cp(0x1F494), '[</3]'], [cp(0x1F499), '[<3]'], [cp(0x1F49A), '[<3]'],
    [cp(0x1F4AC), '[Chat]'], [cp(0x1F4AD), '[Pensamento]'],
    [cp(0x1F4BC), '[Negocio]'],
    [cp(0x1F914), '[Hmm]'], [cp(0x1F937), '[?]'],
    [cp(0x1F44A), '[Bora]'], [cp(0x270C), '[V]'], [cp(0x1F91D), '[Acordo]'],
    [cp(0x1F4F0), '[Noticia]'], [cp(0x1F4DA), '[Livros]'], [cp(0x1F4D6), '[Livro]'],
    [cp(0x1F3E2), '[Empresa]'], [cp(0x1F3ED), '[Fabrica]'], [cp(0x1F3E0), '[Casa]'],
    [cp(0x1F6D2), '[Carrinho]'], [cp(0x1F4B3), '[Cartao]'],
    [cp(0x1F465), '[Equipe]'], [cp(0x1F464), '[Pessoa]'],
  ];
}

// Build once at module load
var EMOJI_MAP = buildEmojiMap();

/**
 * Converte string para texto seguro para jsPDF
 * Trata objetos, arrays, null, undefined
 * Tambem normaliza caracteres UTF-8 problematicos para a fonte padrao do jsPDF
 */
export function safeText(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      return value.map(function(v) { return safeText(v); }).join(', ');
    }
    // Tenta extrair campos comuns
    if (value.descricao) return safeText(value.descricao);
    if (value.name) return safeText(value.name);
    if (value.titulo) return safeText(value.titulo);
    if (value.text) return safeText(value.text);
    return JSON.stringify(value);
  }
  var text = stripInlineMarkdown(String(value));
  
  // Normalizar para NFC primeiro (combina caracteres decompostos)
  text = text.normalize('NFC');
  
  // Substituir emojis conhecidos por equivalentes ASCII
  for (var i = 0; i < EMOJI_MAP.length; i++) {
    text = text.split(EMOJI_MAP[i][0]).join(EMOJI_MAP[i][1]);
  }
  
  // Substituir caracteres tipograficos problematicos por equivalentes ASCII
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
  var safeContent = safeText(String(content));
  
  var tokens;
  try {
    tokens = marked.lexer(safeContent);
  } catch (e) {
    // Fallback: retorna como texto simples
    return [{
      text: safeContent,
      marginTop: 0,
      marginBottom: 3,
      marginLeft: 0
    }];
  }
  
  var pdfContent = [];

  tokens.forEach(function(token) {
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
      token.items.forEach(function(item) {
        var cleanText = stripInlineMarkdown(item.text);
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
      var cleanText = stripInlineMarkdown(token.text);
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
        var headerText = token.header.map(function(h) { return stripInlineMarkdown(h.text); }).join(' | ');
        pdfContent.push({
          text: headerText,
          style: 'subheader',
          marginTop: 4,
          marginBottom: 2,
          marginLeft: 0
        });
      }
      if (token.rows) {
        token.rows.forEach(function(row) {
          var rowText = row.map(function(cell) { return stripInlineMarkdown(cell.text); }).join(' | ');
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
      var codeText = stripInlineMarkdown(token.text);
      if (codeText.trim()) {
        pdfContent.push({
          text: codeText,
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