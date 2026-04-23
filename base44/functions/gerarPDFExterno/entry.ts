import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      console.error(`[PDF-External] Não autenticado`);
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`[PDF-External] Usuário autenticado: ${user.email}`);

    const { html, filename = 'documento.pdf' } = await req.json();

    if (!html) {
      console.error(`[PDF-External] HTML não fornecido`);
      return Response.json({ error: 'html is required' }, { status: 400 });
    }

    console.log(`[PDF-External] Gerando PDF com HTML de ${html.length} caracteres`);

    // Chamar serviço externo de PDF com retry
    const pdfServiceUrl = Deno.env.get('PDF_SERVICE_URL') || 'https://pdf-service-production-37e0.up.railway.app/generate-pdf';
    
    let externalResponse = null;
    let lastError = null;
    const maxRetries = 2;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[PDF-External] Tentativa ${attempt + 1}/${maxRetries + 1} de contato com serviço externo`);
        
        const payloadJson = JSON.stringify({ 
          html,
          filename
        });
        
        console.log(`[PDF-External] Tamanho do payload: ${payloadJson.length} bytes`);
        
        externalResponse = await fetch(pdfServiceUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: payloadJson,
          signal: AbortSignal.timeout(60000) // 60 segundos timeout
        });
        
        if (externalResponse.ok) {
          console.log(`[PDF-External] Serviço respondeu com sucesso (status ${externalResponse.status})`);
          break;
        } else if (externalResponse.status >= 500 && attempt < maxRetries) {
          // Erro de servidor, tentar novamente
          const errorText = await externalResponse.text();
          lastError = `Status ${externalResponse.status}: ${errorText.substring(0, 200)}`;
          console.warn(`[PDF-External] Serviço retornou erro ${externalResponse.status}, tentando novamente...`);
          
          // Aguardar antes de retry
          await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
          continue;
        } else {
          // Erro de cliente ou último retry falhou
          const errorText = await externalResponse.text();
          lastError = `Status ${externalResponse.status}: ${errorText.substring(0, 200)}`;
          console.error(`[PDF-External] Serviço retornou erro: ${lastError}`);
          
          if (externalResponse.status < 500 || attempt === maxRetries) {
            break;
          }
          
          await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
          continue;
        }
      } catch (fetchError) {
        lastError = fetchError.message;
        console.error(`[PDF-External] Erro ao conectar com serviço: ${lastError}`);
        
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
          continue;
        }
      }
    }

    if (!externalResponse || !externalResponse.ok) {
      console.error(`[PDF-External] Falha após ${maxRetries + 1} tentativas: ${lastError}`);
      return Response.json(
        { 
          error: 'Serviço de geração de PDF temporariamente indisponível. Tente novamente em alguns momentos.',
          details: lastError || 'Não foi possível conectar ao serviço'
        },
        { status: 503 }
      );
    }

    // Receber PDF do serviço externo
    const pdfBuffer = await externalResponse.arrayBuffer();
    console.log(`[PDF-External] PDF recebido: ${pdfBuffer.byteLength} bytes`);

    // Converter para base64
    const uint8Array = new Uint8Array(pdfBuffer);
    const base64PDF = btoa(String.fromCharCode(...uint8Array));

    console.log(`[PDF-External] Geração concluída com sucesso`);
    return Response.json({
      success: true,
      pdf: base64PDF,
      filename,
      size: pdfBuffer.byteLength
    });

  } catch (error) {
    console.error(`[PDF-External-Error] ========== ERRO NA GERAÇÃO ==========`);
    console.error(`[PDF-External-Error] Tipo: ${error.name}`);
    console.error(`[PDF-External-Error] Mensagem: ${error.message}`);
    console.error(`[PDF-External-Error] Stack: ${error.stack}`);

    let statusCode = 500;
    let userMessage = 'Erro ao gerar PDF';

    if (error.message?.includes('timeout') || error.message?.includes('Timeout')) {
      statusCode = 408;
      userMessage = 'Tempo limite excedido na geração do PDF';
    }

    return Response.json(
      { 
        error: userMessage,
        details: error.message,
        type: error.name || 'Unknown'
      },
      { status: statusCode }
    );
  }
});