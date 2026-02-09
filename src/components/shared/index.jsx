// Exportações centralizadas do sistema de dados compartilhados

export { SharedDataProvider, useSharedData, useSharedValue } from './SharedDataProvider';
export { default as SharedDataField, SharedDataDisplay } from './SharedDataField';
export { default as TCMP2DataCard, TCMP2Value } from './TCMP2DataCard';
export { default as WorkshopDataCard, WorkshopValue } from './WorkshopDataCard';
export { default as GoalsDataCard, GoalsValue } from './GoalsDataCard';

/*
GUIA DE USO DO SISTEMA DE DADOS COMPARTILHADOS
==============================================

1. PROVIDER (já configurado no Layout.js)
   - SharedDataProvider envolve toda a aplicação
   - Carrega dados da oficina, TCMP², DRE, colaboradores e metas

2. HOOKS
   - useSharedData(): retorna todos os dados compartilhados
   - useSharedValue(source, field, defaultValue): retorna um valor específico

   Exemplo:
   const { tcmp2Data, workshopData, goalsData, employees } = useSharedData();
   const valorHora = useSharedValue('tcmp2', 'ideal_hour_value', 0);

3. COMPONENTES DE EXIBIÇÃO
   - TCMP2DataCard: exibe dados financeiros do TCMP²
   - WorkshopDataCard: exibe dados da oficina
   - GoalsDataCard: exibe metas mensais

   Props comuns:
   - compact: versão reduzida
   - showFields: array de campos específicos
   - className: classes CSS adicionais

   Exemplo:
   <TCMP2DataCard compact />
   <WorkshopDataCard showFields={['name', 'city', 'employees_count']} />

4. COMPONENTES DE INPUT COM VINCULAÇÃO
   - SharedDataField: input que busca valor da fonte automaticamente
   
   Props:
   - source: 'tcmp2', 'workshop', 'goals', 'dre', 'os'
   - field: nome do campo na fonte
   - value: valor atual (pode sobrescrever)
   - onChange: callback
   - allowOverride: permite editar valor diferente da fonte

   Exemplo:
   <SharedDataField
     source="tcmp2"
     field="ideal_hour_value"
     label="Valor Hora"
     value={formData.valorHora}
     onChange={(val) => setFormData({...formData, valorHora: val})}
     formatValue={(v) => `R$ ${v}`}
   />

5. COMPONENTES DE EXIBIÇÃO INLINE
   - TCMP2Value, WorkshopValue, GoalsValue: exibem um valor inline
   
   Exemplo:
   <p>Valor hora: <TCMP2Value field="ideal_hour_value" format={(v) => `R$ ${v}`} /></p>

6. ATUALIZAÇÃO DOS DADOS
   const { refreshData } = useSharedData();
   
   refreshData('tcmp2');    // atualiza dados TCMP²
   refreshData('workshop'); // atualiza dados da oficina
   refreshData('all');      // atualiza tudo

7. FONTES DE DADOS DISPONÍVEIS
   - 'tcmp2': dados financeiros do diagnóstico O.S. e DRE
   - 'workshop': dados cadastrais da oficina
   - 'goals': metas mensais
   - 'dre': DRE mensal
   - 'os': diagnóstico de O.S.

*/