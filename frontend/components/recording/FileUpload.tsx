"use client";

/**
 * FileUpload — drag-and-drop / click-to-browse audio file input.
 * Shows filename + size after selection. Validates accepted audio types.
 */

import { useCallback, useRef, useState } from "react";
import { Upload, FileAudio, X } from "lucide-react";

// ---------------------------------------------------------------------------
// Props interface (exported for Figma handoff)
// ---------------------------------------------------------------------------

export interface FileUploadProps {
  /** Called with the selected File object */
  onFileSelected: (file: File) => void;
  /** Disable the zone — e.g. while uploading */
  disabled?: boolean;
  /** Accepted MIME/extension string for the hidden <input> */
  accept?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_ACCEPT = ".m4a,.mp3,.wav,.webm,audio/*";

const VALID_EXTENSIONS = [".mp3", ".m4a", ".wav", ".webm"];
const VALID_MIME_PREFIXES = ["audio/"];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isValidAudio(file: File): boolean {
  const ext = "." + (file.name.split(".").pop() ?? "").toLowerCase();
  const mimeOk = VALID_MIME_PREFIXES.some((p) => file.type.startsWith(p));
  const extOk = VALID_EXTENSIONS.includes(ext);
  return mimeOk || extOk;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FileUpload({
  onFileSelected,
  disabled = false,
  accept = DEFAULT_ACCEPT,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      setFileError(null);
      if (!isValidAudio(file)) {
        setFileError(
          "Unsupported file type. Please upload a .wav, .mp3, .m4a, or .webm file.",
        );
        return;
      }
      setSelectedFile(file);
      onFileSelected(file);
    },
    [onFileSelected],
  );

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = ""; // reset so same file can be re-selected
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    setSelectedFile(null);
    setFileError(null);
  }

  function openPicker() {
    if (!disabled) inputRef.current?.click();
  }

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Click or drag an audio file here to upload"
        aria-disabled={disabled}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={openPicker}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !disabled) {
            e.preventDefault();
            openPicker();
          }
        }}
        className={`
          relative flex flex-col items-center justify-center gap-3
          rounded-xl border-2 border-dashed p-12 text-center
          transition-colors select-none
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-600 focus-visible:outline-offset-2
          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
          ${
            isDragging
              ? "border-sky-400 bg-sky-50"
              : "border-slate-200 bg-slate-50 hover:border-sky-300 hover:bg-sky-50/50"
          }
        `}
      >
        <Upload
          className={`h-8 w-8 ${isDragging ? "text-sky-500" : "text-slate-300"}`}
          aria-hidden="true"
        />
        <div>
          <p className="text-sm font-medium text-slate-700">
            {isDragging ? "Drop your audio file here" : "Click to upload or drag and drop"}
          </p>
          <p className="text-xs text-slate-400 mt-1">.wav · .mp3 · .m4a · .webm</p>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        aria-label="Select an audio file"
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled}
      />

      {/* Selected file preview */}
      {selectedFile && (
        <div
          className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3"
          role="status"
          aria-label={`Selected: ${selectedFile.name}, ${formatBytes(selectedFile.size)}`}
        >
          <FileAudio className="h-5 w-5 shrink-0 text-green-600" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-green-800 truncate">{selectedFile.name}</p>
            <p className="text-xs text-green-600">{formatBytes(selectedFile.size)}</p>
          </div>
          <button
            onClick={handleClear}
            aria-label={`Remove ${selectedFile.name}`}
            className="shrink-0 rounded text-green-600 hover:text-green-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-600"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Validation error */}
      {fileError && (
        <p role="alert" className="text-sm text-red-600">
          {fileError}
        </p>
      )}
    </div>
  );
}
