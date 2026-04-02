/**
 * Utilitário para normalizar e sanitizar dados de ATA
 * Resolve inconsistências entre formatos de dados (backend IA vs frontend manual)
 */

/**
 * Converte valor para string segura (trata objetos, arrays, null)
 */
function toSafeString(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(toSafeString).filter(Boolean).join(', ');
  if (typeof value === 'object') {
    if (value.descricao) return toSafeString(value.descricao);
    if (value.name) return toSafeString(value.name);
    if (value.titulo) return toSafeString(value.titulo);
    if (value.text) return toSafeString(value.text);
    return JSON.stringify(value);
  }
  return String(value);
}

/**
 * Normaliza participante para formato {name, role}
 */
function normalizeParticipante(p) {
  if (typeof p === 'string') return { name: p, role: '' };
  return {
    name: toSafeString(p.name || p.nome || p.full_name || ''),
    role: toSafeString(p.role || p.cargo || p.funcao || '')
  };
}

/**
 * Normaliza próximo passo para formato {descricao, responsavel, prazo}
 */
function normalizeProximoPasso(passo) {
  if (typeof passo === 'string') return { descricao: passo, responsavel: '', prazo: '' };
  return {
    descricao: toSafeString(passo.descricao || passo.description || passo.acao || ''),
    responsavel: toSafeString(passo.responsavel || passo.responsible || ''),
    prazo: toSafeString(passo.prazo || passo.deadline || '')
  };
}

/**
 * Normaliza responsável para formato {name, role}
 */
function normalizeResponsavel(resp) {
  if (!resp) return { name: '', role: '' };
  if (typeof resp === 'string') return { name: resp, role: '' };
  return {
    name: toSafeString(resp.name || resp.nome || ''),
    role: toSafeString(resp.role || resp.cargo || '')
  };
}

/**
 * Formata prazo de forma segura
 */
export function formatPrazoSafe(prazo) {
  if (!prazo) return 'Não definido';
  const str = toSafeString(prazo);
  try {
    const date = new Date(str);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('pt-BR');
    }
  } catch {
    // ignore
  }
  return str;
}

/**
 * Sanitiza todos os dados da ATA para garantir consistência
 * Retorna uma cópia limpa e normalizada
 */
export function sanitizeAtaData(ata) {
  if (!ata) return null;
  
  const sanitized = { ...ata };
  
  // Normalizar participantes
  if (Array.isArray(sanitized.participantes)) {
    sanitized.participantes = sanitized.participantes.map(normalizeParticipante);
  } else {
    sanitized.participantes = [];
  }
  
  // Normalizar responsável
  sanitized.responsavel = normalizeResponsavel(sanitized.responsavel);
  
  // Normalizar próximos passos
  if (Array.isArray(sanitized.proximos_passos_list)) {
    sanitized.proximos_passos_list = sanitized.proximos_passos_list.map(normalizeProximoPasso);
  } else {
    sanitized.proximos_passos_list = [];
  }
  
  // Garantir campos de texto como strings
  sanitized.pautas = toSafeString(sanitized.pautas);
  sanitized.objetivos_atendimento = toSafeString(sanitized.objetivos_atendimento);
  sanitized.objetivos_consultor = toSafeString(sanitized.objetivos_consultor);
  sanitized.visao_geral_projeto = toSafeString(sanitized.visao_geral_projeto);
  sanitized.observacoes_consultor = toSafeString(sanitized.observacoes_consultor);
  sanitized.plano_nome = toSafeString(sanitized.plano_nome);
  sanitized.code = toSafeString(sanitized.code);
  sanitized.tipo_aceleracao = toSafeString(sanitized.tipo_aceleracao || 'mensal');
  
  // Normalizar proximos_passos (campo texto legado)
  if (sanitized.proximos_passos && typeof sanitized.proximos_passos !== 'string') {
    if (Array.isArray(sanitized.proximos_passos)) {
      sanitized.proximos_passos = sanitized.proximos_passos
        .map(p => typeof p === 'string' ? p : toSafeString(p.descricao || p))
        .join('\n');
    } else {
      sanitized.proximos_passos = toSafeString(sanitized.proximos_passos);
    }
  }
  
  // Normalizar decisões tomadas
  if (Array.isArray(sanitized.decisoes_tomadas)) {
    sanitized.decisoes_tomadas = sanitized.decisoes_tomadas.map(d => ({
      decisao: toSafeString(d.decisao || d.decisão || ''),
      responsavel: toSafeString(d.responsavel || d.responsável || ''),
      prazo: toSafeString(d.prazo || '')
    }));
  }
  
  // Normalizar ações geradas
  if (Array.isArray(sanitized.acoes_geradas)) {
    sanitized.acoes_geradas = sanitized.acoes_geradas.map(a => ({
      acao: toSafeString(a.acao || a.ação || ''),
      responsavel: toSafeString(a.responsavel || a.responsável || ''),
      prazo: toSafeString(a.prazo || '')
    }));
  }
  
  // Normalizar ata_ia (resultado da IA - deve ser string)
  if (sanitized.ata_ia && typeof sanitized.ata_ia !== 'string') {
    sanitized.ata_ia = toSafeString(sanitized.ata_ia);
  }
  
  return sanitized;
}