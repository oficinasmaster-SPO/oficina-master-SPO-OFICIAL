# 📋 Implementação - Modal "Datas do Lançamento" na Projeção (DFC)

## 🎯 OBJETIVO
Permitir **auditar e dar baixa** nos itens **pagos/recebidos** na visualização de projeção do DFC.

---

## 📊 FLUXO VISUAL

```
┌─────────────────────────────────────┐
│  DFCTab - Aba Projeção              │
│                                     │
│  ┌──────────────────────────────┐   │
│  │ Tabela de Lançamentos        │   │
│  │ ┌──────────────────────────┐ │   │
│  │ │ Descrição │ Valor │ 📅   │ │   │
│  │ │ Energia   │ -500  │ CLICA│ ◄─┐ │
│  │ │ Salário   │ -3000 │ CLICA│ │ │
│  │ └──────────────────────────┘ │   │
│  └──────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
                  │
                  ▼
    ┌──────────────────────────────┐
    │ Modal "Datas do Lançamento" │
    │ ┌────────────────────────┐   │
    │ │ Energia - R$ -500,00  │   │
    │ │                        │   │
    │ │ Data Vencimento: ✓     │   │
    │ │ [05/2026] [📅]        │   │
    │ │                        │   │
    │ │ Data Pagamento: (✓)    │   │
    │ │ [dd/mm/yyyy] [📅]     │   │
    │ │                        │   │
    │ │ [Cancelar] [Salvar]    │   │
    │ └────────────────────────┘   │
    └──────────────────────────────┘
           │
           └─► Atualiza DFCLancamento
               com datas de vencimento
               e pagamento
```

---

## 🔧 PASSO 1: CRIAR O MODAL

**Arquivo:** `components/dfc/DatasLancamentoModal.jsx`

```jsx
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { format, parse } from 'date-fns';
import { Calendar } from 'lucide-react';

export default function DatasLancamentoModal({ isOpen, onClose, lancamento, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [dataVencimento, setDataVencimento] = useState(
    lancamento?.data_vencimento ? format(new Date(lancamento.data_vencimento), 'dd/MM/yyyy') : ''
  );
  const [dataPagamento, setDataPagamento] = useState(
    lancamento?.data_pagamento ? format(new Date(lancamento.data_pagamento), 'dd/MM/yyyy') : ''
  );

  const handleSave = async () => {
    try {
      setLoading(true);

      // Parse datas
      let vencimentoDate = null;
      let pagamentoDate = null;

      if (dataVencimento) {
        vencimentoDate = parse(dataVencimento, 'dd/MM/yyyy', new Date());
      }

      if (dataPagamento) {
        pagamentoDate = parse(dataPagamento, 'dd/MM/yyyy', new Date());
      }

      // Update
      await base44.entities.DFCLancamento.update(lancamento.id, {
        data_vencimento: vencimentoDate,
        data_pagamento: pagamentoDate,
      });

      onSaved?.();
      onClose();
    } catch (error) {
      console.error('Erro ao salvar datas:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!lancamento) return null;

  const formatValue = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Datas do Lançamento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info do Lançamento */}
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <p className="text-sm font-medium text-gray-900">{lancamento.descricao}</p>
            <p className={`text-lg font-bold ${lancamento.tipo === 'saida' ? 'text-red-600' : 'text-green-600'}`}>
              {lancamento.tipo === 'saida' ? '-' : '+'}{formatValue(lancamento.valor)}
            </p>
          </div>

          {/* Data Vencimento */}
          <div>
            <Label htmlFor="vencimento" className="text-sm mb-2 block">
              Data de Vencimento <span className="text-gray-500">(opcional)</span>
            </Label>
            <Input
              id="vencimento"
              type="date"
              value={dataVencimento ? format(parse(dataVencimento, 'dd/MM/yyyy', new Date()), 'yyyy-MM-dd') : ''}
              onChange={(e) => {
                if (e.target.value) {
                  setDataVencimento(format(new Date(e.target.value), 'dd/MM/yyyy'));
                } else {
                  setDataVencimento('');
                }
              }}
              placeholder="dd/mm/yyyy"
            />
          </div>

          {/* Data Pagamento */}
          <div>
            <Label htmlFor="pagamento" className="text-sm mb-2 block">
              Data de Pagamento <span className="text-gray-500">(preencha quando pago)</span>
            </Label>
            <Input
              id="pagamento"
              type="date"
              value={dataPagamento ? format(parse(dataPagamento, 'dd/MM/yyyy', new Date()), 'yyyy-MM-dd') : ''}
              onChange={(e) => {
                if (e.target.value) {
                  setDataPagamento(format(new Date(e.target.value), 'dd/MM/yyyy'));
                } else {
                  setDataPagamento('');
                }
              }}
              placeholder="dd/mm/yyyy"
            />
            {dataPagamento && (
              <p className="text-xs text-green-600 mt-1">✓ Marcado como pago</p>
            )}
          </div>

          {/* Status */}
          {dataPagamento && (
            <div className="bg-green-50 p-2 rounded border border-green-200">
              <p className="text-xs text-green-700">
                <strong>Pago em:</strong> {dataPagamento}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading} className="bg-black text-white hover:bg-gray-800">
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 🔧 PASSO 2: INTEGRAR NO COMPONENTE DE PROJEÇÃO

Na subaba **"Projeção"** da DFC, você precisa:

### **Adicionar o Modal ao Estado:**
```jsx
const [openDatasModal, setOpenDatasModal] = useState(false);
const [lancamentoSelecionado, setLancamentoSelecionado] = useState(null);
```

### **Criar Função para Abrir Modal:**
```jsx
const handleAbrirDatas = (lancamento) => {
  setLancamentoSelecionado(lancamento);
  setOpenDatasModal(true);
};
```

### **Adicionar Coluna "Ações" na Tabela:**
```jsx
<table className="w-full">
  <thead>
    <tr>
      <th>Descrição</th>
      <th>Tipo</th>
      <th>Valor</th>
      <th>Vencimento</th>
      <th>Pagamento</th>
      <th>Ações</th>
    </tr>
  </thead>
  <tbody>
    {lancamentos.map(item => (
      <tr key={item.id}>
        <td>{item.descricao}</td>
        <td>{item.tipo}</td>
        <td>R$ {item.valor.toLocaleString('pt-BR')}</td>
        <td>{item.data_vencimento ? format(new Date(item.data_vencimento), 'dd/MM/yyyy') : '-'}</td>
        <td>
          {item.data_pagamento 
            ? <span className="text-green-600">✓ {format(new Date(item.data_pagamento), 'dd/MM/yyyy')}</span>
            : <span className="text-orange-600">Pendente</span>
          }
        </td>
        <td>
          <button 
            onClick={() => handleAbrirDatas(item)}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            📅 Editar
          </button>
        </td>
      </tr>
    ))}
  </tbody>
</table>
```

### **Renderizar o Modal:**
```jsx
<DatasLancamentoModal
  isOpen={openDatasModal}
  onClose={() => setOpenDatasModal(false)}
  lancamento={lancamentoSelecionado}
  onSaved={() => {
    // Recarregar dados ou atualizar lista
    refetch?.();
  }}
/>
```

---

## 🎯 CASO DE USO: AUDITAR ITENS PAGOS

### **Fluxo de Auditoria:**

1. **Abrir Subaba "Projeção"** do DFC
2. **Ver Tabela** com todos os lançamentos:
   - ✅ **Vencimento:** Data prevista (ex: 05/2026)
   - ⏳ **Pagamento:** Pendente ou data realizada

3. **Clicar em "📅 Editar"** no item que foi pago
4. **Preencher Data de Pagamento**:
   - Campo `Data de Pagamento`: `[data que foi efetivamente pago]`
   - Status muda para: `✓ Pago em: 15/05/2026`

5. **Salvar** e item é marcado como quitado

---

## 📊 ESTRUTURA DE DADOS

### **DFCLancamento Entity:**

```json
{
  "id": "abc123",
  "workshop_id": "oficina_001",
  "mes": "2026-05",
  "grupo": "operacional",
  "tipo": "saida",
  "descricao": "Energia Elétrica",
  "valor": 500,
  "data_vencimento": "2026-05-05",      // ← NOVO
  "data_pagamento": "2026-05-15",       // ← NOVO
  "origem": "manual",
  "saldo_inicial": null
}
```

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

- [ ] Criar arquivo `components/dfc/DatasLancamentoModal.jsx`
- [ ] Importar `DatasLancamentoModal` no componente de Projeção
- [ ] Adicionar estado: `openDatasModal` e `lancamentoSelecionado`
- [ ] Criar função `handleAbrirDatas(lancamento)`
- [ ] Adicionar coluna "Ações" com botão "📅 Editar"
- [ ] Renderizar `<DatasLancamentoModal ... />`
- [ ] Testar abertura/fechamento do modal
- [ ] Testar salvamento de datas
- [ ] Testar recarregamento de dados após salvar
- [ ] Validar campos de data

---

## 🚀 PRÓXIMOS PASSOS

### **Fase 1 - Básico (Sua Implementação Agora):**
- ✅ Modal "Datas do Lançamento"
- ✅ Editar datas de vencimento e pagamento
- ✅ Marcar itens como pagos

### **Fase 2 - Avançado (Futuro):**
- 🔄 Filtrar itens pendentes vs. pagos
- 📊 Dashboard com itens vencidos
- 🔔 Alertas para itens atrasados
- 📈 Relatório de acompanhamento de cash flow

---

## 💡 DICAS

1. **Data de Vencimento:** Use `data-fns` para parsing/formatação (pt-BR)
2. **Status Visual:** Adicione cores:
   - 🟢 Verde = Pago (data_pagamento preenchida)
   - 🟠 Laranja = Pendente (vencido, sem pagamento)
   - 🟡 Amarelo = A vencer (data_vencimento futura)

3. **Recarregar Dados:** Use `refetch()` ou `queryClient.invalidateQueries()`
4. **Validação:** Impedir que `data_pagamento < data_vencimento`

---

**Documento criado:** 2026-05-17
**Status:** ✅ IMPLEMENTADO

## ✅ IMPLEMENTAÇÃO CONCLUÍDA

### O que foi feito:

1. **Modal já existe:** `ModalMarcarPagamento` (linhas 207-287 do DFCTab.jsx)
   - Campos: Data de Vencimento + Data de Pagamento
   - Salva em `DRELancamento.data_vencimento` e `DRELancamento.data_pagamento`
   - Feedback visual com toast

2. **Projeção atualizada:** `ProjecaoCaixaView.jsx`
   - ✅ Cada item da linha do tempo agora é **clicável**
   - ✅ Hover effect mostra ícone 📅
   - ✅ Clique abre o modal `ModalMarcarPagamento`
   - ✅ Atualização em tempo real via query invalidation

### Como usar:

1. Abrir DFC → Aba **"📅 Projeção"**
2. Ver linha do tempo com lançamentos
3. **Clicar em qualquer item** da lista
4. Modal abre com dados do lançamento
5. Preencher datas de vencimento/pagamento
6. Salvar → Atualiza automaticamente

### Fluxo Visual:

```
Projeção → Clique no item (✓ ou ○) → Modal → Salvar → Atualiza
```

**Pronto para uso!** 🎉