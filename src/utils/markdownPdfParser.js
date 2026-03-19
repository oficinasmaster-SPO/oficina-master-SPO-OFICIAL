import { marked } from "marked";

export function parseMarkdownToPdf(content) {
  if (!content) return [];
  
  // Ensure content is a string
  const safeContent = String(content);
  
  const tokens = marked.lexer(safeContent);
  const pdfContent = [];

  tokens.forEach((token) => {
    if (token.type === "heading") {
      pdfContent.push({
        text: token.text,
        style: token.depth === 1 ? "header" : "subheader",
        marginTop: 6,
        marginBottom: 3,
        marginLeft: 0
      });
    }

    if (token.type === "list") {
      token.items.forEach((item) => {
        // Strip out HTML tags if present (basic stripping)
        const cleanText = item.text.replace(/<[^>]*>/g, '');
        pdfContent.push({
          text: "• " + cleanText,
          marginTop: 1,
          marginBottom: 1,
          marginLeft: 5 // Indent list items
        });
      });
    }

    if (token.type === "paragraph") {
      // Strip out HTML tags if present
      const cleanText = token.text.replace(/<[^>]*>/g, '');
      pdfContent.push({
        text: cleanText,
        marginTop: 2,
        marginBottom: 3,
        marginLeft: 0
      });
    }
    
    // Handle space/newline
    if (token.type === 'space') {
       pdfContent.push({
        text: ' ',
        marginTop: 2,
        marginBottom: 2,
        marginLeft: 0
      });
    }
  });

  return pdfContent;
}