"use client";

import { useState, useCallback } from "react";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSize?: number; // in MB
}

export function FileUpload({
  onFileSelect,
  accept = ".pdf,.csv",
  maxSize = 10,
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFile = useCallback(
    (file: File): boolean => {
      setError(null);

      // Check file type
      const validTypes = accept.split(",").map((t) => t.trim());
      const fileExt = `.${file.name.split(".").pop()?.toLowerCase()}`;
      if (!validTypes.some((t) => fileExt === t || file.type.includes(t.replace(".", "")))) {
        setError(`Tipo de arquivo invalido. Aceitos: ${accept}`);
        return false;
      }

      // Check file size
      const maxBytes = maxSize * 1024 * 1024;
      if (file.size > maxBytes) {
        setError(`Arquivo muito grande. Maximo: ${maxSize}MB`);
        return false;
      }

      return true;
    },
    [accept, maxSize]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const file = e.dataTransfer.files[0];
      if (file && validateFile(file)) {
        onFileSelect(file);
      }
    },
    [onFileSelect, validateFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && validateFile(file)) {
        onFileSelect(file);
      }
    },
    [onFileSelect, validateFile]
  );

  return (
    <div className="w-full">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl cursor-pointer transition ${
          isDragOver
            ? "border-emerald-500 bg-emerald-50"
            : "border-gray-300 bg-gray-50 hover:bg-gray-100"
        }`}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <span className="text-5xl mb-4">📄</span>
          <p className="mb-2 text-lg font-medium text-gray-700">
            {isDragOver ? "Solte o arquivo aqui" : "Arraste e solte seu extrato"}
          </p>
          <p className="text-sm text-gray-500">
            ou clique para selecionar (PDF, CSV ate {maxSize}MB)
          </p>
        </div>
        <input
          type="file"
          className="hidden"
          accept={accept}
          onChange={handleChange}
        />
      </label>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
