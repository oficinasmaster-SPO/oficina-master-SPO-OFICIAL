# 📎 Implementação de Anexos - Tarefa Backlog

## Overview Arquitetural

Sistema **production-ready** de gerenciamento de anexos (imagens, documentos, links) em Tarefas Backlog, espelhando o padrão de Pedidos Internos mas otimizado para o fluxo de tarefas.

---

## 🏗️ Stack Técnico

### 1. **Entity (Banco de Dados)**
**Arquivo:** `entities/TarefaBacklog.json`

```json
"anexos": {
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "type": { "enum": ["imagem", "arquivo", "link"] },
      "url": { "type": "string" },
      "nome": { "type": "string" },
      "uploaded_at": { "type": "string", "format": "date-time" }
    }
  },
  "default": []
}
```

**Características:**
- Array JSON embutido (não tabela separada)
- Cada objeto contém tipo, URL, nome amigável e timestamp
- Suporta 3 tipos: imagem, arquivo, link
- Armazenado diretamente no record `TarefaBacklog`

### 2. **Componente de Upload**
**Arquivo:** `components/aceleracao/TarefaBacklogMediaUpload.jsx`

#### Funcionalidades:
✅ **Drag & Drop** - Arrasta arquivos direto na zona
✅ **Copiar e Colar** - Ctrl+V para imagens (captura clipboard)
✅ **Clique para Selecionar** - Input file tradicional
✅ **Adicionar Links Manuais** - Cole URL + clique "Adicionar"

#### Fluxo de Upload:
```
Usuário arrasta arquivo
           ↓
onDrop() captura files
           ↓
handleFileUpload(files)
           ↓
Para cada arquivo:
  base44.integrations.Core.UploadFile(file)
           ↓
Retorna { file_url } da CDN
           ↓
Cria objeto anexo:
{
  type: "imagem" | "arquivo",
  url: "https://cdn.base44.com/...",
  nome: "screenshot.png",
  uploaded_at: "2026-05-07T..."
}
           ↓
onAnexosChange(novoArray) → atualiza estado
```

#### Renderização:
- **Imagens:** Grid 2-3 colunas com miniaturas clickáveis
- **Documentos/Links:** Lista com links clicáveis
- **Modal Galeria:** Full-screen com navegação (← →, ESC)

### 3. **Componente de Visualização**
**Arquivo:** `components/aceleracao/TarefaBacklogAnexosVisualizador.jsx`

Renderiza anexos de tarefas já criadas:
- Grid de imagens (mesma lógica do upload)
- Lista de documentos/links com badges
- Modal galeria com navegação por teclado

### 4. **Integração no Form**
**Arquivo:** `components/aceleracao/TarefaBacklogForm.jsx`

```javascript
const [formData, setFormData] = useState({
  // ... outros campos
  anexos: tarefa?.anexos || []  // Adicionado
});

// No JSX:
<TarefaBacklogMediaUpload
  anexos={formData.anexos}
  onAnexosChange={(anexos) => setFormData({...formData, anexos})}
/>
```

### 5. **Backend de Validação**
**Arquivo:** `functions/sincronizarAnexosTarefaBacklog.js`

Função serverless que valida integridade dos anexos:

```
action="validate":
  ✓ Remove duplicatas por URL
  ✓ Valida estrutura (type, url, nome)
  ✓ Valida tipos permitidos
  ✓ Valida URLs (http/https)
  ✓ Remove inválidos
  ✓ Atualiza BD se necessário

action="cleanup":
  ✓ Remove anexos órfãos
  ✓ Remove itens sem timestamp
  ✓ Limpa dados com >1 ano
```

### 6. **Automação**
**Tipo:** Entity Automation
**Trigger:** Atualização de `TarefaBacklog` com mudança em `anexos`
**Ação:** Executa `sincronizarAnexosTarefaBacklog` com `action="validate"`

---

## 🔄 Fluxos de Operação

### ➕ CRIAR TAREFA COM ANEXOS
```
1. Form renderiza com campo de anexos
2. Usuário faz upload (drag/drop/paste/link)
   └─ Para cada arquivo: Upload na CDN
   └─ Cria objeto {type, url, nome, uploaded_at}
   └─ Adiciona ao array `formData.anexos`
3. Usuário clica "Criar Tarefa"
4. Form submete com `anexos: [...]`
5. Backend cria registro TarefaBacklog
   └─ Anexos armazenados no campo `anexos` (JSON)
6. Automação valida anexos (remove duplicatas, inválidos)
7. Tarefa criada com anexos validados
```

### ✏️ EDITAR TAREFA COM ANEXOS
```
1. Usuário abre tarefa existente
2. Form carrega com `anexos` atuais
3. Usuário pode:
   a) Adicionar mais anexos
   b) Remover anexos (clica X)
   c) Visualizar/expandir (clica imagem)
4. Clica "Atualizar Tarefa"
5. Backend atualiza registro
   └─ Campo `anexos` substituído
6. Automação valida novo array
7. Tarefa atualizada
```

### 👁️ VISUALIZAR TAREFA
```
1. Usuário abre detalhe da tarefa
2. TarefaBacklogDetalhe renderiza
3. Ao final, renderiza TarefaBacklogAnexosVisualizador
   └─ Lê tarefa.anexos
   └─ Filtra imagens vs documentos
   └─ Renderiza grid de imagens
   └─ Renderiza lista de docs/links
4. Usuário pode clicar em imagem
   └─ Abre modal full-screen
   └─ Navegação com setas/ESC
```

---

## 📊 Estrutura no Banco de Dados

```javascript
TarefaBacklog {
  id: "tarefa_123",
  titulo: "Implementar processo de vendas",
  descricao: "...",
  cliente_id: "client_456",
  // ... outros campos
  
  // ANEXOS - NOVO CAMPO
  anexos: [
    {
      type: "imagem",
      url: "https://cdn.base44.com/abc123.jpg",
      nome: "fluxo_vendas.jpg",
      uploaded_at: "2026-05-07T10:30:00Z"
    },
    {
      type: "arquivo",
      url: "https://cdn.base44.com/def456.pdf",
      nome: "guia_implementacao.pdf",
      uploaded_at: "2026-05-07T10:32:00Z"
    },
    {
      type: "link",
      url: "https://docs.google.com/document/...",
      nome: "docs.google.com",
      uploaded_at: "2026-05-07T10:35:00Z"
    }
  ],
  
  created_date: "2026-05-07T10:00:00Z",
  updated_date: "2026-05-07T10:35:00Z"
}
```

---

## 🛡️ Validação e Integridade

### Validação em Tempo Real (Frontend)
- ✓ Valida tipo MIME (detecta imagem vs arquivo)
- ✓ Impede duplicatas no estado local
- ✓ Valida estrutura antes de render
- ✓ Remove no clique do X

### Validação no Salvamento (Backend)
- ✓ Automação detecta mudanças em `anexos`
- ✓ Função `sincronizarAnexosTarefaBacklog` valida
- ✓ Remove duplicatas por URL
- ✓ Valida estrutura obrigatória
- ✓ Remove URLs inválidas
- ✓ Atualiza BD com anexos limpos

### Cleanup Periódico
- ✓ Remove anexos órfãos (sem timestamp)
- ✓ Limpa dados muito antigos (>1 ano)
- ✓ Pode ser executado manualmente ou via automação

---

## 🐛 Tratamento de Bugs Conhecidos

### Bug 1: **Índice incorreto ao remover anexo**
**Sintoma:** Clica X em anexo errado
**Causa:** Loop não sincronizado com indexOf
**Solução:** `onClick={(e) => { e.stopPropagation(); removeAnexo(anexos.indexOf(anexo)); }}`

### Bug 2: **Modal não abre ao clicar imagem**
**Sintoma:** Clica miniatura mas não expande
**Causa:** State não atualiza índice corretamente
**Solução:** Atribui `currentImageIndex` antes de `setImagemExpandida`

### Bug 3: **Colar não funciona em alguns browsers**
**Sintoma:** Ctrl+V não captura imagem
**Causa:** `clipboardData` pode ser undefined
**Solução:** Validação: `const items = e.clipboardData?.items || []`

### Bug 4: **Dropdown links abre nova aba**
**Sintoma:** Link abre em nova aba sem intention
**Causa:** Sem `target="_blank"` ou sem `onClick` proper
**Solução:** Sempre use `<a href={...} target="_blank" rel="noopener"`

### Bug 5: **Anexos duplicam na atualização**
**Sintoma:** Salva tarefa 2x, anexos duplicam
**Causa:** Sem validação de duplicatas
**Solução:** Automação `sincronizarAnexosTarefaBacklog` com `action="validate"`

---

## 📋 Checklist de Funcionamento

- [x] Entity TarefaBacklog com campo `anexos`
- [x] Componente TarefaBacklogMediaUpload
- [x] Componente TarefaBacklogAnexosVisualizador
- [x] Integração no TarefaBacklogForm
- [x] Integração no TarefaBacklogDetalhe
- [x] Backend de validação
- [x] Automação de validação ao update
- [x] Tratamento de drag & drop
- [x] Tratamento de copiar/colar
- [x] Tratamento de links manuais
- [x] Modal galeria com navegação
- [x] Remoção de anexos
- [x] Validação de duplicatas
- [x] Validação de URLs
- [x] Logs de auditoria

---

## 🚀 Como Testar

### Teste 1: Upload Drag & Drop
```
1. Ir para criar/editar tarefa
2. Arrastar imagem para zona
3. Deve fazer upload e mostrar miniatura
```

### Teste 2: Copiar e Colar
```
1. Copiar imagem (Print Screen)
2. Colar na zona (Ctrl+V)
3. Deve fazer upload
```

### Teste 3: Adicionar Link
```
1. Colar URL no input
2. Clica "Adicionar Link"
3. Deve aparecer na lista com badge "Link"
```

### Teste 4: Remover Anexo
```
1. Clica X no anexo
2. Deve remover da lista
3. Não deve salvar em BD
```

### Teste 5: Salvar Tarefa
```
1. Fazer upload
2. Preencher campos
3. Clica "Criar Tarefa"
4. Deve salvar com anexos
5. Automação deve validar
```

### Teste 6: Visualizar
```
1. Abrir tarefa criada
2. Scroll até "Anexos"
3. Deve mostrar grid de imagens
4. Clica imagem → abre modal
5. Setas ← → navegam
6. ESC fecha
```

---

## 💡 Notas Técnicas

### Por que Array JSON e não Tabela Separada?
- **Coesão:** Anexos pertencem 100% à tarefa
- **Performance:** Não precisa join em leitura
- **Simplicidade:** Sem FK/constraints complexas
- **Escalabilidade:** Não cresce índices de tabela separada
- **Uso Real:** Mesmo padrão do PedidoInterno funciona bem

### Por que Validação em Automação?
- **Consistência:** Garante que BD sempre tem dados limpos
- **Audit Trail:** Log de mudanças automático
- **Revalidação:** Pode rodar novamente sem risco
- **Escalabilidade:** Não sobrecarrega frontend

### Segurança de URLs
- Upload usa endpoint Base44 (garantido seguro)
- Links são user-input (validamos prefix http/https)
- Storage de URL é apenas string (sem execução)
- Acesso controlado por RLS da tarefa

---

## 📝 Próximas Melhorias Sugeridas

1. **Compressão de Imagens:** Antes de upload
2. **Preview de PDF:** Embed viewer para PDFs
3. **Versioning de Anexos:** Histórico de mudanças
4. **Integração Cloud:** Google Drive, OneDrive
5. **Assinatura Digital:** Sign PDFs
6. **OCR:** Extrair texto de imagens
7. **Thumbnail Cache:** Cachear miniaturas
8. **Quota por Usuário:** Limitar tamanho

---

## 📞 Suporte

Para bugs ou dúvidas, verificar:
1. Console do browser (DevTools → Console)
2. Backend logs da automação
3. Dados em BD (campo `anexos` da tarefa)
4. Teste de URL (abrir em nova aba)