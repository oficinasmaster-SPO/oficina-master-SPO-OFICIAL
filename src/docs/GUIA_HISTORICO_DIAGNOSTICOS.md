# Guia: Histórico de Diagnósticos

## 👋 O que é?

A página **Histórico de Diagnósticos** centraliza todos os diagnósticos já realizados no sistema. Você consegue:

- 📊 Ver todos seus diagnósticos em um só lugar
- 🔍 Filtrar por tipo, data, empresa
- 📥 Exportar relatório em CSV
- 🔄 Rastrear evolução ao longo do tempo

---

## 🚀 Como Acessar

1. No menu lateral, acesse **Diagnósticos & IA**
2. Clique em **"Histórico de Diagnóstico"**
3. Você verá todos seus diagnósticos

---

## 🎯 Funcionalidades

### Visualizar Diagnósticos
Cada diagnóstico aparece como um **card** com:
- Nome do diagnóstico (ex: "Diagnóstico de Empreendedor")
- Data de conclusão
- Seu nome
- Nome da empresa
- Botões de ação:
  - **Ver Resultado** → Abre o resultado completo
  - **Plano de Ação** → Abre o plano IA (se disponível)

### Filtrar
Clique no ícone 🔍 **Filtros** para:

**Por Tipo de Diagnóstico:**
- Diagnóstico de Empreendedor
- Diagnóstico Comercial
- Teste DISC
- (e outros tipos)

**Por Data:**
- De: selecione data inicial
- Até: selecione data final

**Por Empresa** (consultores apenas):
- Dropdown com lista de clientes

### Exportar Relatório
Clique em **📥 Exportar CSV** para:
- Baixar arquivo `historico-diagnosticos-2026-05-13.csv`
- Abrir em Excel, Google Sheets, etc.
- Compartilhar com colegas

### Paginação
- Veja 50 diagnósticos por página
- Use botões **Anterior** e **Próxima**
- Veja total de registros

---

## ⏰ Limitações de Frequência

Cada tipo de diagnóstico tem uma **frequência mínima** entre tentativas:

| Tipo | Frequência | Próximo após |
|------|-----------|-------------|
| Empreendedor | Anual | 365 dias |
| Comercial | Semestral | 180 dias |
| Maturidade | Trimestral | 90 dias |
| Carga de Trabalho | Mensal | 30 dias |
| DISC | Mensal | 30 dias |

**O que acontece?**
1. Você completa um diagnóstico
2. Sistema salva a data de conclusão
3. Se tenta fazer novamente antes do prazo:
   ```
   ❌ "Você já completou este diagnóstico.
      Próximo disponível em X dias"
   ```
4. Após X dias, o botão fica disponível novamente

---

## 🤖 Plano IA

Alguns diagnósticos suportam **Plano de Ação com IA**:

**Com IA Habilitado:**
- Ao ver resultado, clique **"Gerar Plano"**
- IA cria um plano personalizado
- Baixe ou compartilhe

**Sem IA:**
- Vê resultado do diagnóstico
- Sem opção de plano automático
- (Disponível em planos superiores)

---

## ❓ Perguntas Frequentes

**P: Vejo diagnósticos de outras pessoas?**
A: Não. Você vê apenas seus diagnósticos (mesmo se fizer pelo mesmo login que outro usuário).

**P: Posso deletar um diagnóstico?**
A: Não. Históricos são imutáveis para auditoria.

**P: Por que não consigo fazer o diagnóstico novamente?**
A: Porque não atingiu o intervalo mínimo. Exemplo: Empreendedor é anual (365 dias).

**P: O relatório CSV inclui quê?**
A: Nome, Empresa, Tipo de Diagnóstico, Data, ID único.

**P: Consultores veem todos os diagnósticos?**
A: Sim, consultores veem todos seus clientes. Usuários comuns veem apenas seus.

---

## 📞 Suporte

Dúvidas? Entre em contato:
- 📧 suporte@oficinamaster.com
- 💬 Chat de suporte (inferior direito)
- 📞 (11) 3000-0000