'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Loader2, X, ExternalLink } from 'lucide-react'

interface VerPDFProps {
  filePath: string
  fileName: string
  bucketName: string
  isOpen: boolean
  onClose: () => void
}

export default function VerPDF({ filePath, fileName, bucketName, isOpen, onClose }: VerPDFProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!isOpen || !filePath) {
      setError(false)
      setLoading(false)
      setBlobUrl((prev) => {
        if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
        return null
      })
      return
    }

    let cancelled = false
    let objectUrl: string | null = null

    const load = async () => {
      try {
        setLoading(true)
        setError(false)

        const { data, error: downloadError } = await supabase.storage
          .from(bucketName)
          .download(filePath)

        if (!downloadError && data) {
          if (cancelled) return
          objectUrl = URL.createObjectURL(data)
          setBlobUrl(objectUrl)
          return
        }

        const { data: signed } = await supabase.storage
          .from(bucketName)
          .createSignedUrl(filePath, 3600)

        if (cancelled) return
        if (signed?.signedUrl) {
          setBlobUrl(signed.signedUrl)
          return
        }

        throw downloadError ?? new Error('Sin archivo')
      } catch (err) {
        console.error(err)
        if (!cancelled) {
          setBlobUrl(null)
          setError(true)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [isOpen, filePath, bucketName])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 p-0 backdrop-blur-sm dark:bg-black/80 md:p-4">
      <div className="relative flex h-full w-full flex-col overflow-hidden bg-gray-100 dark:bg-gray-900 md:h-[95vh] md:max-w-[95vw] md:rounded-lg md:shadow-2xl">
        <div className="relative z-10 flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-3 text-gray-900 shadow-md dark:border-gray-700 dark:bg-gray-800 dark:text-white">
          <h3 className="max-w-[150px] truncate text-sm font-semibold md:max-w-md" title={fileName}>
            {fileName}
          </h3>

          <div className="flex items-center gap-2">
            {blobUrl && (
              <a
                href={blobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden rounded-full p-2 text-gray-500 hover:bg-blue-50 hover:text-blue-600 dark:text-gray-400 dark:hover:bg-blue-500/10 dark:hover:text-blue-400 sm:flex"
                title="Abrir nativo"
              >
                <ExternalLink className="h-5 w-5" />
              </a>
            )}
            <button
              onClick={onClose}
              className="rounded-full p-2 text-gray-500 hover:bg-red-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-red-600/20 dark:hover:text-white"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-gray-200/50 dark:bg-gray-900/50">
          {loading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Cargando...</span>
            </div>
          ) : blobUrl ? (
            <iframe
              src={blobUrl}
              title={fileName}
              className="h-full w-full border-0 bg-white"
            />
          ) : (
            <span className="rounded-md bg-gray-200 px-4 py-2 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              {error ? 'No se pudo abrir el PDF' : 'No disponible'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
