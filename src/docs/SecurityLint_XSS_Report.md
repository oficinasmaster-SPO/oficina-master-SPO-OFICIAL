# Relatório de Security Lint — XSS & Inputs Inseguros
**Data:** 2026-04-24

---

## 🔴 CORRIGIDO — Crítico

### 1. `PrintPlanoModal` — XSS via `innerHTML` em `document.write()`
**Problema:** A função `handlePrint` copiava `printContent.innerHTML` (que contém dados gerados por IA e dados inseridos por usuários como nomes de oficinas, pautas, objetivos, etc.) e o injetava diretamente via `document.write()` em uma nova janela. Qualquer campo de texto com conteúdo como `<img src=x onerror=alert(1)>` seria executado.

**Vetor concreto:** Campos como `pillar.direction`, `activity.description`, `indicator.indicator_name` são gerados por IA a partir de dados que o usuário inseriu. Se o dado do banco contivesse HTML, seria executado no contexto da janela de impressão.

**Fix:** Substituição completa da abordagem `innerHTML` → construção de DOM via API segura (`document.createElement` + `document.createTextNode`). Todo conteúdo de dados é passado exclusivamente como `textContent`, nunca como `innerHTML`.

---

## 🟡 VERIFICADOS — OK

### 2. Componentes React (JSX) — Sem `dangerouslySetInnerHTML` não sanitizado
Todos os componentes de exibição de dados (PrintProcessView, AtaPrintLayout, RegimentViewer, ManualViewer, GenericReportViewer, AtaPDFViewer) renderizam dados via JSX com interpolação `{variavel}` — o React escapa automaticamente HTML nesses contextos. **Sem risco de XSS.**

A única exceção (ReactMarkdown em `AtaPrintLayout`) usa a biblioteca `react-markdown` que renderiza markdown em DOM seguro, não via `innerHTML` direto.

### 3. `lib/processHTMLGenerator.js` e `lib/cronogramaHTMLGenerator.js` — Sanitização correta
Ambos os geradores de HTML puro (para PDF externo) implementam a função `sanitize()` que faz encoding correto de `&`, `<`, `>`, `"`, `'` antes de interpolar qualquer dado no template HTML. **Correto.**

### 4. `utils/markdownPdfParser.js` — Sem risco
Processa markdown para jsPDF (texto simples, sem HTML). A função `safeText()` remove tags HTML residuais e normaliza o texto. **Sem risco de XSS.**

### 5. `components/aceleracao/AtaSearchFilters` — Inputs de pesquisa OK
Os campos de input controlado (`value={filters.searchTerm}`, `onChange`) usam state React. O valor é usado apenas como filtro de API/query, nunca renderizado como HTML. **Sem risco.**

### 6. `api/base44Client.js` — Sem risco
Sem manipulação de DOM. **OK.**

### 7. Funções backend — Sem risco de XSS (server-side)
XSS é uma vulnerabilidade frontend. As funções backend não renderizam HTML e retornam JSON. **N/A.**

---

## Padrão recomendado para impressão/exportação

❌ **Nunca fazer:**
```js
printWindow.document.write(`<body>${someElement.innerHTML}</body>`);
```

✅ **Sempre fazer:**
```js
// Para templates estáticos (sem dados do usuário): document.write() é OK
// Para dados dinâmicos: construir via DOM API
const el = doc.createElement('p');
el.appendChild(doc.createTextNode(userData)); // textContent — escapa tudo
doc.body.appendChild(el);
```

---

## Resumo

| Arquivo | Problema | Status |
|---------|----------|--------|
| `PrintPlanoModal` | XSS via innerHTML em document.write | ✅ Corrigido |
| `AtaPrintLayout` | Dados via JSX + ReactMarkdown | ✅ OK |
| `PrintProcessView` | Dados via JSX textContent | ✅ OK |
| `RegimentViewer` | Dados via JSX textContent | ✅ OK |
| `ManualViewer` | Dados via JSX textContent | ✅ OK |
| `GenericReportViewer` | Dados via JSX textContent | ✅ OK |
| `processHTMLGenerator` | sanitize() em toda interpolação | ✅ OK |
| `cronogramaHTMLGenerator` | sanitize() em toda interpolação | ✅ OK |
| `markdownPdfParser` | safeText() + sem HTML output | ✅ OK |
| `AtaSearchFilters` | React controlled input | ✅ OK |