import React, { useCallback } from "react";
import { Upload } from "lucide-react";

/**
 * Componente de upload com drag & drop
 */
export default function DragDropUpload({ onFileSelect, accept = "*" }) {
  const [isDragging, setIsDragging] = React.useState(false);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragOut = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  }, [onFileSelect]);

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
        isDragging 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-gray-300 hover:border-gray-400'
      }`}
    >
      <input
        type="file"
        onChange={handleFileInput}
        accept={accept}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
      
      <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-blue-600' : 'text-gray-400'}`} />
      
      <p className="text-sm text-gray-600">
        {isDragging ? (
          <span className="font-semibold text-blue-600">Solte o arquivo aqui</span>
        ) : (
          <>
            <span className="font-semibold">Clique para selecionar</span> ou arraste o arquivo
          </>
        )}
      </p>
      
      <p className="text-xs text-gray-500 mt-2">
        Formatos aceitos: PDF, JPG, PNG, DOCX
      </p>
    </div>
  );
}