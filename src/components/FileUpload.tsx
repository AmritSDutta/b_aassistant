import React, { useRef } from 'react';

export interface ActiveDocumentInfo {
  name: string;
  size: number;
  pageCount: number;
  status: 'idle' | 'parsing' | 'indexed' | 'error';
}

interface FileUploadProps {
  activeDoc: ActiveDocumentInfo | null;
  onFileSelect: (file: File) => void;
  onClearDocument?: () => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  activeDoc,
  onFileSelect,
  onClearDocument,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  return (
    <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Document Ingestion
        </label>
        <span className="text-[10px] text-slate-400 font-mono">&lt; 1MB Doc/PDF</span>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-sky-500 rounded-lg p-3 text-center cursor-pointer transition-colors relative bg-slate-50 dark:bg-slate-900/60"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={handleFileChange}
          className="hidden"
        />
        <div className="text-xs text-slate-500 dark:text-slate-400">
          <p className="font-medium text-slate-700 dark:text-slate-300">Drop file or browse</p>
          <p className="text-[10px] text-slate-400 mt-0.5">PDF or Word document (&lt; 1MB)</p>
        </div>
      </div>

      {activeDoc && (
        <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-medium truncate max-w-[140px] text-slate-800 dark:text-slate-200" title={activeDoc.name}>
              {activeDoc.name}
            </span>
            {activeDoc.status === 'indexed' && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                Indexed
              </span>
            )}
            {activeDoc.status === 'parsing' && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800 animate-pulse">
                Parsing...
              </span>
            )}
            {activeDoc.status === 'error' && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-800">
                Error
              </span>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            <span>{activeDoc.pageCount} {activeDoc.pageCount === 1 ? 'page' : 'pages'}</span>
            <span>{(activeDoc.size / 1024).toFixed(1)} KB</span>
          </div>

          {onClearDocument && (
            <div className="pt-1 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClearDocument();
                }}
                className="text-[10px] text-red-500 hover:text-red-600 dark:hover:text-red-400 cursor-pointer font-medium"
              >
                Clear Document
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
