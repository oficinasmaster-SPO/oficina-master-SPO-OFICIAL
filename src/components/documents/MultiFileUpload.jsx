import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Upload, X, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function MultiFileUpload({ onComplete, workshopId }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadResults, setUploadResults] = useState([]);

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    addFiles(selectedFiles);
  };

  const addFiles = (newFiles) => {
    const filesWithMetadata = newFiles.map((file, index) => ({
      id: Date.now() + index,
      file,
      name: file.name,
      size: file.size,
      title: file.name.replace(/\.[^/.]+$/, ""),
      category: "empresa",
      type: "interno",
      is_controlled_copy: false,
      expiry_date: ""
    }));
    setFiles(prev => [...prev, ...filesWithMetadata]);
  };

  const removeFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const updateFileMetadata = (id, field, value) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  const uploadAll = async () => {
    if (files.length === 0) {
      toast.error("Adicione pelo menos um arquivo");
      return;
    }

    setUploading(true);
    setUploadResults([]);
    const results = [];

    for (const fileData of files) {
      try {
        setUploadProgress(prev => ({ ...prev, [fileData.id]: 30 }));
        
        const { file_url } = await base44.integrations.Core.UploadFile({ file: fileData.file });
        
        setUploadProgress(prev => ({ ...prev, [fileData.id]: 60 }));

        await base44.entities.CompanyDocument.create({
          workshop_id: workshopId,
          title: fileData.title,
          category: fileData.category,
          type: fileData.type,
          is_controlled_copy: fileData.is_controlled_copy,
          file_url: file_url,
          expiry_date: fileData.expiry_date || null
        });

        setUploadProgress(prev => ({ ...prev, [fileData.id]: 100 }));
        results.push({ ...fileData, status: "success" });
      } catch (error) {
        setUploadProgress(prev => ({ ...prev, [fileData.id]: 0 }));
        results.push({ ...fileData, status: "error", error: error.message });
      }
    }

    setUploadResults(results);
    setUploading(false);

    const successCount = results.filter(r => r.status === "success").length;
    const errorCount = results.filter(r => r.status === "error").length;

    if (errorCount === 0) {
      toast.success(`${successCount} documento(s) enviado(s) com sucesso!`);
      setTimeout(() => onComplete(), 1500);
    } else {
      toast.error(`${errorCount} erro(s) durante o upload`);
    }
  };

  return (
    <div className="space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer"
      >
        <input
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          id="multi-file-input"
        />
        <label htmlFor="multi-file-input" className="cursor-pointer">
          <Upload className="w-12 h-12 mx-auto text-gray-400 mb-3" />
          <p className="text-sm text-gray-600 mb-1">
            Arraste múltiplos arquivos ou clique para selecionar
          </p>
          <p className="text-xs text-gray-500">
            Você pode adicionar vários documentos de uma vez
          </p>
        </label>
      </div>

      {files.length > 0 && (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {files.map((fileData) => (
            <Card key={fileData.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded">
                    <FileText className="w-5 h-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-sm truncate">{fileData.name}</p>
                      {!uploading && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 -mt-1"
                          onClick={() => removeFile(fileData.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    {uploadProgress[fileData.id] !== undefined ? (
                      <div className="space-y-1">
                        <Progress value={uploadProgress[fileData.id]} className="h-2" />
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">
                            {uploadProgress[fileData.id]}%
                          </span>
                          {uploadProgress[fileData.id] === 100 && (
                            <span className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="w-3 h-3" />
                              Concluído
                            </span>
                          )}
                          {uploadResults.find(r => r.id === fileData.id)?.status === "error" && (
                            <span className="flex items-center gap-1 text-red-600">
                              <AlertCircle className="w-3 h-3" />
                              Erro
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <input
                          type="text"
                          value={fileData.title}
                          onChange={(e) => updateFileMetadata(fileData.id, "title", e.target.value)}
                          placeholder="Título"
                          className="col-span-3 px-2 py-1 border rounded text-xs"
                        />
                        <select
                          value={fileData.category}
                          onChange={(e) => updateFileMetadata(fileData.id, "category", e.target.value)}
                          className="px-2 py-1 border rounded text-xs"
                        >
                          <option value="empresa">Empresa</option>
                          <option value="juridico">Jurídico</option>
                          <option value="financeiro">Financeiro</option>
                          <option value="consorcio">Consórcio</option>
                          <option value="rh">RH</option>
                          <option value="outros">Outros</option>
                        </select>
                        <select
                          value={fileData.type}
                          onChange={(e) => updateFileMetadata(fileData.id, "type", e.target.value)}
                          className="px-2 py-1 border rounded text-xs"
                        >
                          <option value="interno">Interno</option>
                          <option value="externo">Externo</option>
                        </select>
                        <input
                          type="date"
                          value={fileData.expiry_date}
                          onChange={(e) => updateFileMetadata(fileData.id, "expiry_date", e.target.value)}
                          className="px-2 py-1 border rounded text-xs"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {uploadResults.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-sm mb-2">Resumo do Upload</h4>
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle className="w-4 h-4" />
              {uploadResults.filter(r => r.status === "success").length} sucesso
            </span>
            {uploadResults.filter(r => r.status === "error").length > 0 && (
              <span className="flex items-center gap-1 text-red-600">
                <AlertCircle className="w-4 h-4" />
                {uploadResults.filter(r => r.status === "error").length} erro(s)
              </span>
            )}
          </div>
        </div>
      )}

      {files.length > 0 && !uploading && uploadResults.length === 0 && (
        <Button onClick={uploadAll} className="w-full bg-blue-600 hover:bg-blue-700">
          <Upload className="w-4 h-4 mr-2" />
          Enviar {files.length} Documento(s)
        </Button>
      )}
    </div>
  );
}