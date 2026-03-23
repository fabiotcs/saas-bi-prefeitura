'use client'

import { useRef, useState } from 'react'
import { X, ImagePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PhotoUploaderProps {
  onFilesChange: (files: File[]) => void
  maxFiles?: number
  label?: string
}

export function PhotoUploader({
  onFilesChange,
  maxFiles = 10,
  label = 'Adicionar fotos',
}: PhotoUploaderProps) {
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? [])
    const available = maxFiles - files.length
    const toAdd = selected.slice(0, available)

    const newPreviews = toAdd.map((f) => URL.createObjectURL(f))
    const updatedFiles = [...files, ...toAdd]
    const updatedPreviews = [...previews, ...newPreviews]

    setFiles(updatedFiles)
    setPreviews(updatedPreviews)
    onFilesChange(updatedFiles)

    // Reset input so the same file can be re-selected
    if (inputRef.current) inputRef.current.value = ''
  }

  function removeFile(index: number) {
    URL.revokeObjectURL(previews[index])

    const updatedFiles = files.filter((_, i) => i !== index)
    const updatedPreviews = previews.filter((_, i) => i !== index)

    setFiles(updatedFiles)
    setPreviews(updatedPreviews)
    onFilesChange(updatedFiles)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        {previews.map((src, idx) => (
          <div key={src} className="relative w-20 h-20 rounded overflow-hidden border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removeFile(idx)}
              className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5 text-white hover:bg-black/80"
              aria-label={`Remover foto ${idx + 1}`}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}

        {files.length < maxFiles && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-border rounded text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            aria-label={label}
          >
            <ImagePlus className="w-5 h-5 mb-1" />
            <span className="text-xs">{label}</span>
          </button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {files.length} {files.length === 1 ? 'foto selecionada' : 'fotos selecionadas'}
        {maxFiles < Infinity && ` (máx. ${maxFiles})`}
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={handleFilesSelected}
        aria-hidden="true"
      />
    </div>
  )
}
