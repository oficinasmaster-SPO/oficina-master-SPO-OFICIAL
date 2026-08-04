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

## 2. Resolução de nomes, avatares e fotos (REGRA OBRIGATÓRIA)

> **Nunca** escrever lógica nova para resolver nome de usuário, foto de perfil do
> usuário ou logo/avatar do workshop. Sempre reutilizar as funções/hooks/componentes
> canônicos abaixo, exatamente como fazemos com o `Combobox`.

### 2.1 Nome de exibição do usuário
**Hook:** `useDisplayName` — `src/hooks/useDisplayName.js`

```jsx
import useDisplayName from "@/hooks/useDisplayName";

const { displayName, employee, isLoading } = useDisplayName(user);
// displayName = Employee.full_name || User.full_name || User.email
```
- Resolve o nome canônico (contas Google podem ter `full_name` errado em `User`).
- Faz 1 query leve por `user_id` no `Employee` (evita `User.list` em massa / 429).
- Usar **sempre** que precisar mostrar o nome de um usuário logado ou referenciado.

### 2.2 Foto de perfil do usuário (avatar de pessoa)
**Componente:** `UserAvatar` — `src/components/shared/UserAvatar.jsx`

```jsx
import UserAvatar from "@/components/shared/UserAvatar";

<UserAvatar user={user} size="md" />
```
- Renderiza a `profile_picture_url` do usuário com fallback automático.
- Para gerar iniciais/cor de fallback, importar de `@/lib/avatarUtils`:

```jsx
import { getInitials, getAvatarColor } from "@/lib/avatarUtils";
```

### 2.3 Logo / avatar do workshop (cliente)
**Hook (cache de logos):** `useWorkshopLogos` — `src/hooks/useWorkshopLogos.js`

```jsx
import { useWorkshopLogos } from "@/hooks/useWorkshopLogos";

const logosByWorkshop = useWorkshopLogos(workshopIds);
// logosByWorkshop[workshop_id] => logo_url | null
```
- Retorna mapa `{ workshop_id → logo_url }`, cache compartilhado (zero queries extras).

**Componente (renderização):** `WorkshopAvatar` — `src/components/aceleracao/followups/ds/WorkshopAvatar.jsx`

```jsx
import WorkshopAvatar from "@/components/aceleracao/followups/ds/WorkshopAvatar";

<WorkshopAvatar name={cliente} logo_url={logosByWorkshop[wid]} size="md" />
```
- Renderiza a logo quando disponível; senão, iniciais coloridas (`getInitials`/`getAvatarColor`).

### 2.4 Regras operacionais
- **Proibido** instanciar `<img>` direto para avatar de usuário ou logo de workshop
  sem fallback — sempre passar pelo `UserAvatar` / `WorkshopAvatar`.
- **Proibido** buscar `User.list()` para resolver nomes — usar `useDisplayName`.
- **Proibido** buscar `Workshop.filter({ id: { $in: [...] } })` manualmente para logos —
  usar `useWorkshopLogos` (já lida com batching 100 e cache).
- Ao tocar em tela que mostra avatar de cliente/pessoa, **substituir** qualquer
  `<img>`/iniciais customizadas pelo componente canônico.

---

## 3. Colar imagens / prints do clipboard (REGRA OBRIGATÓRIA)

> **Sempre** que um formulário aceitar anexar imagens coladas (Ctrl+V / ⌘V),
> use o componente canônico `PastePrintField`. Não reimplemente captura de
> clipboard manualmente.

### Componente
**Arquivo:** `src/components/shared/PastePrintField.jsx`

```jsx
import PastePrintField from "@/components/shared/PastePrintField";

<PastePrintField
  images={midias.filter(m => m.type === "imagem")}
  onAdd={(mediaItem) => setMidias(prev => [...prev, mediaItem])}
  onRemove={(index) => setMidias(prev => prev.filter((_, i) => i !== index))}
/>
```

### Props
- `images` — array de itens `midias_anexas` (`{ type, url, nome, uploaded_at }`) **com `type === "imagem"`** (exibidos como thumbnails).
- `onAdd(mediaItem)` — chamado para cada imagem colada, já após upload. Recebe o item pronto para inserir em `midias_anexas`.
- `onRemove(index)` — índice dentro do array `images` passado (não da lista completa de mídias).

### Como funciona (não reimplementar)
- Área focável (`tabIndex={0}`, `role="textbox"`) com `onPaste`.
- Captura `clipboardData.items` do tipo `image/*`, faz upload via `base44.integrations.Core.UploadFile` e devolve o item `{ type: "imagem", url, nome, uploaded_at }`.
- Mostra thumbnails com botão de remover no hover.
- Estado `busy` (spinner) durante o upload; `toast` de sucesso/erro.

### Persistência
As mídias coladas seguem o schema **`midias_anexas`** (array de objetos) presente em
`TarefaBacklog`, `PedidoInterno` e `ConsultoriaAtendimento`. Sempre persistir o array
completo no campo `midias_anexas` da entidade ao salvar.

### Regras operacionais
- **Proibido** escrever handler `onPaste` próprio em formulários que anexam imagens —
  usar `PastePrintField`.
- **Proibido** armazenar base64 de print em campo de entidade — sempre fazer upload
  (`Core.UploadFile`) e guardar a `url` (regra geral de não-armazenar blobs em campos).
- O filtro de exibição (`type === "imagem"`) é responsabilidade de quem passa `images`.

---

## 4. Outras convenções (resumo)
- Ícones: somente `lucide-react`, apenas ícones existentes.
- Imports: usar alias `@/` (nunca caminhos relativos para `src/`).
- Estilo: classes Tailwind literais; design tokens em `src/index.css`.
- Componentes shadcn: importar cada primitivo de seu próprio arquivo (`@/components/ui/<x>`).
- Entidades: SDK via `base44.entities.<Name>` de `@/api/base44Client`.
- Hooks no topo do componente; nunca condicionais.
- JSX apenas em `.jsx`/`.tsx`.