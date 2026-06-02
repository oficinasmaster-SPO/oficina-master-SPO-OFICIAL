# Como Integrar o Modal ResultadoDISC no HistoricoDISC

## Passos para Integração

### 1. Adicionar Import no HistoricoDISC

No início do arquivo `pages/HistoricoDISC`, adicione:

```jsx
import ResultadoDISCModal from "@/pages/ResultadoDISC";
```

### 2. Adicionar Estado para Controlar o Modal

Dentro do componente `HistoricoDISC`, adicione os estados:

```jsx
const [modalOpen, setModalOpen] = useState(false);
const [selectedDiagnosticId, setSelectedDiagnosticId] = useState(null);
```

### 3. Criar Função para Abrir o Modal

Adicione a função:

```jsx
const handleVerResultado = (diagnosticId) => {
  setSelectedDiagnosticId(diagnosticId);
  setModalOpen(true);
};
```

### 4. Atualizar o Botão "Ver Resultado"

Na tabela onde exibe os diagnósticos, localize o botão "Ver Resultado" e atualize:

**Antes:**
```jsx
<Button
  onClick={() => navigate(`/ResultadoDISC?id=${diagnostic.id}`)}
  size="sm"
>
  Ver Resultado
</Button>
```

**Depois:**
```jsx
<Button
  onClick={() => handleVerResultado(diagnostic.id)}
  size="sm"
>
  Ver Resultado
</Button>
```

### 5. Adicionar o Modal no JSX

No final do JSX do componente `HistoricoDISC`, antes do fechamento do componente, adicione:

```jsx
<ResultadoDISCModal
  open={modalOpen}
  onOpenChange={setModalOpen}
  diagnosticId={selectedDiagnosticId}
/>
```

## Resultado Final

Após essas alterações:
- ✅ Ao clicar em "Ver Resultado", abrirá um modal suspenso
- ✅ O botão "Voltar ao Início" fecha o modal
- ✅ O botão "Avaliar Outro Colaborador" foi removido
- ✅ O botão "Gerar Plano com IA" está visível mas bloqueado com "(Em Construção)"

## Exemplo Completo

```jsx
import React, { useState } from "react";
import ResultadoDISCModal from "@/pages/ResultadoDISC";

export default function HistoricoDISC() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDiagnosticId, setSelectedDiagnosticId] = useState(null);

  const handleVerResultado = (diagnosticId) => {
    setSelectedDiagnosticId(diagnosticId);
    setModalOpen(true);
  };

  return (
    <div>
      {/* ... resto do código ... */}
      
      {/* Tabela de diagnósticos */}
      {diagnostics.map((diagnostic) => (
        <div key={diagnostic.id}>
          {/* ... dados do diagnóstico ... */}
          <Button onClick={() => handleVerResultado(diagnostic.id)}>
            Ver Resultado
          </Button>
        </div>
      ))}

      {/* Modal de Resultado DISC */}
      <ResultadoDISCModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        diagnosticId={selectedDiagnosticId}
      />
    </div>
  );
}
``