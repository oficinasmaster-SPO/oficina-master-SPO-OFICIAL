import { base44 } from '@/api/base44Client';
import { downloadAtaPDF } from './pdfDownloadManager';
import { generateCronogramaHTML } from './cronogramaHTMLGenerator';
import { generateProcessHTML } from './processHTMLGenerator';

/**
 * Baixa cronograma via serviço externo
 */
export async function downloadCronogramaPDFExterno(cronogramaData, workshop, options = {}) {
  const { action = 'download', onSuccess, onError } = options;

  try {
    console.log(`[PDF-Manager] Iniciando ${action} do PDF do cronograma`);

    const html = generateCronogramaHTML(cronogramaData, workshop);
    console.log(`[PDF-Manager] HTML gerado: ${html.length} caracteres`);

    // Chamar função backend que já trata a chamada ao serviço externo
    const response = await base44.functions.invoke('gerarPDFExterno', {
      html,
      filename: `Cronograma_${workshop?.name || 'oficina'}_${new Date().toISOString().split('T')[0]}.pdf`
    });

    if (!response.data || !response.data.success) {
      const errorMsg = response.data?.error || 'Erro desconhecido ao gerar PDF';
      console.error(`[PDF-Manager] Erro: ${errorMsg}`);
      throw new Error(errorMsg);
    }

    console.log(`[PDF-Manager] PDF gerado com sucesso: ${response.data.size} bytes`);

    const base64PDF = response.data.pdf;
    if (!base64PDF || typeof base64PDF !== 'string') {
      throw new Error('PDF inválido recebido do servidor');
    }

    let binaryString;
    try {
      binaryString = atob(base64PDF);
    } catch (e) {
      throw new Error('PDF corrompido ou mal codificado');
    }

    const bytes = Uint8Array.from(binaryString, c => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);

    if (action === 'print') {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = url;
      document.body.appendChild(iframe);
      
      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow.print();
          document.body.removeChild(iframe);
          window.URL.revokeObjectURL(url);
          
          if (onSuccess) {
            onSuccess({
              filename: response.data.filename,
              size: response.data.size,
              action: 'print'
            });
          }
        }, 250);
      };
    } else {
      const link = document.createElement('a');
      link.href = url;
      link.download = response.data.filename || 'cronograma.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log(`[PDF-Manager] Download iniciado: ${link.download}`);

      if (onSuccess) {
        onSuccess({
          filename: response.data.filename,
          size: response.data.size,
          action: 'download'
        });
      }
    }

  } catch (error) {
    console.error(`[PDF-Manager-Error] ${error.message}`);
    
    let friendlyError = error.message;
    if (error.message?.includes('502') || error.message?.includes('503')) {
      friendlyError = 'Serviço de geração de PDF temporariamente indisponível. Tente novamente em alguns momentos.';
    } else if (error.message?.includes('timeout')) {
      friendlyError = 'Tempo limite excedido. A geração do PDF está levando muito tempo. Tente novamente.';
    }
    
    const enhancedError = new Error(friendlyError);
    enhancedError.original = error;
    
    if (onError) {
      onError(enhancedError);
    } else {
      console.error('Erro ao gerar PDF:', error.message);
    }
  }
}

/**
 * Baixa processo/MAP via serviço externo
 */
export async function downloadProcessPDFExterno(processDoc, its = [], workshop, options = {}) {
  const { action = 'download', onSuccess, onError } = options;

  try {
    console.log(`[PDF-Manager] Iniciando ${action} do PDF do processo`);

    const html = generateProcessHTML(processDoc, its, workshop);
    console.log(`[PDF-Manager] HTML gerado: ${html.length} caracteres`);

    const response = await base44.functions.invoke('gerarPDFExterno', {
      html,
      filename: `MAPA_${processDoc.code || 'MAP'}_${processDoc.title.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
    });

    if (!response.data || !response.data.success) {
      const errorMsg = response.data?.error || 'Erro desconhecido ao gerar PDF';
      console.error(`[PDF-Manager] Erro: ${errorMsg}`);
      throw new Error(errorMsg);
    }

    console.log(`[PDF-Manager] PDF gerado com sucesso: ${response.data.size} bytes`);

    const base64PDF = response.data.pdf;
    if (!base64PDF || typeof base64PDF !== 'string') {
      throw new Error('PDF inválido recebido do servidor');
    }

    let binaryString;
    try {
      binaryString = atob(base64PDF);
    } catch (e) {
      throw new Error('PDF corrompido ou mal codificado');
    }

    const bytes = Uint8Array.from(binaryString, c => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);

    if (action === 'print') {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = url;
      document.body.appendChild(iframe);
      
      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow.print();
          document.body.removeChild(iframe);
          window.URL.revokeObjectURL(url);
          
          if (onSuccess) {
            onSuccess({
              filename: response.data.filename,
              size: response.data.size,
              action: 'print'
            });
          }
        }, 250);
      };
    } else {
      const link = document.createElement('a');
      link.href = url;
      link.download = response.data.filename || 'processo.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log(`[PDF-Manager] Download iniciado: ${link.download}`);

      if (onSuccess) {
        onSuccess({
          filename: response.data.filename,
          size: response.data.size,
          action: 'download'
        });
      }
    }

  } catch (error) {
    console.error(`[PDF-Manager-Error] ${error.message}`);
    
    let friendlyError = error.message;
    if (error.message?.includes('502') || error.message?.includes('503')) {
      friendlyError = 'Serviço de geração de PDF temporariamente indisponível. Tente novamente em alguns momentos.';
    } else if (error.message?.includes('timeout')) {
      friendlyError = 'Tempo limite excedido. A geração do PDF está levando muito tempo. Tente novamente.';
    }
    
    const enhancedError = new Error(friendlyError);
    enhancedError.original = error;
    
    if (onError) {
      onError(enhancedError);
    } else {
      console.error('Erro ao gerar PDF:', error.message);
    }
  }
}