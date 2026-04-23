import { base44 } from '@/api/base44Client';

/**
 * Gera PDF via serviço externo com opção de download ou impressão
 * @param {string} ata_id - ID da ATA a ser convertida em PDF
 * @param {object} options - Opções adicionais
 * @param {string} options.action - 'download' (padrão) ou 'print' (abre em nova aba)
 * @param {function} options.onSuccess - Callback de sucesso
 * @param {function} options.onError - Callback de erro
 * @returns {Promise<void>}
 */
export async function downloadAtaPDF(ata_id, options = {}) {
  const { action = 'download', onSuccess, onError } = options;

  try {
    console.log(`[PDF-Manager] Iniciando ${action} do PDF para ATA: ${ata_id}`);

    // Chamar função backend
    const response = await base44.functions.invoke('generateAtaPDFExterno', {
      ata_id
    });

    if (!response.data || !response.data.success) {
      const errorMsg = response.data?.error || 'Erro desconhecido ao gerar PDF';
      console.error(`[PDF-Manager] Erro: ${errorMsg}`);
      throw new Error(errorMsg);
    }

    console.log(`[PDF-Manager] PDF gerado com sucesso: ${response.data.size} bytes`);

    // Converter base64 para blob
    const base64PDF = response.data.pdf;
    const binaryString = atob(base64PDF);
    const bytes = new Uint8Array(binaryString.length);
    
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);

    if (action === 'print') {
      // Abrir em nova aba para impressão
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = url;
      document.body.appendChild(iframe);
      
      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow.print();
          document.body.removeChild(iframe);
          window.URL.revokeObjectURL(url);
          
          console.log(`[PDF-Manager] Diálogo de impressão aberto`);
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
      // Download automático (padrão)
      const link = document.createElement('a');
      link.href = url;
      link.download = response.data.filename || 'ata.pdf';
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
    
    if (onError) {
      onError(error);
    } else {
      console.error('Erro ao gerar PDF:', error.message);
    }
  }
}

/**
 * Versão assíncrona que retorna o blob sem fazer download automático
 * Útil para processos customizados
 * @param {string} ata_id - ID da ATA
 * @returns {Promise<Blob>}
 */
export async function getAtaPDFBlob(ata_id) {
  try {
    const response = await base44.functions.invoke('generateAtaPDFExterno', {
      ata_id
    });

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || 'Erro ao gerar PDF');
    }

    const base64PDF = response.data.pdf;
    const binaryString = atob(base64PDF);
    const bytes = new Uint8Array(binaryString.length);
    
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    return new Blob([bytes], { type: 'application/pdf' });
  } catch (error) {
    console.error('Erro ao obter PDF:', error.message);
    throw error;
  }
}