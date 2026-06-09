import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Telemetria de sugestões de perfil (Fase 3.5)
 * Coleta métricas de aceitação/rejeição para validar tabela canônica
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }
    
    const payload = await req.json();
    const { event_type, job_role, suggested_profile_id, suggested_profile_name, chosen_profile_id, chosen_profile_name, workshop_id } = payload;
    
    // Validações básicas
    if (!event_type || !job_role) {
      return Response.json({ 
        error: 'event_type e job_role são obrigatórios' 
      }, { status: 400 });
    }
    
    // Tipos de evento válidos
    const validEvents = [
      'profile_suggestion_generated',
      'profile_suggestion_accepted',
      'profile_suggestion_rejected'
    ];
    
    if (!validEvents.includes(event_type)) {
      return Response.json({ 
        error: `event_type deve ser um de: ${validEvents.join(', ')}` 
      }, { status: 400 });
    }
    
    // Determinar se foi aceito
    const accepted = event_type === 'profile_suggestion_accepted';
    
    // Criar registro de telemetria
    const telemetry = await base44.asServiceRole.entities.ProfileSuggestionTelemetry.create({
      event_type: event_type,
      job_role: job_role,
      suggested_profile_id: suggested_profile_id,
      suggested_profile_name: suggested_profile_name,
      selected_profile_id: chosen_profile_id || suggested_profile_id,
      accepted: accepted,
      workshop_id: workshop_id,
      user_id: user.id,
      user_email: user.email,
      timestamp: new Date().toISOString()
    });
    
    console.log(`📊 Telemetria registrada: ${event_type} para ${job_role}`);
    
    return Response.json({
      success: true,
      telemetry_id: telemetry.id,
      event_type: event_type,
      message: 'Telemetria registrada com sucesso'
    });
    
  } catch (error) {
    console.error('Erro em logProfileSuggestion:', error);
    return Response.json({ 
      error: error.message || 'Erro interno do servidor' 
    }, { status: 500 });
  }
});