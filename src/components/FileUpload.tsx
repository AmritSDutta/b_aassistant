import React, { useRef, useState } from 'react';

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
  const [dragOver, setDragOver] = useState(false);

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
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  return (
    <div className="p-4 border-b space-y-3" style={{ borderColor: 'var(--line)' }}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold" style={{ color: 'var(--ink)' }}>
          Document Ingestion
        </label>
        <span className="text-[10px] font-mono" style={{ color: 'var(--ink-soft)' }}>
          &lt; 2MB Doc/Text
        </span>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors relative"
        style={{
          borderColor: dragOver ? 'var(--accent)' : 'var(--line)',
          background: dragOver ? 'var(--accent-soft)' : 'var(--card)',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt,.md"
          onChange={handleFileChange}
          className="hidden"
        />
        <div className="text-xs" style={{ color: 'var(--ink-soft)' }}>
          <p className="font-medium" style={{ color: dragOver ? 'var(--accent)' : 'var(--ink)' }}>
            {dragOver ? 'Release to ingest' : 'Drop file or browse'}
          </p>
          <p className="text-[10px] mt-0.5">PDF, Word, TXT, or MD (&lt; 2MB)</p>
        </div>
      </div>

      {activeDoc && (
        <div
          className="p-2.5 rounded-lg border text-xs space-y-1.5"
          style={{ borderColor: 'var(--line)', background: 'var(--card)' }}
        >
          <div className="flex items-center justify-between">
            <span
              className="font-medium truncate max-w-[140px]"
              style={{ color: 'var(--ink)' }}
              title={activeDoc.name}
            >
              {activeDoc.name}
            </span>
            {activeDoc.status === 'indexed' && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ background: 'var(--you-soft)', color: 'var(--you)' }}>
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

          <div
            className="flex items-center justify-between text-[11px] font-mono"
            style={{ color: 'var(--ink-soft)' }}
          >
            <span>{activeDoc.pageCount} {activeDoc.pageCount === 1 ? 'page' : 'pages'}</span>
            <span>{(activeDoc.size / 1024).toFixed(1)} KB</span>
          </div>

          {onClearDocument && (
            <div className="pt-1 border-t flex justify-end" style={{ borderColor: 'var(--line)' }}>
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
