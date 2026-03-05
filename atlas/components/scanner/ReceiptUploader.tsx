'use client';

import { useCallback, useState, useRef } from 'react';
import { Upload, ImageIcon, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatFileSize } from '@/lib/utils/formatting';

/* ============================================================
   ATLAS — ReceiptUploader Component
   Drag-and-drop + click to upload
   ============================================================ */

interface ReceiptUploaderProps {
    onUpload: (files: File[]) => void;
    tornMode?: boolean;
    maxFiles?: number;
    disabled?: boolean;
}

export function ReceiptUploader({
    onUpload,
    tornMode = false,
    maxFiles = 1,
    disabled = false,
}: ReceiptUploaderProps) {
    const [dragActive, setDragActive] = useState(false);
    const [previewFiles, setPreviewFiles] = useState<
        { file: File; preview: string }[]
    >([]);
    const inputRef = useRef<HTMLInputElement>(null);

    const effectiveMax = tornMode ? 2 : maxFiles;

    const handleFiles = useCallback(
        (files: FileList | File[]) => {
            const fileArray = Array.from(files).slice(0, effectiveMax);
            const validFiles = fileArray.filter((f) =>
                ['image/jpeg', 'image/png', 'image/webp', 'image/heic'].includes(f.type)
            );

            if (validFiles.length === 0) return;

            const previews = validFiles.map((file) => ({
                file,
                preview: URL.createObjectURL(file),
            }));

            setPreviewFiles(previews);
        },
        [effectiveMax]
    );

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setDragActive(false);
            if (!disabled) handleFiles(e.dataTransfer.files);
        },
        [disabled, handleFiles]
    );

    const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            if (e.target.files) handleFiles(e.target.files);
        },
        [handleFiles]
    );

    const removeFile = (index: number) => {
        setPreviewFiles((prev) => {
            const updated = [...prev];
            URL.revokeObjectURL(updated[index].preview);
            updated.splice(index, 1);
            return updated;
        });
    };

    const submitFiles = () => {
        onUpload(previewFiles.map((p) => p.file));
    };

    return (
        <div className="space-y-4">
            {/* Drop Zone */}
            <div
                onDragOver={(e) => {
                    e.preventDefault();
                    if (!disabled) setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                onClick={() => !disabled && inputRef.current?.click()}
                className={`
          relative flex flex-col items-center justify-center
          w-full min-h-[200px]
          border-2 border-dashed rounded-2xl
          transition-all duration-200 cursor-pointer
          ${dragActive
                        ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/5'
                        : 'border-[var(--border-default)] hover:border-[var(--accent-purple)] hover:bg-[var(--bg-elevated)]/50'
                    }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic"
                    multiple={tornMode}
                    onChange={handleChange}
                    className="hidden"
                    disabled={disabled}
                />

                <Upload className="h-10 w-10 text-[var(--text-muted)] mb-3" />
                <p className="text-sm text-[var(--text-secondary)] font-medium">
                    Drag & drop your receipt here
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                    or click to browse • JPEG, PNG, WebP • Max 10MB
                </p>
                {tornMode && (
                    <p className="text-xs text-[var(--accent-primary)] mt-2 font-medium">
                        📄 Torn Receipt Mode: Upload up to 2 images
                    </p>
                )}
            </div>

            {/* Preview */}
            <AnimatePresence>
                {previewFiles.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3"
                    >
                        <div className="flex flex-wrap gap-3">
                            {previewFiles.map((pf, index) => (
                                <motion.div
                                    key={pf.preview}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="relative group"
                                >
                                    <div className="w-32 h-40 rounded-xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
                                        <img
                                            src={pf.preview}
                                            alt={`Receipt ${index + 1}`}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeFile(index);
                                        }}
                                        className="absolute -top-2 -right-2 p-1 rounded-full bg-[var(--error)] text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                    <p className="text-[10px] text-[var(--text-muted)] mt-1 text-center truncate w-32">
                                        {formatFileSize(pf.file.size)}
                                    </p>
                                </motion.div>
                            ))}
                        </div>

                        <button
                            onClick={submitFiles}
                            disabled={disabled}
                            className="w-full py-3 rounded-xl bg-[var(--accent-primary)] text-white font-medium hover:brightness-110 transition-all disabled:opacity-50"
                        >
                            {tornMode && previewFiles.length > 1
                                ? `Process ${previewFiles.length} Images (Torn Receipt)`
                                : 'Process Receipt'}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
