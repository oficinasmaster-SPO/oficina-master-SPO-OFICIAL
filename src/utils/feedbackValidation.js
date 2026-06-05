/**
 * Feedback Validation Utilities
 * TDD-tested validation functions for Employee Feedback module
 */

/**
 * Validates feedback data before submission
 * @param {Object} data - Feedback data object
 * @returns {Object} { isValid: boolean, errors: string[] }
 */
export const validateFeedback = (data) => {
  const errors = [];
  
  // Required fields validation
  if (!data.employee_id || data.employee_id.trim() === '') {
    errors.push('Colaborador é obrigatório');
  }
  
  if (!data.content || data.content.trim() === '') {
    errors.push('Conteúdo do feedback é obrigatório');
  }
  
  if (!data.type || !['positivo', 'negativo', 'one_on_one'].includes(data.type)) {
    errors.push('Tipo de feedback é obrigatório (positivo, negativo ou one_on_one)');
  }
  
  // Content length validation
  if (data.content && data.content.trim().length < 10) {
    errors.push('Conteúdo muito curto (mínimo 10 caracteres)');
  }
  
  if (data.content && data.content.length > 5000) {
    errors.push('Conteúdo muito longo (máximo 5000 caracteres)');
  }
  
  // Action plan validation (optional but has deadline)
  if (data.action_plan_deadline && !data.action_plan?.trim()) {
    errors.push('Plano de ação é obrigatório quando há prazo definido');
  }
  
  // Future deadline validation
  if (data.action_plan_deadline) {
    const deadline = new Date(data.action_plan_deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (deadline < today) {
      errors.push('Prazo do plano de ação não pode ser data passada');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates audio transcription result
 * @param {string} text - Transcribed text
 * @param {string} field - Field being transcribed ('content' or 'action_plan')
 * @param {string} feedbackType - Type of feedback for context validation
 * @returns {Object} { isValid: boolean, error?: string, warning?: string }
 */
export const validateAudioTranscription = (text, field, feedbackType) => {
  // Empty or too short validation
  if (!text || text.trim().length < 10) {
    return { 
      isValid: false, 
      error: 'Transcrição muito curta. Por favor, fale mais claramente.' 
    };
  }
  
  // Max length validation
  if (text.length > 5000) {
    return { 
      isValid: false, 
      error: 'Transcrição muito longa (máximo 5000 caracteres)' 
    };
  }
  
  // CNV methodology validation for content field
  if (field === 'content' && feedbackType) {
    const cnvKeywords = {
      positivo: ['percebi', 'notei', 'admiro', 'reconheço', 'valorizo', 'parabéns', 'excelente'],
      negativo: ['precisamos', 'necessário', 'melhorar', 'ajustar', 'observação', 'atenção'],
      one_on_one: ['pauta', 'conversa', 'alinhamento', 'próximos passos', 'metas']
    };
    
    const keywords = cnvKeywords[feedbackType] || [];
    const hasContextKeywords = keywords.some(keyword => 
      text.toLowerCase().includes(keyword)
    );
    
    // CNV structure validation (Observation, Feeling, Need, Request)
    const cnvStructureKeywords = ['observação', 'sentimento', 'necessidade', 'pedido', 'percebo', 'sinto', 'precisamos'];
    const hasCnvStructure = cnvStructureKeywords.some(k => text.toLowerCase().includes(k));
    
    if (!hasContextKeywords && !hasCnvStructure) {
      return { 
        isValid: true, // Don't block, just warn
        warning: '⚠️ Transcrição pode não estar seguindo metodologia CNV. Considere revisar.'
      };
    }
  }
  
  // Action plan structure validation
  if (field === 'action_plan') {
    const actionKeywords = ['ação', 'medida', 'providência', 'implementar', 'realizar', 'fazer'];
    const hasAction = actionKeywords.some(k => text.toLowerCase().includes(k));
    
    if (!hasAction) {
      return { 
        isValid: true,
        warning: '⚠️ Plano de ação deve conter verbo de ação claro. Revise se necessário.'
      };
    }
  }
  
  return { isValid: true };
};

/**
 * Validates audio duration before processing
 * @param {Blob} audioBlob - Audio blob object
 * @returns {Object} { isValid: boolean, error?: string }
 */
export const validateAudioDuration = (audioBlob) => {
  // Check if blob exists and has size
  if (!audioBlob || audioBlob.size === 0) {
    return { isValid: false, error: 'Áudio não foi gravado corretamente' };
  }
  
  // Minimum duration: 2 seconds (2000ms)
  // Note: Duration check happens in the component via audio recorder
  const minSize = 1024; // Minimum ~2 seconds of audio
  if (audioBlob.size < minSize) {
    return { 
      isValid: false, 
      error: 'Áudio muito curto. Grave pelo menos 2 segundos de fala.' 
    };
  }
  
  return { isValid: true };
};

/**
 * Checks if user has manager permissions
 * @param {Object} user - Current user object
 * @param {Array} userEmployees - User's employee records
 * @returns {boolean}
 */
export const isUserManager = (user, userEmployees) => {
  if (!user) return false;
  
  // Admin role always has permission
  if (user.role === 'admin') return true;
  
  // Manager job roles
  const MANAGER_JOB_ROLES = [
    'socio',
    'socio_interno', 
    'diretor',
    'supervisor_loja',
    'gerente',
    'lider_tecnico'
  ];
  
  const userEmployee = userEmployees?.[0];
  return MANAGER_JOB_ROLES.includes(userEmployee?.job_role);
};

/**
 * Generates sequential custom ID for feedback
 * @param {Array} existingFeedbacks - List of existing feedbacks
 * @returns {string} Custom ID in format F001, F002, etc
 */
export const generateCustomId = (existingFeedbacks) => {
  if (!existingFeedbacks || existingFeedbacks.length === 0) {
    return 'F001';
  }
  
  const nextNumber = existingFeedbacks.length + 1;
  return `F${String(nextNumber).padStart(3, '0')}`;
};

/**
 * Prepares feedback data for submission
 * @param {Object} formData - Form data from component
 * @param {Object} user - Current user
 * @param {Array} existingFeedbacks - Existing feedbacks for ID generation
 * @param {string} workshopId - Workshop ID
 * @returns {Object} Prepared data object
 */
export const prepareFeedbackData = (formData, user, existingFeedbacks, workshopId) => {
  const customId = generateCustomId(existingFeedbacks);
  
  return {
    custom_id: customId,
    feedback_type: formData.type,
    content: formData.content.trim(),
    action_plan: formData.action_plan?.trim() || null,
    action_plan_deadline: formData.action_plan_deadline || null,
    privacy: formData.privacy || 'privado_gestor',
    employee_id: formData.employee_id,
    evaluator_id: user.id,
    workshop_id: workshopId,
    feedback_date: new Date().toISOString()
  };
};

/**
 * Prepares edit data with audit trail
 * @param {Object} editData - Data being edited
 * @param {Object} user - Current user (editor)
 * @returns {Object} Data with audit fields
 */
export const prepareEditData = (editData, user) => {
  return {
    ...editData,
    edited_at: new Date().toISOString(),
    edited_by: user.email
  };
};