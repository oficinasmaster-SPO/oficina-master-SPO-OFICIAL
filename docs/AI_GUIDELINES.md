# Diretrizes de IA — Convenções de Código (SPO)

> Estas diretrizes são **obrigatórias** para qualquer alteração feita por IA neste repositório.
> Sempre que houver ambiguidade, siga estas regras antes de qualquer convenção genérica.

---

## 1. Seletores / Dropdowns / Comboboxes (REGRA PRINCIPAL)

### Regra
**TODA seleção de valor único em React deve usar o componente:**

```jsx
import Combobox from "@/components/ui/combobox";
```

> Caminho canônico: `src/components/ui/combobox.jsx`
> Não criar novo componente de seleção. Não importar Select de outro lugar para seleção de valor.

### Quando usar o Combobox (OBRIGATÓRIO)
- Seleção de cliente / oficina (`workshop_id`).
- Seleção de consultor / responsável / colaborador.
- Seleção de status, prioridade, origem, impacto, tipo — **sempre** que houver um campo de escolha.
- Qualquer `<select>` nativo ou `<Select>` (shadcn) novo.

### Quando o `<Select>` do shadcn (`@/components/ui/select`) ainda é aceito
- **Apenas** casos onde a lista é fixa, curta (≤ 6 itens) e NÃO há benefício em busca — e o componente já existia legado.
- **Não usar** `<Select>` para listas grandes, dinâmicas ou que beneficiam busca.
- Não usar `<select>` nativo do HTML em hipótese alguma.

### API resumo (use assim)
```jsx
<Combobox
  options={workshops.map(w => ({ value: w.id, label: w.name }))}
  value={formData.workshop_id}
  onChange={handleWorkshopChange}
  placeholder="Selecione o cliente"
  searchPlaceholder="Pesquisar cliente..."
  emptyText="Nenhum cliente encontrado."
/>
```

Props-chave:
- `options` — lista crua de objetos (`{ value, label }`).
- `value` / `onChange(value)` — controlado (string|number).
- `getOptionValue` / `getOptionLabel` — extratores quando o objeto não segue `{ value, label }`.
- `renderOption` / `filterOption` — customização.
- `lazyRender` — renderiza itens só ao abrir (listas grandes).
- `maxHeight` — altura máxima da lista (default 250).

### Regras operacionais
- `value` e o retorno de `getOptionValue` devem ser do **mesmo tipo** (`===`) — o componente avisa no console em dev se houver incompatibilidade.
- Não definir `autoSelectOnOpen` (legado); o Combobox não expõe isso.
- Sempre que possível, passar `options` já como lista de `{ value, label }` simples.

### Migração de código legado
- Ao tocar em um arquivo que contenha `<Select>` (shadcn) ou `<select>` nativo, **substitua por `<Combobox>`** se a seleção for de valor único e a lista tiver mais de 6 itens ou for dinâmica.
- Para listas muito pequenas e fixas em código legado, pode manter `<Select>`, mas não criar novos.

---

## 2. Outras convenções (resumo)
- Ícones: somente `lucide-react`, apenas ícones existentes.
- Imports: usar alias `@/` (nunca caminhos relativos para `src/`).
- Estilo: classes Tailwind literais; design tokens em `src/index.css`.
- Componentes shadcn: importar cada primitivo de seu próprio arquivo (`@/components/ui/<x>`).
- Entidades: SDK via `base44.entities.<Name>` de `@/api/base44Client`.
- Hooks no topo do componente; nunca condicionais.
- JSX apenas em `.jsx`/`.tsx`.