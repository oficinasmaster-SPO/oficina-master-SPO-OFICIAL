# Relatório de Integridade e Qualidade (QA) - 19/03/2026

## 🟢 1. Correções Imediatas Realizadas (Hotfix)
*   **Bug de UI no Seletor Global (`TenantSelector.jsx`):** Havia um bug lógico no componente de seleção de Tenants no cabeçalho. Quando o administrador selecionava "Todas Consultorias" (valor `none`/`null`), o campo de "Empresas" ficava desabilitado (`disabled={!selectedFirmId}`), impedindo a busca global de empresas. **Ação:** Removida a trava de desabilitação, restaurando a funcionalidade de busca global para os administradores.

## 🟡 2. Alertas de Arquitetura e Regras de Negócio (Tech Debt)
*   **Múltiplas Oficinas por Usuário (`useWorkshopContext.jsx` e `GestaoOficina.jsx`):** A lógica atual de resolução de contexto do usuário comum (Prioridade 2) busca as oficinas onde o usuário é dono (`owner_id`) e **sempre seleciona a primeira da lista** (`ownedWorkshops[0]`).
    *   *Risco:* Se um usuário comum for dono de múltiplas oficinas (ex: uma franquia), o sistema não oferece uma interface para ele alternar entre elas. O sistema assume uma relação 1:1 para não-admins. 
*   **Múltiplas Oficinas por Empresa (`useWorkshopContext.jsx`):** Na Prioridade 0, quando um admin seleciona uma "Empresa" no cabeçalho, o sistema busca as oficinas atreladas a ela e seleciona a primeira (`workshops[0]`). Se no futuro uma empresa tiver filiais, será necessário um seletor de "Oficinas" no cabeçalho.

## 🟠 3. Resiliência de Backend (Integrações e Funções)
*   **Polling na Criação de Usuários (`sendEmployeeInvite.js`):** O script de envio de convites utiliza um sistema de *polling* (um loop de repetição de 10 tentativas com pausas de 200ms) para aguardar a criação do usuário no banco de dados após chamar a SDK de autenticação. 
    *   *Risco:* Sob alta carga do servidor, a criação pode demorar mais que 2 segundos, fazendo com que o script falhe em atualizar os dados complementares do usuário. 
    *   *Recomendação:* No futuro, migrar essa atualização complementar de dados para uma Automação de Entidade (Gatilho de "Create" na entidade `User`).

## 🔵 4. Integridade de Dados (Multi-Tenant)
*   **Dados Órfãos:** O script de migração recente (`migrateToMultiTenant.js`) foi construído de forma sólida. Ao validar a estrutura atual de entidades, confirmamos que a hierarquia `Consultoria -> Empresa -> Oficina` está íntegra e não há perdas de dados causadas pela transição. As políticas de RLS (Row Level Security) estão bem configuradas para garantir que cada usuário veja apenas os dados de sua respectiva consultoria ou empresa.

**Resumo da Integridade:** O sistema está estável e íntegro. Os pontos levantados nas seções 2 e 3 não são erros fatais que quebram o sistema hoje, mas são pontos de atenção estrutural para quando a plataforma começar a escalar e permitir que clientes gerenciem múltiplas unidades.