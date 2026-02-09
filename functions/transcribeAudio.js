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

    // Buscar o arquivo de áudio
    const audioResponse = await fetch(audio_url);
    const audioBlob = await audioResponse.blob();

    // Transcrever com OpenAI Whisper
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', 'pt');

    const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`
      },
      body
    });

    if (!transcriptionResponse.ok) {
      throw new Error('Erro na API do OpenAI: ' + await transcriptionResponse.text());
    }

    const transcription = await transcriptionResponse.json();

    return Response.json({
      success,
      text.text
    });
  } catch (error) {
    console.error('Erro ao transcrever áudio:', error);
    return Response.json({ 
      error.message || 'Erro ao transcrever áudio' 
    }, { status: 500 });
  }
});
