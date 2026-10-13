import React from 'react';

interface FileUploadProps {
  onFileSelect?: (file: File) => void;
  status?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, status }) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onFileSelect) {
      onFileSelect(file);
    }
  };

  return (
    <div className="p-4 border-b border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Document Ingestion
        </label>
        <span className="text-[10px] text-slate-400 font-mono">&lt; 1MB Doc/PDF</span>
      </div>

      <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-sky-500 rounded-lg p-3 text-center cursor-pointer transition-colors relative bg-slate-50 dark:bg-slate-900/60">
        <input
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="text-xs text-slate-500 dark:text-slate-400">
          <p className="font-medium">Drop file or browse</p>
          <p className="text-[10px] text-slate-400 mt-0.5">PDF or Word document</p>
        </div>
      </div>

      {status && (
        <div className="mt-2 text-xs font-mono text-slate-600 dark:text-slate-300">
          {status}
        </div>
      )}
    </div>
  );
};
