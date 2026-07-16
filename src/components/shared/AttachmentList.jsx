import React from "react";
import { Paperclip, FileText, Image as ImageIcon, ExternalLink } from "lucide-react";

function formatFileSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(fileType) {
  if (!fileType) return FileText;
  if (fileType.startsWith("image/")) return ImageIcon;
  return FileText;
}

/**
 * AttachmentList — Lista de anexos padronizada.
 * Renderiza arquivos com ícone, nome, tamanho e link.
 * @param {Array} items - [{ file_url, file_name, file_type, file_size }]
 */
export default function AttachmentList({ items = [], compact = false }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {items.map((item, idx) => {
        const Icon = getFileIcon(item.file_type);
        return (
          <a
            key={idx}
            href={item.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors ${compact ? "px-2 py-1" : "px-3 py-2"}`}
          >
            <Icon className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <span className="text-sm text-gray-700 truncate flex-1 min-w-0">
              {item.file_name || "arquivo"}
            </span>
            {item.file_size && (
              <span className="text-xs text-gray-400 flex-shrink-0">{formatFileSize(item.file_size)}</span>
            )}
            <ExternalLink className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          </a>
        );
      })}
    </div>
  );
}