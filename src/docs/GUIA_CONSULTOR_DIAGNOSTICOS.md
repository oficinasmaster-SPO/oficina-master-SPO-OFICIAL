# Guia: Histórico de Diagnósticos para Consultores

## 👨‍💼 Visão Geral

Como **consultor**, você tem acesso especial ao **Histórico de Diagnósticos**:
- ✅ Vê diagnósticos de **TODOS seus clientes**
- ✅ Filtra por empresa, tipo, data
- ✅ Exporta relatórios personalizados
- ✅ Acompanha evolução do cliente

---

## 🎯 Acessar Histórico de Seus Clientes

1. Menu → **Diagnósticos & IA**
2. **"Histórico de Diagnóstico"**
3. Filtro de **"Empresa"** aparece automaticamente
4. Selecione um cliente
5. Veja diagnósticos daquele cliente

---

## 🔍 Filtros Avançados

### Filtro de Empresa
Dropdown mostra lista de **todos seus clientes**:
- Busque o nome
- Clique para filtrar
- Mostra diagnósticos apenas daquela empresa

### Filtro de Tipo
Veja apenas um tipo de diagnóstico:
- Empreendedor
- Comercial
- DISC
- Carga de Trabalho
- Maturidade
- (e mais)

### Filtro de Data
Veja diagnósticos em um período:
- **De:** 01/01/2026
- **Até:** 13/05/2026
- Útil para relatórios trimestrais/anuais

---

## 📊 Interpretando os Dados

### Informações Rastreadas
Cada diagnóstico mostra:

| Campo | Significa |
|-------|-----------|
| **Nome Usuário** | Quem respondeu |
| **Empresa** | Qual cliente |
| **Tipo** | Que diagnóstico |
| **Data** | Quando completou |
| **ID** | Referência única |

### Status Visual
- 🟢 **Verde**: Diagnóstico dentro da frequência esperada
- 🟡 **Amarelo**: Cliente atrasado (não fez na frequência)
- 🔴 **Vermelho**: Muito atrasado (recomendado agir)

---

## 📈 Casos de Uso

### Acompanhamento Trimestral
```
1. Acesso Histórico
2. Filtrar: Tipo = "Maturidade Colaborador", Data = "últimos 3 meses"
3. Vê evolução do cliente
4. Se regrediu → Conversa sobre plano de ação
```

### Relatório para Apresentação
```
1. Filtro: Empresa X, Tipo = Comercial
2. Exportar CSV
3. Abrir no Excel
4. Criar gráfico de evolução
5. Apresentar ao cliente
```

### Identificar Clientes em Risco
```
1. Filtro: Data = "antes de 90 dias atrás"
2. Vê clientes que não fazem diagnóstico há tempo
3. Priorizar follow-up com esses clientes
```

### Sugerir Próximo Passo
```
1. Ver resultado do diagnóstico
2. Se tem IA disponível:
   └─ Botão "Gerar Plano" aparece
3. Compartilhar plano com cliente
4. Agendar follow-up
```

---

## 💾 Exportar Relatório

**Quando usar:**
- Preparar apresentação
- Compartilhar com gestor
- Análise em bulk
- Documentar progresso

**Como fazer:**
1. Aplicar filtros desejados
2. Clique **"Exportar CSV"**
3. Arquivo baixa
4. Abra em Excel/Sheets

**Arquivo inclui:**
- Nome do usuário
- Nome da empresa
- Tipo de diagnóstico
- Data de conclusão
- ID único

---

## 🔄 Ciclo Recomendado de Acompanhamento

### Mensal
- [ ] Acessar Histórico
- [ ] Filtrar por "Data = últimos 30 dias"
- [ ] Identificar novos diagnósticos
- [ ] Agendar follow-ups

### Trimestral
- [ ] Filtro: Tipo = "Maturidade", Data = "últimos 90 dias"
- [ ] Análise de evolução
- [ ] Planejar próxima onda

### Anual
- [ ] Exportar relatório anual
- [ ] Preparar apresentação para cliente
- [ ] Revisar planos de ação

---

## ⚡ Dicas & Boas Práticas

### Dica 1: Use Datas Inteligentemente
```
Não: "Mostrar todos" (é muita informação)
Sim: "Últimos 90 dias" (foco no recente)
```

### Dica 2: Combine Filtros
```
Filtro + Filtro + Filtro = resultado específico
Tipo: "Empreendedor" + Empresa: "Oficina XYZ" + Data: "2026"
```

### Dica 3: Exportar para Análise
```
Histórico em CSV → Excel → Gráfico → Apresentação
```

### Dica 4: Documento em Acompanhamento
```
Se cliente fez diagnostico em Mai → 
Próximo esperado em Ago →
Agende follow-up em Jul
```

---

## 🤔 Troubleshooting

**P: Não vejo alguns clientes**
A: Você vê apenas clientes da sua consultoria. Confira com supervisor.

**P: Diagnóstico não aparece na lista**
A: Pode estar em processo. Aguarde conclusão. Ou aplique mais filtros (data/tipo).

**P: Filtro de empresa não aparece**
A: É exibido automaticamente. Se não vê, pode ser usuário sem rol de consultor.

**P: CSV vem vazio**
A: Nenhum diagnóstico atende aos filtros. Tente reset (remover filtros).

---

## 📞 Suporte Consultor

- 📧 consultor@oficinamaster.com
- 💬 Chat interno
- 📚 Documentação: [/docs](../docs)

---

## 🎓 Próximo Nível

- Usar dados para criar **Plano de Ação** personalizado
- Integrar com **Controle de Aceleração**
- Agendar **Follow-ups** automáticos
- Gerar **Relatórios com IA**