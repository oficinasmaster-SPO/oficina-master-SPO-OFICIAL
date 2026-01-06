import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { audio_url } = await req.json();

    if (!audio_url) {
      return Response.json({ error: 'audio_url é obrigatório' }, { status: 400 });
    }

    // Baixar o áudio
    const audioResponse = await fetch(audio_url);
    const audioBlob = await audioResponse.blob();

    // Criar FormData para enviar ao Whisper
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', 'pt');

    // Chamar API do Whisper
    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`
      },
      body: formData
    });

    if (!whisperResponse.ok) {
      const error = await whisperResponse.text();
      console.error('Whisper error:', error);
      return Response.json({ error: 'Erro ao transcrever áudio' }, { status: 500 });
    }

    const result = await whisperResponse.json();
    
    return Response.json({ 
      transcription: result.text 
    });
    
  } catch (error) {
    console.error('Transcription error:', error);
    return Response.json({ 
      error: error.message || 'Erro ao transcrever áudio' 
    }, { status: 500 });
  }
});