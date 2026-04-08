// ============================================================================
// 1. QUERIES DE INTEGRIDADE
// ============================================================================

export const findInvalidClientIntelligence = async (base44, workshopId) => {
  const items = await base44.entities.ClientIntelligence.filter({
    workshop_id: workshopId
  });
  
  const invalid = items.filter(item => 
    !item.area || !item.type || !item.subcategory || !item.description
  );
  
  console.log(`🔍 Registros com campos obrigatórios faltando: ${invalid.length}`);
  return invalid;
};

export const findInvalidDates = async (base44, workshopId) => {
  const items = await base44.entities.ClientIntelligence.filter({
    workshop_id: workshopId
  });
  
  const invalid = items.filter(item => {
    if (!item.resolution_date) return false;
    
    try {
      const date = new Date(item.resolution_date);
      return isNaN(date.getTime());
    } catch (e) {
      return true;
    }
  });
  
  console.log(`🔍 Registros com data de resolução inválida: ${invalid.length}`);
  return invalid;
};

export const findCorruptedMetadata = async (base44, workshopId) => {
  const items = await base44.entities.ClientIntelligence.filter({
    workshop_id: workshopId
  });
  
  const corrupted = items.filter(item => {
    if (!item.metadata) return false;
    return typeof item.metadata !== 'object' || Array.isArray(item.metadata);
  });
  
  console.log(`🔍 Registros com metadata corrompido: ${corrupted.length}`);
  return corrupted;
};

// ============================================================================
// 2. QUERIES DE RELACIONAMENTO
// ============================================================================

export const findOrphanChecklists = async (base44, workshopId) => {
  const checklists = await base44.entities.ClientIntelligenceChecklist.filter({
    workshop_id: workshopId
  });
  
  const validIds = new Set();
  
  const items = await base44.entities.ClientIntelligence.filter({
    workshop_id: workshopId
  });
  
  items.forEach(item => validIds.add(item.id));
  
  const orphans = checklists.filter(checklist => 
    !validIds.has(checklist.client_intelligence_id)
  );
  
  console.log(`🔍 Checklists órfãos (sem item pai): ${orphans.length}`);
  return orphans;
};

export const findInconsistentProgress = async (base44, workshopId) => {
  const progressItems = await base44.entities.ClientIntelligenceChecklistProgress.filter({});
  
  const inconsistent = progressItems.filter(progress => {
    if (!progress.checked_items || !Array.isArray(progress.checked_items)) {
      return progress.completion_percentage > 0;
    }
    
    const checkedCount = progress.checked_items.filter(i => i.checked).length;
    const totalCount = progress.checked_items.length;
    
    if (totalCount === 0) return progress.completion_percentage > 0;
    
    const calculatedPercentage = Math.round((checkedCount / totalCount) * 100);
    return progress.completion_percentage !== calculatedPercentage;
  });
  
  console.log(`🔍 Registros de progresso com porcentagem inconsistente: ${inconsistent.length}`);
  return inconsistent;
};

export const findMissingGravity = async (base44, workshopId) => {
  const items = await base44.entities.ClientIntelligence.filter({
    workshop_id: workshopId
  });
  
  const missing = items.filter(item => !item.gravity);
  
  console.log(`🔍 Registros sem nível de gravidade definido: ${missing.length}`);
  return missing;
};

// ============================================================================
// 3. SCRIPTS DE CORREÇÃO (USAR COM CUIDADO)
// ============================================================================

export const fixInvalidDates = async (base44, workshopId) => {
  const invalid = await findInvalidDates(base44, workshopId);
  console.log(`🔧 Corrigindo ${invalid.length} datas inválidas...`);
  
  let fixed = 0;
  for (const item of invalid) {
    try {
      await base44.entities.ClientIntelligence.update(item.id, {
        resolution_date: null
      });
      console.log(`  ✅ ID ${item.id}: Data limpa`);
      fixed++;
    } catch (e) {
      console.error(`  ❌ Falha ao corrigir ID ${item.id}:`, e.message);
    }
  }
  
  console.log(`✅ ${fixed} datas corrigidas!`);
};

export const fixMissingGravity = async (base44, workshopId) => {
  const missing = await findMissingGravity(base44, workshopId);
  console.log(`🔧 Corrigindo ${missing.length} registros sem gravidade...`);
  
  let fixed = 0;
  for (const item of missing) {
    try {
      await base44.entities.ClientIntelligence.update(item.id, {
        gravity: 'media'
      });
      console.log(`  ✅ ID ${item.id}: Gravidade definida como 'media'`);
      fixed++;
    } catch (e) {
      console.error(`  ❌ Falha ao corrigir ID ${item.id}:`, e.message);
    }
  }
  
  console.log(`✅ ${fixed} gravidades corrigidas!`);
};

export const recalculateChecklistProgress = async (base44, workshopId) => {
  const inconsistent = await findInconsistentProgress(base44, workshopId);
  console.log(`🔧 Recalculando ${inconsistent.length} progressos inconsistentes...`);
  
  let fixed = 0;
  for (const progress of inconsistent) {
    try {
      if (!progress.checked_items || !Array.isArray(progress.checked_items) || progress.checked_items.length === 0) {
        await base44.entities.ClientIntelligenceChecklistProgress.update(progress.id, {
          completion_percentage: 0
        });
      } else {
        const checkedCount = progress.checked_items.filter(i => i.checked).length;
        const totalCount = progress.checked_items.length;
        const calculatedPercentage = Math.round((checkedCount / totalCount) * 100);
        
        await base44.entities.ClientIntelligenceChecklistProgress.update(progress.id, {
          completion_percentage: calculatedPercentage
        });
      }
      
      console.log(`  ✅ ID ${progress.id}: Progresso recalculado`);
      fixed++;
    } catch (e) {
      console.error(`  ❌ Falha ao recalcular ID ${progress.id}:`, e.message);
    }
  }
  
  console.log(`✅ ${fixed} progressos recalculados!`);
};

export const normalizeMetadata = async (base44, workshopId) => {
  const items = await base44.entities.ClientIntelligence.filter({
    workshop_id: workshopId
  });
  
  console.log(`🔧 Normalizando metadata de ${items.length} registros...`);
  
  let fixed = 0;
  
  for (const item of items) {
    let needsUpdate = false;
    let newMetadata = { ...(item.metadata || {}) };
    
    if (typeof item.metadata !== 'object' || item.metadata === null) {
      newMetadata = {};
      needsUpdate = true;
    }
    
    if (!newMetadata.version) {
      newMetadata.version = 1;
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      await base44.entities.ClientIntelligence.update(item.id, {
        metadata: newMetadata
      });
      console.log(`  ✅ ID ${item.id}: metadata normalizado`);
      fixed++;
    }
  }
  
  console.log(`✅ ${fixed} registros normalizados!`);
};

// ============================================================================
// 4. QUERIES DE ANÁLISE E RELATÓRIO
// ============================================================================

export const generateHealthReport = async (base44, workshopId) => {
  console.log('📊 RELATÓRIO DE SAÚDE DOS DADOS\n');
  
  const items = await base44.entities.ClientIntelligence.filter({
    workshop_id: workshopId
  });
  
  console.log(`Total de registros: ${items.length}`);
  console.log(`Registros com area: ${items.filter(i => i.area).length}`);
  console.log(`Registros com type: ${items.filter(i => i.type).length}`);
  console.log(`Registros com gravity: ${items.filter(i => i.gravity).length}`);
  console.log(`Registros com metadata: ${items.filter(i => i.metadata).length}`);
  
  const byType = {
    dor: items.filter(i => i.type === 'dor').length,
    duvida: items.filter(i => i.type === 'duvida').length,
    desejo: items.filter(i => i.type === 'desejo').length,
    risco: items.filter(i => i.type === 'risco').length,
    evolucao: items.filter(i => i.type === 'evolucao').length,
  };
  
  console.log('\nDistribuição por tipo:');
  Object.entries(byType).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });
  
  const byGravity = {
    baixa: items.filter(i => i.gravity === 'baixa').length,
    media: items.filter(i => i.gravity === 'media').length,
    alta: items.filter(i => i.gravity === 'alta').length,
    critica: items.filter(i => i.gravity === 'critica').length,
    undefined: items.filter(i => !i.gravity).length,
  };
  
  console.log('\nDistribuição por gravidade:');
  Object.entries(byGravity).forEach(([gravity, count]) => {
    console.log(`  ${gravity}: ${count}`);
  });
  
  return {
    total: items.length,
    byType,
    byGravity
  };
};

export const findDuplicates = async (base44, workshopId) => {
  const items = await base44.entities.ClientIntelligence.filter({
    workshop_id: workshopId
  });
  
  const seen = new Map();
  const duplicates = [];
  
  items.forEach(item => {
    const key = `${item.area}|${item.subcategory}|${item.description?.substring(0, 100)}`;
    
    if (seen.has(key)) {
      duplicates.push({
        original: seen.get(key),
        duplicate: item
      });
    } else {
      seen.set(key, item);
    }
  });
  
  console.log(`🔍 Possíveis duplicados encontrados: ${duplicates.length}`);
  return duplicates;
};

// ============================================================================
// 5. SCRIPT PRINCIPAL DE VALIDAÇÃO COMPLETA
// ============================================================================

export const runCompleteValidation = async (base44, workshopId) => {
  console.log('🚀 INICIANDO VALIDAÇÃO COMPLETA\n');
  console.log('='.repeat(60));
  
  console.log('\n1️⃣  VALIDAÇÃO DE INTEGRIDADE');
  console.log('-'.repeat(60));
  await findInvalidClientIntelligence(base44, workshopId);
  await findInvalidDates(base44, workshopId);
  await findCorruptedMetadata(base44, workshopId);
  
  console.log('\n2️⃣  VALIDAÇÃO DE RELACIONAMENTOS');
  console.log('-'.repeat(60));
  await findOrphanChecklists(base44, workshopId);
  await findInconsistentProgress(base44, workshopId);
  
  console.log('\n3️⃣  VALIDAÇÃO DE CAMPOS');
  console.log('-'.repeat(60));
  await findMissingGravity(base44, workshopId);
  
  console.log('\n4️⃣  ANÁLISE DE DUPLICADOS');
  console.log('-'.repeat(60));
  await findDuplicates(base44, workshopId);
  
  console.log('\n5️⃣  RELATÓRIO DE SAÚDE');
  console.log('-'.repeat(60));
  await generateHealthReport(base44, workshopId);
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ VALIDAÇÃO COMPLETA FINALIZADA');
};