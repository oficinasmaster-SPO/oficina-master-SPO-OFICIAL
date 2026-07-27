import React, { useState, useMemo } from "react";
import { 
  FileText, FileImage, FileSpreadsheet, FileArchive, 
  FileAudio, FileVideo, File, Link as LinkIcon, 
  ChevronDown, ChevronRight, Download, Maximize, 
  RotateCw, ChevronLeft, ExternalLink, X, Loader2
} from "lucide-react";

// ============================================================================
// IMPORTS DO REACT-PDF
// ============================================================================
import { Document, Page, pdfjs } from 'react-pdf';
// Configuração obrigatória do Worker do Mozilla PDF.js (usando CDN para facilitar)
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;


// ============================================================================
// UTILS & HELPERS
// ============================================================================
const formatBytes = (bytes, decimals = 1) => {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

const getDomainName = (url) => {
  try {
    const domain = new URL(url).hostname;
    return domain.replace('www.', '');
  } catch (e) {
    return "Link Externo";
  }
};

const getFileMeta = (mimeType, extension) => {
  const ext = (extension || "").toLowerCase();
  if (ext === "pdf" || mimeType?.includes("pdf")) return { icon: FileText, color: "text-red-500", bg: "bg-red-50" };
  if (["xls", "xlsx", "csv"].includes(ext) || mimeType?.includes("spreadsheet")) return { icon: FileSpreadsheet, color: "text-emerald-500", bg: "bg-emerald-50" };
  if (["doc", "docx"].includes(ext)) return { icon: FileText, color: "text-blue-500", bg: "bg-blue-50" };
  if (["zip", "rar", "7z"].includes(ext)) return { icon: FileArchive, color: "text-amber-500", bg: "bg-amber-50" };
  if (mimeType?.includes("audio")) return { icon: FileAudio, color: "text-purple-500", bg: "bg-purple-50" };
  if (mimeType?.includes("video")) return { icon: FileVideo, color: "text-pink-500", bg: "bg-pink-50" };
  if (mimeType?.includes("image")) return { icon: FileImage, color: "text-blue-400", bg: "bg-blue-50" };
  return { icon: File, color: "text-gray-500", bg: "bg-gray-100" };
};

// ============================================================================
// COMPONENTE: PDF VIEWER (React-PDF)
// ============================================================================
function PdfViewer({ url }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
    setPageNumber(1); // Reseta para a pág 1 ao abrir um novo PDF
  }

  return (
    <div className="flex flex-col items-center w-full h-full bg-gray-100/50 rounded-md border border-gray-200 overflow-hidden">
      {/* Controles de Paginação Fixos no Topo */}
      <div className="flex items-center gap-4 bg-white/90 backdrop-blur border-b border-gray-200 w-full px-4 py-2 shrink-0 z-10 justify-center shadow-sm">
        <button 
          disabled={pageNumber <= 1} 
          onClick={() => setPageNumber(p => p - 1)}
          className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </button>
        
        <span className="text-xs font-medium text-gray-600 tabular-nums">
          Página {pageNumber} de {numPages || '--'}
        </span>
        
        <button 
          disabled={pageNumber >= numPages} 
          onClick={() => setPageNumber(p => p + 1)}
          className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* Renderizador do Documento */}
      <div className="flex-1 overflow-y-auto w-full flex justify-center p-4">
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin mb-2" />
              <span className="text-xs">Carregando PDF...</span>
            </div>
          }
          error={
            <div className="flex flex-col items-center justify-center h-40 text-red-400">
              <FileText className="w-8 h-8 mb-2 opacity-50" />
              <span className="text-xs">Falha ao carregar o documento.</span>
            </div>
          }
        >
          <Page 
            pageNumber={pageNumber} 
            renderTextLayer={false} 
            renderAnnotationLayer={false}
            className="shadow-md rounded-sm overflow-hidden border border-gray-200"
            width={600} // Ajuste fino da largura base
          />
        </Document>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTE: DRAWER DE PREVIEW
// ============================================================================
function FileViewerDrawer({ files, currentIndex, onClose, onChangeIndex }) {
  if (!files || files.length === 0 || currentIndex === null) return null;
  const currentFile = files[currentIndex];
  if (!currentFile) return null;
  
  const isImage = currentFile.type === "image" || currentFile.mimeType?.includes("image");
  const isPdf =
    currentFile.extension?.toLowerCase() === 'pdf' ||
    currentFile.mimeType?.includes('pdf') ||
    currentFile.name?.toLowerCase().endsWith('.pdf'); // Reforço garantido

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right-8 duration-300">
        
        {/* Header do Drawer */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="min-w-0 pr-4">
            <h2 className="text-sm font-semibold text-gray-800 truncate">{currentFile.name}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {currentFile.createdBy || "Sistema"} • {formatBytes(currentFile.size)}
            </p>
          </div>
          <div className="flex items-center gap-1 text-gray-500 shrink-0">
            <a href={currentFile.url} download={currentFile.name} className="p-2 hover:bg-gray-100 rounded-full transition-colors" title="Download">
              <Download className="w-4 h-4" />
            </a>
            {isImage && (
              <button className="p-2 hover:bg-gray-100 rounded-full transition-colors" title="Rotacionar">
                <RotateCw className="w-4 h-4" />
              </button>
            )}
            <div className="w-px h-4 bg-gray-200 mx-1" />
            <button onClick={onClose} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 bg-gray-50/50 p-6 flex items-center justify-center relative overflow-hidden">
          
          {/* Se for Imagem */}
          {isImage ? (
            <img src={currentFile.url} alt={currentFile.name} className="max-w-full max-h-full object-contain rounded-md shadow-sm" />
          ) 
          
          /* Se for PDF (Usando react-pdf) */
          : isPdf ? (
            <PdfViewer url={currentFile.url} />
          ) 
          
          /* Fallback para outros arquivos (Excel, Word, Zip, etc) */
          : (
            <div className="flex flex-col items-center justify-center text-gray-400 bg-white border border-gray-200 rounded-xl p-12 shadow-sm">
              <File className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-sm font-medium text-gray-600">{currentFile.name}</p>
              <p className="text-xs mt-1">Pré-visualização visual não disponível.</p>
              <a href={currentFile.url} download={currentFile.name} className="mt-6 px-5 py-2 bg-blue-600 rounded-md text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-all flex items-center gap-2">
                <Download className="w-4 h-4" /> Fazer Download
              </a>
            </div>
          )}

          {/* Navegação Prev/Next flutuante na Galeria */}
          {files.length > 1 && (
            <>
              <button 
                disabled={currentIndex === 0}
                onClick={() => onChangeIndex(currentIndex - 1)}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 backdrop-blur shadow border border-gray-200 text-gray-700 rounded-full hover:bg-white hover:scale-105 disabled:opacity-30 disabled:hover:scale-100 transition-all z-20"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button 
                disabled={currentIndex === files.length - 1}
                onClick={() => onChangeIndex(currentIndex + 1)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 backdrop-blur shadow border border-gray-200 text-gray-700 rounded-full hover:bg-white hover:scale-105 disabled:opacity-30 disabled:hover:scale-100 transition-all z-20"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL: ATTACHMENT GALLERY 
// ============================================================================
/**
 * @typedef {Object} Attachment
 * @property {string} id
 * @property {string} url
 * @property {string} name
 * @property {'image'|'document'|'link'} type
 * @property {string} [mimeType]
 * @property {number} [size]
 * @property {string} [extension]
 * @property {string} [createdBy]
 * @property {string} [createdAt] - ISO Date
 * @property {string} [origin] - Ex: "Solicitação", "Comentário"
 */

/**
 * @param {{ files: Attachment[] }} props
 */
export default function AttachmentGallery({ files = [] }) {
  const [expanded, setExpanded] = useState({ images: true, documents: true, links: true });
  const [preview, setPreview] = useState({ isOpen: false, list: [], currentIndex: null });

  const toggleSection = (section) => {
    setExpanded(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const openPreview = (fileList, file) => {
    const idx = fileList.findIndex(f => f.id === file.id);
    setPreview({ isOpen: true, list: fileList, currentIndex: Math.max(0, idx) });
  };

  const images = useMemo(() => files.filter(f => f.type === "image"), [files]);
  const documents = useMemo(() => files.filter(f => f.type === "document"), [files]);
  const links = useMemo(() => files.filter(f => f.type === "link"), [files]);

  if (files.length === 0) return null;

  return (
    <div className="w-full text-sm">
      {preview.isOpen && (
        <FileViewerDrawer 
          files={preview.list} 
          currentIndex={preview.currentIndex} 
          onChangeIndex={(idx) => setPreview(prev => ({ ...prev, currentIndex: idx }))}
          onClose={() => setPreview({ isOpen: false, list: [], currentIndex: null })} 
        />
      )}

      <div className="flex items-center gap-2 py-3 border-b border-gray-200/70 mb-4">
        <h3 className="font-semibold text-gray-800 tracking-tight">Arquivos</h3>
        <span className="px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-500 text-[11px] font-bold">
          {files.length}
        </span>
      </div>

      <div className="space-y-6">
        
        {images.length > 0 && (
          <div className="space-y-3">
            <button onClick={() => toggleSection('images')} className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-800 transition-colors">
              <ChevronRight className={`w-3.5 h-3.5 transition-transform ${expanded.images ? 'rotate-90' : ''}`} /> Imagens ({images.length})
            </button>
            
            {expanded.images && (
              <div className="flex flex-wrap gap-2.5 pl-5">
                {images.slice(0, 5).map((img, idx) => {
                  const isLastVisible = idx === 4;
                  const hasMore = images.length > 5;
                  return (
                    <button key={img.id} onClick={() => openPreview(images, img)} className="relative group w-[72px] h-[72px] rounded-lg border border-gray-200 overflow-hidden bg-gray-50 shadow-sm hover:shadow-md hover:border-blue-300 transition-all">
                      <img src={img.url} alt={img.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                      {isLastVisible && hasMore && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">+{images.length - 5}</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {documents.length > 0 && (
          <div className="space-y-2">
            <button onClick={() => toggleSection('documents')} className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-800 transition-colors mb-1">
              <ChevronRight className={`w-3.5 h-3.5 transition-transform ${expanded.documents ? 'rotate-90' : ''}`} /> Documentos ({documents.length})
            </button>

            {expanded.documents && (
              <div className="flex flex-col gap-1 pl-1">
                {documents.map((doc) => {
                  const MetaIcon = getFileMeta(doc.mimeType, doc.extension);
                  const Icon = MetaIcon.icon;
                  return (
                    <div key={doc.id} onClick={() => openPreview(documents, doc)} className="group flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-gray-50/80 hover:shadow-sm border border-transparent hover:border-gray-100 transition-all cursor-pointer">
                      <div className={`flex items-center justify-center w-10 h-10 rounded-md ${MetaIcon.bg} ${MetaIcon.color} group-hover:scale-105 transition-transform`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-800 truncate">{doc.name}</p>
                          {doc.extension && <span className="shrink-0 px-1.5 py-0.5 rounded-[4px] bg-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-wide">{doc.extension}</span>}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-gray-500 truncate">
                          <span>{formatBytes(doc.size)}</span>
                          {doc.createdBy && <><span className="w-1 h-1 rounded-full bg-gray-300" /><span className="truncate">Enviado por {doc.createdBy}</span></>}
                          {doc.origin && <><span className="w-1 h-1 rounded-full bg-gray-300" /><span className="truncate text-gray-400">({doc.origin})</span></>}
                        </div>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 pr-2 text-gray-400 transition-all">
                        <Maximize className="w-4 h-4" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {links.length > 0 && (
          <div className="space-y-2">
            <button onClick={() => toggleSection('links')} className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-800 transition-colors mb-1">
              <ChevronRight className={`w-3.5 h-3.5 transition-transform ${expanded.links ? 'rotate-90' : ''}`} /> Links ({links.length})
            </button>

            {expanded.links && (
              <div className="flex flex-col gap-1 pl-1">
                {links.map((link) => (
                  <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="group flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-blue-50/50 hover:shadow-sm border border-transparent hover:border-blue-100/50 transition-all cursor-pointer">
                    <div className="flex items-center justify-center w-10 h-10 rounded-md bg-gray-50 text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                      <LinkIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate group-hover:text-blue-700 transition-colors">{link.name || getDomainName(link.url)}</p>
                      <p className="text-[11px] text-gray-400 truncate mt-0.5 max-w-[80%]">{link.url}</p>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 pr-2 text-blue-500 transition-opacity">
                      <ExternalLink className="w-4 h-4" />
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}