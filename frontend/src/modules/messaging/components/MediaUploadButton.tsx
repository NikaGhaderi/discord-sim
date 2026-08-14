import React, { useRef } from 'react';

export interface SelectedFile {
  name: string;
  size: number;
  file: File;
}

interface MediaUploadButtonProps {
  selectedFile: SelectedFile | null;
  onFileSelect: (file: SelectedFile | null) => void;
  disabled?: boolean;
}

export const MediaUploadButton: React.FC<MediaUploadButtonProps> = ({
  selectedFile,
  onFileSelect,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect({
        name: file.name,
        size: file.size,
        file,
      });
    }
  };

  const handleClear = () => {
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex flex-col gap-1">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        disabled={disabled}
        className="hidden"
        style={{ display: 'none' }}
        data-testid="media-file-input"
      />
      
      {!selectedFile ? (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="p-2 border rounded-md text-sm font-medium disabled:opacity-50 text-[var(--ws-text-secondary)] border-[var(--ws-border)] hover:text-[var(--ws-primary)]"
          aria-label="Attach File"
        >
          📎 Attach
        </button>
      ) : (
        <div className="flex items-center gap-2 p-1.5 rounded-md border text-xs bg-[var(--ws-bg-hover)] border-[var(--ws-border)] text-[var(--ws-text)]">
          <span className="font-medium truncate max-w-[150px]">{selectedFile.name}</span>
          <span className="text-[var(--ws-text-secondary)]">({formatFileSize(selectedFile.size)})</span>
          <button
            type="button"
            onClick={handleClear}
            className="font-bold ml-1 text-[var(--ws-danger)] hover:opacity-75"
            aria-label="Remove Attachment"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};