import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { base44 } from "@/api/base44Client";

export default function ManualDownloadButton({ workshopId, onDownload }) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async (includeMaster) => {
    if (!workshopId) {
      toast.error("Workshop não encontrado");
      return;
    }

    setLoading(true);
    try {
      const response = await base44.functions.invoke('generateWorkshopManualPDF', {
        workshop_id: workshopId,
        include_master_processes: includeMaster
      });

      console.log('Response:', response);

      if (response.data?.pdf_data) {
        // Criar link para download
        const link = document.createElement('a');
        link.href = response.data.pdf_data;
        link.download = `manual-${workshopId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success('PDF baixado com sucesso!');
        
        if (onDownload) {
          onDownload();
        }
      } else {
        console.error('Resposta inválida:', response);
        toast.error('Erro ao gerar PDF: resposta inválida');
      }
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      console.error('Detalhes completos:', error);
      console.error('Response error data:', error.response?.data);
      toast.error('Erro: ' + JSON.stringify(error.response?.data || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          className="bg-blue-600 hover:bg-blue-700"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Gerando...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Baixar PDF
              <ChevronDown className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleDownload(true)}>
          Com Processos Oficinas Master
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleDownload(false)}>
          Sem Processos Oficinas Master
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}