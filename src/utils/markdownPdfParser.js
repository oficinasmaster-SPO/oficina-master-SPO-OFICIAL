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
        margin: [0, 10, 0, 5]
      });
    }

    if (token.type === "list") {
      token.items.forEach((item) => {
        // Strip out HTML tags if present (basic stripping)
        const cleanText = item.text.replace(/<[^>]*>/g, '');
        pdfContent.push({
          text: "• " + cleanText,
          margin: [10, 2], // Indent list items
        });
      });
    }

    if (token.type === "paragraph") {
      // Strip out HTML tags if present
      const cleanText = token.text.replace(/<[^>]*>/g, '');
      pdfContent.push({
        text: cleanText,
        margin: [0, 5],
      });
    }
    
    // Handle space/newline
    if (token.type === 'space') {
       pdfContent.push({
        text: ' ',
        margin: [0, 5],
      });
    }
  });

  return pdfContent;
}